/**
 * Derivations for the docket.
 *
 * `GET /user/cases` already returns summary, sections, turn count, outcome and
 * confidence for every matter. The old dashboard rendered four of those nine
 * fields and computed "total / this month / latest date" from the rest, which
 * are counts of rows rather than answers to anything. Everything here is
 * computed from that same payload -- no additional requests.
 */

/** Stages that mean the hearing is still open. */
const OPEN_STAGES = new Set(["created", "structuring", "researching", "arguing", "ruling", "analysing"])

export const isOpen = (c) => OPEN_STAGES.has(c.status)
export const isConcluded = (c) => c.status === "done"
export const isFailed = (c) => c.status === "failed"

export const STATUS_FILTERS = [
  { id: "all", label: "All", match: () => true },
  { id: "open", label: "In flight", match: isOpen },
  { id: "done", label: "Concluded", match: isConcluded },
  { id: "failed", label: "Stopped", match: isFailed },
]

/** A human label for a stage, in the vocabulary the hearing itself uses. */
export const STAGE_LABEL = {
  created: "Filed",
  structuring: "Reading the case",
  researching: "Searching the record",
  arguing: "Counsel arguing",
  ruling: "Bench considering",
  analysing: "Auditing",
  done: "Concluded",
  failed: "Stopped",
}

const time = (c) => new Date(c.updated_at || c.created_at || 0).getTime()

/** "2 h ago", "yesterday", "12 Aug" -- short enough for a table cell. */
export function relativeTime(value) {
  if (!value) return "—"
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return "—"
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return "yesterday"
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} days ago`
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** Age of the oldest still-open matter, for the "in flight" tile. */
export function oldestOpenAge(cases) {
  const open = cases.filter(isOpen)
  if (!open.length) return null
  return relativeTime(open.reduce((a, b) => (time(a) < time(b) ? a : b)).updated_at)
}

/** Twelve buckets of filings, oldest first, for the sparkline. */
export function filingsByMonth(cases, months = 6) {
  const now = new Date()
  const buckets = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }), count: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  cases.forEach((c) => {
    if (!c.created_at) return
    const d = new Date(c.created_at)
    const slot = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (slot !== undefined) buckets[slot].count += 1
  })
  return buckets
}

/** How the bench actually leaned, across every matter that produced a ruling. */
export function outcomeSplit(cases) {
  let prosecution = 0
  let defence = 0
  cases.forEach((c) => {
    if (c.outcome === "prosecution") prosecution += 1
    else if (c.outcome === "defence") defence += 1
  })
  return { prosecution, defence, ruled: prosecution + defence }
}

/** Median rather than mean: one runaway 0.99 should not move the figure. */
export function medianConfidence(cases) {
  const values = cases.map((c) => c.confidence).filter((v) => typeof v === "number").sort((a, b) => a - b)
  if (!values.length) return null
  const mid = Math.floor(values.length / 2)
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2
}

/** Sections ranked by how often they come up, for the rail. */
export function sectionFrequency(cases, limit = 6) {
  const counts = new Map()
  cases.forEach((c) => (c.sections || []).forEach((s) => counts.set(s, (counts.get(s) || 0) + 1)))
  return [...counts.entries()]
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count || a.section.localeCompare(b.section))
    .slice(0, limit)
}

/** Search across everything a user might remember about a matter, not just the
 *  title -- the summary and the section numbers are usually what they recall. */
export function searchCases(cases, query) {
  const q = query.trim().toLowerCase()
  if (!q) return cases
  return cases.filter((c) =>
    [c.title, c.summary, ...(c.sections || []).map((s) => `s.${s}`)]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q))
  )
}

export const SORTS = {
  updated: { label: "Last updated", compare: (a, b) => time(b) - time(a) },
  filed: { label: "Date filed", compare: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) },
  confidence: { label: "Confidence", compare: (a, b) => (b.confidence ?? -1) - (a.confidence ?? -1) },
  rounds: { label: "Rounds argued", compare: (a, b) => (b.turns || 0) - (a.turns || 0) },
  title: { label: "Matter", compare: (a, b) => (a.title || "").localeCompare(b.title || "") },
}

/** Today / This week / Earlier. Grouping by recency is how people actually
 *  look for a matter they were working on. */
export function groupByRecency(cases) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const weekAgo = startOfToday.getTime() - 6 * 86400000

  const groups = [
    { id: "today", label: "Today", cases: [] },
    { id: "week", label: "Earlier this week", cases: [] },
    { id: "earlier", label: "Earlier", cases: [] },
  ]
  cases.forEach((c) => {
    const t = time(c)
    if (t >= startOfToday.getTime()) groups[0].cases.push(c)
    else if (t >= weekAgo) groups[1].cases.push(c)
    else groups[2].cases.push(c)
  })
  return groups.filter((g) => g.cases.length)
}
