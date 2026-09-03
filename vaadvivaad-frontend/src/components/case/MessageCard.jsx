import { useState } from "react"
import { motion } from "framer-motion"
import {
  Info, ShieldCheck, Gavel, Flag, AlertTriangle, FileText, Crown,
  ChevronUp, ChevronDown, Loader2, CheckCircle2,
} from "lucide-react"
import ArgumentDetails from "./ArgumentDetails"

const MessageCard = ({ data, dark }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const cardBase = dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"

  const getConfig = () => {
    switch (data.type) {
      case "initial_response":
        return {
          icon: Info,
          title: "Case analysis & initial arguments",
          accent: "border-l-4 border-brass",
          iconWrap: "bg-brass/15 text-brass",
        }
      case "debate_response": {
        const isSupporting = data.role === "supporting"
        return {
          icon: isSupporting ? ShieldCheck : Gavel,
          title: `${isSupporting ? "Supporting" : "Opposing"} counsel — round ${data.round}`,
          accent: isSupporting ? "border-l-4 border-verdict" : "border-l-4 border-dissent",
          iconWrap: isSupporting ? "bg-verdict/15 text-verdict" : "bg-dissent/15 text-dissent",
        }
      }
      case "debate_concluded":
        return {
          icon: Flag,
          title: "Final verdict",
          accent: "border-l-4 border-brass",
          iconWrap: "bg-brass/15 text-brass",
        }
      case "status":
        return {
          icon: data.status === "success" ? CheckCircle2 : Loader2,
          title: data.title || "System status",
          accent: dark ? "border-l-4 border-white/10" : "border-l-4 border-ink-blue/10",
          iconWrap: dark ? "bg-white/10 text-gray-300" : "bg-ink-blue/5 text-ink-blue/60",
          spin: data.status !== "success",
        }
      case "error":
      case "debate_failed":
      default:
        return {
          icon: AlertTriangle,
          title: "System alert",
          accent: "border-l-4 border-dissent",
          iconWrap: "bg-dissent/15 text-dissent",
        }
    }
  }

  const config = getConfig()

  const renderContent = () => {
    switch (data.type) {
      case "initial_response": {
        const similarCase = data.similar_case
        return (
          <div className="space-y-5">
            <div className={`rounded-lg p-4 border ${dark ? "bg-white/5 border-white/10" : "bg-ink-blue/[0.03] border-ink-blue/10"}`}>
              <div className={`flex items-center gap-2 mb-1.5 text-xs font-semibold docket-label ${dark ? "text-gray-300" : "text-ink-blue/70"}`}>
                <FileText size={13} />
                Case analysis
              </div>
              <p className={`italic text-sm ${muted}`}>"{data.processed_prompt?.refined_prompt || "N/A"}"</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg p-4 border bg-brass/5 border-brass/20">
                <p className="docket-label text-[10px] text-brass mb-1.5">Relevant IPC section</p>
                <p className={`text-sm font-medium ${dark ? "text-white" : "text-ink-blue"}`}>{data.ipc_section || "N/A"}</p>
              </div>

              <div className="rounded-lg p-4 border bg-verdict/5 border-verdict/20">
                <p className="docket-label text-[10px] text-verdict mb-1.5">Case precedent</p>
                {typeof similarCase === "object" && similarCase !== null ? (
                  <div>
                    <p className={`text-sm font-medium ${dark ? "text-white" : "text-ink-blue"}`}>{similarCase.case_id_name || "Unknown case"}</p>
                    <p className={`text-xs mt-0.5 ${muted}`}>
                      {similarCase.court || "N/A"} • {similarCase.date_of_judgment || "N/A"}
                    </p>
                    <p className={`text-xs mt-1.5 italic ${muted}`}>"{similarCase.case_summary || "No summary available."}"</p>
                  </div>
                ) : (
                  <p className={`text-sm ${muted}`}>No precedent found</p>
                )}
              </div>
            </div>

            <div className="rounded-lg p-5 border-l-4 border-verdict bg-verdict/5">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-verdict docket-label">
                <ShieldCheck size={13} />
                Initial supporting argument
              </div>
              <ArgumentDetails argument={data.argument} dark={dark} />
            </div>
          </div>
        )
      }
      case "debate_response":
        return <ArgumentDetails argument={data.argument} dark={dark} />
      case "debate_concluded":
        return (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brass flex items-center justify-center shadow-[0_0_30px_-6px_rgba(199,160,70,0.7)]">
              <Crown size={22} className="text-ink" />
            </div>
            <h3 className={`font-display text-xl mb-1.5 ${dark ? "text-white" : "text-ink-blue"}`}>Debate concluded</h3>
            <p className={`text-sm mb-1 ${muted}`}>
              The proceedings concluded after {data.total_rounds} round{data.total_rounds === 1 ? "" : "s"} of arguments.
            </p>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-ink-blue/40"}`}>Click "Save case" to store this debate.</p>
          </div>
        )
      case "status":
        return (
          <div className={`flex items-center gap-3 text-sm ${muted}`}>
            {data.status === "success" ? (
              <CheckCircle2 size={16} className="text-verdict flex-shrink-0" />
            ) : (
              <Loader2 size={16} className="animate-spin text-brass flex-shrink-0" />
            )}
            {data.message}
          </div>
        )
      case "error":
      case "debate_failed":
        return (
          <div className="flex items-center gap-3 text-sm">
            <AlertTriangle size={16} className="text-dissent flex-shrink-0" />
            <p className="text-dissent">{data.message || "The debate could not be completed. Please try again."}</p>
          </div>
        )
      default:
        return null
    }
  }

  const isDebateResponse = data.type === "debate_response"
  const isSupportingRole = data.role === "supporting"
  const initial = isDebateResponse ? { opacity: 0, x: isSupportingRole ? -24 : 24 } : { opacity: 0, y: 12 }

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-xl overflow-hidden border ${cardBase} ${config.accent}`}
    >
      <header
        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.iconWrap}`}>
            <config.icon size={15} className={config.spin ? "animate-spin" : ""} />
          </div>
          <span className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-ink-blue"}`}>{config.title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {data.timestamp && (
            <span className={`font-mono text-[10px] ${dark ? "text-gray-500" : "text-ink-blue/40"}`}>{data.timestamp}</span>
          )}
          {isExpanded ? <ChevronUp size={14} className={muted} /> : <ChevronDown size={14} className={muted} />}
        </div>
      </header>
      {isExpanded && <div className="px-5 pb-5">{renderContent()}</div>}
    </motion.div>
  )
}

export default MessageCard
