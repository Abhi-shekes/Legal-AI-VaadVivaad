import { useEffect, useState } from "react"
import { CalendarClock, Loader2, TriangleAlert } from "lucide-react"

import { api } from "../../lib/api"

/**
 * The sequence of events in the file, and what does not add up.
 *
 * Two kinds of finding, and the distinction is the point. Ordering conflicts
 * and clashing dates are arithmetic — an FIR cannot predate the incident it
 * reports — and come back marked certain. Conflicts read out of the prose are
 * provisional, and every one carries the two passage anchors it rests on so a
 * reader can check it against the document rather than take it on trust.
 */

const KIND_TONE = {
  incident: "text-dissent bg-dissent/10",
  fir: "text-accent bg-accent-solid/10",
  complaint: "text-accent bg-accent-solid/10",
  arrest: "text-content/70 bg-content/10",
  recovery: "text-verdict bg-verdict/10",
  medical: "text-verdict bg-verdict/10",
}

export default function TimelinePanel({ caseId }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .caseTimeline(caseId)
      .then((data) => !cancelled && setReport(data))
      .catch(() => !cancelled && setReport(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [caseId])

  if (loading) {
    return (
      <div className="rounded-lg border border-line/10 bg-surface elev-1 px-5 py-6
                      flex items-center gap-2.5 font-mono text-[11.5px] text-content/45">
        <Loader2 size={14} className="animate-spin" />
        Reading the file…
      </div>
    )
  }

  const events = report?.events || []
  const conflicts = report?.contradictions || []
  if (!events.length && !conflicts.length) return null

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-line/10 flex items-center gap-2.5">
        <CalendarClock size={15} className="text-accent" />
        <h3 className="font-display text-base">Timeline</h3>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-content/45">
          {events.length}
        </span>
      </div>

      {conflicts.length > 0 && (
        <div className="px-5 py-4 border-b border-line/10 bg-dissent/[0.06]">
          <p className="flex items-center gap-2 docket-label text-[10px] text-dissent mb-3">
            <TriangleAlert size={13} />
            {conflicts.length} {conflicts.length === 1 ? "discrepancy" : "discrepancies"}
          </p>
          <ul className="space-y-3">
            {conflicts.map((item, i) => (
              <li key={i} className="text-[12.5px] leading-relaxed">
                <p className="font-medium">
                  {item.why}
                  {!item.certain && (
                    <span className="ml-1.5 docket-label text-[9px] px-1.5 py-0.5 rounded
                                     bg-content/10 text-content/55">
                      provisional
                    </span>
                  )}
                </p>
                <p className="mt-1 text-content/60">
                  <span className="font-mono text-[10.5px] text-content/40">
                    [{item.anchor_a}]
                  </span>{" "}
                  {item.statement_a}
                </p>
                <p className="text-content/60">
                  <span className="font-mono text-[10.5px] text-content/40">
                    [{item.anchor_b}]
                  </span>{" "}
                  {item.statement_b}
                </p>
              </li>
            ))}
          </ul>
          {report?.note && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-content/50">{report.note}</p>
          )}
        </div>
      )}

      {events.length > 0 && (
        <ol className="divide-y divide-line/10">
          {events.map((event, i) => (
            <li key={i} className="px-5 py-3 flex items-baseline gap-3">
              <span className="font-mono text-[11px] tabular-nums text-content/45 w-[86px] shrink-0">
                {event.date || "undated"}
              </span>
              <span
                className={`docket-label text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                  KIND_TONE[event.kind] || "bg-content/10 text-content/55"
                }`}
              >
                {event.kind}
              </span>
              <span className="text-[12.5px] leading-snug min-w-0">{event.description}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
