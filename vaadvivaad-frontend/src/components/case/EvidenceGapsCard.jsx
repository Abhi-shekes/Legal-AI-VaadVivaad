import { Search } from "lucide-react"

/** Evidence gaps, ranked by how hard the defence actually pushed on them. */
export default function EvidenceGapsCard({ gaps }) {
  const items = gaps?.gaps || []
  if (!items.length) return null

  const tone = {
    critical: "bg-dissent/15 text-dissent",
    material: "bg-accent-solid/15 text-accent",
    minor: "bg-content/10 text-content/55",
  }

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-line/10 flex items-center gap-2.5">
        <Search size={15} className="text-accent" />
        <h3 className="font-display text-base">Evidence gaps</h3>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-content/45">{items.length}</span>
      </div>

      <ul className="divide-y divide-line/10">
        {items.map((gap, i) => (
          <li key={i} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-[13px] font-medium leading-snug">{gap.element}</p>
              <span
                className={`docket-label text-[9px] px-2 py-0.5 rounded shrink-0 ${
                  tone[String(gap.severity).toLowerCase()] || tone.minor
                }`}
              >
                {gap.severity}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-content/60 mb-2">{gap.missing}</p>
            {gap.obtain_how && (
              <p className="text-[12px] leading-relaxed text-content/45">
                <span className="font-medium">How to obtain:</span> {gap.obtain_how}
                {gap.obtain_who ? ` (${gap.obtain_who})` : ""}
                {gap.provision ? ` · ${gap.provision}` : ""}
              </p>
            )}
            {gap.exploited_in_debate && (
              <p className="text-[11px] mt-1.5 text-dissent">The defence pressed this point.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
