import { useEffect, useRef } from "react"
import { LayoutGrid, Plus, Rows3, Search, X } from "lucide-react"
import { Link } from "react-router-dom"

import { SORTS, STATUS_FILTERS } from "../../lib/docket"

/**
 * The docket's controls.
 *
 * This replaces the aurora welcome band, which was the largest element on the
 * page and carried a greeting. Search moves out of the header and into the page
 * it searches, next to the filters that narrow the same list.
 */
export default function CommandBar({
  query, onQuery,
  status, onStatus,
  section, onSection,
  sort, onSort,
  view, onView,
  sections, counts,
}) {
  const searchRef = useRef(null)

  // "/" focuses search, the convention anywhere with a list this long.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable
      if (e.key === "/" && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        searchRef.current.blur()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const chip = "px-3 py-1.5 rounded-full text-[12.5px] transition-colors duration-ui ease-ui whitespace-nowrap"

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content/35 pointer-events-none" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search matters, summaries, sections…"
            aria-label="Search your matters"
            className="w-full pl-10 pr-9 py-2.5 rounded-lg text-sm bg-surface border border-line/10
                       placeholder:text-content/35 focus:outline-none focus:border-accent-solid
                       transition-colors duration-ui"
          />
          {!query && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-content/30
                            border border-line/15 rounded px-1.5 py-0.5 pointer-events-none hidden sm:block">
              /
            </kbd>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="sr-only" htmlFor="docket-sort">Sort matters by</label>
          <select
            id="docket-sort"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            className="py-2.5 pl-3 pr-8 rounded-lg text-[12.5px] bg-surface border border-line/10
                       focus:outline-none focus:border-accent-solid transition-colors duration-ui"
          >
            {Object.entries(SORTS).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </select>

          <div className="flex rounded-lg border border-line/10 bg-surface p-0.5" role="group" aria-label="View">
            {[
              { id: "table", icon: Rows3, label: "Table view" },
              { id: "grid", icon: LayoutGrid, label: "Card view" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onView(id)}
                aria-pressed={view === id}
                title={label}
                className={`p-2 rounded transition-colors duration-ui ${
                  view === id ? "bg-content/10 text-content" : "text-content/40 hover:text-content"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          <Link
            to="/user/case"
            className="inline-flex items-center gap-1.5 bg-accent-solid text-accent-on font-semibold
                       py-2.5 px-4 rounded-lg text-[13px] hover:brightness-105 transition-all duration-ui"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">File a case</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onStatus(f.id)}
            aria-pressed={status === f.id}
            className={`${chip} ${
              status === f.id
                ? "bg-content text-ground font-medium"
                : "text-content/55 hover:text-content hover:bg-content/5"
            }`}
          >
            {f.label}
            <span className={`ml-1.5 tabular-nums ${status === f.id ? "opacity-60" : "text-content/35"}`}>
              {counts[f.id] ?? 0}
            </span>
          </button>
        ))}

        {sections.length > 0 && (
          <>
            <span className="w-px h-5 bg-line/15 mx-1.5" aria-hidden="true" />
            {sections.map(({ section: s, count }) => (
              <button
                key={s}
                type="button"
                onClick={() => onSection(section === s ? null : s)}
                aria-pressed={section === s}
                className={`${chip} font-mono ${
                  section === s
                    ? "bg-accent-solid/20 text-accent"
                    : "text-content/50 hover:text-accent hover:bg-accent-solid/10"
                }`}
              >
                s.{s}
                <span className="ml-1.5 opacity-50 tabular-nums">{count}</span>
              </button>
            ))}
          </>
        )}

        <span className="ml-auto hidden lg:flex items-center gap-2 text-[11px] text-content/30">
          <kbd className="font-mono border border-line/15 rounded px-1.5 py-0.5">j</kbd>
          <kbd className="font-mono border border-line/15 rounded px-1.5 py-0.5">k</kbd>
          to move
          <kbd className="font-mono border border-line/15 rounded px-1.5 py-0.5 ml-1">n</kbd>
          to file
        </span>

        {(section || query || status !== "all") && (
          <button
            type="button"
            onClick={() => {
              onSection(null)
              onQuery("")
              onStatus("all")
            }}
            className={`${chip} inline-flex items-center gap-1 text-content/45 hover:text-content`}
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
