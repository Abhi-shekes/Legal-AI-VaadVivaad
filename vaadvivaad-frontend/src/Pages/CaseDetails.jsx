import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft, faSpinner, faExclamationTriangle, faBalanceScale } from "@fortawesome/free-solid-svg-icons"
import DebateChat from "../components/case/DebateChat"

const CaseDetails = () => {
    const { id } = useParams()
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [caseTitle, setCaseTitle] = useState("Case Details")
    const debateOutputRef = useRef(null)

    const apiUrl = import.meta.env.VITE_API_URL

    useEffect(() => {
        const fetchCaseDetails = async () => {
            try {
                setLoading(true)
                // Assuming the endpoint is /user/debate/:id per conversation
                const response = await axios.get(`${apiUrl}/user/debate/${id}`, {
                    withCredentials: true
                })

                if (response.data.status === "success") {
                    // The backend snippet returned a list in 'data'. 
                    // Depending on backend implementation, it might be an object or a list of 1.
                    const data = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;

                    if (data) {
                        setCaseTitle(data.title || "Legal Case Details")

                        // Reconstruct messages for the UI
                        const history = data.debate_history || []
                        const displayMessages = []

                        if (history.length > 0) {
                            // 1. Initial Response (Combines metadata + first argument)
                            const firstItem = history[0]
                            displayMessages.push({
                                type: "initial_response",
                                role: firstItem.role || "supporting",
                                argument: firstItem.argument,
                                ipc_section: data.ipc_section,
                                similar_case: data.similar_case,
                                processed_prompt: { refined_prompt: "Existing Case Record" }, // generic label
                                timestamp: data.created_at ? new Date(data.created_at).toLocaleTimeString() : null
                            })

                            // 2. Subsequent Rounds
                            // We slice from 1 to avoid duplicating the first argument
                            // Using map to correctly type subsequent messages
                            const subsequentItems = history.slice(1).map(item => ({
                                ...item,
                                type: "debate_response"
                            }))
                            displayMessages.push(...subsequentItems)
                        }

                        // 3. Conclusion (if completed or if history exists)
                        // Adding conclusion card if status is completed
                        if (data.status === "completed" || history.length > 1) {
                            displayMessages.push({
                                type: "debate_concluded",
                                total_rounds: history.length,
                                timestamp: data.updated_at ? new Date(data.updated_at).toLocaleTimeString() : null
                            })
                        }

                        setMessages(displayMessages)
                    } else {
                        setError("Case data not found.")
                    }
                } else {
                    setError("Failed to fetch case details.")
                }
            } catch (err) {
                console.error("Error fetching case details:", err)
                setError(err.message || "An error occurred while loading the case.")
            } finally {
                setLoading(false)
            }
        }

        fetchCaseDetails()
    }, [id, apiUrl])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-900 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Loading case record...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Unable to Load Case</h2>
                <p className="text-gray-600 mb-6 max-w-md">{error}</p>
                <Link
                    to="/user/dashboard"
                    className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                    Return to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center">
                        <Link
                            to="/user/dashboard"
                            className="mr-4 p-2 bg-white rounded-full shadow-sm hover:shadow text-gray-600 hover:text-blue-900 transition-all"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <FontAwesomeIcon icon={faBalanceScale} className="text-amber-600" />
                                <h1 className="text-2xl font-bold text-gray-800">{caseTitle}</h1>
                            </div>
                            <p className="text-sm text-gray-500">Case ID: {id}</p>
                        </div>
                    </div>
                </header>

                <main className="flex flex-col xl:flex-row gap-8">
                    {/* Debate Output reused in Read-Only mode */}
                    <DebateChat
                        messages={messages}
                        isSubmitting={false}
                        isConnected={false} // Offline/Archived view
                        typingState={{ isTyping: false }}
                        debateOutputRef={debateOutputRef}
                    />
                </main>
            </div>
        </div>
    )
}

export default CaseDetails;
