import { AlertTriangle, Check, Pencil } from "lucide-react"

/**
 * What the document turned out to say, shown back for correction.
 *
 * A document of this kind records allegations, not findings, and the extraction
 * is a machine reading of it. Both facts are stated here rather than implied,
 * and every field is editable before the hearing opens -- which is what the
 * endpoint's own contract asks for.
 */
export default function ExtractionReview({ extracted, kind, onEdit, onConfirm, confirming }) {
  const parties = extracted?.parties || []
  const evidence = extracted?.evidence || []
  const disputed = extracted?.disputed_facts || []

  const Field = ({ label, value, empty = "Not stated in the document" }) => (
    <div>
      <p className="docket-label text-[10px] text-content/40 mb-1">{label}</p>
      <p className={`text-[13px] leading-relaxed ${value ? "" : "text-content/40 italic"}`}>
        {value || empty}
      </p>
    </div>
  )

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-line/10 flex items-center justify-between gap-3">
        <div>
          <p className="docket-label text-[10px] text-accent mb-1">Read from your document</p>
          <h2 className="font-display text-lg leading-tight">
            {kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "Case record"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-content/60 hover:text-accent
                     transition-colors duration-ui"
        >
          <Pencil size={13} />
          Edit as text
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex gap-2.5 rounded-lg border border-accent-solid/30 bg-accent-solid/5 p-3">
          <AlertTriangle size={14} className="text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] leading-relaxed text-content/70">
            A document of this kind records <span className="font-medium">allegations, not findings</span>,
            and this is a machine reading of it. Correct anything that is wrong before the hearing opens.
          </p>
        </div>

        <Field label="Summary" value={extracted?.summary} />

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Classification" value={extracted?.crime_type} />
          <Field label="Date of incident" value={extracted?.incident_date} />
          <Field label="Location" value={extracted?.location} />
        </div>

        {parties.length > 0 && (
          <div>
            <p className="docket-label text-[10px] text-content/40 mb-2">Parties</p>
            <ul className="flex flex-wrap gap-2">
              {parties.map((p, i) => (
                <li
                  key={`${p.role}-${i}`}
                  className="text-[12px] px-2.5 py-1 rounded-lg bg-content/5"
                >
                  <span className="text-content/50">{p.role}</span>
                  {p.name && <span className="font-medium ml-1.5">{p.name}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {evidence.length > 0 && (
          <div>
            <p className="docket-label text-[10px] text-content/40 mb-2">Exhibits referred to</p>
            <ul className="space-y-1.5">
              {evidence.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px]">
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.in_possession ? "bg-verdict" : "bg-content/25"
                    }`}
                  />
                  <span>
                    {item.description}
                    <span className="text-content/40 ml-1.5">
                      {item.in_possession ? "seized or produced" : "referred to only"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {disputed.length > 0 && (
          <div>
            <p className="docket-label text-[10px] text-content/40 mb-2">Flagged as contested</p>
            <ul className="space-y-1 text-[12.5px] text-content/70 list-disc pl-4">
              {disputed.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="w-full inline-flex items-center justify-center gap-2 bg-accent-solid text-accent-on
                     font-semibold py-3 rounded-lg text-sm hover:brightness-105 disabled:opacity-50
                     transition-all duration-ui"
        >
          <Check size={16} />
          {confirming ? "Opening the hearing…" : "This is correct — open the hearing"}
        </button>
      </div>
    </div>
  )
}
