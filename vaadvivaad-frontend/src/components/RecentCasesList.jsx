import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import axios from "axios"
import backendURL from "../config"


export default function RecentCasesList() {
  const [cases, setCases] = useState([])
  const [hoveredCase, setHoveredCase] = useState(null)
  const loggedInUser = JSON.parse(localStorage.getItem("user"))

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const token = localStorage.getItem("token")
        

       
        const response = await axios.get(`${backendURL}/user_case/${loggedInUser.user_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setCases(response.data.user_cases)
      } catch (error) {
        console.error("Error fetching user cases:", error)
      }
    }

    fetchCases()
  }, [])

  return (
    <div className="divide-y divide-gray-200">
      {cases.length === 0 ? (
        <div className="p-4 text-gray-500 text-center">No cases found.</div>
      ) : (
        cases.map((caseItem, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onMouseEnter={() => setHoveredCase(caseItem.case_id)}
            onMouseLeave={() => setHoveredCase(null)}
            className={`p-4 transition-colors ${hoveredCase === caseItem.case_id ? "bg-blue-50" : ""}`}
          >
            <Link to={`/case/${caseItem.case_id}`} className="block">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-800">{caseItem.case_id}</h3>
                  <p className="text-sm text-gray-500">
                    Date: {new Date(caseItem.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      caseItem.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {caseItem.is_active ? "Active" : "Completed"}
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
