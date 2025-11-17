"use client"

import { useEffect, useMemo, useState } from "react"
import { API_BASE_URL, getHeaders } from "@/lib/api"

type AgentRecord = {
    agent_id: string
    namespace: string
    permissions: string[]
    description?: string
    registration_date: string
    last_access: string
}

type NamespaceSummary = {
    namespace: string
    description?: string
    created_by?: string | null
    created_at: string
    updated_at: string
    primary_agent_count: number
}

type NamespaceTotals = {
    totalNamespaces: number
    totalAgents: number
    orphanedNamespaces: number
}

type AgentFormValues = {
    agent_id: string
    namespace: string
    permissions: string[]
    description: string
}

type NamespaceFormValues = {
    namespace: string
    description: string
    created_by: string
}

const permissionOptions: Array<"read" | "write" | "admin"> = ["read", "write", "admin"]

export default function AgentsPage() {
    const [agents, setAgents] = useState<AgentRecord[]>([])
    const [namespaces, setNamespaces] = useState<NamespaceSummary[]>([])
    const [totals, setTotals] = useState<NamespaceTotals | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [agentModalOpen, setAgentModalOpen] = useState(false)
    const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null)
    const [agentResult, setAgentResult] = useState<{ agent_id: string; api_key?: string; message?: string } | null>(null)
    const [agentDeleteTarget, setAgentDeleteTarget] = useState<AgentRecord | null>(null)
    const [namespaceModalOpen, setNamespaceModalOpen] = useState(false)
    const [editingNamespace, setEditingNamespace] = useState<NamespaceSummary | null>(null)
    const [namespaceDeleteTarget, setNamespaceDeleteTarget] = useState<NamespaceSummary | null>(null)
    const [namespaceResult, setNamespaceResult] = useState<{ namespace: string; message?: string } | null>(null)

    const hasApiKey = Boolean((process.env.NEXT_PUBLIC_API_KEY || "").trim())

    useEffect(() => {
        if (!hasApiKey) {
            setLoading(false)
            return
        }
        refreshData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasApiKey])

    const refreshData = async () => {
        if (!hasApiKey) {
            setLoading(false)
            return
        }
        setLoading(true)
        setError(null)
        try {
            const [agentRes, namespaceRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/agents`, { headers: getHeaders() }),
                fetch(`${API_BASE_URL}/api/namespaces/summary`, { headers: getHeaders() }),
            ])

            if (!agentRes.ok) {
                const body = await agentRes.json().catch(() => ({}))
                throw new Error(body.error || "Failed to load agents")
            }
            if (!namespaceRes.ok) {
                const body = await namespaceRes.json().catch(() => ({}))
                throw new Error(body.error || "Failed to load namespaces")
            }

            const agentData = await agentRes.json()
            const namespaceData = await namespaceRes.json()

            setAgents(agentData.agents || [])
            setNamespaces(namespaceData.namespaces || [])
            setTotals(namespaceData.totals || null)
        } catch (err: any) {
            setError(err.message || "Unable to load data")
        } finally {
            setLoading(false)
        }
    }

    const handleSaveAgent = async (values: AgentFormValues) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/agents`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    agent_id: values.agent_id,
                    namespace: values.namespace,
                    permissions: values.permissions,
                    description: values.description.trim(),
                }),
            })

            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(body.error || "Failed to save agent")
            }

            setAgentResult({ agent_id: body.agent_id, api_key: body.api_key, message: body.message })
            setAgentModalOpen(false)
            setEditingAgent(null)
            await refreshData()
        } catch (err: any) {
            throw new Error(err.message || "Failed to save agent")
        }
    }

    const handleDeleteAgent = async (agent: AgentRecord) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/agents/${agent.agent_id}`, {
                method: "DELETE",
                headers: getHeaders(),
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(body.error || "Failed to deactivate agent")
            }
            setAgentDeleteTarget(null)
            setAgentResult({ agent_id: agent.agent_id, message: body.message })
            await refreshData()
        } catch (err: any) {
            setError(err.message || "Failed to deactivate agent")
            throw err
        }
    }

    const handleSaveNamespace = async (values: NamespaceFormValues) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/namespaces`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    namespace: values.namespace,
                    description: values.description.trim(),
                    created_by: values.created_by.trim(),
                }),
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(body.error || "Failed to save namespace")
            }
            setNamespaceResult({ namespace: body.namespace, message: body.message })
            setNamespaceModalOpen(false)
            setEditingNamespace(null)
            await refreshData()
        } catch (err: any) {
            throw new Error(err.message || "Failed to save namespace")
        }
    }

    const handleDeleteNamespace = async (summary: NamespaceSummary) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/namespaces/${summary.namespace}`, {
                method: "DELETE",
                headers: getHeaders(),
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(body.error || "Failed to deactivate namespace")
            }
            setNamespaceDeleteTarget(null)
            setNamespaceResult({ namespace: summary.namespace, message: body.message })
            await refreshData()
        } catch (err: any) {
            setError(err.message || "Failed to deactivate namespace")
            throw err
        }
    }

    return (
        <div className="min-h-screen" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-6" suppressHydrationWarning>
                <div>
                    <h1 className="text-white text-2xl">Agent & Namespace Management</h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Configure registered agents and control namespace access policies.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setEditingNamespace(null)
                            setNamespaceModalOpen(true)
                            setNamespaceResult(null)
                        }}
                        disabled={!hasApiKey}
                        className="rounded-xl p-2 px-4 bg-stone-900 hover:bg-stone-800 border border-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        New Namespace
                    </button>
                    <button
                        onClick={() => {
                            setEditingAgent(null)
                            setAgentModalOpen(true)
                            setAgentResult(null)
                        }}
                        disabled={!hasApiKey}
                        className="rounded-xl p-2 px-4 bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Register Agent
                    </button>
                </div>
            </div>

            {!hasApiKey && (
                <div className="mb-6 rounded-xl border border-amber-700/30 bg-amber-900/20 p-4 text-amber-400">
                    Configure <code className="bg-stone-900 px-1 rounded">NEXT_PUBLIC_API_KEY</code> to enable management actions.
                </div>
            )}

            {agentResult && (
                <div className="mb-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 p-4 text-emerald-200">
                    <div className="font-semibold">{agentResult.message || `Agent ${agentResult.agent_id} updated`}</div>
                    {agentResult.api_key && (
                        <div className="mt-2 text-sm">
                            API Key: <code className="bg-emerald-950 px-1 rounded">{agentResult.api_key}</code>
                        </div>
                    )}
                </div>
            )}

            {namespaceResult && (
                <div className="mb-6 rounded-xl border border-sky-700/40 bg-sky-900/30 p-4 text-sky-200">
                    <div className="font-semibold">{namespaceResult.message || `Namespace ${namespaceResult.namespace} updated`}</div>
                </div>
            )}

            {error && (
                <div className="mb-6 rounded-xl border border-rose-800/40 bg-rose-950/40 p-4 text-rose-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" suppressHydrationWarning>
                <div className="rounded-xl border border-stone-900 bg-stone-950/60 p-4">
                    <div className="text-sm text-stone-500">Registered Agents</div>
                    <div className="text-2xl text-white mt-2">{loading ? "—" : agents.length}</div>
                </div>
                <div className="rounded-xl border border-stone-900 bg-stone-950/60 p-4">
                    <div className="text-sm text-stone-500">Namespaces</div>
                    <div className="text-2xl text-white mt-2">{loading ? "—" : totals?.totalNamespaces ?? 0}</div>
                </div>
                <div className="rounded-xl border border-stone-900 bg-stone-950/60 p-4">
                    <div className="text-sm text-stone-500">Orphaned Namespaces</div>
                    <div className="text-2xl text-white mt-2">{loading ? "—" : totals?.orphanedNamespaces ?? 0}</div>
                </div>
            </div>

            <section className="mb-10" suppressHydrationWarning>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl text-white">Namespace Summary</h2>
                </div>
                <div className="rounded-xl border border-stone-900 bg-stone-950/60 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-900/60 text-stone-400">
                            <tr>
                                <th className="text-left px-4 py-3">Namespace</th>
                                <th className="text-left px-4 py-3">Agents</th>
                                <th className="text-left px-4 py-3">Description</th>
                                <th className="text-left px-4 py-3">Updated</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                                        Loading namespaces...
                                    </td>
                                </tr>
                            ) : namespaces.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                                        No namespaces found.
                                    </td>
                                </tr>
                            ) : (
                                namespaces.map((ns) => (
                                    <tr key={ns.namespace} className="border-t border-stone-900/60">
                                        <td className="px-4 py-3 text-stone-200 font-medium">{ns.namespace}</td>
                                        <td className="px-4 py-3 text-stone-300">{ns.primary_agent_count}</td>
                                        <td className="px-4 py-3 text-stone-400 max-w-[260px] break-words">{ns.description || "—"}</td>
                                        <td className="px-4 py-3 text-stone-400">{new Date(ns.updated_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingNamespace(ns)
                                                        setNamespaceModalOpen(true)
                                                        setNamespaceResult(null)
                                                    }}
                                                    className="p-2 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-800"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setNamespaceDeleteTarget(ns)}
                                                    disabled={ns.primary_agent_count > 0}
                                                    className="p-2 rounded-lg bg-rose-900/20 border border-rose-800/40 text-rose-300 hover:bg-rose-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Disable
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-10" suppressHydrationWarning>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl text-white">Registered Agents</h2>
                </div>
                <div className="rounded-xl border border-stone-900 bg-stone-950/60 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-900/60 text-stone-400">
                            <tr>
                                <th className="text-left px-4 py-3">Agent</th>
                                <th className="text-left px-4 py-3">Namespace</th>
                                <th className="text-left px-4 py-3">Permissions</th>
                                <th className="text-left px-4 py-3">Description</th>
                                <th className="text-left px-4 py-3">Last Access</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                                        Loading agents...
                                    </td>
                                </tr>
                            ) : agents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                                        No agents registered yet.
                                    </td>
                                </tr>
                            ) : (
                                agents.map((agent) => (
                                    <tr key={agent.agent_id} className="border-t border-stone-900/60">
                                        <td className="px-4 py-3 text-stone-200 font-medium">{agent.agent_id}</td>
                                        <td className="px-4 py-3">
                                            <span className="bg-stone-900 border border-stone-800 rounded-lg px-2 py-0.5 text-xs text-stone-300">
                                                {agent.namespace}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-stone-300">
                                            {agent.permissions.join(", ")}
                                        </td>
                                        <td className="px-4 py-3 text-stone-400 max-w-[260px] break-words">
                                            {agent.description || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-stone-400">{new Date(agent.last_access).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingAgent(agent)
                                                        setAgentModalOpen(true)
                                                        setAgentResult(null)
                                                    }}
                                                    className="p-2 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-800"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setAgentDeleteTarget(agent)}
                                                    className="p-2 rounded-lg bg-rose-900/20 border border-rose-800/40 text-rose-300 hover:bg-rose-900/40"
                                                >
                                                    Deactivate
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {agentModalOpen && (
                <AgentModal
                    onClose={() => {
                        setAgentModalOpen(false)
                        setEditingAgent(null)
                    }}
                    onSave={handleSaveAgent}
                    namespaces={namespaces.map((ns) => ns.namespace)}
                    initial={editingAgent}
                />
            )}

            {agentDeleteTarget && (
                <ConfirmDialog
                    title="Deactivate Agent"
                    description={`This will disable API access for ${agentDeleteTarget.agent_id}. Continue?`}
                    confirmLabel="Deactivate"
                    tone="danger"
                    onCancel={() => setAgentDeleteTarget(null)}
                    onConfirm={async () => {
                        await handleDeleteAgent(agentDeleteTarget)
                    }}
                />
            )}

            {namespaceModalOpen && (
                <NamespaceModal
                    onClose={() => {
                        setNamespaceModalOpen(false)
                        setEditingNamespace(null)
                    }}
                    onSave={handleSaveNamespace}
                    initial={editingNamespace}
                />
            )}

            {namespaceDeleteTarget && (
                <ConfirmDialog
                    title="Disable Namespace"
                    description={`Namespaces with active agents cannot be disabled. Disable ${namespaceDeleteTarget.namespace}?`}
                    confirmLabel="Disable"
                    tone="danger"
                    onCancel={() => setNamespaceDeleteTarget(null)}
                    onConfirm={async () => {
                        await handleDeleteNamespace(namespaceDeleteTarget)
                    }}
                />
            )}
        </div>
    )
}

function AgentModal({
    onClose,
    onSave,
    namespaces,
    initial,
}: {
    onClose: () => void
    onSave: (values: AgentFormValues) => Promise<void>
    namespaces: string[]
    initial: AgentRecord | null
}) {
    const [agentId, setAgentId] = useState(initial?.agent_id || "")
    const [namespace, setNamespace] = useState(initial?.namespace || "")
    const [permissions, setPermissions] = useState<string[]>(() => {
        const base = initial?.permissions || ["read", "write"]
        return Array.from(new Set([...base, "read"]))
    })
    const [description, setDescription] = useState(initial?.description || "")
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const togglePermission = (perm: "read" | "write" | "admin") => {
        setPermissions((prev) =>
            prev.includes(perm)
                ? prev.filter((p) => p !== perm)
                : [...prev, perm]
        )
    }

    const handleSubmit = async () => {
        if (!agentId.trim()) {
            setFormError("Agent ID is required")
            return
        }
        if (!namespace.trim()) {
            setFormError("Namespace is required")
            return
        }
        if (!permissions.includes("read")) {
            setFormError("Agents must keep read permission")
            return
        }

        setSaving(true)
        setFormError(null)
        try {
            await onSave({
                agent_id: agentId.trim(),
                namespace: namespace.trim(),
                permissions,
                description,
            })
        } catch (error: any) {
            setFormError(error.message || "Failed to save agent")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-2xl rounded-xl border border-stone-800 bg-black p-6">
                <h3 className="text-xl text-white mb-4">
                    {initial ? "Edit Agent" : "Register Agent"}
                </h3>

                {formError && (
                    <div className="mb-4 rounded-lg border border-rose-800/40 bg-rose-950/40 p-3 text-sm text-rose-300">
                        {formError}
                    </div>
                )}

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Agent ID</label>
                        <input
                            value={agentId}
                            onChange={(e) => setAgentId(e.target.value)}
                            disabled={!!initial}
                            className="w-full rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200 disabled:opacity-70"
                            placeholder="my-agent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Namespace</label>
                        <input
                            list="namespace-suggestions"
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="w-full rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200"
                            placeholder="workspace-namespace"
                        />
                        <datalist id="namespace-suggestions">
                            {namespaces.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <span className="block text-sm text-stone-400 mb-2">Permissions</span>
                        <div className="flex flex-wrap gap-3">
                            {permissionOptions.map((perm) => (
                                <label key={perm} className="flex items-center gap-2 text-stone-300">
                                    <input
                                        type="checkbox"
                                        className="rounded border-stone-700 bg-stone-950"
                                        checked={permissions.includes(perm)}
                                        onChange={() => togglePermission(perm)}
                                        disabled={perm === "read"}
                                    />
                                    <span className="capitalize">{perm}</span>
                                </label>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-stone-500">Read access is required for all agents.</p>
                    </div>
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full min-h-24 rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200"
                            placeholder="Purpose or capabilities"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-stone-800 bg-stone-900 px-4 py-2 text-stone-300 hover:bg-stone-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="rounded-lg bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Agent"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function NamespaceModal({
    onClose,
    onSave,
    initial,
}: {
    onClose: () => void
    onSave: (values: NamespaceFormValues) => Promise<void>
    initial: NamespaceSummary | null
}) {
    const [namespace, setNamespace] = useState(initial?.namespace || "")
    const [description, setDescription] = useState(initial?.description || "")
    const [createdBy, setCreatedBy] = useState(initial?.created_by || "")
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!namespace.trim()) {
            setFormError("Namespace is required")
            return
        }

        setSaving(true)
        setFormError(null)
        try {
            await onSave({
                namespace: namespace.trim(),
                description,
                created_by: createdBy,
            })
        } catch (error: any) {
            setFormError(error.message || "Failed to save namespace")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-xl rounded-xl border border-stone-800 bg-black p-6">
                <h3 className="text-xl text-white mb-4">
                    {initial ? "Edit Namespace" : "Create Namespace"}
                </h3>

                {formError && (
                    <div className="mb-4 rounded-lg border border-rose-800/40 bg-rose-950/40 p-3 text-sm text-rose-300">
                        {formError}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Namespace</label>
                        <input
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            disabled={!!initial}
                            className="w-full rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200 disabled:opacity-70"
                            placeholder="team-namespace"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full min-h-24 rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200"
                            placeholder="Describe how this namespace is used"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Created By (optional)</label>
                        <input
                            value={createdBy || ""}
                            onChange={(e) => setCreatedBy(e.target.value)}
                            className="w-full rounded-lg border border-stone-800 bg-stone-950 p-2 text-stone-200"
                            placeholder="agent-id"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-stone-800 bg-stone-900 px-4 py-2 text-stone-300 hover:bg-stone-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="rounded-lg bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Namespace"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ConfirmDialog({
    title,
    description,
    confirmLabel,
    tone = "default",
    onCancel,
    onConfirm,
}: {
    title: string
    description: string
    confirmLabel: string
    tone?: "default" | "danger"
    onCancel: () => void
    onConfirm: () => Promise<void>
}) {
    const [working, setWorking] = useState(false)
    const handleConfirm = async () => {
        setWorking(true)
        try {
            await onConfirm()
        } catch (error) {
            console.error(error)
        } finally {
            setWorking(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md rounded-xl border border-stone-800 bg-black p-6">
                <h3 className="text-xl text-white mb-3">{title}</h3>
                <p className="text-sm text-stone-400 mb-6">{description}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="rounded-lg border border-stone-800 bg-stone-900 px-4 py-2 text-stone-300 hover:bg-stone-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={working}
                        className={`rounded-lg px-4 py-2 ${
                            tone === "danger"
                                ? "bg-rose-600 text-white hover:bg-rose-700"
                                : "bg-sky-500 text-white hover:bg-sky-600"
                        } disabled:opacity-50`}
                    >
                        {working ? "Working..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
