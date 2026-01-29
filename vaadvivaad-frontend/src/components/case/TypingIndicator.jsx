import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldAlt, faHammer } from "@fortawesome/free-solid-svg-icons";

const TypingIndicator = ({ role }) => {
    const roleName = role === "supporting" ? "Supporting Counsel" : "Opposing Counsel"
    const isSupporting = role === "supporting"

    return (
        <div
            className={`message-fade-up p-6 rounded-xl transition-all duration-300 legal-card legal-shadow ${isSupporting ? "supporting-accent" : "opposing-accent"
                }`}
        >
            <div className="flex items-center space-x-3">
                <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${isSupporting ? "supporting-gradient" : "opposing-gradient"
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

export default TypingIndicator;
