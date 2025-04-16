"use client"

import { motion, AnimatePresence } from "framer-motion"
import { LucideChevronDown, LucideChevronUp, LucideBookOpen, LucideAlertTriangle } from "lucide-react"

export default function ArgumentCard({ argument, isActive, index, onToggle }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">  

    
      <motion.button
        whileHover={{ backgroundColor: "#f8fafc" }}
        onClick={onToggle}
        className="w-full flex justify-between items-center px-6 py-4 text-left"
      >
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold mr-3">
            {index + 1}
          </div>
          <h3 className="font-serif font-bold text-gray-800 pr-4">{argument.argument}</h3>
        </div>
        {isActive ? <LucideChevronUp /> : <LucideChevronDown />}
      </motion.button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 py-4 border-t border-gray-100">
              {/* Elements Section */}
              <div className="mb-6">
                <h4 className="text-lg font-serif font-bold text-gray-800 mb-3">Elements</h4>
                <ul className="space-y-2">
                  {argument.elements.map((element, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                      className="flex items-center bg-blue-50 px-4 py-2 rounded-md"
                    >
                      <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                        {idx + 1}
                      </div>
                      <span>{element}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Precedents Section */}
              <div className="mb-6">
                <h4 className="text-lg font-serif font-bold text-gray-800 mb-3 flex items-center">
                  <LucideBookOpen className="mr-2 h-5 w-5 text-amber-600" />
                  Supporting Precedents
                </h4>
                <ul className="space-y-2">
                  {argument.precedents.map((precedent, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 + 0.3 }}
                      className="bg-amber-50 px-4 py-3 rounded-md border-l-4 border-amber-500"
                    >
                      <p className="font-medium text-gray-800">{precedent}</p>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Counter Arguments Section */}
              {argument.counter_arguments && argument.counter_arguments.length > 0 && (
                <div>
                  <h4 className="text-lg font-serif font-bold text-gray-800 mb-3 flex items-center">
                    <LucideAlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                    Potential Counter-Arguments
                  </h4>

                  {argument.counter_arguments.map((counter, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                      className="bg-red-50 p-4 rounded-md border-l-4 border-red-400 mb-4"
                    >
                      <p className="font-medium text-gray-800 mb-3">{counter.loophole}</p>

                      <h5 className="text-sm font-medium text-gray-700 mb-2">Supporting Precedents:</h5>
                      <ul className="space-y-2">
                        {counter.supporting_precedents.map((precedent, pidx) => (
                          <li key={pidx} className="bg-white px-3 py-2 rounded-md text-sm">
                            {precedent}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
