"use client"

import { useEffect, useState } from "react"
import { API_BASE_URL, getHeaders } from "@/lib/api"

interface Namespace {
    namespace: string
    description: string
    ontology_profile?: string
    metadata?: any
    created_at: string
    updated_at: string
    active: number
}

export default function NamespacesPage() {
    const [namespaces, setNamespaces] = useState<Namespace[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingNamespace, setEditingNamespace] = useState<Namespace | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingNamespace, setDeletingNamespace] = useState<Namespace | null>(null)

    const hasApiKey = Boolean((process.env.NEXT_PUBLIC_API_KEY || "").trim())

    useEffect(() => {
        if (hasApiKey) {
            refreshNamespaces()
        } else {
            setLoading(false)
        }
    }, [hasApiKey])

    async function refreshNamespaces() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_BASE_URL}/api/namespaces`, { headers: getHeaders() })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || "Failed to load namespaces")
            }
            const data = await res.json()
            setNamespaces(data.namespaces || [])
        } catch (err: any) {
            setError(err.message || "Unable to load namespaces")
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateNamespace(namespace: string, description: string, ontology?: string) {
        try {
            const body: any = { namespace, description }
            if (ontology) body.ontology_profile = ontology
            
            const res = await fetch(`${API_BASE_URL}/api/namespaces`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to create namespace')
            }
            setShowCreateModal(false)
            refreshNamespaces()
        } catch (e: any) {
            alert(`Error: ${e.message}`)
        }
    }

    async function handleUpdateNamespace(namespace: string, description: string, ontology?: string) {
        try {
            const body: any = { description }
            if (ontology) body.ontology_profile = ontology
            
            const res = await fetch(`${API_BASE_URL}/api/namespaces/${namespace}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to update namespace')
            }
            setShowEditModal(false)
            setEditingNamespace(null)
            refreshNamespaces()
        } catch (e: any) {
            alert(`Error: ${e.message}`)
        }
    }

    async function handleDeleteNamespace(namespace: string) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/namespaces/${namespace}`, {
                method: 'DELETE',
                headers: getHeaders(),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to delete namespace')
            }
            setShowDeleteModal(false)
            setDeletingNamespace(null)
            refreshNamespaces()
        } catch (e: any) {
            alert(`Error: ${e.message}`)
        }
    }

    return (
        <div className="min-h-screen" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-white text-2xl">Namespaces</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    disabled={!hasApiKey}
                    className="rounded-xl p-2 px-4 bg-sky-500 hover:bg-sky-600 text-white flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                    <span>Create Namespace</span>
                </button>
            </div>

            {!hasApiKey && (
                <div className="rounded-xl border border-amber-800 bg-amber-500/10 p-4 text-amber-400 mb-6">
                    Please configure NEXT_PUBLIC_API_KEY in your environment to use this feature.
                </div>
            )}

            {loading && <div className="text-stone-400 text-center py-8">Loading...</div>}
            {error && <div className="text-rose-400 text-center py-8">Error: {error}</div>}
            
            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {namespaces.length === 0 ? (
                        <div className="col-span-full rounded-xl border border-stone-900 p-8 bg-stone-950/50 flex items-center justify-center">
                            <span className="text-stone-400">No namespaces found. Create your first namespace to get started.</span>
                        </div>
                    ) : (
                        namespaces.map((ns) => (
                            <div
                                key={ns.namespace}
                                className="rounded-xl border border-stone-800 bg-stone-950/50 p-4 hover:border-stone-700 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-1">{ns.namespace}</h3>
                                        <p className="text-sm text-stone-400">{ns.description || 'No description'}</p>
                                    </div>
                                    <div className={`rounded-lg px-2 py-1 text-xs ${ns.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-stone-800 text-stone-400'}`}>
                                        {ns.active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>

                                {ns.ontology_profile && (
                                    <div className="mb-3 rounded-lg bg-stone-900 border border-stone-800 p-2">
                                        <span className="text-xs text-stone-400">Ontology: </span>
                                        <span className="text-xs text-sky-400">{ns.ontology_profile}</span>
                                    </div>
                                )}

                                {ns.metadata && Object.keys(ns.metadata).length > 0 && (
                                    <div className="mb-3 rounded-lg bg-stone-900 border border-stone-800 p-2">
                                        <span className="text-xs text-stone-400 block mb-1">Metadata:</span>
                                        <pre className="text-xs text-stone-300 overflow-x-auto">
                                            {JSON.stringify(ns.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                <div className="text-xs text-stone-500 mb-3">
                                    <div>Created: {new Date(ns.created_at).toLocaleDateString()}</div>
                                    <div>Updated: {new Date(ns.updated_at).toLocaleDateString()}</div>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => { setEditingNamespace(ns); setShowEditModal(true) }}
                                        className="flex-1 rounded-lg p-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { setDeletingNamespace(ns); setShowDeleteModal(true) }}
                                        className="flex-1 rounded-lg p-2 bg-rose-900/20 border border-rose-800/50 hover:bg-rose-900/40 text-rose-400 text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showCreateModal && (
                <CreateNamespaceModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateNamespace}
                />
            )}

            {showEditModal && editingNamespace && (
                <EditNamespaceModal
                    namespace={editingNamespace}
                    onClose={() => { setShowEditModal(false); setEditingNamespace(null) }}
                    onUpdate={handleUpdateNamespace}
                />
            )}

            {showDeleteModal && deletingNamespace && (
                <DeleteNamespaceModal
                    namespace={deletingNamespace}
                    onClose={() => { setShowDeleteModal(false); setDeletingNamespace(null) }}
                    onConfirm={() => handleDeleteNamespace(deletingNamespace.namespace)}
                />
            )}
        </div>
    )
}

