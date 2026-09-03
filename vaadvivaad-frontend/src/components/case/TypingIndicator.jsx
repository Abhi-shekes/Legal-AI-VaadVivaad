import { ShieldCheck, Gavel } from "lucide-react"

const TypingIndicator = ({ role, dark }) => {
  const isSupporting = role === "supporting"
  const roleName = isSupporting ? "Supporting counsel" : "Opposing counsel"

  return (
    <div className={`message-fade-up flex items-start gap-3 p-5 rounded-xl border ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}>
      <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${isSupporting ? "bg-verdict/15 text-verdict" : "bg-dissent/15 text-dissent"}`}>
        {isSupporting ? <ShieldCheck size={16} /> : <Gavel size={16} />}
      </div>
      <div>
        <p className={`text-sm font-medium ${dark ? "text-white" : "text-ink-blue"}`}>{roleName}</p>
        <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${dark ? "text-gray-500" : "text-ink-blue/50"}`}>
          Preparing argument
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </p>
      </div>
    </div>
  )
}

export default TypingIndicator
