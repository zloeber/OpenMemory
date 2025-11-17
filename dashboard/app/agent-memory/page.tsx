"use client"

import { useState, useEffect } from "react"
import { API_BASE_URL, getHeaders } from "@/lib/api"

interface Agent {
    agent_id: string
    namespace: string
    permissions: string[]
    description: string
    registration_date: string
    last_access: string
}

interface Memory {
    id: string
    content: string
    primary_sector: string
    sectors: string[]
    salience: number
    score?: number
    last_seen_at: number
}

interface QueryResult {
    total_results: number
    results: Memory[]
    namespace: string
    agent_id: string
}

const sectorColors: Record<string, string> = {
    semantic: "sky",
    episodic: "amber",
    procedural: "emerald",
    emotional: "rose",
    reflective: "purple"
}

const sectorIcons: Record<string, React.ReactElement> = {
    semantic: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>,
    episodic: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>,
    procedural: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>,
    emotional: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>,
    reflective: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>
}

export default function AgentMemoryPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
    const [selectedNamespace, setSelectedNamespace] = useState<string>("")
    const [query, setQuery] = useState("")
    const [memories, setMemories] = useState<Memory[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showStoreModal, setShowStoreModal] = useState(false)
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
    
    const hasApiKey = Boolean((process.env.NEXT_PUBLIC_API_KEY || "").trim())

    useEffect(() => {
        if (hasApiKey) {
            fetchAgents()
        }
    }, [hasApiKey])

    useEffect(() => {
        if (selectedAgent) {
            setSelectedNamespace(selectedAgent.namespace)
        }
    }, [selectedAgent])

    async function fetchAgents() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/agents`, { headers: getHeaders() })
            if (!res.ok) throw new Error('Failed to fetch agents')
            const data = await res.json()
            setAgents(data.agents || [])
            if (data.agents?.length > 0) {
                setSelectedAgent(data.agents[0])
            }
        } catch (e: any) {
            setError(e.message)
        }
    }

    async function handleQuery() {
        if (!selectedAgent || !query.trim()) return
        
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_BASE_URL}/mcp-proxy`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "query_memory",
                        arguments: {
                            agent_id: selectedAgent.agent_id,
                            query: query,
                            namespace: selectedNamespace,
                            k: 20
                        }
                    },
                    id: 1
                })
            })
            if (!res.ok) throw new Error('Query failed')
            const data = await res.json()
            
            if (data.error) {
                throw new Error(data.error.message || 'Query failed')
            }

            const result = data.result?.meta || {}
            setQueryResult(result)
            setMemories(result.results || [])
        } catch (e: any) {
            setError(e.message)
            setMemories([])
        } finally {
            setLoading(false)
        }
    }

    async function handleStoreMemory(content: string, sector: string) {
        if (!selectedAgent) return
        
        try {
            const res = await fetch(`${API_BASE_URL}/mcp-proxy`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "store_memory",
                        arguments: {
                            agent_id: selectedAgent.agent_id,
                            content: content,
                            namespace: selectedNamespace,
                            sector: sector
                        }
                    },
                    id: 1
                })
            })
            if (!res.ok) throw new Error('Failed to store memory')
            const data = await res.json()
            
            if (data.error) {
                throw new Error(data.error.message || 'Store failed')
            }
            
            setShowStoreModal(false)
            // Refresh results if we have a query
            if (query.trim()) {
                handleQuery()
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`)
        }
    }

    async function handleReinforceMemory(memoryId: string) {
        if (!selectedAgent) return
        
        try {
            const res = await fetch(`${API_BASE_URL}/mcp-proxy`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "reinforce_memory",
                        arguments: {
                            agent_id: selectedAgent.agent_id,
                            memory_id: memoryId
                        }
                    },
                    id: 1
                })
            })
            if (!res.ok) throw new Error('Failed to reinforce memory')
            const data = await res.json()
            
            if (data.error) {
                throw new Error(data.error.message || 'Reinforce failed')
            }
            
            // Refresh results
            if (query.trim()) {
                handleQuery()
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`)
        }
    }

    const availableNamespaces = selectedAgent 
        ? [selectedAgent.namespace]
        : []

    return (
        <div className="min-h-screen" suppressHydrationWarning>
            <div className="mb-6" suppressHydrationWarning>
                <h1 className="text-white text-2xl mb-2">Agent Memory Manager</h1>
                <p className="text-sm text-stone-500">
                    Query and manage memories through registered agents using the MCP proxy
                </p>
            </div>

            {!hasApiKey && (
                <div className="mb-6 rounded-xl border border-amber-700/30 bg-amber-900/20 p-4 text-amber-400">
                    Configure <code className="bg-stone-900 px-1 rounded">NEXT_PUBLIC_API_KEY</code> to enable agent memory operations.
                </div>
            )}

            {error && (
                <div className="mb-6 rounded-xl border border-rose-800/40 bg-rose-950/40 p-4 text-rose-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="rounded-xl border border-stone-900 bg-stone-950/60 p-4">
                        <h2 className="text-white text-lg mb-4">Select Agent</h2>
                        <select
                            value={selectedAgent?.agent_id || ""}
                            onChange={(e) => {
                                const agent = agents.find(a => a.agent_id === e.target.value)
                                setSelectedAgent(agent || null)
                            }}
                            disabled={!hasApiKey || agents.length === 0}
                            className="w-full rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200 disabled:opacity-50"
                        >
                            {agents.length === 0 ? (
                                <option>No agents available</option>
                            ) : (
                                agents.map(agent => (
                                    <option key={agent.agent_id} value={agent.agent_id}>
                                        {agent.agent_id}
                                    </option>
                                ))
                            )}
                        </select>

                        {selectedAgent && (
                            <div className="mt-4 space-y-3">
                                <div>
                                    <div className="text-xs text-stone-500 mb-1">Namespace</div>
                                    <div className="text-sm text-stone-300 font-mono bg-stone-900 rounded px-2 py-1">
                                        {selectedAgent.namespace}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-stone-500 mb-1">Permissions</div>
                                    <div className="flex gap-1 flex-wrap">
                                        {selectedAgent.permissions.map(perm => (
                                            <span key={perm} className="text-xs bg-sky-900/40 text-sky-300 px-2 py-0.5 rounded">
                                                {perm}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-stone-900 bg-stone-950/60 p-4">
                        <h2 className="text-white text-lg mb-4">Target Namespace</h2>
                        <select
                            value={selectedNamespace}
                            onChange={(e) => setSelectedNamespace(e.target.value)}
                            disabled={!selectedAgent || availableNamespaces.length === 0}
                            className="w-full rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200 disabled:opacity-50"
                        >
                            {availableNamespaces.map(ns => (
                                <option key={ns} value={ns}>{ns}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    <div className="rounded-xl border border-stone-900 bg-stone-950/60 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white text-lg">Query Memories</h2>
                            <button
                                onClick={() => setShowStoreModal(true)}
                                disabled={!hasApiKey || !selectedAgent}
                                className="rounded-xl px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Store Memory
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                                placeholder="Enter search query..."
                                disabled={!selectedAgent}
                                className="flex-1 rounded-lg border border-stone-800 bg-stone-950 p-3 text-stone-200 placeholder-stone-600 disabled:opacity-50"
                            />
                            <button
                                onClick={handleQuery}
                                disabled={loading || !selectedAgent || !query.trim()}
                                className="rounded-lg px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Searching..." : "Search"}
                            </button>
                        </div>

                        {queryResult && (
                            <div className="mt-4 text-sm text-stone-400">
                                Found <span className="text-white font-semibold">{queryResult.total_results}</span> memories 
                                in namespace <span className="text-sky-400 font-mono">{queryResult.namespace}</span>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-stone-900 bg-stone-950/60 overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-stone-500">
                                Searching memories...
                            </div>
                        ) : memories.length === 0 ? (
                            <div className="p-8 text-center text-stone-500">
                                {query.trim() ? "No memories found" : "Enter a query to search memories"}
                            </div>
                        ) : (
                            <div className="divide-y divide-stone-900">
                                {memories.map((memory) => (
                                    <div key={memory.id} className="p-4 hover:bg-stone-900/30 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-${sectorColors[memory.primary_sector]}-900/40 text-${sectorColors[memory.primary_sector]}-300`}>
                                                        {sectorIcons[memory.primary_sector]}
                                                        {memory.primary_sector}
                                                    </span>
                                                    {memory.score !== undefined && (
                                                        <span className="text-xs text-stone-500">
                                                            Score: <span className="text-white">{memory.score.toFixed(3)}</span>
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-stone-500">
                                                        Salience: <span className="text-white">{memory.salience.toFixed(2)}</span>
                                                    </span>
                                                </div>
                                                <p className="text-stone-300 text-sm leading-relaxed">
                                                    {memory.content}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-stone-500">
                                                    <span>ID: {memory.id.slice(0, 8)}...</span>
                                                    <span>Last seen: {new Date(memory.last_seen_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleReinforceMemory(memory.id)}
                                                disabled={!selectedAgent}
                                                className="rounded-lg px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                title="Reinforce this memory"
                                            >
                                                Reinforce
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showStoreModal && selectedAgent && (
                <StoreMemoryModal
                    onClose={() => setShowStoreModal(false)}
                    onStore={handleStoreMemory}
                    namespace={selectedNamespace}
                />
            )}
        </div>
    )
}

function StoreMemoryModal({ 
    onClose, 
    onStore,
    namespace 
}: { 
    onClose: () => void
    onStore: (content: string, sector: string) => void
    namespace: string
}) {
    const [content, setContent] = useState("")
    const [sector, setSector] = useState<string>("semantic")

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-black rounded-xl p-6 max-w-2xl w-full mx-4 border border-stone-800">
                <h2 className="text-xl text-white mb-4">Store New Memory</h2>
                <div className="mb-3 text-sm text-stone-400">
                    Storing to namespace: <span className="text-sky-400 font-mono">{namespace}</span>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-stone-400 text-sm mb-2 block">Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-stone-950 rounded-xl border border-stone-800 outline-none p-3 text-stone-300 min-h-32"
                            placeholder="Enter memory content..."
                        />
                    </div>
                    <div>
                        <label className="text-stone-400 text-sm mb-2 block">Sector</label>
                        <select
                            value={sector}
                            onChange={(e) => setSector(e.target.value)}
                            className="w-full bg-stone-950 rounded-xl border border-stone-800 outline-none p-3 text-stone-300"
                        >
                            <option value="semantic">Semantic</option>
                            <option value="episodic">Episodic</option>
                            <option value="procedural">Procedural</option>
                            <option value="emotional">Emotional</option>
                            <option value="reflective">Reflective</option>
                        </select>
                    </div>
                </div>
                <div className="flex space-x-3 mt-6">
                    <button
                        onClick={() => onStore(content, sector)}
                        disabled={!content.trim()}
                        className="flex-1 rounded-xl p-2 bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Store Memory
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl p-2 bg-stone-800 hover:bg-stone-700 text-white"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