function CreateNamespaceModal({ onClose, onCreate }: { 
    onClose: () => void; 
    onCreate: (namespace: string, description: string, ontology?: string) => void 
}) {
    const [namespace, setNamespace] = useState('')
    const [description, setDescription] = useState('')
    const [ontology, setOntology] = useState('')

    const ontologyOptions = [
        '',
        'default_agentic_memory_ontology',
        'fantasy_dungeon_master_ontology',
        'therapy_psychology_ontology'
    ]

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-black rounded-xl p-6 max-w-2xl w-full mx-4 border border-stone-800">
                <h2 className="text-xl text-white mb-4">Create Namespace</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-stone-400 text-sm mb-2 block">Namespace Name *</label>
                        <input
                            type="text"
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="w-full bg-stone-950 rounded-xl border border-stone-800 outline-none p-3 text-stone-300"
                            placeholder="my-namespace"
                        />
                    </div>
                    <div>
                        <label className="text-stone-400 text-sm mb-2 block">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-stone-950 rounded-xl border border-stone-800 outline-none p-3 text-stone-300 min-h-24"
                            placeholder="Describe this namespace..."
                        />
                    </div>
                    <div>
                        <label className="text-stone-400 text-sm mb-2 block">Ontology Profile (optional)</label>
                        <select
                            value={ontology}
                            onChange={(e) => setOntology(e.target.value)}
                            className="w-full bg-stone-950 rounded-xl border border-stone-800 outline-none p-3 text-stone-300"
                        >
                            <option value="">None</option>
                            {ontologyOptions.slice(1).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex space-x-3 mt-6">
                    <button
                        onClick={() => onCreate(namespace, description, ontology || undefined)}
                        disabled={!namespace.trim()}
                        className="flex-1 rounded-xl p-2 bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create
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

function EditNamespaceModal({ namespace, onClose, onUpdate }: { 
    namespace: Namespace;
    onClose: () => void; 
    onUpdate: (namespace: string, description: string, ontology?: string) => void 
}) {
    const [description, setDescription] = useState(namespace.description)
    const [ontology, setOntology] = useState(namespace.ontology_profile || '')

    const ontologyOptions = [
        '',
        'default_agentic_memory_ontology',
        'fantasy_dungeon_master_ontology',
        'therapy_psychology_ontology'
    ]

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-black rounded-xl p-6 max-w-2xl w-full mx-4 border border-stone-800">
                <h2 className="text-xl text-white mb-4">Edit Namespace: {namespace.namespace}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-stone-400 text-sm mb-2 block">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-stone-950 rounded-xl border border-stone-800 outline-none p-3 text-stone-300 min-h-24"
                            placeholder="Describe this namespace..."
                        />
                    </div>
                    <div>
                        <label className="text-stone-400 text-sm mb-2 block">Ontology Profile (optional)</label>
                        <select
                            value={ontology}
                            onChange={(e) => setOntology(e.target.value)}
                            className="w-full bg-stone-950 rounded-xl border border-stone-800 outline-none p-3 text-stone-300"
                        >
                            <option value="">None</option>
                            {ontologyOptions.slice(1).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex space-x-3 mt-6">
                    <button
                        onClick={() => onUpdate(namespace.namespace, description, ontology || undefined)}
                        className="flex-1 rounded-xl p-2 bg-sky-500 hover:bg-sky-600 text-white"
                    >
                        Update
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

function DeleteNamespaceModal({ namespace, onClose, onConfirm }: { 
    namespace: Namespace;
    onClose: () => void; 
    onConfirm: () => void 
}) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-black rounded-xl p-6 max-w-md w-full mx-4 border border-stone-800">
                <h2 className="text-xl text-white mb-4">Delete Namespace</h2>
                <p className="text-stone-400 mb-6">
                    Are you sure you want to delete the namespace <span className="text-white font-semibold">{namespace.namespace}</span>? 
                    This will deactivate the namespace but preserve all associated memories.
                </p>
                <div className="flex space-x-3">
                    <button
                        onClick={onConfirm}
                        className="flex-1 rounded-xl p-2 bg-rose-500 hover:bg-rose-600 text-white"
                    >
                        Delete
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
