/**
 * Case-strength meter.
 *
 * Always rendered with its decomposition. A bare score from a model is an
 * assertion, not a measurement, so the factors that produced it are shown
 * alongside and the caveat is never hidden.
 */
export default function StrengthCard({ strength }) {
  if (!strength) return null

  const Bar = ({ label, value, colour }) => (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="docket-label text-[10px] text-content/55">{label}</span>
        <span className="font-mono text-[11px] tabular-nums">{Math.round((value ?? 0) * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-content/10">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${(value ?? 0) * 100}%` }} />
      </div>
    </div>
  )

  return (
    <div className="rounded-lg border border-line/10 bg-surface elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-line/10">
        <h3 className="font-display text-base">Case strength</h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Bar label="Prosecution" value={strength.prosecution_score} colour="bg-verdict" />
          <Bar label="Defence" value={strength.defence_score} colour="bg-dissent" />
        </div>

        {(strength.factors || []).length > 0 && (
          <div>
            <p className="docket-label text-[10px] text-accent mb-2">What drives this</p>
            <ul className="space-y-2">
              {strength.factors.map((f, i) => (
                <li key={i} className="text-[12px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{f.factor}</span>
                    <span className="font-mono text-[10px] tabular-nums text-content/45">
                      w{(f.weight ?? 0).toFixed(2)} · {Math.round((f.score ?? 0) * 100)}%
                    </span>
                  </div>
                  {f.note && <p className="text-content/60 leading-relaxed mt-0.5">{f.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(strength.sensitivity || []).length > 0 && (
          <div className="rounded-lg bg-content/5 p-3.5">
            <p className="docket-label text-[10px] text-accent mb-2">Sensitivity</p>
            <ul className="space-y-1.5">
              {strength.sensitivity.map((s, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-content/60">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {strength.caveat && (
          <p className="text-[11px] leading-relaxed text-content/45">{strength.caveat}</p>
        )}
      </div>
    </div>
  )
}
