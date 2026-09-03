import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertTriangle, ArrowLeft, ArrowRight, Download, FileText, Fingerprint,
  Hand, Info, LifeBuoy, Loader2, MessagesSquare,
} from "lucide-react"
import { toast } from "react-toastify"

import AppHeader from "../components/AppHeader"
import CaseAnalysisPanel from "../components/case/CaseAnalysisPanel"
import EvidenceGapsCard from "../components/case/EvidenceGapsCard"
import RulingCard from "../components/case/RulingCard"
import StrengthCard from "../components/case/StrengthCard"
import TurnCard from "../components/case/TurnCard"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import useLogout from "../hooks/useLogout"
import { useDebateSocket } from "../hooks/useDebateSocket"
import { api, ApiError } from "../lib/api"

const STAGE_LABEL = {
  connecting: "Opening the hearing",
  structuring: "Reading the case",
  researching: "Searching statute and precedent",
  arguing: "Counsel are arguing",
  ruling: "The bench is considering",
  analysing: "Auditing the record",
  done: "Concluded",
  failed: "Stopped",
}

export default function Case() {
  const { user } = useAuthStore((s) => s)
  const { theme, changeTheme } = themeStore((s) => s)
  const dark = theme === "dark"
  const handleLogout = useLogout()
  const navigate = useNavigate()

  const [incident, setIncident] = useState("")
  const [evidence, setEvidence] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [caseId, setCaseId] = useState(null)
  const [guard, setGuard] = useState(null)
  const [objection, setObjection] = useState("")
  const transcriptRef = useRef(null)

  const debate = useDebateSocket()
  const running = submitting || (caseId && !debate.concluded && debate.stage !== "failed")

  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [debate.turns, debate.streaming, debate.ruling])

  const submit = async (e) => {
    e.preventDefault()
    if (!incident.trim()) return
    setSubmitting(true)
    setGuard(null)
    try {
      const res = await api.createCase(incident, evidence)
      setGuard(res.guard)
      if (res.status === "rejected") {
        // Not an error: a routing decision. The old flow emitted an error and
        // then dropped the socket, so the only way back was a page reload.
        setSubmitting(false)
        return
      }
      setCaseId(res.debate_id)
      debate.start(res.debate_id)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not open the case."
      toast.error(message)
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (debate.concluded || debate.stage === "failed") setSubmitting(false)
  }, [debate.concluded, debate.stage])

  const sendObjection = () => {
    const text = objection.trim()
    if (!text) return
    debate.object(text)
    setObjection("")
    toast.info("Objection noted — counsel will address it.")
  }

  const reset = () => {
    setCaseId(null)
    setGuard(null)
    setIncident("")
    setEvidence("")
    debate.hydrate({
      turns: [], ruling: null, gaps: null, strength: null,
      caseDetails: null, concluded: false, stage: "idle", error: null,
    })
  }

  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/45"
  const card = dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"
  const field = dark
    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
    : "bg-parchment/50 border-ink-blue/10 text-ink-blue placeholder:text-ink-blue/30"

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
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              dark ? "text-gray-400 hover:text-white" : "text-ink-blue/60 hover:text-ink-blue"
            }`}
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10">
        <div className="mb-8">
          <p className="docket-label text-xs text-brass mb-2">New filing</p>
          <h1 className="font-display text-3xl md:text-4xl mb-2">File your case</h1>
          <p className={`text-sm md:text-base max-w-2xl ${muted}`}>
            Describe the incident and what evidence you hold. Both sides argue it from the statute and
            the precedent on record, then the bench rules.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Transcript */}
          <div className="flex-1 min-w-0 space-y-5">
            <div className={`rounded-xl border flex flex-col overflow-hidden ${card}`} style={{ height: "min(72vh, 760px)" }}>
              <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
                <div>
                  <h2 className="font-display text-lg leading-tight">Proceedings</h2>
                  <p className={`text-xs ${faint}`}>
                    {STAGE_LABEL[debate.stage] || "Awaiting filing"}
                    {debate.statusMessage ? ` — ${debate.statusMessage}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    debate.connected ? "bg-verdict animate-pulse" : dark ? "bg-gray-600" : "bg-ink-blue/20"
                  }`} />
                  <span className={`docket-label text-[10px] ${faint}`}>
                    {debate.connected ? "Live" : "Idle"}
                  </span>
                </div>
              </div>

              <div ref={transcriptRef} className={`flex-1 p-5 overflow-y-auto space-y-3 ${dark ? "bg-ink" : "bg-parchment/40"}`}>
                {!caseId && !guard && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className={`w-14 h-14 mb-4 rounded-full flex items-center justify-center ${dark ? "bg-white/5" : "bg-ink-blue/5"}`}>
                      <MessagesSquare size={24} className={faint} />
                    </div>
                    <h3 className="font-display text-lg mb-1.5">Ready for proceedings</h3>
                    <p className={`text-sm max-w-xs ${muted}`}>Submit your case to open the session.</p>
                  </div>
                )}

                {guard && guard.decision !== "in_scope" && (
                  <div className={`rounded-lg border p-4 ${
                    guard.welfare ? "border-dissent/40 bg-dissent/5" : dark ? "border-white/10 bg-white/[0.03]" : "border-brass/30 bg-brass/5"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {guard.welfare ? <LifeBuoy size={15} className="text-dissent" /> : <Info size={15} className="text-brass" />}
                      <p className="text-sm font-medium">
                        {guard.welfare ? "Support comes first" : "Outside what this service argues"}
                      </p>
                    </div>
                    <p className={`text-sm leading-relaxed ${muted}`}>{guard.reason}</p>
                    {guard.suggestion && <p className={`text-sm leading-relaxed mt-2 ${muted}`}>{guard.suggestion}</p>}
                    {guard.welfare && (guard.helplines || []).length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {guard.helplines.map((h) => (
                          <li key={h.number} className="text-sm">
                            <span className="font-medium">{h.name}</span>
                            <span className="font-mono ml-2 text-dissent">{h.number}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {debate.turns.map((t) => (
                  <TurnCard key={t.index} turn={t} dark={dark} />
                ))}
                {debate.streaming && <TurnCard turn={debate.streaming} streaming dark={dark} />}

                {debate.error && (
                  <div className="rounded-lg border border-dissent/40 bg-dissent/5 p-4 flex gap-2.5">
                    <AlertTriangle size={15} className="text-dissent flex-shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">{debate.error}</p>
                  </div>
                )}

                {debate.ruling && <RulingCard ruling={debate.ruling} dark={dark} />}
              </div>

              {caseId && !debate.concluded && debate.stage !== "failed" && (
                <div className={`px-5 py-3 border-t flex gap-2 ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
                  <input
                    value={objection}
                    onChange={(e) => setObjection(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendObjection()}
                    placeholder="Object — add a fact or challenge a point…"
                    className={`flex-1 rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-brass ${field}`}
                  />
                  <button
                    onClick={sendObjection}
                    disabled={!objection.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-brass/15 text-brass disabled:opacity-40"
                  >
                    <Hand size={14} />
                    Object
                  </button>
                </div>
              )}
            </div>

            {debate.gaps && <EvidenceGapsCard gaps={debate.gaps} dark={dark} />}
            {debate.strength && <StrengthCard strength={debate.strength} dark={dark} />}
          </div>

          {/* Side column */}
          <div className="w-full xl:w-96 flex-shrink-0 space-y-5">
            {!caseId ? (
              <div className={`rounded-xl border overflow-hidden sticky top-24 ${card}`}>
                <div className={`px-5 py-4 border-b ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
                  <p className="docket-label text-[11px] text-brass mb-1">New filing</p>
                  <h2 className="font-display text-lg">Your case</h2>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                  <div>
                    <label htmlFor="incident" className={`flex items-center gap-2 text-xs font-medium mb-2 ${muted}`}>
                      <FileText size={13} className="text-brass" />
                      What happened
                    </label>
                    <textarea
                      id="incident"
                      value={incident}
                      onChange={(e) => setIncident(e.target.value)}
                      rows={7}
                      required
                      placeholder="Describe the incident — what happened, roughly when, where, and who was involved."
                      className={`w-full rounded-lg px-3.5 py-2.5 text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-brass ${field}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="evidence" className={`flex items-center gap-2 text-xs font-medium mb-2 ${muted}`}>
                      <Fingerprint size={13} className="text-brass" />
                      Evidence you have
                    </label>
                    <textarea
                      id="evidence"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      rows={5}
                      placeholder="Documents, photographs, recordings, witnesses — and say which of them you actually hold."
                      className={`w-full rounded-lg px-3.5 py-2.5 text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-brass ${field}`}
                    />
                    <p className={`text-[11px] mt-1.5 ${faint}`}>
                      Each item is argued over specifically, so be concrete.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !incident.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 bg-brass text-ink font-semibold py-3 rounded-full text-sm transition-all hover:bg-brass/90 disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 size={15} className="animate-spin" />Opening…</>
                    ) : (
                      <>Begin the hearing<ArrowRight size={15} /></>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="sticky top-24 space-y-5">
                <CaseAnalysisPanel details={debate.caseDetails} dark={dark} />

                {(debate.concluded || debate.stage === "failed") && (
                  <div className={`rounded-xl border p-5 space-y-3 ${card}`}>
                    <a
                      href={api.briefUrl(caseId, "pdf")}
                      className="w-full inline-flex items-center justify-center gap-2 bg-brass text-ink font-semibold py-2.5 rounded-full text-sm hover:bg-brass/90"
                    >
                      <Download size={15} />
                      Download case brief
                    </a>
                    <div className="flex gap-2">
                      <a
                        href={api.briefUrl(caseId, "docx")}
                        className={`flex-1 text-center py-2 rounded-full text-xs font-medium border ${
                          dark ? "border-white/15 hover:bg-white/5" : "border-ink-blue/15 hover:bg-ink-blue/5"
                        }`}
                      >
                        DOCX
                      </a>
                      <button
                        onClick={() => navigate(`/case/${caseId}`)}
                        className={`flex-1 py-2 rounded-full text-xs font-medium border ${
                          dark ? "border-white/15 hover:bg-white/5" : "border-ink-blue/15 hover:bg-ink-blue/5"
                        }`}
                      >
                        Open record
                      </button>
                    </div>
                    <button onClick={reset} className={`w-full text-xs ${muted} hover:underline`}>
                      File another case
                    </button>
                    {debate.tokens && (
                      <p className={`text-[10px] font-mono text-center ${faint}`}>
                        {debate.tokens.total_tokens?.toLocaleString()} tokens · {debate.tokens.calls} calls
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
