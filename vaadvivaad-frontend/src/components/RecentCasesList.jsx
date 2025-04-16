import { useState } from "react"
import { Routes, Route , Link } from "react-router-dom";
import { motion } from "framer-motion"

// Sample data for recent cases
const recentCases = [
  {
    id: "123",
    title: "State v. Defendant X",
    section: "376 (Rape)",
    date: "2023-05-15",
    status: "Active",
  },
  {
    id: "122",
    title: "Client Y v. Corporation Z",
    section: "420 (Cheating)",
    date: "2023-05-10",
    status: "Active",
  },
  {
    id: "121",
    title: "Property Dispute - Client A",
    section: "Civil Case",
    date: "2023-05-05",
    status: "Active",
  },
  {
    id: "120",
    title: "Domestic Violence Case",
    section: "498A",
    date: "2023-04-28",
    status: "Completed",
  },
  {
    id: "119",
    title: "Corporate Fraud Investigation",
    section: "420, 120B",
    date: "2023-04-20",
    status: "Completed",
  },
]

export default function RecentCasesList() {
  const [hoveredCase, setHoveredCase] = useState(null)

  return (
    <div className="divide-y divide-gray-200">
      {recentCases.map((caseItem, index) => (
        <motion.div
          key={caseItem.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          onMouseEnter={() => setHoveredCase(caseItem.id)}
          onMouseLeave={() => setHoveredCase(null)}
          className={`p-4 transition-colors ${hoveredCase === caseItem.id ? "bg-blue-50" : ""}`}
        >
          <Link href={`/case/${caseItem.id}`} className="block">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-800">{caseItem.title}</h3>
                <p className="text-sm text-gray-500">
                  Section: {caseItem.section} | Date: {new Date(caseItem.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    caseItem.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {caseItem.status}
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
