import { Gavel, MessagesSquare } from "lucide-react"
import MessageCard from "./MessageCard"
import TypingIndicator from "./TypingIndicator"

const DebateChat = ({ messages, isSubmitting, isConnected, typingState, debateOutputRef, dark }) => {
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/40"

  return (
    <div className="flex-1 min-w-0">
      <div className={`rounded-xl border h-[700px] flex flex-col overflow-hidden ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}>
        <div className={`px-6 py-5 border-b flex items-center justify-between ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ink-blue flex items-center justify-center flex-shrink-0">
              <Gavel size={16} className="text-brass" />
            </div>
            <div>
              <h2 className={`font-display text-lg leading-tight ${dark ? "text-white" : "text-ink-blue"}`}>Courtroom proceedings</h2>
              <p className={`text-xs ${faint}`}>Live legal debate session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-verdict animate-pulse" : dark ? "bg-gray-600" : "bg-ink-blue/20"}`} />
            <span className={`docket-label text-[10px] ${faint}`}>{isConnected ? "Live" : "Idle"}</span>
          </div>
        </div>

        <div ref={debateOutputRef} className={`flex-1 p-6 overflow-y-auto space-y-4 ${dark ? "bg-ink" : "bg-parchment/40"}`}>
          {messages.length === 0 && !isSubmitting ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-24">
              <div className={`w-16 h-16 mb-5 rounded-full flex items-center justify-center ${dark ? "bg-white/5" : "bg-ink-blue/5"}`}>
                <MessagesSquare size={26} className={faint} />
              </div>
              <h3 className={`font-display text-lg mb-1.5 ${dark ? "text-white" : "text-ink-blue"}`}>Ready for proceedings</h3>
              <p className={`text-sm max-w-xs ${muted}`}>Submit your case details to open the session.</p>
            </div>
          ) : (
            messages.map((msg, index) => <MessageCard key={index} data={msg} dark={dark} />)
          )}
          {typingState.isTyping && <TypingIndicator role={typingState.role} dark={dark} />}
        </div>
      </div>
    </div>
  )
}

export default DebateChat
