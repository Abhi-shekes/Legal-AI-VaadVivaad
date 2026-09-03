import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../lib/api"
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import DebateChat from "../components/case/DebateChat"
import AppHeader from "../components/AppHeader"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import useLogout from "../hooks/useLogout"

const CaseDetails = () => {
    const { id } = useParams()
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [caseTitle, setCaseTitle] = useState("Case details")
    const debateOutputRef = useRef(null)

    const { user } = useAuthStore((state) => state)
    const { theme, changeTheme } = themeStore((state) => state)
    const dark = theme === "dark"
    const handleLogout = useLogout()


    useEffect(() => {
        const fetchCaseDetails = async () => {
            try {
                setLoading(true)
                const response = await api.getCase(id)

                if (response.data.status === "success") {
                    const data = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;

                    if (data) {
                        setCaseTitle(data.title || "Legal case details")

                        const history = data.debate_history || []
                        const displayMessages = []

                        if (history.length > 0) {
                            const firstItem = history[0]
                            displayMessages.push({
                                type: "initial_response",
                                role: firstItem.role || "supporting",
                                argument: firstItem.argument,
                                ipc_section: data.ipc_section,
                                similar_case: data.similar_case,
                                processed_prompt: { refined_prompt: "Existing case record" },
                                timestamp: data.created_at ? new Date(data.created_at).toLocaleTimeString() : null
                            })

                            const subsequentItems = history.slice(1).map(item => ({
                                ...item,
                                type: "debate_response"
                            }))
                            displayMessages.push(...subsequentItems)
                        }

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
            <div className={`min-h-screen flex flex-col items-center justify-center gap-3 ${dark ? "bg-ink text-white" : "bg-parchment text-ink-blue"}`}>
                <Loader2 size={28} className="animate-spin text-brass" />
                <p className={`text-sm font-medium ${dark ? "text-gray-400" : "text-ink-blue/60"}`}>Loading case record…</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${dark ? "bg-ink text-white" : "bg-parchment text-ink-blue"}`}>
                <div className="w-14 h-14 rounded-full bg-dissent/15 flex items-center justify-center mb-4">
                    <AlertTriangle size={22} className="text-dissent" />
                </div>
                <h2 className="font-display text-2xl mb-2">Unable to load case</h2>
                <p className={`mb-6 max-w-md text-sm ${dark ? "text-gray-400" : "text-ink-blue/60"}`}>{error}</p>
                <Link
                    to="/user/dashboard"
                    className="inline-flex items-center gap-2 bg-brass text-ink font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-brass/90 transition-colors"
                >
                    Return to dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className={`min-h-screen ${dark ? "bg-ink text-white" : "bg-parchment text-ink-blue"}`}>
            <AppHeader
                dark={dark}
                changeTheme={changeTheme}
                user={user}
                onLogout={handleLogout}
                center={
                    <Link
                        to="/user/dashboard"
                        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${dark ? "text-gray-400 hover:text-white" : "text-ink-blue/60 hover:text-ink-blue"}`}
                    >
                        <ArrowLeft size={14} />
                        Back to dashboard
                    </Link>
                }
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-12">
                <div className="mb-8">
                    <p className="docket-label text-xs text-brass mb-2">On the record</p>
                    <h1 className="font-display text-3xl md:text-4xl mb-2">{caseTitle}</h1>
                    <p className={`font-mono text-xs ${dark ? "text-gray-500" : "text-ink-blue/40"}`}>Case ID: {id}</p>
                </div>

                <DebateChat
                    messages={messages}
                    isSubmitting={false}
                    isConnected={false}
                    typingState={{ isTyping: false }}
                    debateOutputRef={debateOutputRef}
                    dark={dark}
                />
            </main>
        </div>
    )
}

export default CaseDetails;
