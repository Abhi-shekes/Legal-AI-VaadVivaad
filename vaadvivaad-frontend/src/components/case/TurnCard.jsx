import { AlertTriangle, BookOpen, Gavel, ShieldCheck } from "lucide-react"

/**
 * One turn of the hearing.
 *
 * Streaming turns render the same shape as committed ones with a caret, so
 * text does not jump when the turn completes. Citations are shown as the
 * verified authorities they resolved to; if anything was stripped by the
 * citation check, the card says so rather than quietly showing shortened text.
 */
export default function TurnCard({ turn, streaming = false, dark }) {
  const isProsecution = turn.side === "prosecution"
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/45"
  const Icon = isProsecution ? ShieldCheck : Gavel
  const accent = isProsecution ? "border-verdict" : "border-dissent"
  const iconWrap = isProsecution ? "bg-verdict/15 text-verdict" : "bg-dissent/15 text-dissent"

  const content = turn.turn || {}
  const body = streaming ? turn.text : content.argument
  const citations = turn.citations || []

  return (
    <div
      className={`rounded-lg border border-l-4 ${accent} p-4 ${
        dark ? "bg-white/[0.03] border-y-white/10 border-r-white/10" : "bg-white border-y-ink-blue/10 border-r-ink-blue/10 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
          <Icon size={13} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">
            {isProsecution ? "Prosecution" : "Defence"} counsel
          </p>
          <p className={`docket-label text-[10px] ${faint}`}>
            Round {turn.round} · {turn.phase}
          </p>
        </div>
        {turn.claim_id && (
          <span className={`ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded ${
            dark ? "bg-white/10 text-gray-400" : "bg-ink-blue/[0.06] text-ink-blue/50"
          }`}>
            {turn.claim_id}
          </span>
        )}
      </div>

      {content.headline && !streaming && (
        <p className="text-sm font-medium leading-snug mb-1.5">{content.headline}</p>
      )}

      <p className={`text-sm leading-relaxed ${muted}`}>
        {body}
        {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-brass/70 align-text-bottom animate-pulse" />}
      </p>

      {!streaming && content.element_addressed && (
        <p className={`text-[11px] mt-2 ${faint}`}>
          Goes to: <span className="font-medium">{content.element_addressed}</span>
        </p>
      )}

      {citations.length > 0 && (
        <div className={`mt-3 pt-3 border-t ${dark ? "border-white/10" : "border-ink-blue/[0.08]"}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen size={11} className="text-brass" />
            <span className="docket-label text-[9px] text-brass">Relies on</span>
          </div>
          <ul className="space-y-1">
            {citations.map((c) => (
              <li key={c.citation_id} className="text-[11px] leading-snug">
                <span className="font-medium">{c.case_name}</span>
                {c.court && <span className={faint}> · {c.court}</span>}
                {c.source_url && (
                  <a href={c.source_url} target="_blank" rel="noreferrer" className="text-brass ml-1.5">
                    read
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(turn.unsupported || []).length > 0 && (
        <p className="text-[11px] mt-2.5 text-dissent/90 flex gap-1.5">
          <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
          <span>
            An authority that is not in the retrieved record was removed from this submission.
          </span>
        </p>
      )}
    </div>
  )
}
