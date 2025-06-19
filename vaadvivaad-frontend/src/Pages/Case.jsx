import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import backendURL from "../config"; 
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faBalanceScale,
  faGavel,
  faFileAlt,
  faClipboardList,
  faFingerprint,
  faPlay,
  faSpinner,
  faComments,
  faInfoCircle,
  faShieldAlt,
  faFlagCheckered,
  faExclamationTriangle,
  faLink,
  faCheckCircle,
  faScroll,
  faCrown,
  faHammer,
  faSave,
} from "@fortawesome/free-solid-svg-icons"

// Enhanced styling with custom color variables and animations
const animationStyles = `
    :root {
        --legal-blue: #1E3A8A;
        --legal-gold: #D4AF37;
        --supporting-green: #065F46;
        --opposing-red: #991B1B;
        --legal-blue-light: #3B82F6;
        --legal-gold-light: #F59E0B;
        --supporting-green-light: #10B981;
        --opposing-red-light: #EF4444;
    }

    @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
    }

    @keyframes slideInFromRight {
        0% { transform: translateX(100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideInFromLeft {
        0% { transform: translateX(-100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes fadeInUp {
        0% { transform: translateY(20px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.3); }
        50% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.6), 0 0 30px rgba(212, 175, 55, 0.4); }
    }

    .typing-indicator span {
        height: 8px;
        width: 8px;
        background-color: #6B7280;
        border-radius: 50%;
        display: inline-block;
        margin: 0 2px;
        animation: bounce 1.5s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    .message-slide-right { animation: slideInFromRight 0.5s ease-out; }
    .message-slide-left { animation: slideInFromLeft 0.5s ease-out; }
    .message-fade-up { animation: fadeInUp 0.4s ease-out; }
    .glow-effect { animation: glow 2s infinite; }

    .legal-gradient {
        background: linear-gradient(135deg, var(--legal-blue) 0%, var(--legal-blue-light) 100%);
    }

    .gold-gradient {
        background: linear-gradient(135deg, var(--legal-gold) 0%, var(--legal-gold-light) 100%);
    }

    .supporting-gradient {
        background: linear-gradient(135deg, var(--supporting-green) 0%, var(--supporting-green-light) 100%);
    }

    .opposing-gradient {
        background: linear-gradient(135deg, var(--opposing-red) 0%, var(--opposing-red-light) 100%);
    }

    .legal-card {
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(30, 58, 138, 0.1);
    }

    .legal-shadow {
        box-shadow: 0 10px 25px rgba(30, 58, 138, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    .gold-accent {
        border-left: 4px solid var(--legal-gold);
    }

    .supporting-accent {
        border-left: 4px solid var(--supporting-green);
    }

    .opposing-accent {
        border-left: 4px solid var(--opposing-red);
    }
`

