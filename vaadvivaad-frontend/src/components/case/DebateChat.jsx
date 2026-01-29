import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel, faComments } from "@fortawesome/free-solid-svg-icons";
import MessageCard from './MessageCard';
import TypingIndicator from './TypingIndicator';

const DebateChat = ({ messages, isSubmitting, isConnected, typingState, debateOutputRef }) => {
    return (
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
    )
}

export default DebateChat;
