/**
 * Maps a stored case document onto the shapes the hearing components take.
 *
 * `GET /user/cases/{id}` returns `DebateState.to_dict()`, while the hearing
 * components were written against the socket payloads. The two differ in three
 * ways that had silently broken the record page:
 *
 *   - a stored turn keeps its argument under `content` and its unsupported
 *     citations under `unsupported_citations`; the socket sends `turn` and
 *     `unsupported`;
 *   - a stored turn cites by id in `content.relies_on`, so the precedents have
 *     to be resolved from the case-level `precedents` list;
 *   - the stored document has no `section` view, which the analysis panel
 *     needs, so it is reconstructed from the first section candidate.
 *
 * Doing it here means the record page and a resumed hearing render from one
 * mapping rather than two drifting copies.
 */

/** A stored turn in the shape `TurnCard` expects from the socket. */
export function turnToSocketShape(turn, precedents = []) {
  const content = turn.content || {}
  const reliedOn = new Set(content.relies_on || [])
  return {
    index: turn.index,
    round: turn.round,
    phase: turn.phase,
    side: turn.side,
    claim_id: turn.claim_id || content.claim_id || "",
    turn: content,
    citations: precedents.filter((p) => reliedOn.has(p.citation_id)),
    unsupported: turn.unsupported_citations || [],
  }
}

/** The `case_details` payload, rebuilt from storage. */
export function detailsFromDoc(doc) {
  if (!doc?.case) return null
  const sections = doc.sections || []
  const first = sections[0] || {}
  return {
    summary: doc.case.summary,
    crime_type: doc.case.crime_type,
    // The replay path on the server omits `section`, so derive the same view
    // from the leading section candidate rather than rendering an em dash.
    section: doc.section || {
      label: first.section ? `${first.code || "IPC"} s.${first.section}` : "",
      subject: first.subject || first.rationale || "",
      provisional: Boolean(first.provisional),
      counterpart_section: first.counterpart_section || "",
    },
    all_sections: sections,
    statute: doc.statute || null,
    statute_verified: Boolean(doc.statute_verified),
    precedents: doc.precedents || [],
    precedent_note: (doc.precedents || []).length
      ? ""
      : "No verified precedent was found for this matter. Both sides argued from the statutory elements and the record.",
    statute_note: doc.statute_note || "",
  }
}

/** Everything the hearing view needs, from one stored document. */
export function hydrateFromDoc(doc) {
  const precedents = doc.precedents || []
  return {
    stage: doc.stage === "done" || doc.stage === "failed" ? doc.stage : "idle",
    concluded: doc.stage === "done",
    caseDetails: detailsFromDoc(doc),
    turns: (doc.turns || [])
      .map((t) => turnToSocketShape(t, precedents))
      .sort((a, b) => a.index - b.index),
    ruling: doc.ruling || null,
    gaps: doc.gaps || null,
    strength: doc.strength || null,
    objections: (doc.objections || []).map((o) => (typeof o === "string" ? o : o?.text || "")),
    priorRulings: doc.prior_rulings || [],
    continuations: doc.continuations || 0,
    consultations: doc.consultations || [],
    tokens: doc.tokens || null,
    error: doc.error || null,
  }
}

/** A readable title for a stored document, matching the server's rule. */
export function titleFromDoc(doc) {
  const crime = (doc?.case?.crime_type || "").trim()
  const section = doc?.sections?.[0]?.section || ""
  if (crime && section) return `${crime.charAt(0).toUpperCase()}${crime.slice(1)} — s.${section}`
  if (crime) return crime.charAt(0).toUpperCase() + crime.slice(1)
  const summary = (doc?.case?.summary || "").trim()
  if (!summary) return "Untitled matter"
  return summary.length > 60 ? `${summary.slice(0, 60)}…` : summary
}