// Enhanced Typing Indicator with better styling
const TypingIndicator = ({ role }) => {
  const roleName = role === "supporting" ? "Supporting Counsel" : "Opposing Counsel"
  const isSupporting = role === "supporting"

  return (
    <div
      className={`message-fade-up p-6 rounded-xl transition-all duration-300 legal-card legal-shadow ${
        isSupporting ? "supporting-accent" : "opposing-accent"
      }`}
    >
      <div className="flex items-center space-x-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isSupporting ? "supporting-gradient" : "opposing-gradient"
          }`}
        >
          <FontAwesomeIcon icon={isSupporting ? faShieldAlt : faHammer} className="text-white text-sm" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">{roleName}</p>
          <p className="text-sm text-gray-600 flex items-center">
            Preparing argument
            <span className="typing-indicator ml-2">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// Enhanced Argument Details with better formatting
const ArgumentDetails = ({ argument }) => {
  if (typeof argument !== "object" || argument === null) {
    return <p className="text-gray-700 leading-relaxed">{String(argument)}</p>
  }

  return (
    <div className="space-y-4">
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-800 leading-relaxed text-base">{argument.point || "No point stated."}</p>
      </div>

      {argument.evidence && argument.evidence.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 gold-accent">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faScroll} className="text-amber-600 mr-2" />
            <p className="font-semibold text-amber-800">Supporting Evidence</p>
          </div>
          <ul className="space-y-2">
            {argument.evidence.map((e, i) => (
              <li key={i} className="flex items-start">
                <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-amber-700">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <FontAwesomeIcon icon={faGavel} className="text-gray-600 mr-2" />
          <span className="font-semibold text-gray-800">Legal Demand</span>
        </div>
        <p className="text-gray-700">{argument.demand || "No specific demand made."}</p>
      </div>
    </div>
  )
}

// Enhanced Message Card with sophisticated styling
const MessageCard = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const getCardConfig = () => {
    switch (data.type) {
      case "initial_response":
        return {
          icon: faInfoCircle,
          title: "Case Analysis & Initial Arguments",
          headerClass: "legal-gradient",
          headerText: "text-white",
          cardClass: "legal-card legal-shadow gold-accent",
          animationClass: "message-fade-up",
        }
      case "debate_response":
        const isSupporting = data.role === "supporting"
        return {
          icon: isSupporting ? faShieldAlt : faHammer,
          title: `${isSupporting ? "Supporting Counsel" : "Opposing Counsel"} - Round ${data.round}`,
          headerClass: isSupporting ? "supporting-gradient" : "opposing-gradient",
          headerText: "text-white",
          cardClass: `legal-card legal-shadow ${isSupporting ? "supporting-accent" : "opposing-accent"}`,
          animationClass: isSupporting ? "message-slide-left" : "message-slide-right",
        }
      case "debate_concluded":
        return {
          icon: faFlagCheckered,
          title: "Final Verdict",
          headerClass: "gold-gradient",
          headerText: "text-white",
          cardClass: "legal-card legal-shadow gold-accent glow-effect",
          animationClass: "message-fade-up",
        }
      case "status":
        return {
          icon: data.icon || faInfoCircle,
          title: data.title || "System Status",
          headerClass: "bg-blue-50 border-b border-blue-200",
          headerText: "text-blue-800",
          cardClass: "legal-card legal-shadow",
          animationClass: "message-fade-up",
        }
      case "error":
      default:
        return {
          icon: faExclamationTriangle,
          title: "System Alert",
          headerClass: "bg-red-50 border-b border-red-200",
          headerText: "text-red-800",
          cardClass: "legal-card legal-shadow",
          animationClass: "message-fade-up",
        }
    }
  }

  const config = getCardConfig()

  const renderContent = () => {
    switch (data.type) {
      case "initial_response":
        const similarCase = data.similar_case
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center mb-2">
                <FontAwesomeIcon icon={faFileAlt} className="text-blue-600 mr-2" />
                <span className="font-semibold text-blue-800">Case Analysis</span>
              </div>
              <p className="text-blue-700 italic">"{data.processed_prompt?.refined_prompt || "N/A"}"</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <span className="font-semibold text-purple-800">Relevant IPC Section</span>
                <p className="text-purple-700 mt-1">{data.ipc_section || "N/A"}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <span className="font-semibold text-green-800">Case Precedent</span>
                {typeof similarCase === "object" && similarCase !== null ? (
                  <div className="mt-2">
                    <p className="font-medium text-green-700">{similarCase.case_id_name || "Unknown Case"}</p>
                    <p className="text-sm text-green-600">
                      {similarCase.court || "N/A"} • {similarCase.date_of_judgment || "N/A"}
                    </p>
                    <p className="text-sm text-green-600 mt-1 italic">
                      "{similarCase.case_summary || "No summary available."}"
                    </p>
                  </div>
                ) : (
                  <p className="text-green-700 mt-1">No precedent found</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200 supporting-accent">
              <div className="flex items-center mb-3">
                <FontAwesomeIcon icon={faShieldAlt} className="text-green-700 mr-2" />
                <span className="font-semibold text-green-800">Initial Supporting Argument</span>
              </div>
              <ArgumentDetails argument={data.argument} />
            </div>
          </div>
        )
      case "debate_response":
        return <ArgumentDetails argument={data.argument} />
      case "debate_concluded":
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 gold-gradient rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCrown} className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Debate Concluded</h3>
            <p className="text-gray-600 mb-1">
              The legal proceedings have concluded after {data.total_rounds} rounds of arguments.
            </p>
            <p className="text-sm text-gray-500">Click 'Save Debate to DB' to store the debate history or submit a new case.</p>
          </div>
        )
      case "status":
        return (
          <div className="flex items-center py-2">
            <FontAwesomeIcon icon={data.icon || faInfoCircle} className="text-blue-600 mr-3" />
            <p className="text-gray-700">{data.message}</p>
          </div>
        )
      case "error":
        return (
          <div className="flex items-center py-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mr-3" />
            <p className="text-red-700 font-medium">{data.message}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`${config.animationClass} ${config.cardClass} rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg`}
    >
      <header
        className={`px-6 py-4 flex items-center justify-between cursor-pointer ${config.headerClass} ${config.headerText}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <FontAwesomeIcon icon={config.icon} className="text-lg" />
          <span className="font-semibold">{config.title}</span>
        </div>
        <div className="flex items-center space-x-3">
          {data.timestamp && (
            <span className="text-xs opacity-90 bg-black bg-opacity-20 px-2 py-1 rounded">{data.timestamp}</span>
          )}
          <FontAwesomeIcon
            icon={isExpanded ? "chevron-up" : "chevron-down"}
            className="text-sm transition-transform duration-200"
          />
        </div>
      </header>
      {isExpanded && <div className="p-6 transition-all duration-300">{renderContent()}</div>}
    </div>
  )
}

