import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"

export default function RecentCasesList({ cases = [], loading = false, dark = false, hasQuery = false }) {
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/40"

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className={`font-mono text-xs ${faint}`}>Loading case history…</p>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText size={28} className={`mx-auto mb-3 ${faint}`} />
        <p className={`text-sm ${muted}`}>
          {hasQuery ? "No cases match that search." : "No cases on the record yet — file your first one."}
        </p>
      </div>
    )
  }

  return (
    <div>
      {cases.map((caseItem, index) => (
        <motion.div
          key={caseItem.id || index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
          className={index !== 0 ? "docket-rule" : ""}
        >
          <Link
            to={`/case/${caseItem.id}`}
            className={`flex items-center justify-between gap-4 py-4 px-1 transition-colors group ${dark ? "hover:bg-white/[0.03]" : "hover:bg-ink-blue/[0.03]"
              }`}
          >
            <div className="min-w-0">
              <h3 className={`font-medium truncate transition-colors ${dark ? "text-white group-hover:text-brass" : "text-ink-blue group-hover:text-brass"
                }`}>
                {caseItem.title}
              </h3>
              <p className={`text-xs font-mono mt-0.5 ${faint}`}>
                {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Date unknown"}
              </p>
            </div>
            <span
              className={`flex-shrink-0 docket-label text-[10px] px-2.5 py-1 rounded-full ${caseItem.status === "completed"
                ? "text-verdict bg-verdict/10"
                : dark ? "text-gray-400 bg-white/5" : "text-ink-blue/50 bg-ink-blue/5"
                }`}
            >
              {caseItem.status}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
