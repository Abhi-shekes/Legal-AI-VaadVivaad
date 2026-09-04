import { useEffect, useRef, useState } from "react"
import { FileStack, Loader2, Upload } from "lucide-react"

import { api, UPLOAD } from "../../lib/api"

/**
 * The documents filed in a matter.
 *
 * A case is rarely one document. Everything added here is chunked and indexed
 * against this case only, so counsel can quote the chargesheet during the
 * hearing instead of arguing from a summary of it.
 */
export default function CaseFilePanel({ caseId }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef(null)

  const load = async () => {
    try {
      const data = await api.caseDocuments(caseId)
      setDocuments(data?.documents || [])
    } catch {
      // A missing case file is not an error worth shouting about; the panel
      // simply shows nothing to upload against yet.
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  const onPick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (file.size > UPLOAD.maxBytes) {
      setError(`That file is larger than ${Math.round(UPLOAD.maxBytes / 1048576)} MB.`)
      return
    }

    setBusy(true)
    setError("")
    try {
      await api.addCaseDocument(caseId, file)
      await load()
    } catch (err) {
      setError(err?.message || "That file could not be added.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-line/10 flex items-center gap-2.5">
        <FileStack size={15} className="text-accent" />
        <h3 className="font-display text-base">Case file</h3>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-content/45">
          {documents.length}
        </span>
      </div>

      {loading ? (
        <p className="px-5 py-6 font-mono text-[11.5px] text-content/40">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="px-5 py-5 text-[12.5px] leading-relaxed text-content/55">
          Nothing filed yet. Add the FIR, chargesheet, statements or medical
          report and counsel can quote them directly.
        </p>
      ) : (
        <ul className="divide-y divide-line/10">
          {documents.map((doc) => (
            <li key={doc.document_id} className="px-5 py-3 flex items-baseline gap-3">
              <span className="text-[13px] truncate flex-1">{doc.filename}</span>
              <span className="docket-label text-[9px] px-1.5 py-0.5 rounded bg-content/10 text-content/55 shrink-0">
                {doc.kind}
              </span>
              <span className="font-mono text-[10.5px] tabular-nums text-content/40 shrink-0">
                {doc.chunks}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="px-5 py-4 border-t border-line/10">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border
                     border-line/15 px-4 py-2 text-[12.5px] font-medium
                     hover:bg-content/5 disabled:opacity-50 transition-colors duration-ui"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {busy ? "Reading the document…" : "Add a document"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD.accept}
          onChange={onPick}
          className="sr-only"
        />
        {error && <p className="mt-2 text-[12px] text-dissent">{error}</p>}
      </div>
    </div>
  )
}
