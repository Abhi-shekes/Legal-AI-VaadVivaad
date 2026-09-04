import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, CornerDownLeft, Loader2, Info } from "lucide-react"

import { api } from "../lib/api"
import { OPEN_SEARCH_EVENT } from "../lib/search"

/**
 * Search across the whole record, on ⌘K.
 *
 * The dashboard lists the fifty most recent matters by date. That answers
 * "what did I do lately", not "which hearing was the one about the dying
 * declaration" -- so this searches the transcript, the order and the
 * questions put to the bench afterwards, not just the title.
 *
 * Opened by ⌘K / Ctrl+K anywhere in the authenticated app, or by anything
 * dispatching the event in `lib/search.js`. That event is why the rail can
 * offer a button without this component's state living in AppShell.
 *
 * The backend answers with which engine served the query. When it is the
 * MongoDB fallback the results genuinely cannot include transcript matches,
 * and the panel says so -- an empty result there means "not found in the
 * case description", not "never argued".
 */

export default function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [state, setState] = useState({ loading: false, results: [], backend: "", error: "" })
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const requestId = useRef(0)

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setState({ loading: false, results: [], backend: "", error: "" })
    setActive(0)
  }, [])

  // ── open / close ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (event) => {
      const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      if (combo) {
        event.preventDefault()
        setOpen((was) => !was)
      } else if (event.key === "Escape" && open) {
        event.preventDefault()
        close()
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen)
    }
  }, [open, close])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // ── query ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return undefined

    const id = ++requestId.current
    setState((prev) => ({ ...prev, loading: true, error: "" }))

    // Debounced: an empty query is a valid request -- it returns the most
    // recent matters, so the panel is useful before a single key is pressed.
    const timer = setTimeout(async () => {
      try {
        const data = await api.search(query)
        if (id !== requestId.current) return // a newer query already won
        setState({
          loading: false,
          results: data?.results || [],
          backend: data?.backend || "",
          error: "",
        })
        setActive(0)
      } catch (err) {
        if (id !== requestId.current) return
        setState({
          loading: false,
          results: [],
          backend: "",
          error: err?.message || "Search is unavailable right now.",
        })
      }
    }, query ? 180 : 0)

    return () => clearTimeout(timer)
  }, [query, open])

  const results = state.results
  const limited = state.backend === "mongo"

  const go = useCallback(
    (item) => {
      if (!item) return
      close()
      navigate(`/case/${item.id}`)
    },
    [close, navigate]
  )

  const onInputKey = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      go(results[active])
    }
  }

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-index="${active}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [active])

  const hint = useMemo(
    () => (navigator?.platform?.includes("Mac") ? "⌘K" : "Ctrl K"),
    []
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={close}
    >
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search your hearings"
        onMouseDown={(event) => event.stopPropagation()}
        className="relative w-full max-w-xl rounded-xl border border-line/12 bg-surface-raised
                   shadow-[var(--elev-3)] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 border-b border-line/10">
          {state.loading ? (
            <Loader2 size={16} className="shrink-0 text-content/40 animate-spin" />
          ) : (
            <Search size={16} className="shrink-0 text-content/40" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search hearings — offence, section, or what was argued"
            aria-label="Search hearings"
            aria-controls="vv-search-results"
            className="flex-1 bg-transparent py-4 text-[15px] text-content
                       placeholder:text-content/35 outline-none"
          />
          <kbd className="docket-label text-[10px] px-1.5 py-0.5 rounded border
                          border-line/15 text-content/40">
            esc
          </kbd>
        </div>

        {limited && (
          <p className="flex items-start gap-2 px-4 py-2 bg-accent/[0.07]
                        border-b border-line/10 text-[11.5px] leading-relaxed text-content/60">
            <Info size={13} className="shrink-0 mt-0.5 text-accent" />
            <span>
              Searching case descriptions only. Transcript search needs Meilisearch —
              start it with the <code className="font-mono">search</code> profile.
            </span>
          </p>
        )}

        <ul
          id="vv-search-results"
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="max-h-[52vh] overflow-y-auto"
        >
          {state.error && (
            <li className="px-4 py-8 text-center text-sm text-dissent">{state.error}</li>
          )}

          {!state.error && !state.loading && results.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-content/50">
              {query
                ? `Nothing on the record matches “${query}”.`
                : "No hearings yet — file your first one."}
            </li>
          )}

          {results.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === active} data-index={index}>
              <button
                type="button"
                onClick={() => go(item)}
                onMouseMove={() => setActive(index)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors
                            duration-ui ease-ui ${
                              index === active ? "bg-accent/[0.09]" : "hover:bg-content/[0.03]"
                            }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-content truncate">{item.title}</span>
                    {item.outcome && (
                      <span
                        className={`docket-label text-[9.5px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          item.outcome === "prosecution"
                            ? "text-dissent bg-dissent/10"
                            : "text-verdict bg-verdict/10"
                        }`}
                      >
                        {item.outcome}
                      </span>
                    )}
                  </div>

                  {/* Meilisearch marks matched terms with <em>; render it as
                      text rather than HTML -- a snippet is user content and
                      does not get to inject markup. */}
                  <p className="mt-0.5 text-[12.5px] text-content/55 line-clamp-2">
                    {stripMarks(item.snippet) || item.summary}
                  </p>

                  <p className="mt-1 flex items-center gap-2 font-mono text-[10.5px] text-content/35">
                    {item.sections?.length > 0 && <span>s.{item.sections.join(", s.")}</span>}
                    <span>{item.turns} turns</span>
                    {item.created_at && (
                      <span>
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </p>
                </div>

                {index === active && (
                  <CornerDownLeft size={14} className="shrink-0 mt-1 text-accent" />
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between px-4 py-2 border-t border-line/10
                        font-mono text-[10.5px] text-content/35">
          <span>↑↓ to move · ⏎ to open</span>
          <span>{hint}</span>
        </div>
      </div>
    </div>
  )
}

/** Meilisearch highlight markers, removed for plain-text rendering. */
function stripMarks(text) {
  return (text || "").replace(/<\/?em>/g, "")
}
