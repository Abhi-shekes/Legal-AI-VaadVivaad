import { useState } from "react"
import { ExternalLink, Globe, Loader2 } from "lucide-react"

import { api } from "../../lib/api"

/**
 * Material from outside the corpus — and outside the record.
 *
 * The corpus is a snapshot, so a judgment from last month is invisible to
 * precedent retrieval. This searches the official publishers for it.
 *
 * Everything here is deliberately kept at arm's length: none of it was
 * before the bench, none of it is citable by counsel, and the backend
 * refuses to hand it to them. It is a lead for a person to follow, which is
 * why it sits behind a button rather than loading with the page — the user
 * asks for it, having read what the panel says it is.
 */
export default function OutsideRecordPanel({ caseId }) {
  const [state, setState] = useState({ status: "idle", data: null, error: "" })

  const run = async () => {
    setState({ status: "loading", data: null, error: "" })
    try {
      const data = await api.outsideTheRecord(caseId)
      setState({ status: "done", data, error: "" })
    } catch (err) {
      setState({ status: "done", data: null, error: err?.message || "Search failed." })
    }
  }

  const results = state.data?.results || []
  const unavailable = state.status === "done" && state.data && !state.data.available

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-line/10 flex items-center gap-2.5">
        <Globe size={15} className="text-accent" />
        <h3 className="font-display text-base">Outside the record</h3>
      </div>

      <div className="px-5 py-4">
        <p className="text-[12.5px] leading-relaxed text-content/60 mb-3">
          Search the official publishers for material the corpus does not hold —
          a recent judgment, an amendment. <strong className="text-content">Not
          evidence, not before the bench, and not citable by counsel.</strong>
        </p>

        {state.status === "idle" && (
          <button
            type="button"
            onClick={run}
            className="w-full rounded-lg border border-line/15 px-4 py-2 text-[12.5px]
                       font-medium hover:bg-content/5 transition-colors duration-ui"
          >
            Search outside the record
          </button>
        )}

        {state.status === "loading" && (
          <p className="flex items-center gap-2 font-mono text-[11.5px] text-content/45">
            <Loader2 size={14} className="animate-spin" />
            Searching…
          </p>
        )}

        {state.error && <p className="text-[12px] text-dissent">{state.error}</p>}

        {unavailable && (
          <p className="text-[12px] leading-relaxed text-content/55">
            Live search is not switched on. Start it with the{" "}
            <code className="font-mono">websearch</code> profile.
          </p>
        )}

        {state.status === "done" && state.data?.available && results.length === 0 && (
          <p className="text-[12px] text-content/55">
            Nothing found on the official publishers for this matter.
          </p>
        )}
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-line/10 border-t border-line/10">
          {results.map((item) => (
            <li key={item.url} className="px-5 py-3">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-start gap-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-snug
                                   group-hover:text-accent transition-colors duration-ui">
                    {item.title}
                  </span>
                  {item.snippet && (
                    <span className="block mt-0.5 text-[12px] leading-relaxed text-content/55 line-clamp-2">
                      {item.snippet}
                    </span>
                  )}
                  <span className="block mt-1 font-mono text-[10.5px] text-content/40">
                    {item.publisher}
                  </span>
                </span>
                <ExternalLink size={13} className="shrink-0 mt-1 text-content/35" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
