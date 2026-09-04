/**
 * Constants and pure helpers for the hearing UI.
 *
 * Kept out of the component files so those export components only, which is
 * what keeps fast refresh working on them.
 */

/** The pipeline the socket announces, in order. */
export const STAGES = [
  { id: "connecting", label: "Opening", detail: "Joining the hearing" },
  { id: "structuring", label: "Structure", detail: "Reading your account of it" },
  { id: "researching", label: "Retrieval", detail: "Searching statute and precedent" },
  { id: "arguing", label: "Argument", detail: "Counsel are exchanging rounds" },
  { id: "ruling", label: "Ruling", detail: "The bench is considering" },
  { id: "analysing", label: "Audit", detail: "Scoring gaps and case strength" },
  { id: "done", label: "Concluded", detail: "The record is closed" },
]

export const STAGE_ORDER = STAGES.map((s) => s.id)

const MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december"

/**
 * What a good filing contains.
 *
 * Deliberately simple client-side pattern matching: it exists to prompt the
 * writer, it says so in the UI, and nothing downstream depends on it.
 */
export const SIGNALS = [
  {
    id: "when",
    label: "When it happened",
    hint: "A date, or at least the month.",
    test: (t) =>
      new RegExp(`\\b(${MONTHS})\\b`, "i").test(t) ||
      /\b(19|20)\d{2}\b/.test(t) ||
      /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(t) ||
      /\b(yesterday|last (night|week|month|year))\b/i.test(t),
  },
  {
    id: "where",
    label: "Where it happened",
    hint: "An address, locality or city.",
    test: (t) =>
      /\b(at|near|outside|inside|in front of)\s+[A-Z0-9]/.test(t) ||
      /\b(road|street|nagar|sector|colony|market|station|office|shop|house|flat|building|village|district)\b/i.test(t),
  },
  {
    id: "who",
    label: "Who was involved",
    hint: "The parties, by role if not by name.",
    test: (t) =>
      /\b(accused|complainant|witness|neighbour|neighbor|landlord|tenant|employer|employee|driver|owner|officer|guard|supplier|partner)\b/i.test(t) ||
      /\b(my|his|her|their)\s+(brother|sister|father|mother|son|daughter|friend|colleague|husband|wife)\b/i.test(t),
  },
  {
    id: "what",
    label: "What was done or taken",
    hint: "The act itself, in plain terms.",
    test: (t) =>
      /\b(took|stole|theft|assault|hit|struck|beat|threat|threaten|cheat|fraud|forged|damaged|broke|trespass|abused|harass|withheld|refused|failed to deliver)\b/i.test(t),
  },
  {
    id: "harm",
    label: "The harm or loss",
    hint: "An amount, an injury, a consequence.",
    test: (t) =>
      /(₹|rs\.?|inr)\s?[\d,]+/i.test(t) ||
      /\b\d[\d,]*\s*(rupees|lakh|crore)\b/i.test(t) ||
      /\b(injur|hurt|wound|fracture|bruis|hospital|clinic|treated|loss|damage|stolen|missing)\w*\b/i.test(t),
  },
]

export function readiness(text) {
  const t = text || ""
  return SIGNALS.map((s) => ({ ...s, met: t.length > 24 && s.test(t) }))
}
