import { Gavel, AlertTriangle } from "lucide-react"

/**
 * The Bench's order.
 *
 * The old UI titled its final card "Final verdict" and rendered a dump of the
 * debate history — there was no ruling to show. Confidence is displayed as a
 * bar with its own caveat because a number without its basis is worse than no
 * number.
 */
export default function RulingCard({ ruling, dark }) {
  if (!ruling) return null
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/45"
  const pct = Math.round((ruling.confidence ?? 0) * 100)
  const band =
    pct >= 70 ? "text-verdict" : pct >= 45 ? "text-brass" : "text-dissent"
  const bandLabel =
    pct >= 70 ? "Firm on this record" : pct >= 45 ? "Ordinary balance" : "Record is thin"

  return (
    <div className={`rounded-xl border overflow-hidden ${dark ? "bg-white/[0.04] border-brass/30" : "bg-white border-brass/30 shadow-sm"}`}>
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 border-brass/20">
        <div className="flex items-center gap-2.5">
          <Gavel size={16} className="text-brass" />
          <h3 className="font-display text-base">Order of the bench</h3>
        </div>
        <span className={`docket-label text-[10px] px-2 py-0.5 rounded ${
          ruling.favoured_side === "prosecution" ? "bg-verdict/15 text-verdict" : "bg-dissent/15 text-dissent"
        }`}>
          favours {ruling.favoured_side}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="docket-label text-[10px] text-brass mb-1.5">Decisive issue</p>
          <p className="text-sm leading-relaxed">{ruling.decisive_issue}</p>
        </div>

        <div>
          <p className="docket-label text-[10px] text-brass mb-1.5">Disposition</p>
          <p className="text-sm leading-relaxed">{ruling.disposition}</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="docket-label text-[10px] text-brass">Confidence</p>
            <span className={`font-mono text-sm ${band}`}>{pct}%</span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-ink-blue/10"}`}>
            <div
              className={`h-full rounded-full ${pct >= 70 ? "bg-verdict" : pct >= 45 ? "bg-brass" : "bg-dissent"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`text-[11px] mt-1.5 ${faint}`}>{bandLabel}</p>
        </div>

        {(ruling.would_change_if || []).length > 0 && (
          <div className={`rounded-lg p-3.5 ${dark ? "bg-white/[0.04]" : "bg-parchment/60"}`}>
            <p className="docket-label text-[10px] text-brass mb-2">What would change this</p>
            <ul className="space-y-1.5">
              {ruling.would_change_if.map((item, i) => (
                <li key={i} className={`text-xs leading-relaxed flex gap-2 ${muted}`}>
                  <span className="text-brass mt-0.5">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(ruling.findings || []).length > 0 && (
          <div>
            <p className="docket-label text-[10px] text-brass mb-2">Findings</p>
            <ul className="space-y-2">
              {ruling.findings.map((f, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  <span className="font-medium">{f.issue}</span>
                  <span className={muted}> — {f.resolution}</span>
                  <span className={`ml-1.5 font-mono text-[10px] ${
                    f.favoured === "prosecution" ? "text-verdict" : "text-dissent"
                  }`}>({f.favoured})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className={`text-[11px] leading-relaxed flex gap-2 pt-1 ${faint}`}>
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>
            Generated analysis for study and research. Not legal advice, and not reviewed by an advocate.
          </span>
        </p>
      </div>
    </div>
  )
}
