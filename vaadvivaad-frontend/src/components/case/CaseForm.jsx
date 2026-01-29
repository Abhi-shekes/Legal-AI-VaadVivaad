import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faClipboardList, faFingerprint, faSpinner, faPlay, faSave } from "@fortawesome/free-solid-svg-icons";

const CaseForm = ({
    incident,
    setIncident,
    evidence,
    setEvidence,
    isSubmitting,
    isDebateConcluded,
    handleSubmit
}) => {
    return (
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

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                                ? "Save Case"
                                : "Initiate Legal Debate"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default CaseForm;
