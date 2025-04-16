import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Scale, User, LogOut, FileText, Plus, Search } from "lucide-react"
import CaseSubmissionForm from "../components/CaseSubmissionForm"
import RecentCasesList from "../components/RecentCasesList"

export default function Dashboard() {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-950 text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center text-xl font-serif font-bold">
              <Scale className="mr-2" /> LegalAI
            </Link>

            <div className="flex items-center space-x-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search cases..."
                  className="bg-blue-900 text-white placeholder-blue-300 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-300" />
              </div>

              <div className="flex items-center">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-blue-950 font-bold mr-2">
                  A
                </div>
                <span className="font-medium">Adv. Sharma</span>
              </div>

              <button className="text-blue-300 hover:text-white transition-colors">
                <LogOut />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-serif font-bold text-gray-800">Dashboard</h1>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSubmissionForm(true)}
            className="flex items-center bg-blue-900 hover:bg-blue-800 text-white py-2 px-4 rounded-md shadow-sm transition-colors"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Case
          </motion.button>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-900"
            >
              <h3 className="text-lg font-medium text-gray-500 mb-2">Active Cases</h3>
              <p className="text-3xl font-bold text-gray-800">12</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500"
            >
              <h3 className="text-lg font-medium text-gray-500 mb-2">Completed Cases</h3>
              <p className="text-3xl font-bold text-gray-800">48</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500"
            >
              <h3 className="text-lg font-medium text-gray-500 mb-2">Success Rate</h3>
              <p className="text-3xl font-bold text-gray-800">78%</p>
            </motion.div>
          </div>

          {/* Recent Cases */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h2 className="text-xl font-serif font-bold text-gray-800">Recent Cases</h2>
              </div>

              <RecentCasesList />
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h2 className="text-xl font-serif font-bold text-gray-800">Quick Actions</h2>
              </div>

              <div className="p-6 space-y-4">
                <Link
                  to="/case/new"
                  className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center text-white mr-3">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">New Case</h3>
                    <p className="text-sm text-gray-500">Create a new legal case</p>
                  </div>
                </Link>

                <Link
                  to="/cases"
                  className="flex items-center p-3 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                >
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white mr-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">All Cases</h3>
                    <p className="text-sm text-gray-500">View your case history</p>
                  </div>
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white mr-3">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Profile</h3>
                    <p className="text-sm text-gray-500">Manage your account</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Case Submission Modal */}
      <AnimatePresence>
        {showSubmissionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-blue-950 text-white px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-serif font-bold">New Case Submission</h2>
                <button
                  onClick={() => setShowSubmissionForm(false)}
                  className="text-white hover:text-amber-300 transition-colors"
                >
                  &times;
                </button>
              </div>

              <CaseSubmissionForm onClose={() => setShowSubmissionForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
