import { FileText, Fingerprint, Loader2, Save, ArrowRight } from "lucide-react"

const CaseForm = ({
  incident,
  setIncident,
  evidence,
  setEvidence,
  isSubmitting,
  isDebateConcluded,
  handleSubmit,
  dark,
}) => {
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/50"

  return (
    <div className="w-full xl:w-96 flex-shrink-0">
      <div className={`rounded-xl border sticky top-24 overflow-hidden ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}>
        <div className={`px-6 py-5 border-b ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
          <p className="docket-label text-[11px] text-brass mb-1.5">New filing</p>
          <h2 className="font-display text-xl">File your case</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="incident_description" className={`flex items-center gap-2 text-xs font-medium mb-2 ${muted}`}>
              <FileText size={14} className="text-brass" />
              Incident description
            </label>
            <textarea
              id="incident_description"
              value={incident}
              onChange={(e) => setIncident(e.target.value)}
              rows={6}
              required
              disabled={isDebateConcluded}
              placeholder="Describe the incident in detail — what happened, who was involved, and the sequence of events…"
              className={`w-full rounded-lg px-4 py-3 text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-brass disabled:opacity-50 ${dark
                ? "bg-white/5 border border-white/10 text-white placeholder:text-gray-500"
                : "bg-parchment/50 border border-ink-blue/10 text-ink-blue placeholder:text-ink-blue/30"
                }`}
            />
          </div>

          <div>
            <label htmlFor="evidence" className={`flex items-center gap-2 text-xs font-medium mb-2 ${muted}`}>
              <Fingerprint size={14} className="text-brass" />
              Supporting evidence
            </label>
            <textarea
              id="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={6}
              required
              disabled={isDebateConcluded}
              placeholder="List documents, witness statements, physical evidence, or other supporting material…"
              className={`w-full rounded-lg px-4 py-3 text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-brass disabled:opacity-50 ${dark
                ? "bg-white/5 border border-white/10 text-white placeholder:text-gray-500"
                : "bg-parchment/50 border border-ink-blue/10 text-ink-blue placeholder:text-ink-blue/30"
                }`}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-brass text-ink font-semibold py-3.5 rounded-full text-sm shadow-[0_0_30px_-8px_rgba(199,160,70,0.6)] transition-all hover:bg-brass/90 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing…
              </>
            ) : isDebateConcluded ? (
              <>
                <Save size={16} />
                Save case
              </>
            ) : (
              <>
                Begin the debate
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className={`text-[11px] text-center leading-relaxed ${faint}`}>
            Grounded in IPC search and precedent — argued from both sides.
          </p>
        </form>
      </div>
    </div>
  )
}

export default CaseForm
