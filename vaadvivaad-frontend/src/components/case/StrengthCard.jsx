/**
 * Case-strength meter.
 *
 * Always rendered with its decomposition. A bare score from a model is an
 * assertion, not a measurement, so the factors that produced it are shown
 * alongside and the caveat is never hidden.
 */
export default function StrengthCard({ strength, dark }) {
  if (!strength) return null
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/45"
  const track = dark ? "bg-white/10" : "bg-ink-blue/10"

  const Bar = ({ label, value, colour }) => (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="docket-label text-[10px]">{label}</span>
        <span className="font-mono text-xs">{Math.round((value ?? 0) * 100)}%</span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${track}`}>
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${(value ?? 0) * 100}%` }} />
      </div>
    </div>
  )

  return (
    <div className={`rounded-xl border overflow-hidden ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}>
      <div className={`px-5 py-4 border-b ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
        <h3 className="font-display text-base">Case strength</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Bar label="Prosecution" value={strength.prosecution_score} colour="bg-verdict" />
          <Bar label="Defence" value={strength.defence_score} colour="bg-dissent" />
        </div>

        {(strength.factors || []).length > 0 && (
          <div>
            <p className="docket-label text-[10px] text-brass mb-2">What drives this</p>
            <ul className="space-y-2">
              {strength.factors.map((f, i) => (
                <li key={i} className="text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{f.factor}</span>
                    <span className={`font-mono text-[10px] ${faint}`}>
                      w{(f.weight ?? 0).toFixed(2)} · {Math.round((f.score ?? 0) * 100)}%
                    </span>
                  </div>
                  {f.note && <p className={`${muted} leading-relaxed mt-0.5`}>{f.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(strength.sensitivity || []).length > 0 && (
          <div className={`rounded-lg p-3.5 ${dark ? "bg-white/[0.04]" : "bg-parchment/60"}`}>
            <p className="docket-label text-[10px] text-brass mb-2">Sensitivity</p>
            <ul className="space-y-1.5">
              {strength.sensitivity.map((s, i) => (
                <li key={i} className={`text-xs leading-relaxed ${muted}`}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {strength.caveat && <p className={`text-[11px] leading-relaxed ${faint}`}>{strength.caveat}</p>}
      </div>
    </div>
  )
}
