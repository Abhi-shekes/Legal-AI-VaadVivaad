"use client"

import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Scale, ArrowLeft, ChevronDown, ChevronUp, Gavel } from "lucide-react"
import ArgumentCard from "../components/ArgumentCard"



// Inside the `CasePage` component:
// useEffect(() => {
//   const interval = setInterval(() => {
//     setActiveArgument((prev) => {
//       const next = prev + 1
//       return next < caseData.arguments.length ? next : -1 // or 0 if you want to loop
//     })
//   }, 6000) // Adjust timing as needed

//   return () => clearInterval(interval)
// }, [])

// Sample case data (would normally come from an API)
const sampleCaseData = {
  facts:
    "The prosecutrix, Ms. X, alleges that the accused, Mr. Y, forcibly entered her home, physically overpowered her and committed rape. Medical examination confirms recent sexual activity but shows no signs of physical injury. Mr. Y claims consensual sex.",
  ipc_sections: "376 (Rape)",
  arguments: [
    {
      argument:
        "Sexual intercourse occurred against the will of the prosecutrix, fulfilling the essential ingredient of rape under Section 376 IPC.",
      precedents: [
        "State of Punjab v. Gurmit Singh (1996) 2 SCC 384 (Defines consent and lack thereof)",
        "Bodhisattwa Gautam v. Subhra Chakraborty (1996) 1 SCC 490 (Emphasizes dignity and autonomy of the victim)",
        "State of Himachal Pradesh v. Raghubir Singh (1980) 3 SCC 421 (Sexual intercourse without consent is rape)",
      ],
      elements: [
        "Consent (Lack thereof is implied by allegation of force/threat)",
        "Sexual intercourse (Evidenced by medical report)",
      ],
      counter_arguments: [
        {
          loophole: "Consent implied due to lack of physical resistance or victim testimony.",
          supporting_precedents: [
            "State of Haryana v. Prem Chand (1990) 1 SCC 525 (Absence of physical resistance not conclusive, but relevant)",
            "Kaliyaperumal v. State of Tamil Nadu (1973) 2 SCC 808 (Consideration of victim character/past, but lack of consent is key)",
          ],
        },
      ],
    },
    {
      argument:
        "The accused used force or threat of force, thereby negating any possibility of consent, fulfilling the essential ingredient of rape under Section 376 IPC.",
      precedents: [
        "State of Punjab v. Gurmit Singh (1996) 2 SCC 384 (Defines consent and lack thereof)",
        "Bodhisattwa Gautam v. Subhra Chakraborty (1996) 1 SCC 490 (Emphasizes dignity and autonomy of the victim)",
        "State of Himachal Pradesh v. Raghubir Singh (1980) 3 SCC 421 (Sexual intercourse without consent is rape)",
      ],
      elements: ["Force/Threat (Allegation of forcible entry, physical overpowering)", "Sexual intercourse"],
    },
  ],
  verdict:
    "Based on the evidence and legal precedents, the accused may be found guilty under Section 376 IPC, given the lack of consent and the presence of force.",
}

export default function CasePage() {
  const [activeArgument, setActiveArgument] = useState(0)
  const [showVerdict, setShowVerdict] = useState(false)

  // In a real app, you would fetch the case data based on the ID
  const { id: caseId } = useParams()
  const caseData = sampleCaseData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-950 text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center text-xl font-serif font-bold">
              <Scale className="mr-2" /> LegalAI
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            to="/user/dashboard"
            className="inline-flex items-center text-blue-900 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="bg-blue-950 text-white px-6 py-4">
            <h1 className="text-xl font-serif font-bold">
              Case #{caseId}: IPC Section {caseData.ipc_sections}
            </h1>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-serif font-bold text-gray-800 mb-2">Case Facts</h2>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-200">{caseData.facts}</p>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-serif font-bold text-gray-800 mb-2">Applicable IPC Sections</h2>
              <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded-md inline-block border border-amber-200">
                {caseData.ipc_sections}
              </div>
            </div>
          </div>
        </div>

        {/* Arguments Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4">Legal Arguments</h2>

          <div className="space-y-6">
            {caseData.arguments.map((argument, index) => (
              <ArgumentCard
                key={index}
                argument={argument}
                isActive={activeArgument === index}
                index={index}
                onToggle={() => setActiveArgument(activeArgument === index ? -1 : index)}
              />
            ))}
          </div>
        </div>

        {/* Verdict Section */}
        <div className="mb-8">
          <button
            onClick={() => setShowVerdict(!showVerdict)}
            className="w-full flex justify-between items-center bg-blue-900 hover:bg-blue-800 text-white px-6 py-4 rounded-lg shadow-md transition-colors"
          >
            <div className="flex items-center">
              <Gavel className="mr-3 h-6 w-6" />
              <h2 className="text-xl font-serif font-bold">Verdict Analysis</h2>
            </div>
            {showVerdict ? <ChevronUp /> : <ChevronDown />}
          </button>

          <AnimatePresence>
            {showVerdict && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-b-lg shadow-md overflow-hidden border-x border-b"
              >
                <div className="p-6">
                  <p className="text-gray-700 bg-blue-50 p-4 rounded-md border border-blue-200">{caseData.verdict}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
