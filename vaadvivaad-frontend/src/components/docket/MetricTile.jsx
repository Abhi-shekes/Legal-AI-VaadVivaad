/**
 * The four figures at the top of the docket.
 *
 * Each carries a mark, not just a number: a sparkline of filings, a split bar
 * of how the bench leaned, a confidence meter. A bare count answers nothing on
 * its own -- the shape beside it is what makes the figure readable at a glance.
 *
 * These are the only big-number tiles on the page, because these figures are
 * the point of the summary row.
 */

export function MetricTile({ label, value, unit, children, hint }) {
  return (
    <div className="rounded-lg border border-line/10 bg-surface p-4 lg:p-5 elev-1">
      <p className="docket-label text-[10px] text-content/45">{label}</p>
      <p className="font-display text-3xl lg:text-[2.5rem] leading-none mt-2 mb-3 tabular-nums">
        {value}
        {unit && <span className="text-base text-content/45 ml-1.5 font-sans">{unit}</span>}
      </p>
      {children}
      {hint && <p className="text-[11px] text-content/45 mt-2">{hint}</p>}
    </div>
  )
}

/** Filings per month. Drawn to the scale: the tallest bar is the busiest month,
 *  and the last bar is emphasised because it is the one in progress. */
export function Sparkbars({ data }) {
  const peak = Math.max(1, ...data.map((d) => d.count))
  return (
    <div
      className="flex items-end gap-1 h-8"
      role="img"
      aria-label={data.map((d) => `${d.label}: ${d.count}`).join(", ")}
    >
      {data.map((d, i) => (
        <div key={d.key} className="flex-1 flex flex-col justify-end h-full" title={`${d.label}: ${d.count}`}>
          <div
            className={`w-full rounded-sm ${i === data.length - 1 ? "bg-accent-solid" : "bg-content/15"}`}
            style={{ height: `${Math.max(6, (d.count / peak) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  )
}

/** How the bench leaned. Prosecution and defence carry the semantic colours the
 *  transcript already uses, so the bar reads without a legend. */
export function SplitBar({ prosecution, defence }) {
  const total = prosecution + defence
  if (!total) {
    return <p className="text-[11px] text-content/45">No matter has reached a ruling yet.</p>
  }
  const pct = (prosecution / total) * 100
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-content/10">
        <div className="bg-verdict" style={{ width: `${pct}%` }} />
        <div className="bg-dissent" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-[11px] font-mono tabular-nums">
        <span className="text-verdict">{prosecution} prosecution</span>
        <span className="text-dissent">{defence} defence</span>
      </div>
    </div>
  )
}

/** A five-segment meter. Segments rather than a continuous bar because the
 *  underlying confidence is not precise enough to justify a smooth reading. */
export function ConfidenceMeter({ value, segments = 5, className = "" }) {
  if (typeof value !== "number") {
    return <span className="text-content/40 font-mono text-[11px]">—</span>
  }
  const lit = Math.round(value * segments)
  const tone = value >= 0.66 ? "bg-verdict" : value >= 0.4 ? "bg-accent-solid" : "bg-dissent"
  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="img"
      aria-label={`Confidence ${(value * 100).toFixed(0)} percent`}
    >
      <div className="flex gap-0.5">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={`w-1.5 h-3.5 rounded-sm ${i < lit ? tone : "bg-content/15"}`} />
        ))}
      </div>
      <span className="font-mono text-[11px] tabular-nums text-content/60">{value.toFixed(2)}</span>
    </div>
  )
}
