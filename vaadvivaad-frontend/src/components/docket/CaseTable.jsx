import { Link } from "react-router-dom"
import { Download, FileText, Trash2 } from "lucide-react"

import { api } from "../../lib/api"
import { STAGE_LABEL, groupByRecency, isFailed, isOpen, relativeTime } from "../../lib/docket"
import { ConfidenceMeter } from "./MetricTile"

/**
 * The ledger.
 *
 * A table, because the interesting comparison is down a column -- which matters
 * ran longest, which the bench was least sure about. The previous list rendered
 * a title and a date per row and had nothing to compare.
 *
 * Rows are grouped by recency rather than sorted into one undifferentiated run,
 * and the per-row actions call endpoints that were already in the API client and
 * had never been wired to anything.
 */

function SectionChips({ sections = [], onSection }) {
  if (!sections.length) return <span className="text-content/30">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {sections.slice(0, 3).map((s) => (
        <button
          key={s}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onSection?.(s)
          }}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-content/5 text-content/70
                     hover:bg-accent-solid/15 hover:text-accent transition-colors duration-ui"
        >
          s.{s}
        </button>
      ))}
      {sections.length > 3 && (
        <span className="font-mono text-[11px] text-content/40 py-0.5">+{sections.length - 3}</span>
      )}
    </span>
  )
}

function OutcomePill({ item }) {
  if (isOpen(item)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-accent">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-solid animate-pulse-live" />
        {STAGE_LABEL[item.status] || item.status}
      </span>
    )
  }
  if (isFailed(item)) {
    return <span className="text-[11px] font-mono text-dissent">Stopped</span>
  }
  if (item.outcome === "prosecution") {
    return (
      <span className="docket-label text-[10px] px-2 py-0.5 rounded-full bg-verdict/15 text-verdict">
        Prosecution
      </span>
    )
  }
  if (item.outcome === "defence") {
    return (
      <span className="docket-label text-[10px] px-2 py-0.5 rounded-full bg-dissent/15 text-dissent">
        Defence
      </span>
    )
  }
  return <span className="text-[11px] font-mono text-content/40">No order</span>
}

function RowActions({ item, onDelete }) {
  const stop = (e) => e.stopPropagation()
  return (
    // Always visible. Hiding these until hover meant they could not be found
    // without sweeping the pointer across the row, and on a touch screen there
    // is no hover at all -- so the actions were effectively unreachable there.
    <div className="flex items-center justify-end gap-0.5">
      {item.status === "done" && (
        <>
          <a
            href={api.briefUrl(item.id, "pdf")}
            onClick={stop}
            title="Download the case brief as PDF"
            className="p-1.5 rounded text-content/45 hover:text-accent hover:bg-content/5 transition-colors duration-ui"
          >
            <Download size={14} />
          </a>
          <a
            href={api.briefUrl(item.id, "docx")}
            onClick={stop}
            title="Download the case brief as DOCX"
            className="p-1.5 rounded text-content/45 hover:text-accent hover:bg-content/5 transition-colors duration-ui"
          >
            <FileText size={14} />
          </a>
        </>
      )}
      <button
        type="button"
        onClick={(e) => {
          stop(e)
          onDelete(item)
        }}
        title="Delete this matter"
        className="p-1.5 rounded text-content/45 hover:text-dissent hover:bg-dissent/10 transition-colors duration-ui"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function Row({ item, onSection, onDelete }) {
  const href = isOpen(item) ? `/user/case/${item.id}` : `/case/${item.id}`
  return (
    <tr
      data-docket-row
      className="group/row border-b border-line/5 hover:bg-content/5
                 focus-within:bg-content/5 transition-colors duration-ui"
    >
      <td className="py-3 pr-4 align-top">
        <Link to={href} className="block rounded-sm">
          <span className="font-medium group-hover/row:text-accent transition-colors duration-ui">
            {item.title}
          </span>
          {item.summary && (
            <span className="block text-[12.5px] text-content/50 mt-0.5 line-clamp-1 max-w-[60ch]">
              {item.summary}
            </span>
          )}
        </Link>
      </td>
      <td className="py-3 pr-4 align-top hidden md:table-cell">
        <SectionChips sections={item.sections} onSection={onSection} />
      </td>
      <td className="py-3 pr-4 align-top hidden lg:table-cell font-mono text-[12px] tabular-nums text-content/60">
        {item.turns || 0}
      </td>
      <td className="py-3 pr-4 align-top"><OutcomePill item={item} /></td>
      <td className="py-3 pr-4 align-top hidden lg:table-cell">
        <ConfidenceMeter value={item.confidence} />
      </td>
      <td className="py-3 pr-4 align-top hidden sm:table-cell font-mono text-[11.5px] text-content/50 whitespace-nowrap">
        {relativeTime(item.updated_at || item.created_at)}
      </td>
      <td className="py-3 align-top w-24">
        <RowActions item={item} onDelete={onDelete} />
      </td>
    </tr>
  )
}

export function LedgerSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-line/5" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="py-4 flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 rounded bg-content/10 relative overflow-hidden" style={{ width: `${38 + (i % 3) * 12}%` }}>
              <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-content/10 to-transparent" />
            </div>
            <div className="h-2.5 rounded bg-content/5" style={{ width: `${52 + (i % 4) * 8}%` }} />
          </div>
          <div className="h-3 w-16 rounded bg-content/10 hidden sm:block" />
          <div className="h-3 w-20 rounded bg-content/5 hidden lg:block" />
        </div>
      ))}
    </div>
  )
}

export default function CaseTable({ cases, onSection, onDelete }) {
  const groups = groupByRecency(cases)

  return (
    <div className="scroll-x">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line/20">
            {[
              ["Matter", ""],
              ["Sections", "hidden md:table-cell"],
              ["Rounds", "hidden lg:table-cell"],
              ["Outcome", ""],
              ["Confidence", "hidden lg:table-cell"],
              ["Updated", "hidden sm:table-cell"],
              ["", "w-24"],
            ].map(([label, cls]) => (
              <th
                key={label || "actions"}
                scope="col"
                className={`text-left docket-label text-[10px] font-normal text-content/40 pb-2.5 pr-4 ${cls}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.id}>
            <tr>
              <th
                colSpan={7}
                scope="colgroup"
                className="text-left docket-label text-[10px] font-normal text-content/35 pt-5 pb-2"
              >
                {group.label}
                <span className="ml-2 text-content/25">{group.cases.length}</span>
              </th>
            </tr>
            {group.cases.map((item) => (
              <Row key={item.id} item={item} onSection={onSection} onDelete={onDelete} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

export { OutcomePill, SectionChips }