// Main Component with enhanced design
const Case = () => {
  // State
  const [incident, setIncident] = useState("")
  const [evidence, setEvidence] = useState("")
  const [messages, setMessages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [typingState, setTypingState] = useState({ isTyping: false, role: "" })
  const [isDebateConcluded, setIsDebateConcluded] = useState(false)
  const [debateData, setDebateData] = useState(null)

  // Refs
  const socket = useRef(null)
  const sessionId = useRef(crypto.randomUUID())
  const initialCaseDetails = useRef(null)
  const debateOutputRef = useRef(null)

  // Effects
  useEffect(() => {
    if (debateOutputRef.current) {
      debateOutputRef.current.scrollTop = debateOutputRef.current.scrollHeight
    }
  }, [messages, typingState])

  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.disconnect()
      }
    }
  }, [])

  const addMessage = (newMessage) => {
    setMessages((prev) => [...prev, { ...newMessage, timestamp: new Date().toLocaleTimeString() }])
  }

  const apiUrl = import.meta.env.VITE_API_URL;

  const handleSaveDebate = async () => {
    if (!debateData) {
      addMessage({ type: "error", message: "No debate data available to save." })
      return
    }

    setIsSubmitting(true)
    addMessage({ type: "status", message: "Saving debate to database...", icon: faSpinner, title: "Saving" })

    try {
      const response = await fetch(`${apiUrl}/api/user/save-debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId.current,
          debate_history: debateData.debate_history,
          ipc_section: debateData.ipc_section,
          similar_case: debateData.similar_case,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Failed to save debate to database.")
      }

      addMessage({ type: "status", message: "Debate saved successfully!", icon: faCheckCircle, title: "Saved" })
      setIsDebateConcluded(false)
      setDebateData(null)
      setIncident("")
      setEvidence("")
      sessionId.current = crypto.randomUUID() // Generate new session ID for next case
    } catch (error) {
      addMessage({ type: "error", message: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Form submit handler
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (isDebateConcluded) {
      await handleSaveDebate()
      return
    }

    if (!incident || !evidence) {
      addMessage({ type: "error", message: "Please fill out both the incident description and evidence fields." })
      return
    }

    setIsSubmitting(true)
    setMessages([])
    if (socket.current) {
      socket.current.disconnect()
    }

    addMessage({ type: "status", message: "Submitting case details...", icon: faSpinner, title: "Initializing" })

    try {
      const response = await fetch(`${apiUrl}/api/user/start-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_description: incident,
          evidence: evidence,
          session_id: sessionId.current,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Failed to initialize case on server.")
      }

      addMessage({ type: "status", message: "Connecting to debate server...", icon: faLink, title: "Connecting" })

      socket.current = io(backendURL, { transports: ["websocket"] })

      socket.current.on("connect", () => {
        setIsConnected(true)
        setTypingState({ isTyping: false, role: "" })
        socket.current.emit("join_room", { session_id: sessionId.current })
        socket.current.emit("start_debate_flow", { session_id: sessionId.current })
        addMessage({
          type: "status",
          message: "Connected! Waiting for debate to begin...",
          icon: faCheckCircle,
          title: "Success",
        })
      })

      socket.current.on("disconnect", () => setIsConnected(false))
      socket.current.on("error", (data) => addMessage({ type: "error", message: data.message }))
      socket.current.on("case_details", (data) => {
        initialCaseDetails.current = data
      })
      socket.current.on("typing", (data) => setTypingState({ isTyping: true, role: data.role }))

      socket.current.on("new_argument", (data) => {
        setTypingState({ isTyping: false, role: "" })
        if (data.round === 0 && initialCaseDetails.current) {
          addMessage({ type: "initial_response", argument: data.argument, ...initialCaseDetails.current })
          initialCaseDetails.current = null
        } else {
          addMessage({ type: "debate_response", ...data })
        }
      })

      socket.current.on("debate_concluded", (data) => {
        setTypingState({ isTyping: false, role: "" })
        console.log("Debate History:", data)
        setDebateData({
          debate_history: data.debate_history,
          ipc_section: data.ipc_section,
          similar_case: data.similar_case,
        })
        setIsDebateConcluded(true)
        addMessage({ type: "debate_concluded", ...data })
        setIsSubmitting(false)
        socket.current.disconnect()
      })

       socket.current.on("debate_failed", (data) => {
        setTypingState({ isTyping: false, role: "" })
        setIsDebateConcluded(true)
        addMessage({ type: "debate_failed", ...data })
        setIsSubmitting(false)
        socket.current.disconnect()
      })




    } catch (error) {
      addMessage({ type: "error", message: error.message })
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <style>{animationStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-[80vw] mx-auto px-4 py-8">
          {/* Enhanced Header */}
          <header className="mb-12 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 gold-gradient rounded-full flex items-center justify-center mr-4 legal-shadow">
                <FontAwesomeIcon icon={faBalanceScale} className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-gray-800 mb-2">
                  <span style={{ color: "var(--legal-blue)" }}>Legal</span>
                  <span style={{ color: "var(--legal-gold)" }} className="ml-2">
                    Debate
                  </span>
                  <span className="text-gray-600 ml-2">System</span>
                </h1>
                <div className="h-1 w-32 gold-gradient rounded-full mx-auto"></div>
              </div>
            </div>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
              Experience the future of legal analysis with our AI-powered courtroom simulation. Present your case and
              witness a comprehensive debate between virtual legal counsels.
            </p>
          </header>

          <main className="flex flex-col xl:flex-row gap-8">
            {/* Enhanced Debate Output */}
            <div className="flex-1">
              <div className="legal-card legal-shadow rounded-2xl h-[700px] flex flex-col overflow-hidden">
                <div className="legal-gradient text-white px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faGavel} className="text-2xl" />
                    <div>
                      <h2 className="text-2xl font-bold">Courtroom Proceedings</h2>
                      <p className="text-blue-100 text-sm">Live Legal Debate Session</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
                    ></div>
                    <span className="text-sm font-medium">{isConnected ? "Live Session" : "Disconnected"}</span>
                  </div>
                </div>

                <div
                  ref={debateOutputRef}
                  className="flex-1 p-6 overflow-y-auto space-y-6 bg-gradient-to-b from-gray-50 to-white"
                >
                  {messages.length === 0 && !isSubmitting ? (
                    <div className="text-center py-24">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faComments} className="text-4xl text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">Ready for Legal Proceedings</h3>
                      <p className="text-gray-500">Submit your case details to initiate the debate session</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => <MessageCard key={index} data={msg} />)
                  )}
                  {typingState.isTyping && <TypingIndicator role={typingState.role} />}
                </div>
              </div>
            </div>

            {/* Enhanced Case Input Form */}
            <div className="w-full xl:w-96">
              <div className="legal-card legal-shadow rounded-2xl sticky top-8 overflow-hidden">
                <div className="legal-gradient text-white px-8 py-6">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faFileAlt} className="text-xl" />
                    <div>
                      <h2 className="text-xl font-bold">Case Submission</h2>
                      <p className="text-blue-100 text-sm">Provide case details</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
                  <div>
                    <label
                      className="flex items-center text-sm font-semibold text-gray-700 mb-3"
                      htmlFor="incident_description"
                    >
                      <FontAwesomeIcon icon={faClipboardList} className="text-gray-500 mr-2" />
                      Incident Description
                    </label>
                    <textarea
                      id="incident_description"
                      value={incident}
                      onChange={(e) => setIncident(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      rows="6"
                      placeholder="Provide a detailed description of the incident, including all relevant circumstances, parties involved, and sequence of events..."
                      required
                      disabled={isDebateConcluded}
                    />
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-3" htmlFor="evidence">
                      <FontAwesomeIcon icon={faFingerprint} className="text-gray-500 mr-2" />
                      Supporting Evidence
                    </label>
                    <textarea
                      id="evidence"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      rows="6"
                      placeholder="List all relevant evidence including documents, witness statements, physical evidence, expert opinions, and any supporting materials..."
                      required
                      disabled={isDebateConcluded}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full legal-gradient text-white px-6 py-4 rounded-xl hover:shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100 font-semibold text-lg"
                  >
                    <FontAwesomeIcon
                      icon={isSubmitting ? faSpinner : isDebateConcluded ? faSave : faPlay}
                      className={`mr-3 text-xl ${isSubmitting && "animate-spin"}`}
                    />
                    {isSubmitting
                      ? "Processing..."
                      : isDebateConcluded
                      ? "Initiate Legal Debate" // Temp waork Done
                      : "Initiate Legal Debate"}
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default Case