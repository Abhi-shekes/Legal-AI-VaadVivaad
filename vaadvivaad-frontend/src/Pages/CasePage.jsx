import { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, ArrowLeft, ChevronDown, ChevronUp, Gavel } from "lucide-react";
import ArgumentCard from "../components/ArgumentCard";

export default function CasePage() {
  const { id: caseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const formData = location.state;
  const [caseData, setCaseData] = useState(null);
  const [argumentsList, setArgumentsList] = useState([]);
  const [activeArgument, setActiveArgument] = useState(0);
  const [showVerdict, setShowVerdict] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formData || !formData.caseId || !formData.facts) {
      console.error("Case ID or Facts are missing");
      navigate("/user/dashboard");
      return;
    }

    const generateArguments = async () => {
      try {
        const response = await fetch(`${backendURL}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            case_id: formData.caseId,
            facts: formData.facts,
            ipc_sections: formData.ipcSections.length > 0 ? formData.ipcSections : [],
            max_new_tokens: 1024,
            temperature: 0.7,
            top_p: 0.9,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate case arguments");
        }

        const data = await response.json();
        setCaseData(data);

        // Parse the generated arguments' raw text
        const parsedArguments = parseRawText(data.generated_arguments.raw_text);
        setArgumentsList(parsedArguments);
      } catch (error) {
        console.error("Error generating arguments:", error);
      } finally {
        setLoading(false);
      }
    };

    generateArguments();
  }, [formData, navigate]);

  const parseRawText = (rawText) => {
    if (!rawText) return [];

    const parts = rawText.split("\n").filter(part => part.trim() !== "");
    const parsed = [];

    for (const part of parts) {
      try {
        // Fix single quotes to double quotes to make it JSON parsable
        const fixed = part.replace(/'/g, '"');
        const obj = JSON.parse(fixed);
        parsed.push(obj);
      } catch (error) {
        console.error("Failed to parse part:", part, error);
      }
    }

    return parsed;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl font-serif font-bold text-blue-900">Generating Legal Arguments...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl font-serif font-bold text-red-600">Failed to load case details.</p>
      </div>
    );
  }

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

        {/* Case Data Section */}
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
                {caseData.ipc_sections.join(", ")}
              </div>
            </div>
          </div>
        </div>

        {/* Arguments Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4">Legal Arguments</h2>

          <div className="space-y-6">
            {argumentsList.map((argument, index) => (
              <div key={index} className="bg-white shadow-md rounded-lg p-6 mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif font-bold text-gray-800">{argument.argument}</h3>
                  <button
                    onClick={() => setActiveArgument(activeArgument === index ? -1 : index)}
                    className="text-blue-900 hover:text-blue-700"
                  >
                    {activeArgument === index ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>

                {activeArgument === index && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <h4 className="font-bold text-gray-700">Precedents</h4>
                      <ul>
                        {argument.precedents.map((precedent, i) => (
                          <li key={i} className="text-gray-600">- {precedent}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <h4 className="font-bold text-gray-700">Elements</h4>
                      <ul>
                        {argument.elements.map((element, i) => (
                          <li key={i} className="text-gray-600">- {element}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <h4 className="font-bold text-gray-700">Counter-arguments</h4>
                      {argument.counter_arguments.map((counterArg, i) => (
                        <div key={i} className="mt-2">
                          <p className="text-gray-600">- {counterArg.loophole}</p>
                          <h5 className="font-semibold">Supporting Precedents:</h5>
                          <ul>
                            {counterArg.supporting_precedents.map((precedent, j) => (
                              <li key={j} className="text-gray-600">- {precedent}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                  <p className="text-lg text-gray-800">{caseData.verdict}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
