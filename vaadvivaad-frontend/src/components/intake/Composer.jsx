import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, FileStack, FileText, Loader2, PenLine, Upload } from "lucide-react"
import { toast } from "react-toastify"

import DocumentDrop from "./DocumentDrop"
import DictateButton from "./DictateButton"
import EvidenceChips from "./EvidenceChips"
import ExtractionReview from "./ExtractionReview"
import ReadinessMeter from "./ReadinessMeter"
import { EXAMPLE_FILINGS, evidenceToText } from "../../lib/filings"
import { api, ApiError } from "../../lib/api"

const DRAFT_KEY = "vv-case-draft"

const TABS = [
  { id: "describe", label: "Describe it", icon: PenLine },
  { id: "upload", label: "Upload a document", icon: Upload },
  { id: "template", label: "Start from a template", icon: FileStack },
]

/**
 * Intake.
 *
 * The form this replaces was a 384px sidebar holding two textareas, which is
 * indistinguishable from a contact form and gave no sense of what a good filing
 * contains. Three routes in now share the full width of the page, and the draft
 * survives a refresh -- which it previously did not.
 */
export default function Composer({ prefill, onOpened }) {
  const [tab, setTab] = useState("describe")
  const [incident, setIncident] = useState("")
  const [evidence, setEvidence] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [extraction, setExtraction] = useState(null)

  const editorRef = useRef(null)
  const restored = useRef(false)

  const applyFilling = (filling) => {
    setIncident(filling.incident)
    setEvidence(filling.evidence.map((e) => ({ ...e })))
    setTab("describe")
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  // A filing handed over from the empty docket's examples.
  useEffect(() => {
    if (prefill) applyFilling(prefill)
  }, [prefill])

  // Restore a draft. The old form lost everything typed on a refresh.
  useEffect(() => {
    if (restored.current || prefill) {
      restored.current = true
      return
    }
    restored.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.incident) setIncident(draft.incident)
      if (Array.isArray(draft.evidence)) setEvidence(draft.evidence)
    } catch {
      /* a corrupt draft is not worth surfacing -- start clean */
    }
  }, [prefill])

  // Save it back, debounced.
  useEffect(() => {
    if (!restored.current) return
    const id = setTimeout(() => {
      try {
        if (!incident.trim() && !evidence.length) localStorage.removeItem(DRAFT_KEY)
        else {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ incident, evidence }))
          setSavedAt(new Date())
        }
      } catch {
        /* drafts are a convenience; failing to store one changes nothing */
      }
    }, 600)
    return () => clearTimeout(id)
  }, [incident, evidence])

  // Auto-grow, so a long filing is not typed through a seven-row window.
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.max(240, el.scrollHeight)}px`
  }, [incident, tab])

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* nothing to clean up */
    }
  }

  const file = async (e) => {
    e?.preventDefault()
    if (!incident.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await api.createCase(incident, evidenceToText(evidence))
      clearDraft()
      onOpened(res)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "The case could not be opened.")
      setSubmitting(false)
    }
  }

  const upload = async (chosen) => {
    setUploading(true)
    setUploadError(null)
    try {
      const res = await api.uploadCase(chosen)
      if (res.status === "rejected") {
        onOpened(res)
        return
      }
      setExtraction(res)
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "That document could not be read.")
    } finally {
      setUploading(false)
    }
  }

  // Editing means filing fresh, so the case the upload already opened is
  // discarded rather than left sitting in the docket half-formed.
  const editExtraction = async () => {
    const parsed = extraction?.extracted || {}
    const lines = [parsed.summary]
    if (parsed.incident_date) lines.push(`Date of incident: ${parsed.incident_date}`)
    if (parsed.location) lines.push(`Location: ${parsed.location}`)
    if (parsed.parties?.length) {
      lines.push(`Parties: ${parsed.parties.map((p) => [p.role, p.name].filter(Boolean).join(" — ")).join("; ")}`)
    }
    setIncident(lines.filter(Boolean).join("\n"))
    setEvidence((parsed.evidence || []).map((i) => ({ text: i.description, held: !!i.in_possession })))
    const abandoned = extraction?.debate_id
    setExtraction(null)
    setTab("describe")
    requestAnimationFrame(() => editorRef.current?.focus())
    if (abandoned) {
      try {
        await api.deleteCase(abandoned)
      } catch {
        /* the half-formed case is harmless if it lingers */
      }
    }
  }

  const words = useMemo(() => incident.trim().split(/\s+/).filter(Boolean).length, [incident])

  if (extraction) {
    return (
      <div className="max-w-3xl">
        <ExtractionReview
          extracted={extraction.extracted}
          kind={extraction.document_kind}
          onEdit={editExtraction}
          onConfirm={() => onOpened(extraction)}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
      <div className="xl:col-span-8 min-w-0">
        {/* Routes in */}
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-content/5 mb-5 w-fit" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded text-[13px] font-medium
                          transition-colors duration-ui ${
                            tab === id
                              ? "bg-surface text-content elev-1"
                              : "text-content/55 hover:text-content"
                          }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === "describe" && (
          <form onSubmit={file} className="space-y-6">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="incident" className="text-[13px] font-medium">
                  What happened
                </label>
                <div className="flex items-center gap-3">
                  <DictateButton
                    disabled={submitting}
                    onTranscript={(text) =>
                      // Appended, not substituted: people dictate, correct,
                      // then dictate more, and replacing the box would throw
                      // away the edit they just made.
                      setIncident((prev) => (prev ? `${prev.trim()}\n\n${text}` : text))
                    }
                  />
                  <span className="font-mono text-[11px] text-content/35 tabular-nums">
                    {words} {words === 1 ? "word" : "words"}
                    {savedAt && ` · draft saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </span>
                </div>
              </div>
              <textarea
                id="incident"
                ref={editorRef}
                value={incident}
                onChange={(e) => setIncident(e.target.value)}
                required
                placeholder="What happened, roughly when and where, who was involved, and what the harm or loss was. Plain language is fine — no formatting required."
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") file(e)
                }}
                className="w-full rounded-lg px-4 py-3.5 text-[14px] leading-relaxed bg-surface border border-line/10
                           placeholder:text-content/30 focus:outline-none focus:border-accent-solid
                           transition-colors duration-ui resize-none"
                style={{ minHeight: 240 }}
              />
              <p className="text-[11px] text-content/40 mt-2">
                <kbd className="font-mono border border-line/15 rounded px-1">⌘</kbd>
                {" + "}
                <kbd className="font-mono border border-line/15 rounded px-1">↵</kbd>
                {" to file."}
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-2">Evidence you have</label>
              <EvidenceChips items={evidence} onChange={setEvidence} />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || !incident.trim()}
                className="inline-flex items-center gap-2 bg-accent-solid text-accent-on font-semibold
                           py-3 px-6 rounded-lg text-sm hover:brightness-105 disabled:opacity-50
                           transition-all duration-ui"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" />Opening the hearing…</>
                ) : (
                  <>Begin the hearing<ArrowRight size={16} /></>
                )}
              </button>
              {(incident || evidence.length > 0) && !submitting && (
                <button
                  type="button"
                  onClick={() => {
                    setIncident("")
                    setEvidence([])
                    clearDraft()
                    setSavedAt(null)
                  }}
                  className="text-[13px] text-content/45 hover:text-content transition-colors duration-ui"
                >
                  Clear the draft
                </button>
              )}
            </div>
          </form>
        )}

        {tab === "upload" && (
          <DocumentDrop onFile={upload} busy={uploading} error={uploadError} />
        )}

        {tab === "template" && (
          <div className="grid sm:grid-cols-3 gap-4">
            {EXAMPLE_FILINGS.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => applyFilling(example)}
                className="group text-left rounded-lg border border-line/10 bg-surface p-5 elev-1
                           hover:border-accent-solid/40 hover:elev-2 transition-all duration-ui ease-ui"
              >
                <p className="docket-label text-[10px] text-accent mb-2">{example.tag}</p>
                <p className="font-medium text-[14px] mb-2">{example.title}</p>
                <p className="text-[12.5px] text-content/55 leading-relaxed line-clamp-4">
                  {example.incident}
                </p>
                <span className="inline-flex items-center gap-1 text-[12px] text-accent mt-3">
                  Use as a starting point
                  <ArrowRight size={12} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rail */}
      <aside className="xl:col-span-4 space-y-4">
        {tab === "describe" && <ReadinessMeter text={incident} />}

        <div className="rounded-lg border border-line/10 bg-surface p-5 elev-1">
          <p className="docket-label text-[10px] text-content/40 mb-3">What happens when you file</p>
          <ol className="space-y-2.5">
            {[
              ["Intake", "Your account of it is structured."],
              ["Retrieval", "Statute and precedent are searched and verified."],
              ["Argument", "Both sides exchange rounds, live."],
              ["Ruling", "The bench decides, and says what would change it."],
              ["Audit", "Evidence gaps and case strength are scored."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="font-mono text-[10px] text-content/35 pt-1 w-4 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-[12.5px] font-medium">{title}</span>
                  <span className="block text-[11.5px] text-content/50 leading-relaxed">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-line/10 bg-surface p-5 elev-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-accent" />
            <p className="docket-label text-[10px] text-content/40">Be specific</p>
          </div>
          <p className="text-[12.5px] text-content/60 leading-relaxed">
            Each item of evidence is argued over by name, and the bench weighs what you hold against
            what you only refer to. Vague filings produce vague hearings.
          </p>
        </div>
      </aside>
    </div>
  )
}
