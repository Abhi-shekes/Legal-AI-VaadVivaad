import { readiness } from "../../lib/hearing"

/**
 * What a good filing contains.
 *
 * Five facts the pipeline looks for, lit as they appear in the draft. This is
 * guidance, never a gate -- the form submits regardless. The old form said
 * "be concrete" in eleven-point grey and left the user to guess at the rest.
 */
export default function ReadinessMeter({ text }) {
  const signals = readiness(text)
  const met = signals.filter((s) => s.met).length

  return (
    <div className="rounded-lg border border-line/10 bg-surface p-5 elev-1">
      <div className="flex items-baseline justify-between mb-1">
        <p className="docket-label text-[10px] text-content/40">Readiness</p>
        <p className="font-mono text-[11px] tabular-nums text-content/50">{met}/{signals.length}</p>
      </div>

      <div className="flex gap-1 mb-4" aria-hidden="true">
        {signals.map((s) => (
          <span
            key={s.id}
            className={`h-1 flex-1 rounded-full transition-colors duration-enter ease-ui ${
              s.met ? "bg-verdict" : "bg-content/10"
            }`}
          />
        ))}
      </div>

      <ul className="space-y-2.5">
        {signals.map((s) => (
          <li key={s.id} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-enter ${
                s.met ? "bg-verdict" : "bg-content/25"
              }`}
            />
            <span>
              <span className={`block text-[12.5px] ${s.met ? "text-content" : "text-content/60"}`}>
                {s.label}
              </span>
              {!s.met && <span className="block text-[11px] text-content/40 mt-0.5">{s.hint}</span>}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-content/40 mt-4 pt-3 border-t border-line/5 leading-relaxed">
        A prompt, not a requirement. You can file whenever you are ready.
      </p>
    </div>
  )
}
