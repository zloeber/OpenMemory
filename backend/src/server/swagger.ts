import { env } from "../core/cfg";

export const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "OpenMemory API",
        version: "1.2.2",
        description: "Hierarchical Sector Graph (HSG) memory engine with REST API",
        contact: {
            name: "OpenMemory",
            url: "https://github.com/openmemoryhq/openmemory"
        }
    },
    servers: [
        {
            url: `http://localhost:${env.port}`,
            description: "Local development server"
        }
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
                description: "API key for authentication"
            },
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                description: "Bearer token authentication"
            }
        },
        schemas: {
            Memory: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    content: { type: "string" },
                    salience: { type: "number", format: "float" },
                    sector: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                    user_id: { type: "string" },
                    metadata: { type: "object" },
                    tags: { type: "array", items: { type: "string" } }
                }
            },
            AddMemoryRequest: {
                type: "object",
                required: ["content"],
                properties: {
                    content: { type: "string", description: "Memory content" },
                    user_id: { type: "string", description: "User identifier" },
                    metadata: { type: "object", description: "Additional metadata" },
                    tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
                    namespace: { type: "string", description: "Namespace for isolation" }
                }
            },
            QueryRequest: {
                type: "object",
                required: ["query"],
                properties: {
                    query: { type: "string", description: "Search query" },
                    user_id: { type: "string", description: "User identifier" },
                    top_k: { type: "integer", description: "Number of results to return", default: 10 },
                    min_score: { type: "number", description: "Minimum relevance score", default: 0.3 },
                    namespace: { type: "string", description: "Namespace to query" },
                    filters: { type: "object", description: "Additional filters" }
                }
            },
            QueryResponse: {
                type: "object",
                properties: {
                    results: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                memory: { $ref: "#/components/schemas/Memory" },
                                score: { type: "number", format: "float" },
                                relevance: { type: "string" }
                            }
                        }
                    },
                    query_time_ms: { type: "number" }
                }
            },
            Error: {
                type: "object",
                properties: {
                    error: { type: "string" },
                    message: { type: "string" },
                    details: { type: "object" }
                }
            },
            HealthResponse: {
                type: "object",
                properties: {
                    status: { type: "string", enum: ["ok", "error"] },
                    version: { type: "string" },
                    uptime: { type: "number" },
                    timestamp: { type: "string", format: "date-time" }
                }
            },
            StatsResponse: {
                type: "object",
                properties: {
                    total_memories: { type: "integer" },
                    users: { type: "integer" },
                    avg_salience: { type: "number" },
                    sectors: { type: "object" },
                    storage_backend: { type: "string" },
                    vector_dimensions: { type: "integer" }
                }
            }
        }
    },
    security: [
        { ApiKeyAuth: [] },
        { BearerAuth: [] }
    ],
    paths: {
        "/health": {
            get: {
                tags: ["System"],
                summary: "Health check",
                description: "Check if the API is running",
                security: [],
                responses: {
                    "200": {
                        description: "API is healthy",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/HealthResponse" }
                            }
                        }
                    }
                }
            }
        },
        "/api/stats": {
            get: {
                tags: ["System"],
                summary: "Get system statistics",
                description: "Retrieve overall system statistics and metrics",
                responses: {
                    "200": {
                        description: "Statistics retrieved successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/StatsResponse" }
                            }
                        }
                    }
                }
            }
        },
        "/api/memory/add": {
            post: {
                tags: ["Memory"],
                summary: "Add a new memory",
                description: "Store a new memory with automatic sector classification and embeddings",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AddMemoryRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Memory added successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        sector: { type: "string" },
                                        salience: { type: "number" }
                                    }
                                }
                            }
                        }
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" }
                }
            }
        },
        "/api/memory/query": {
            post: {
                tags: ["Memory"],
                summary: "Query memories",
                description: "Search for relevant memories using semantic search",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/QueryRequest" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Query successful",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/QueryResponse" }
                            }
                        }
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" }
                }
            }
        },
        "/api/memory/list": {
            get: {
                tags: ["Memory"],
                summary: "List memories",
                description: "Retrieve a paginated list of memories",
                parameters: [
                    {
                        name: "user_id",
                        in: "query",
                        schema: { type: "string" },
                        description: "Filter by user ID"
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 50 },
                        description: "Number of memories to return"
                    },
                    {
                        name: "offset",
                        in: "query",
                        schema: { type: "integer", default: 0 },
                        description: "Offset for pagination"
                    },
                    {
                        name: "namespace",
                        in: "query",
                        schema: { type: "string" },
                        description: "Filter by namespace"
                    }
                ],
                responses: {
                    "200": {
                        description: "Memories retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        memories: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Memory" }
                                        },
                                        total: { type: "integer" },
                                        limit: { type: "integer" },
                                        offset: { type: "integer" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/memory/delete/:id": {
            delete: {
                tags: ["Memory"],
                summary: "Delete a memory",
                description: "Remove a specific memory by ID",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Memory ID"
                    }
                ],
                responses: {
                    "200": {
                        description: "Memory deleted successfully"
                    },
                    "404": {
                        description: "Memory not found"
                    }
                }
            }
        },
        "/api/compression/compress": {
            post: {
                tags: ["Compression"],
                summary: "Compress text",
                description: "Compress text using semantic, syntactic, or aggressive algorithms",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: { type: "string" },
                                    algorithm: {
                                        type: "string",
                                        enum: ["semantic", "syntactic", "aggressive", "auto"],
                                        default: "auto"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Text compressed successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        original: { type: "string" },
                                        compressed: { type: "string" },
                                        ratio: { type: "number" },
                                        algorithm: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/temporal/add_fact": {
            post: {
                tags: ["Temporal"],
                summary: "Add temporal fact",
                description: "Store a temporal knowledge graph fact with time-based reasoning",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["subject", "predicate", "object"],
                                properties: {
                                    subject: { type: "string" },
                                    predicate: { type: "string" },
                                    object: { type: "string" },
                                    timestamp: { type: "string", format: "date-time" },
                                    valid_from: { type: "string", format: "date-time" },
                                    valid_until: { type: "string", format: "date-time" },
                                    confidence: { type: "number", minimum: 0, maximum: 1 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Temporal fact added successfully"
                    }
                }
            }
        },
        "/api/temporal/query": {
            post: {
                tags: ["Temporal"],
                summary: "Query temporal facts",
                description: "Query temporal knowledge graph with time-based constraints",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    subject: { type: "string" },
                                    predicate: { type: "string" },
                                    object: { type: "string" },
                                    at_time: { type: "string", format: "date-time" },
                                    limit: { type: "integer", default: 50 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Query successful"
                    }
                }
            }
        },
        "/api/users/list": {
            get: {
                tags: ["Users"],
                summary: "List users",
                description: "Retrieve a list of all users in the system",
                responses: {
                    "200": {
                        description: "Users retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        users: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    user_id: { type: "string" },
                                                    memory_count: { type: "integer" },
                                                    last_activity: { type: "string", format: "date-time" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/users/delete/:user_id": {
            delete: {
                tags: ["Users"],
                summary: "Delete user",
                description: "Remove a user and all associated memories",
                parameters: [
                    {
                        name: "user_id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "User ID"
                    }
                ],
                responses: {
                    "200": {
                        description: "User deleted successfully"
                    },
                    "404": {
                        description: "User not found"
                    }
                }
            }
        },
        "/api/ide/event": {
            post: {
                tags: ["IDE"],
                summary: "Send IDE event",
                description: "Send telemetry event from IDE extension",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["event_type"],
                                properties: {
                                    event_type: { type: "string" },
                                    session_id: { type: "string" },
                                    data: { type: "object" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Event recorded successfully"
                    }
                }
            }
        },
        "/api/dashboard/metrics": {
            get: {
                tags: ["Dashboard"],
                summary: "Get dashboard metrics",
                description: "Retrieve real-time system metrics for dashboard display",
                responses: {
                    "200": {
                        description: "Metrics retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        requests: { type: "object" },
                                        active_queries: { type: "integer" },
                                        cache_stats: { type: "object" },
                                        memory_stats: { type: "object" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    responses: {
        BadRequest: {
            description: "Bad request - invalid parameters",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/Error" }
                }
            }
        },
        Unauthorized: {
            description: "Unauthorized - invalid or missing API key",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/Error" }
                }
            }
        },
        NotFound: {
            description: "Resource not found",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/Error" }
                }
            }
        }
    },
    tags: [
        { name: "System", description: "System health and statistics" },
        { name: "Memory", description: "Memory storage and retrieval operations" },
        { name: "Compression", description: "Text compression utilities" },
        { name: "Temporal", description: "Temporal knowledge graph operations" },
        { name: "Users", description: "User management" },
        { name: "IDE", description: "IDE integration endpoints" },
        { name: "Dashboard", description: "Dashboard and monitoring" }
    ]
};
