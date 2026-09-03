import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { io } from "socket.io-client"
import { ArrowLeft } from "lucide-react"
import CaseForm from "../components/case/CaseForm"
import DebateChat from "../components/case/DebateChat"
import AppHeader from "../components/AppHeader"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import useLogout from "../hooks/useLogout"

const Case = () => {
  // State
  const { user } = useAuthStore((state) => state)
  const { theme, changeTheme } = themeStore((state) => state)
  const dark = theme === "dark"
  const handleLogout = useLogout()
  const [incident, setIncident] = useState("")
  const [evidence, setEvidence] = useState("")
  const [messages, setMessages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [typingState, setTypingState] = useState({ isTyping: false, role: "" })
  const [isDebateConcluded, setIsDebateConcluded] = useState(false)
  const [debateData, setDebateData] = useState(null)

  // Refs
  const socket = useRef(null)
  const sessionId = useRef(Math.floor(1000000000 + Math.random() * 9000000000).toString())
  const initialCaseDetails = useRef(null)
  const debateOutputRef = useRef(null)

  // Effects
  useEffect(() => {
    if (debateOutputRef.current) {
      debateOutputRef.current.scrollTop = debateOutputRef.current.scrollHeight
    }
  }, [messages, typingState])

  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.disconnect()
      }
    }
  }, [])

  const addMessage = (newMessage) => {
    setMessages((prev) => [...prev, { ...newMessage, timestamp: new Date().toLocaleTimeString() }])
  }

  const handleSaveDebate = async () => {
    if (!debateData) {
      addMessage({ type: "error", message: "No debate data available to save." })
      return
    }

    setIsSubmitting(true)
    addMessage({ type: "status", message: "Saving debate to database...", status: "loading", title: "Saving" })

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/save-debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debate_history: debateData.debate_history,
          ipc_section: debateData.ipc_section,
          similar_case: debateData.similar_case,
          user_id: user?.email || "",
        }),
        credentials: "include"
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Failed to save debate to database.")
      }

      addMessage({ type: "status", message: "Debate saved successfully!", status: "success", title: "Saved" })
      // Reset state for new case
      setIsDebateConcluded(false)
      setDebateData(null)
      setIncident("")
      setEvidence("")
      setMessages([])
      sessionId.current = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    } catch (error) {
      addMessage({ type: "error", message: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Form submit handler
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (isDebateConcluded) {
      await handleSaveDebate()
      return
    }

    if (!incident || !evidence) {
      addMessage({ type: "error", message: "Please fill out both the incident description and evidence fields." })
      return
    }

    setIsSubmitting(true)
    setMessages([])
    if (socket.current) {
      socket.current.disconnect()
    }

    addMessage({ type: "status", message: "Submitting case details...", status: "loading", title: "Initializing" })

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/start-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_description: incident,
          evidence: evidence,
          session_id: sessionId.current,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Failed to initialize case on server.")
      }

      addMessage({ type: "status", message: "Connecting to debate server...", status: "loading", title: "Connecting" })

      const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
      socket.current = io(socketUrl, { transports: ["websocket"] })

      socket.current.on("connect", () => {
        setIsConnected(true)
        setTypingState({ isTyping: false, role: "" })
        socket.current.emit("join_room", { session_id: sessionId.current })
        socket.current.emit("start_debate_flow", { session_id: sessionId.current })
        addMessage({
          type: "status",
          message: "Connected! Waiting for debate to begin...",
          status: "success",
          title: "Success",
        })
      })

      socket.current.on("disconnect", () => setIsConnected(false))
      socket.current.on("error", (data) => addMessage({ type: "error", message: data.message }))
      socket.current.on("case_details", (data) => {
        initialCaseDetails.current = data
      })
      socket.current.on("typing", (data) => setTypingState({ isTyping: true, role: data.role }))

      socket.current.on("new_argument", (data) => {
        setTypingState({ isTyping: false, role: "" })
        if (data.round === 0 && initialCaseDetails.current) {
          addMessage({ type: "initial_response", argument: data.argument, ...initialCaseDetails.current })
          initialCaseDetails.current = null
        } else {
          addMessage({ type: "debate_response", ...data })
        }
      })

      socket.current.on("debate_concluded", (data) => {
        setTypingState({ isTyping: false, role: "" })
        console.log("Debate History:", data)
        setDebateData({
          debate_history: data.debate_history,
          ipc_section: data.ipc_section,
          similar_case: data.similar_case,
        })
        setIsDebateConcluded(true)
        addMessage({ type: "debate_concluded", ...data })
        setIsSubmitting(false)
        socket.current.disconnect()
      })

      socket.current.on("debate_failed", (data) => {
        setTypingState({ isTyping: false, role: "" })
        setIsDebateConcluded(true)
        addMessage({ type: "debate_failed", ...data })
        setIsSubmitting(false)
        socket.current.disconnect()
      })

    } catch (error) {
      addMessage({ type: "error", message: error.message })
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`min-h-screen ${dark ? "bg-ink text-white" : "bg-parchment text-ink-blue"}`}>
      <AppHeader
        dark={dark}
        changeTheme={changeTheme}
        user={user}
        onLogout={handleLogout}
        center={
          <Link
            to="/user/dashboard"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${dark ? "text-gray-400 hover:text-white" : "text-ink-blue/60 hover:text-ink-blue"}`}
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-12">
        <div className="mb-8">
          <p className="docket-label text-xs text-brass mb-2">New filing</p>
          <h1 className="font-display text-3xl md:text-4xl mb-2">File your case</h1>
          <p className={`text-sm md:text-base max-w-2xl ${dark ? "text-gray-400" : "text-ink-blue/60"}`}>
            Describe the incident and evidence — the record gets searched for the relevant IPC section and
            precedent, then both sides argue it out.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          <DebateChat
            messages={messages}
            isSubmitting={isSubmitting}
            isConnected={isConnected}
            typingState={typingState}
            debateOutputRef={debateOutputRef}
            dark={dark}
          />

          <CaseForm
            incident={incident}
            setIncident={setIncident}
            evidence={evidence}
            setEvidence={setEvidence}
            isSubmitting={isSubmitting}
            isDebateConcluded={isDebateConcluded}
            handleSubmit={handleFormSubmit}
            dark={dark}
          />
        </div>
      </main>
    </div>
  )
}

export default Case;
