import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faInfoCircle, faShieldAlt, faHammer, faFlagCheckered,
    faExclamationTriangle, faFileAlt, faCrown, faChevronUp, faChevronDown
} from "@fortawesome/free-solid-svg-icons";
import ArgumentDetails from './ArgumentDetails';

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
                        <p className="text-sm text-gray-500">Click 'Save Case' to store the debate history.</p>
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
            case "debate_failed":
                return (
                    <div className="flex items-center py-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mr-3" />
                        <p className="text-red-700 font-medium">
                            {data.message || "The debate could not be completed. Please try again."}
                        </p>
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
                        icon={isExpanded ? faChevronUp : faChevronDown}
                        className="text-sm transition-transform duration-200"
                    />
                </div>
            </header>
            {isExpanded && <div className="p-6 transition-all duration-300">{renderContent()}</div>}
        </div>
    )
}

export default MessageCard;
