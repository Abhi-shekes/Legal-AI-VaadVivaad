import { Scroll, Gavel } from "lucide-react"

const ArgumentDetails = ({ argument, dark }) => {
  const muted = dark ? "text-gray-300" : "text-ink-blue/80"
  const faint = dark ? "text-gray-500" : "text-ink-blue/50"

  if (typeof argument !== "object" || argument === null) {
    return <p className={`leading-relaxed text-sm ${muted}`}>{String(argument)}</p>
  }

  return (
    <div className="space-y-4">
      <p className={`leading-relaxed text-sm ${dark ? "text-white" : "text-ink-blue"}`}>
        {argument.point || "No point stated."}
      </p>

      {argument.evidence && argument.evidence.length > 0 && (
        <div className="rounded-lg p-4 border bg-brass/5 border-brass/20">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-brass">
            <Scroll size={13} />
            Supporting evidence
          </div>
          <ul className="space-y-1.5">
            {argument.evidence.map((e, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm ${muted}`}>
                <span className="w-1 h-1 rounded-full bg-brass mt-2 flex-shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`rounded-lg p-4 border ${dark ? "bg-white/5 border-white/10" : "bg-ink-blue/[0.03] border-ink-blue/10"}`}>
        <div className={`flex items-center gap-2 mb-1.5 text-xs font-semibold ${faint}`}>
          <Gavel size={13} />
          Legal demand
        </div>
        <p className={`text-sm ${muted}`}>{argument.demand || "No specific demand made."}</p>
      </div>
    </div>
  )
}

export default ArgumentDetails
