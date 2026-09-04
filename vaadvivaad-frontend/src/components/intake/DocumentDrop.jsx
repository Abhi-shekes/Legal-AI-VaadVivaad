import { useRef, useState } from "react"
import { FileText, Loader2, Upload } from "lucide-react"

import { UPLOAD } from "../../lib/api"

/**
 * Open a case from a document.
 *
 * `POST /user/cases/upload` has been in the backend the whole time -- it reads
 * an FIR, chargesheet, notice or bail order into the same structure the typed
 * path produces, and returns it "for correction". Nothing in the UI called it.
 *
 * The type and size checks mirror the server's so an obvious mistake is caught
 * before 12 MB goes over the wire, not after.
 */
export default function DocumentDrop({ onFile, busy, error }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const [localError, setLocalError] = useState(null)

  const accept = (file) => {
    if (!file) return
    setLocalError(null)
    if (!UPLOAD.types.includes(file.type)) {
      setLocalError("Upload a PDF, a photograph of the document, or a text file.")
      return
    }
    if (file.size > UPLOAD.maxBytes) {
      setLocalError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 12 MB.`)
      return
    }
    if (file.size === 0) {
      setLocalError("That file is empty.")
      return
    }
    onFile(file)
  }

  const message = error || localError

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          accept(e.dataTransfer.files?.[0])
        }}
        className={`rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors duration-ui ${
          over ? "border-accent-solid bg-accent-solid/5" : "border-line/15 bg-surface-sunken"
        }`}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={26} className="animate-spin text-accent" />
            <p className="text-sm font-medium">Reading the document…</p>
            <p className="text-[12.5px] text-content/50 max-w-sm">
              Pulling out the parties, the dates and every exhibit it refers to. This takes a moment.
            </p>
          </div>
        ) : (
          <>
            <div className="w-11 h-11 mx-auto rounded-lg bg-accent-solid/10 text-accent flex items-center justify-center mb-4">
              <Upload size={20} />
            </div>
            <p className="text-sm font-medium mb-1.5">Drop an FIR, chargesheet, notice or bail order</p>
            <p className="text-[12.5px] text-content/50 max-w-md mx-auto leading-relaxed mb-5">
              It is read into a case record you can correct before anything is argued. PDF, photograph
              or text, up to 12 MB.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium
                         bg-content/5 hover:bg-content/10 transition-colors duration-ui"
            >
              <FileText size={15} />
              Choose a file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={UPLOAD.accept}
              className="sr-only"
              onChange={(e) => {
                accept(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </>
        )}
      </div>

      {message && (
        <p role="alert" className="text-[12.5px] text-dissent mt-3">{message}</p>
      )}
    </div>
  )
}
