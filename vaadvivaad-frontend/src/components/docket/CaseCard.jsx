import { Link } from "react-router-dom"

import { isOpen, relativeTime } from "../../lib/docket"
import { ConfidenceMeter } from "./MetricTile"
import { OutcomePill, SectionChips } from "./CaseTable"

/**
 * The same matter as a card, for the grid view.
 *
 * Cards trade the column-wise comparison a table gives you for more of the
 * summary text, which is what people want when they are browsing rather than
 * looking for something specific.
 */
export default function CaseCard({ item, onSection }) {
  const href = isOpen(item) ? `/user/case/${item.id}` : `/case/${item.id}`
  return (
    <Link
      to={href}
      className="group flex flex-col rounded-lg border border-line/10 bg-surface p-5 elev-1
                 hover:border-accent-solid/40 hover:elev-2 transition-all duration-ui ease-ui"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-medium leading-snug group-hover:text-accent transition-colors duration-ui">
          {item.title}
        </h3>
        <span className="shrink-0"><OutcomePill item={item} /></span>
      </div>

      {item.summary && (
        <p className="text-[13px] leading-relaxed text-content/55 line-clamp-3 mb-4">{item.summary}</p>
      )}

      <div className="mt-auto space-y-3">
        <SectionChips sections={item.sections} onSection={onSection} />
        <div className="flex items-center justify-between pt-3 border-t border-line/5">
          <ConfidenceMeter value={item.confidence} />
          <span className="font-mono text-[11px] text-content/45">
            {item.turns || 0} rounds · {relativeTime(item.updated_at || item.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}
