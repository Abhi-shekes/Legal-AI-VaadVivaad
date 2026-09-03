import { Search } from "lucide-react"

/** Evidence gaps, ranked by how hard the defence actually pushed on them. */
export default function EvidenceGapsCard({ gaps, dark }) {
  const items = gaps?.gaps || []
  if (!items.length) return null
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/45"
  const tone = {
    critical: "bg-dissent/15 text-dissent",
    material: "bg-brass/15 text-brass",
    minor: dark ? "bg-white/10 text-gray-400" : "bg-ink-blue/[0.07] text-ink-blue/55",
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}>
      <div className={`px-5 py-4 border-b flex items-center gap-2.5 ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
        <Search size={15} className="text-brass" />
        <h3 className="font-display text-base">Evidence gaps</h3>
        <span className={`ml-auto font-mono text-xs ${faint}`}>{items.length}</span>
      </div>
      <ul className={`divide-y ${dark ? "divide-white/[0.07]" : "divide-ink-blue/[0.07]"}`}>
        {items.map((gap, i) => (
          <li key={i} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-sm font-medium leading-snug">{gap.element}</p>
              <span className={`docket-label text-[9px] px-2 py-0.5 rounded flex-shrink-0 ${
                tone[String(gap.severity).toLowerCase()] || tone.minor
              }`}>
                {gap.severity}
              </span>
            </div>
            <p className={`text-xs leading-relaxed mb-2 ${muted}`}>{gap.missing}</p>
            {gap.obtain_how && (
              <p className={`text-xs leading-relaxed ${faint}`}>
                <span className="font-medium">How to obtain:</span> {gap.obtain_how}
                {gap.obtain_who ? ` (${gap.obtain_who})` : ""}
                {gap.provision ? ` · ${gap.provision}` : ""}
              </p>
            )}
            {gap.exploited_in_debate && (
              <p className="text-[11px] mt-1.5 text-dissent/90">The defence pressed this point.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
