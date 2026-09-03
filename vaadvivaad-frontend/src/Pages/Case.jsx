import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBalanceScale, faCheckCircle, faSpinner, faLink } from "@fortawesome/free-solid-svg-icons"
import CaseForm from "../components/case/CaseForm"
import DebateChat from "../components/case/DebateChat"
import useAuthStore from "../store/authStore"

// Main Component with enhanced design
const Case = () => {
  // State
  const { user } = useAuthStore((state) => state)
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
  const sessionId = useRef(Math.floor(1000000000 + Math.random() * 9000000000).toString())
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

  const handleSaveDebate = async () => {
    if (!debateData) {
      addMessage({ type: "error", message: "No debate data available to save." })
      return
    }

    setIsSubmitting(true)
    addMessage({ type: "status", message: "Saving debate to database...", icon: faSpinner, title: "Saving" })

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/save-debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debate_history: debateData.debate_history,
          ipc_section: debateData.ipc_section,
          similar_case: debateData.similar_case,
          user_id: user,
        }),
        credentials: "include"
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Failed to save debate to database.")
      }

      addMessage({ type: "status", message: "Debate saved successfully!", icon: faCheckCircle, title: "Saved" })
      // Reset state for new case
      setIsDebateConcluded(false)
      setDebateData(null)
      setIncident("")
      setEvidence("")
      setMessages([])
      sessionId.current = Math.floor(1000000000 + Math.random() * 9000000000).toString();
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/start-case`, {
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

      const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
      socket.current = io(socketUrl, { transports: ["websocket"] })

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
                  <span style={{ color: "var(--legal-gold)" }} className="ml-2">
                    Vaad
                  </span>
                  <span className="text-gray-600 ml-2">Vivaad</span>
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
            <DebateChat
              messages={messages}
              isSubmitting={isSubmitting}
              isConnected={isConnected}
              typingState={typingState}
              debateOutputRef={debateOutputRef}
            />

            {/* Enhanced Case Input Form */}
            <CaseForm
              incident={incident}
              setIncident={setIncident}
              evidence={evidence}
              setEvidence={setEvidence}
              isSubmitting={isSubmitting}
              isDebateConcluded={isDebateConcluded}
              handleSubmit={handleFormSubmit}
            />
          </main>
        </div>
      </div>
    </>
  )
}

export default Case;
