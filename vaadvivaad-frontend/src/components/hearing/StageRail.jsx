import { useEffect, useState } from "react"
import { AlertTriangle, Check, Loader2 } from "lucide-react"

import { STAGES, STAGE_ORDER } from "../../lib/hearing"

/**
 * The pipeline, made visible.
 *
 * The socket announces seven named stages and the old page collapsed all of
 * them into one line of grey text under the word "Proceedings". The system is
 * doing expensive, interesting work -- retrieval, verification, two models
 * arguing -- and the user had no way to see any of it happening.
 */

function Elapsed({ since, stopped }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!since || stopped) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [since, stopped])

  if (!since) return null
  const secs = Math.max(0, Math.floor(((stopped ? since.stoppedAt || now : now) - since.startedAt) / 1000))
  const mm = String(Math.floor(secs / 60)).padStart(2, "0")
  const ss = String(secs % 60).padStart(2, "0")
  return <span className="font-mono text-[11.5px] tabular-nums text-content/50">{mm}:{ss}</span>
}

export default function StageRail({ stage, statusMessage, connected, startedAt, tokens, title }) {
  const failed = stage === "failed"
  const current = failed ? -1 : STAGE_ORDER.indexOf(stage)
  const active = STAGES[current]

  return (
    <div className="border-b border-line/10 bg-surface-raised">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-3">
        {/* Identity and telemetry */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                failed ? "bg-dissent" : connected ? "bg-verdict animate-pulse-live" : "bg-content/25"
              }`}
            />
            <span className="docket-label text-[10px] text-content/50 shrink-0">
              {failed ? "Stopped" : connected ? "Live" : "Reconnecting"}
            </span>
            {title && (
              <span className="text-[13px] font-medium truncate ml-2 min-w-0">{title}</span>
            )}
          </div>

          <div className="flex items-center gap-4 ml-auto shrink-0">
            <Elapsed since={startedAt ? { startedAt } : null} stopped={stage === "done" || failed} />
            {tokens?.total_tokens != null && (
              <span className="font-mono text-[11.5px] tabular-nums text-content/40">
                {tokens.total_tokens.toLocaleString()} tokens · {tokens.calls} calls
              </span>
            )}
          </div>
        </div>

        {/* The spine */}
        <ol className="flex gap-1" aria-label="Hearing progress">
          {STAGES.map((s, i) => {
            const done = current > i
            const now = current === i
            return (
              <li
                key={s.id}
                aria-current={now ? "step" : undefined}
                className="flex-1 min-w-0"
                title={s.detail}
              >
                <div
                  className={`h-1 rounded-full transition-colors duration-enter ease-ui ${
                    failed ? "bg-dissent/30" : done ? "bg-verdict" : now ? "bg-accent-solid" : "bg-content/10"
                  }`}
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  {now && !failed && <Loader2 size={10} className="animate-spin text-accent shrink-0" />}
                  {done && <Check size={10} className="text-verdict shrink-0" />}
                  <span
                    className={`docket-label text-[9px] truncate ${
                      now ? "text-accent" : done ? "text-content/45" : "text-content/25"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>

        {/* What it is doing right now, in words */}
        <p className="text-[12px] text-content/50 mt-2.5 flex items-center gap-2">
          {failed ? (
            <>
              <AlertTriangle size={12} className="text-dissent shrink-0" />
              The hearing stopped. Your transcript so far has been saved.
            </>
          ) : (
            <>{statusMessage || active?.detail || "Waiting for the filing."}</>
          )}
        </p>
      </div>
    </div>
  )
}
