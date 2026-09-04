import { BookOpen, ExternalLink, Scale, ShieldAlert, ShieldCheck } from "lucide-react"

/**
 * The case-analysis panel.
 *
 * This is what the old UI gated on a `case_details` socket event the backend
 * never emitted, so all the retrieval work the system paid for was invisible.
 * It now renders the section (in both codes), the statutory elements, and the
 * precedent actually retrieved — each marked verified or not, because "we
 * found nothing" is a real and useful answer here.
 */
export default function CaseAnalysisPanel({ details, dark }) {
  if (!details) return null

  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/45"
  const card = dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10"
  const section = details.section || {}
  const statute = details.statute
  const precedents = details.precedents || []

  return (
    <div className={`rounded-xl border overflow-hidden ${card}`}>
      <div className={`px-5 py-4 border-b flex items-center gap-2.5 ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
        <Scale size={16} className="text-brass" />
        <h3 className="font-display text-base">Case analysis</h3>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <p className="docket-label text-[10px] text-brass mb-1.5">Provision engaged</p>
          <p className="text-sm font-medium">{section.label || "—"}</p>
          {section.subject && <p className={`text-xs mt-1 ${muted}`}>{section.subject}</p>}
          {details.statute_note && <p className={`text-[11px] mt-2 ${faint}`}>{details.statute_note}</p>}
          {section.provisional && section.counterpart_section && (
            <p className="text-[11px] mt-2 text-dissent/90">
              The IPC/BNS correspondence shown is provisional and unverified.
            </p>
          )}
        </div>

        {(details.all_sections || []).length > 1 && (
          <div>
            <p className="docket-label text-[10px] text-brass mb-1.5">Also disclosed</p>
            <div className="flex flex-wrap gap-1.5">
              {details.all_sections.slice(1).map((s) => (
                <span
                  key={s.section}
                  title={s.rationale}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    dark ? "bg-white/10 text-gray-300" : "bg-ink-blue/[0.06] text-ink-blue/70"
                  }`}
                >
                  s.{s.section}
                </span>
              ))}
            </div>
          </div>
        )}

        {statute && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="docket-label text-[10px] text-brass">Elements to prove</p>
              {details.statute_verified ? (
                <ShieldCheck size={12} className="text-verdict" title="From the curated corpus" />
              ) : (
                <ShieldAlert size={12} className="text-dissent" title="Machine-generated, unverified" />
              )}
            </div>
            <ul className="space-y-1.5">
              {(statute.elements || []).map((el, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  <span className="font-medium">{el.element}</span>
                  <span className={muted}> — {el.description}</span>
                </li>
              ))}
            </ul>
            {statute.mens_rea && (
              <p className={`text-xs mt-2 ${muted}`}>
                <span className="font-medium">Mental element:</span> {statute.mens_rea}
              </p>
            )}
            {!details.statute_verified && (
              <p className="text-[11px] mt-2 text-dissent/90">
                This statutory summary is machine-generated. Check it against the bare Act.
              </p>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={12} className="text-brass" />
            <p className="docket-label text-[10px] text-brass">Authorities retrieved</p>
          </div>
          {precedents.length === 0 ? (
            <p className={`text-xs leading-relaxed ${muted}`}>
              {details.precedent_note ||
                "No verified precedent was found. Both sides argue from the statutory elements and the record."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {precedents.map((p) => (
                <li key={p.citation_id} className="text-xs">
                  <div className="flex items-start gap-1.5">
                    <span className="font-medium leading-snug">{p.case_name}</span>
                    {p.source_url && (
                      <a href={p.source_url} target="_blank" rel="noreferrer" className="text-brass mt-0.5">
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <p className={`${faint} font-mono text-[10px] mt-0.5`}>
                    {[p.court, p.date?.slice(0, 4)].filter(Boolean).join(" · ")} · match{" "}
                    {(p.score * 100).toFixed(0)}%
                  </p>
                  {p.holding && <p className={`${muted} mt-1 leading-relaxed`}>{p.holding}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
