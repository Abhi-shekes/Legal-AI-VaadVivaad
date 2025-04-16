import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function CaseSubmissionForm({ onClose }) {
  
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    caseId: "",
    facts: "",
    ipcSections: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      navigate("/user/casePage")
      
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-6">
        <div>
          <label htmlFor="caseId" className="block text-sm font-medium text-gray-700 mb-1">
            Case ID / Reference Number
          </label>
          <input
            type="text"
            id="caseId"
            name="caseId"
            value={formData.caseId}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
            placeholder="e.g., CR-2023-0123"
          />
        </div>

        <div>
          <label htmlFor="facts" className="block text-sm font-medium text-gray-700 mb-1">
            Case Facts
          </label>
          <textarea
            id="facts"
            name="facts"
            value={formData.facts}
            onChange={handleChange}
            required
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
            placeholder="Describe the facts of the case in detail..."
          ></textarea>
        </div>

        <div>
          <label htmlFor="ipcSections" className="block text-sm font-medium text-gray-700 mb-1">
            Relevant IPC Sections
          </label>
          <input
            type="text"
            id="ipcSections"
            name="ipcSections"
            value={formData.ipcSections}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
            placeholder="e.g., 376, 302, 120B"
          />
          <p className="mt-1 text-sm text-gray-500">Enter comma-separated IPC section numbers</p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
          >
            Cancel
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Submit Case"
            )}
          </motion.button>
        </div>
      </div>
    </form>
  )
}
