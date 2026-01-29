import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"

export default function RecentCasesList({ cases = [], loading = false }) {
  const [hoveredCase, setHoveredCase] = useState(null)

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading cases...</div>
  }

  return (
    <div className="divide-y divide-gray-200">
      {cases.length === 0 ? (
        <div className="p-4 text-gray-500 text-center">No cases found.</div>
      ) : (
        cases.map((caseItem, index) => (
          <motion.div
            key={caseItem.id || index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onMouseEnter={() => setHoveredCase(caseItem.id)}
            onMouseLeave={() => setHoveredCase(null)}
            className={`p-4 transition-colors ${hoveredCase === caseItem.id ? "bg-blue-50" : ""}`}
          >
            <Link to={`/case/${caseItem.id}`} className="block">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-800">{caseItem.title}</h3>
                  <p className="text-sm text-gray-500">
                    Date: {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${caseItem.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {caseItem.status}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))
      )}
    </div>
  )
}
