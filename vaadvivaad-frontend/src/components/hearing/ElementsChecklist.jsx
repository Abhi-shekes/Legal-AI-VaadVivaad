import { BookOpen, Check, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react"

import StatutePopover from "../StatutePopover"

/**
 * What the prosecution has to prove, ticking off as it gets addressed.
 *
 * The statutory elements were already retrieved and already sent to the client;
 * they were rendered as a static list. Matching them against each turn's
 * `element_addressed` turns that list into a live scoreboard of the hearing,
 * which is the thing a person actually wants to follow.
 *
 * The match is deliberately loose -- the model names the element in its own
 * words -- so a tick means "counsel spoke to this", not "this is proven".
 */

function addressed(elementName, turns) {
  const target = (elementName || "").toLowerCase().trim()
  if (!target) return false
  return turns.some((t) => {
    const said = (t.turn?.element_addressed || "").toLowerCase()
    if (!said) return false
    return said.includes(target) || target.includes(said)
  })
}

export default function ElementsChecklist({ details, turns = [] }) {
  if (!details) return null

  const section = details.section || {}
  const statute = details.statute
  const elements = statute?.elements || []
  const precedents = details.precedents || []

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-line/10">
        <p className="docket-label text-[10px] text-accent mb-1">Provision engaged</p>
        <p className="text-[13.5px] font-medium">{section.label || "—"}</p>
        {section.subject && <p className="text-[12px] text-content/55 mt-1">{section.subject}</p>}
        {details.statute_note && (
          <p className="text-[11px] text-content/40 mt-2">{details.statute_note}</p>
        )}
        {section.provisional && section.counterpart_section && (
          <p className="text-[11px] mt-2 text-dissent">
            The IPC/BNS correspondence shown is provisional and unverified.
          </p>
        )}
      </div>

      {(details.all_sections || []).length > 1 && (
        <div className="px-5 py-3 border-b border-line/10">
          <p className="docket-label text-[10px] text-content/40 mb-2">Also disclosed</p>
          <div className="flex flex-wrap gap-1.5">
            {details.all_sections.slice(1).map((s) => (
              <StatutePopover
                key={s.section}
                section={s.section}
                code={s.code || "IPC"}
                incidentDate={details.incident_date || ""}
              />
            ))}
          </div>
        </div>
      )}

      {elements.length > 0 && (
        <div className="px-5 py-4 border-b border-line/10">
          <div className="flex items-center gap-2 mb-3">
            <p className="docket-label text-[10px] text-accent">Elements to prove</p>
            {details.statute_verified ? (
              <ShieldCheck size={12} className="text-verdict" title="From the curated corpus" />
            ) : (
              <ShieldAlert size={12} className="text-dissent" title="Machine-generated, unverified" />
            )}
            <span className="ml-auto font-mono text-[11px] tabular-nums text-content/45">
              {elements.filter((el) => addressed(el.element, turns)).length}/{elements.length}
            </span>
          </div>

          <ul className="space-y-2.5">
            {elements.map((el, i) => {
              const met = addressed(el.element, turns)
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-sm shrink-0 flex items-center justify-center
                                transition-colors duration-enter ${
                                  met ? "bg-verdict/20 text-verdict" : "bg-content/5 text-transparent"
                                }`}
                  >
                    <Check size={10} />
                  </span>
                  <span className="text-[12px] leading-relaxed">
                    <span className={met ? "font-medium" : "font-medium text-content/70"}>
                      {el.element}
                    </span>
                    <span className="text-content/50"> — {el.description}</span>
                  </span>
                </li>
              )
            })}
          </ul>

          {statute?.mens_rea && (
            <p className="text-[12px] text-content/55 mt-3 pt-3 border-t border-line/5">
              <span className="font-medium text-content/75">Mental element:</span> {statute.mens_rea}
            </p>
          )}
          {!details.statute_verified && (
            <p className="text-[11px] mt-2.5 text-dissent">
              This statutory summary is machine-generated. Check it against the bare Act.
            </p>
          )}
          <p className="text-[11px] text-content/40 mt-2.5">
            A tick means counsel spoke to that element, not that it is proven.
          </p>
        </div>
      )}

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-2.5">
          <BookOpen size={12} className="text-accent" />
          <p className="docket-label text-[10px] text-accent">Authorities retrieved</p>
        </div>

        {precedents.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-content/55">
            {details.precedent_note ||
              "No verified precedent was found. Both sides argue from the statutory elements and the record."}
          </p>
        ) : (
          <ul className="space-y-3">
            {precedents.map((p) => (
              <li key={p.citation_id} className="text-[12px]">
                <div className="flex items-start gap-1.5">
                  <span className="font-medium leading-snug">{p.case_name}</span>
                  {p.source_url && (
                    <a
                      href={p.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent mt-0.5 shrink-0"
                      aria-label={`Read ${p.case_name}`}
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <p className="font-mono text-[10px] text-content/40 mt-0.5 tabular-nums">
                  {[p.court, p.date?.slice(0, 4)].filter(Boolean).join(" · ")} · match{" "}
                  {(p.score * 100).toFixed(0)}%
                </p>
                {p.holding && (
                  <p className="text-content/55 mt-1 leading-relaxed">{p.holding}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
