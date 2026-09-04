import { useEffect, useRef, useState } from "react"
import { Loader2, Mic, Square } from "lucide-react"

import { api } from "../../lib/api"

/**
 * Describe the matter out loud.
 *
 * The product already reasons in seven Indian languages and, until now,
 * only accepted typing. Someone who has just been to a police station is not
 * going to compose a paragraph of legal English in a textarea, and the
 * languages they would use are exactly the ones the pipeline already
 * handles.
 *
 * The transcript is *appended* rather than replacing what is there: people
 * dictate a bit, correct it, dictate more, and clobbering the box would lose
 * an edit they had just made.
 *
 * Renders nothing at all when the deployment has no transcription service,
 * rather than offering a button that fails.
 */
export default function DictateButton({ onTranscript, disabled = false }) {
  const [enabled, setEnabled] = useState(false)
  const [state, setState] = useState("idle") // idle | recording | working
  const [error, setError] = useState("")
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api
      .voiceCapabilities()
      .then((caps) => !cancelled && setEnabled(Boolean(caps?.dictation)))
      .catch(() => !cancelled && setEnabled(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Releasing the microphone matters: the browser shows a recording indicator
  // for as long as the track is live, even after this component is gone.
  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const start = async () => {
    setError("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot record audio.")
      return
    }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError("Microphone access was refused.")
      return
    }
    streamRef.current = stream
    chunksRef.current = []

    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = async () => {
      stopTracks()
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      if (!blob.size) {
        setState("idle")
        return
      }
      setState("working")
      try {
        const result = await api.transcribe(blob)
        if (result?.text) onTranscript(result.text, result.language)
        else setError("Nothing was heard in that recording.")
      } catch (err) {
        setError(err?.message || "That recording could not be transcribed.")
      } finally {
        setState("idle")
      }
    }
    recorderRef.current = recorder
    recorder.start()
    setState("recording")
  }

  const stop = () => {
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  if (!enabled) return null

  const busy = state === "working"
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={disabled || busy}
        aria-label={state === "recording" ? "Stop dictating" : "Dictate the description"}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5
                    text-[12px] font-medium transition-colors duration-ui
                    disabled:opacity-50 ${
                      state === "recording"
                        ? "border-dissent/40 text-dissent bg-dissent/10"
                        : "border-line/15 hover:bg-content/5"
                    }`}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : state === "recording" ? (
          <Square size={13} />
        ) : (
          <Mic size={13} />
        )}
        {busy ? "Transcribing…" : state === "recording" ? "Stop" : "Dictate"}
      </button>

      {state === "recording" && (
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-dissent">
          <span className="w-1.5 h-1.5 rounded-full bg-dissent animate-pulse-live" />
          recording
        </span>
      )}

      {error && <span className="text-[11.5px] text-dissent">{error}</span>}
    </div>
  )
}
