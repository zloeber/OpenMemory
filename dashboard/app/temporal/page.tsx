"use client"

import { useState, useEffect } from "react"
import { API_BASE_URL, getHeaders } from "@/lib/api"

interface TemporalFact {
    id: string
    namespace: string
    subject: string
    predicate: string
    object: string
    valid_from: string
    valid_until?: string
    confidence: number
    metadata?: any
    created_at?: string
}

interface TimelineEntry {
    fact_id: string
    subject: string
    predicate: string
    object: string
    valid_from: string
    valid_until?: string
    confidence: number
}

export default function TemporalPage() {
    const [facts, setFacts] = useState<TemporalFact[]>([])
    const [timeline, setTimeline] = useState<TimelineEntry[]>([])
    const [namespace, setNamespace] = useState("global")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    // Form states
    const [showAddModal, setShowAddModal] = useState(false)
    const [showQueryModal, setShowQueryModal] = useState(false)
    const [showTimelineModal, setShowTimelineModal] = useState(false)
    
    // Add fact form
    const [newSubject, setNewSubject] = useState("")
    const [newPredicate, setNewPredicate] = useState("")
    const [newObject, setNewObject] = useState("")
    const [newValidFrom, setNewValidFrom] = useState("")
    const [newConfidence, setNewConfidence] = useState(1.0)
    
    // Query form
    const [querySubject, setQuerySubject] = useState("")
    const [queryPredicate, setQueryPredicate] = useState("")
    const [queryObject, setQueryObject] = useState("")
    const [queryAt, setQueryAt] = useState("")
    
    // Timeline form
    const [timelineSubject, setTimelineSubject] = useState("")
    const [timelinePredicate, setTimelinePredicate] = useState("")

    const hasApiKey = Boolean((process.env.NEXT_PUBLIC_API_KEY || "").trim())

    const handleAddFact = async () => {
        if (!newSubject || !newPredicate || !newObject) {
            setError("Subject, predicate, and object are required")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const body: any = {
                namespace,
                subject: newSubject,
                predicate: newPredicate,
                object: newObject,
                confidence: newConfidence
            }

            if (newValidFrom) {
                body.valid_from = new Date(newValidFrom).toISOString()
            }

            const response = await fetch(`${API_BASE_URL}/api/temporal/fact`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to create temporal fact")
            }

            const result = await response.json()
            
            // Reset form
            setNewSubject("")
            setNewPredicate("")
            setNewObject("")
            setNewValidFrom("")
            setNewConfidence(1.0)
            setShowAddModal(false)
            
            // Refresh facts if we were showing them
            if (facts.length > 0) {
                handleQueryFacts()
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleQueryFacts = async () => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({ namespace })
            
            if (querySubject) params.append("subject", querySubject)
            if (queryPredicate) params.append("predicate", queryPredicate)
            if (queryObject) params.append("object", queryObject)
            if (queryAt) params.append("at", new Date(queryAt).toISOString())

            const response = await fetch(`${API_BASE_URL}/api/temporal/fact?${params}`, {
                headers: getHeaders()
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to query temporal facts")
            }

            const result = await response.json()
            setFacts(result.facts || [])
            setShowQueryModal(false)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGetTimeline = async () => {
        if (!timelineSubject) {
            setError("Subject is required for timeline")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({
                namespace,
                subject: timelineSubject
            })
            
            if (timelinePredicate) {
                params.append("predicate", timelinePredicate)
            }

            const response = await fetch(`${API_BASE_URL}/api/temporal/timeline?${params}`, {
                headers: getHeaders()
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to get timeline")
            }

            const result = await response.json()
            setTimeline(result.timeline || [])
            setShowTimelineModal(false)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleInvalidateFact = async (factId: string) => {
        if (!confirm("Are you sure you want to invalidate this fact?")) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE_URL}/api/temporal/fact/${factId}`, {
                method: "DELETE",
                headers: getHeaders()
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to invalidate fact")
            }

            // Refresh the facts list
            handleQueryFacts()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleString()
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 p-8 ml-20">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Temporal Facts</h1>
                    <p className="text-stone-400">
                        Manage time-aware facts with temporal validity
                    </p>
                </div>

                {!hasApiKey && (
                    <div className="bg-amber-900/20 border border-amber-700/50 text-amber-200 p-4 rounded-lg mb-6">
                        ⚠️ API key not configured. Set NEXT_PUBLIC_API_KEY in your environment.
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/20 border border-red-700/50 text-red-200 p-4 rounded-lg mb-6">
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-4 text-red-300 hover:text-red-100"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Namespace selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-stone-300 mb-2">
                        Namespace
                    </label>
                    <input
                        type="text"
                        value={namespace}
                        onChange={(e) => setNamespace(e.target.value)}
                        placeholder="Enter namespace"
                        className="w-full md:w-96 px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={!hasApiKey || loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                    >
                        Add Temporal Fact
                    </button>
                    <button
                        onClick={() => setShowQueryModal(true)}
                        disabled={!hasApiKey || loading}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                    >
                        Query Facts
                    </button>
                    <button
                        onClick={() => setShowTimelineModal(true)}
                        disabled={!hasApiKey || loading}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-stone-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                    >
                        Get Timeline
                    </button>
                </div>

                {/* Results section */}
                {facts.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">Query Results</h2>
                        <div className="space-y-4">
                            {facts.map((fact) => (
                                <div
                                    key={fact.id}
                                    className="bg-stone-900 border border-stone-700 rounded-lg p-6"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-stone-400 text-sm">Subject:</span>
                                                <span className="font-semibold text-blue-400">{fact.subject}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-stone-400 text-sm">Predicate:</span>
                                                <span className="font-semibold text-emerald-400">{fact.predicate}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-stone-400 text-sm">Object:</span>
                                                <span className="font-semibold text-purple-400">{fact.object}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInvalidateFact(fact.id)}
                                            disabled={loading}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
                                        >
                                            Invalidate
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-stone-400">Valid From:</span>{" "}
                                            <span className="text-stone-200">{formatDate(fact.valid_from)}</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400">Valid Until:</span>{" "}
                                            <span className="text-stone-200">
                                                {fact.valid_until ? formatDate(fact.valid_until) : "∞ (current)"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400">Confidence:</span>{" "}
                                            <span className="text-stone-200">{(fact.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400">Namespace:</span>{" "}
                                            <span className="text-stone-200">{fact.namespace}</span>
                                        </div>
                                    </div>
                                    {fact.metadata && Object.keys(fact.metadata).length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-stone-700">
                                            <span className="text-stone-400 text-sm">Metadata:</span>
                                            <pre className="mt-2 text-xs text-stone-300 bg-stone-950 p-2 rounded overflow-auto">
                                                {JSON.stringify(fact.metadata, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {timeline.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">Timeline</h2>
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-stone-700" />
                            
                            <div className="space-y-6">
                                {timeline.map((entry, index) => (
                                    <div key={entry.fact_id} className="relative pl-16">
                                        {/* Timeline dot */}
                                        <div className="absolute left-6 top-2 w-4 h-4 rounded-full bg-blue-500 border-4 border-stone-900" />
                                        
                                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                                            <div className="text-sm text-stone-400 mb-2">
                                                {formatDate(entry.valid_from)}
                                                {entry.valid_until && ` → ${formatDate(entry.valid_until)}`}
                                            </div>
                                            <div className="space-y-1">
                                                <div>
                                                    <span className="text-blue-400 font-semibold">{entry.subject}</span>
                                                    {" "}
                                                    <span className="text-emerald-400">{entry.predicate}</span>
                                                    {" "}
                                                    <span className="text-purple-400 font-semibold">{entry.object}</span>
                                                </div>
                                                <div className="text-sm text-stone-400">
                                                    Confidence: {(entry.confidence * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Fact Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-4">Add Temporal Fact</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        placeholder="e.g., OpenAI, user, project_x"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Predicate *
                                    </label>
                                    <input
                                        type="text"
                                        value={newPredicate}
                                        onChange={(e) => setNewPredicate(e.target.value)}
                                        placeholder="e.g., has_CEO, prefers, located_in"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Object *
                                    </label>
                                    <input
                                        type="text"
                                        value={newObject}
                                        onChange={(e) => setNewObject(e.target.value)}
                                        placeholder="e.g., Sam Altman, coffee, San Francisco"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Valid From (optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newValidFrom}
                                        onChange={(e) => setNewValidFrom(e.target.value)}
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-stone-400 mt-1">
                                        Leave empty to use current time
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Confidence: {(newConfidence * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={newConfidence}
                                        onChange={(e) => setNewConfidence(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={handleAddFact}
                                    disabled={loading}
                                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                                >
                                    {loading ? "Creating..." : "Create Fact"}
                                </button>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    disabled={loading}
                                    className="px-6 py-3 bg-stone-700 hover:bg-stone-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Query Modal */}
                {showQueryModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-6 max-w-2xl w-full">
                            <h2 className="text-2xl font-bold mb-4">Query Temporal Facts</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Subject (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={querySubject}
                                        onChange={(e) => setQuerySubject(e.target.value)}
                                        placeholder="Filter by subject"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Predicate (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={queryPredicate}
                                        onChange={(e) => setQueryPredicate(e.target.value)}
                                        placeholder="Filter by predicate"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Object (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={queryObject}
                                        onChange={(e) => setQueryObject(e.target.value)}
                                        placeholder="Filter by object"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Query At Time (optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={queryAt}
                                        onChange={(e) => setQueryAt(e.target.value)}
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <p className="text-xs text-stone-400 mt-1">
                                        Leave empty to query current facts
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={handleQueryFacts}
                                    disabled={loading}
                                    className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                                >
                                    {loading ? "Querying..." : "Query Facts"}
                                </button>
                                <button
                                    onClick={() => setShowQueryModal(false)}
                                    disabled={loading}
                                    className="px-6 py-3 bg-stone-700 hover:bg-stone-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timeline Modal */}
                {showTimelineModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-6 max-w-2xl w-full">
                            <h2 className="text-2xl font-bold mb-4">Get Timeline</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        value={timelineSubject}
                                        onChange={(e) => setTimelineSubject(e.target.value)}
                                        placeholder="Subject to get timeline for"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Predicate (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={timelinePredicate}
                                        onChange={(e) => setTimelinePredicate(e.target.value)}
                                        placeholder="Filter timeline by predicate"
                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    <p className="text-xs text-stone-400 mt-1">
                                        Leave empty to see all predicates for the subject
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={handleGetTimeline}
                                    disabled={loading}
                                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-stone-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                                >
                                    {loading ? "Loading..." : "Get Timeline"}
                                </button>
                                <button
                                    onClick={() => setShowTimelineModal(false)}
                                    disabled={loading}
                                    className="px-6 py-3 bg-stone-700 hover:bg-stone-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {facts.length === 0 && timeline.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🕰️</div>
                        <h3 className="text-xl font-semibold mb-2">No temporal data displayed</h3>
                        <p className="text-stone-400">
                            Add temporal facts or query existing ones to get started
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
