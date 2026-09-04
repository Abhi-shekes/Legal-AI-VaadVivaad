import { useState } from "react"
import { ChevronDown, History } from "lucide-react"

/**
 * Orders this hearing has superseded.
 *
 * A revised verdict that quietly replaces the previous one would be worse than
 * not revising at all -- the user watched the first order being made and is
 * entitled to see what changed. Collapsed by default, because the current
 * order is the answer; expandable, because the change is the interesting part.
 */
export default function PriorRulings({ rulings = [] }) {
  const [open, setOpen] = useState(false)
  if (!rulings.length) return null

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-content/5
                   transition-colors duration-ui"
      >
        <History size={14} className="text-content/45 shrink-0" />
        <span className="text-[13px] font-medium">
          {rulings.length === 1 ? "One earlier order" : `${rulings.length} earlier orders`}
        </span>
        <span className="text-[12px] text-content/45">superseded by further submissions</span>
        <ChevronDown
          size={15}
          className={`ml-auto shrink-0 text-content/40 transition-transform duration-ui ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ol className="divide-y divide-line/10 border-t border-line/10">
          {rulings.map((r, i) => (
            <li key={i} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="docket-label text-[9px] text-content/40">
                  Order {i + 1}
                </span>
                <span
                  className={`docket-label text-[9px] px-2 py-0.5 rounded-full ${
                    r.favoured_side === "prosecution"
                      ? "bg-verdict/15 text-verdict"
                      : "bg-dissent/15 text-dissent"
                  }`}
                >
                  favoured {r.favoured_side}
                </span>
                <span className="font-mono text-[10px] text-content/40 tabular-nums ml-auto">
                  {Math.round((r.confidence ?? 0) * 100)}%
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-content/70">
                <span className="text-content/45">Decisive issue: </span>
                {r.decisive_issue}
              </p>
              <p className="text-[12.5px] leading-relaxed text-content/70 mt-1">
                <span className="text-content/45">Disposition: </span>
                {r.disposition}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
