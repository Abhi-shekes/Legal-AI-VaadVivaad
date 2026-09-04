import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, Radio } from "lucide-react"
import { toast } from "react-toastify"

import AppShell from "../layouts/AppShell"
import CaseCard from "../components/docket/CaseCard"
import CaseTable, { LedgerSkeleton } from "../components/docket/CaseTable"
import CommandBar from "../components/docket/CommandBar"
import EmptyDocket from "../components/docket/EmptyDocket"
import { ConfidenceMeter, MetricTile, SplitBar, Sparkbars } from "../components/docket/MetricTile"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import useLogout from "../hooks/useLogout"
import { api } from "../lib/api"
import { enter } from "../lib/motion"
import {
  SORTS, STAGE_LABEL, STATUS_FILTERS,
  filingsByMonth, isOpen, medianConfidence, oldestOpenAge,
  outcomeSplit, relativeTime, searchCases, sectionFrequency,
} from "../lib/docket"

const VIEW_KEY = "vv-docket-view"

export default function Dashboard() {
  const { user } = useAuthStore()
  const { theme, changeTheme } = themeStore((s) => s)
  const handleLogout = useLogout()
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [section, setSection] = useState(null)
  const [sort, setSort] = useState("updated")
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) || "table"
    } catch {
      return "table"
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* remembering the view is a convenience, not a requirement */
    }
  }, [view])

  // j / k walk the ledger, n files a case. The list is long enough that
  // reaching for the mouse for every row is the wrong interaction.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === "n") {
        e.preventDefault()
        navigate("/user/case")
        return
      }
      if (e.key !== "j" && e.key !== "k") return

      const links = [...document.querySelectorAll("[data-docket-row] a")]
      if (!links.length) return
      e.preventDefault()
      const at = links.indexOf(document.activeElement)
      const next = e.key === "j"
        ? Math.min(links.length - 1, at + 1)
        : Math.max(0, at <= 0 ? 0 : at - 1)
      links[next]?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [navigate])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // `api` returns the parsed body directly -- `{status, data}` -- not an
        // axios envelope. Reading `response.data.status` here meant the guard
        // was always false and the ledger was always empty.
        const response = await api.listCases()
        if (cancelled) return
        if (response?.status === "success") setCases(response.data || [])
        else setLoadError("The docket could not be read.")
      } catch (error) {
        if (!cancelled) setLoadError(error?.message || "The docket could not be reached.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`Delete "${item.title}"? The transcript and the ruling go with it.`)) return
    const previous = cases
    setCases((list) => list.filter((c) => c.id !== item.id))
    try {
      await api.deleteCase(item.id)
      toast.success("Matter deleted.")
    } catch (error) {
      setCases(previous)
      toast.error(error?.message || "That matter could not be deleted.")
    }
  }, [cases])

  // Every figure below is derived from the list payload the API already
  // returns. None of it costs an extra request.
  const metrics = useMemo(() => ({
    months: filingsByMonth(cases),
    open: cases.filter(isOpen),
    oldestOpen: oldestOpenAge(cases),
    split: outcomeSplit(cases),
    confidence: medianConfidence(cases),
    sections: sectionFrequency(cases),
  }), [cases])

  const counts = useMemo(() => {
    const out = {}
    STATUS_FILTERS.forEach((f) => {
      out[f.id] = cases.filter(f.match).length
    })
    return out
  }, [cases])

  const visible = useMemo(() => {
    const statusMatch = STATUS_FILTERS.find((f) => f.id === status)?.match ?? (() => true)
    return searchCases(cases, query)
      .filter(statusMatch)
      .filter((c) => !section || (c.sections || []).includes(section))
      .sort(SORTS[sort].compare)
  }, [cases, query, status, section, sort])

  const filtered = Boolean(query.trim() || section || status !== "all")
  const firstName = user?.name ? user.name.split(" ")[0] : user?.name || user?.email || "there"

  return (
    <AppShell
      header={{
        user,
        onLogout: handleLogout,
        changeTheme,
        dark: theme === "dark",
        center: (
          <div className="min-w-0">
            <p className="docket-label text-[10px] text-content/40">Your docket</p>
            <p className="font-display text-base leading-tight truncate">
              Welcome back, <span className="text-accent">{firstName}</span>
            </p>
          </div>
        ),
      }}
    >
      {/* Summary row -- the only big-number tiles on the page, because these
          four figures are the point of it. */}
      <motion.div {...enter()} className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-7">
        <MetricTile label="Matters filed" value={cases.length} hint="Last six months">
          <Sparkbars data={metrics.months} />
        </MetricTile>

        <MetricTile
          label="In flight"
          value={metrics.open.length}
          hint={metrics.oldestOpen ? `Oldest ${metrics.oldestOpen}` : "Nothing open"}
        >
          {metrics.open.length > 0 ? (
            <div className="space-y-1.5">
              {metrics.open.slice(0, 2).map((c) => (
                <Link
                  key={c.id}
                  to={`/user/case/${c.id}`}
                  className="flex items-center gap-2 text-[11.5px] text-content/60 hover:text-accent transition-colors duration-ui"
                >
                  <Radio size={11} className="text-accent animate-pulse-live shrink-0" />
                  <span className="truncate">{c.title}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-content/45">Every hearing has concluded.</p>
          )}
        </MetricTile>

        <MetricTile
          label="Bench leaned"
          value={metrics.split.ruled}
          unit={metrics.split.ruled === 1 ? "ruling" : "rulings"}
        >
          <SplitBar prosecution={metrics.split.prosecution} defence={metrics.split.defence} />
        </MetricTile>

        <MetricTile
          label="Median confidence"
          value={metrics.confidence !== null ? metrics.confidence.toFixed(2) : "—"}
          hint="How firmly the record supported the order"
        >
          <ConfidenceMeter value={metrics.confidence} segments={7} />
        </MetricTile>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        {/* The ledger */}
        <motion.section {...enter(1)} className="xl:col-span-9 min-w-0">
          <CommandBar
            query={query} onQuery={setQuery}
            status={status} onStatus={setStatus}
            section={section} onSection={setSection}
            sort={sort} onSort={setSort}
            view={view} onView={setView}
            sections={metrics.sections}
            counts={counts}
          />

          <div className="rounded-lg border border-line/10 bg-surface px-4 sm:px-5 lg:px-6 py-2 elev-1 2xl:max-w-[1760px]">
            {loading && <LedgerSkeleton />}

            {!loading && loadError && (
              <div className="py-16 text-center">
                <p className="text-sm text-dissent mb-1">{loadError}</p>
                <p className="text-[12.5px] text-content/50">
                  Reload the page to try again.
                </p>
              </div>
            )}

            {!loading && !loadError && visible.length === 0 && (
              <EmptyDocket
                hasQuery={filtered}
                onClear={() => {
                  setQuery("")
                  setSection(null)
                  setStatus("all")
                }}
              />
            )}

            {!loading && !loadError && visible.length > 0 && view === "table" && (
              <CaseTable cases={visible} onSection={setSection} onDelete={handleDelete} />
            )}

            {!loading && !loadError && visible.length > 0 && view === "grid" && (
              <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4 py-4">
                {visible.map((item) => (
                  <CaseCard key={item.id} item={item} onSection={setSection} />
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* Rail */}
        <motion.aside {...enter(2)} className="xl:col-span-3 space-y-4">
          {metrics.open.length > 0 && (
            <div className="rounded-lg border border-accent-solid/30 bg-accent-solid/5 p-5">
              <p className="docket-label text-[10px] text-accent mb-3">Paused mid-record</p>
              <ul className="space-y-3">
                {metrics.open.map((c) => (
                  <li key={c.id}>
                    <Link to={`/user/case/${c.id}`} className="group block">
                      <p className="text-[13px] font-medium leading-snug group-hover:text-accent transition-colors duration-ui">
                        {c.title}
                      </p>
                      <p className="font-mono text-[11px] text-content/50 mt-0.5">
                        {STAGE_LABEL[c.status]} · {relativeTime(c.updated_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {metrics.sections.length > 0 && (
            <div className="rounded-lg border border-line/10 bg-surface p-5 elev-1">
              <p className="docket-label text-[10px] text-content/40 mb-3">Sections you keep hitting</p>
              <ul className="space-y-2">
                {metrics.sections.map(({ section: s, count }) => {
                  const peak = metrics.sections[0].count
                  return (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setSection(section === s ? null : s)}
                        className="w-full flex items-center gap-3 group"
                      >
                        <span className="font-mono text-[12px] w-14 text-left text-content/70 group-hover:text-accent transition-colors duration-ui">
                          s.{s}
                        </span>
                        <span className="flex-1 h-1.5 rounded-full bg-content/10 overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-accent-solid/70"
                            style={{ width: `${(count / peak) * 100}%` }}
                          />
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-content/45 w-4 text-right">
                          {count}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-line/10 bg-surface p-5 elev-1">
            <p className="docket-label text-[10px] text-content/40 mb-3">How a hearing runs</p>
            <ol className="space-y-3">
              {[
                ["File the matter", "The incident and the evidence you actually hold."],
                ["The record is searched", "Statute and precedent are retrieved and verified."],
                ["Both sides argue", "Counsel exchange rounds live; you may object."],
                ["The bench rules", "A disposition, with what would change it."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full border border-accent-solid/40 text-accent
                                   font-mono text-[11px] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[13px] font-medium">{title}</span>
                    <span className="block text-[12px] text-content/55 mt-0.5 leading-relaxed">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link
              to="/user/case"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent mt-4 hover:underline"
            >
              File a case
              <ArrowRight size={13} />
            </Link>
          </div>
        </motion.aside>
      </div>
    </AppShell>
  )
}
