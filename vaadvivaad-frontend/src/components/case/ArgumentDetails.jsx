import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faScroll, faGavel } from "@fortawesome/free-solid-svg-icons";

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

export default ArgumentDetails;
