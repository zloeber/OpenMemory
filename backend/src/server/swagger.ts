import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from '../core/cfg';
import * as path from 'path';
import * as fs from 'fs';

// Manual OpenAPI specification since JSDoc parsing doesn't work well with our custom server
export const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'OpenMemory API',
        version: '2.0.0',
        description: 'Brain-inspired memory engine for LLMs and AI agents with temporal graph capabilities',
        contact: {
            name: 'OpenMemory',
            url: 'https://github.com/zloeber/openmemory-fork',
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
        },
    },
    servers: [
        {
            url: `http://localhost:${env.port}`,
            description: 'Development server',
        },
    ],
    security: [
        { apiKeyAuth: [] }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token authentication',
            },
            apiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'x-api-key',
                description: 'API key authentication',
            },
        },
        schemas: {
            Memory: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Unique memory identifier' },
                    content: { type: 'string', description: 'Memory content text' },
                    tags: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Associated tags'
                    },
                    metadata: { 
                        type: 'object',
                        description: 'Additional metadata'
                    },
                    created_at: { 
                        type: 'string', 
                        format: 'date-time',
                        description: 'Creation timestamp'
                    },
                    updated_at: { 
                        type: 'string', 
                        format: 'date-time',
                        description: 'Last update timestamp'
                    },
                    user_id: { 
                        type: 'string',
                        description: 'Associated user ID'
                    },
                    embedding: {
                        type: 'array',
                        items: { type: 'number' },
                        description: 'Vector embedding'
                    },
                    strength: { 
                        type: 'number',
                        description: 'Memory strength value'
                    },
                },
            },
            TemporalFact: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Unique fact identifier' },
                    subject: { type: 'string', description: 'Fact subject' },
                    predicate: { type: 'string', description: 'Fact predicate/relationship' },
                    object: { type: 'string', description: 'Fact object/value' },
                    valid_from: { 
                        type: 'string', 
                        format: 'date-time',
                        description: 'Fact validity start time'
                    },
                    valid_to: { 
                        type: 'string', 
                        format: 'date-time',
                        nullable: true,
                        description: 'Fact validity end time'
                    },
                    confidence: { 
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'Confidence level'
                    },
                    last_updated: { 
                        type: 'string', 
                        format: 'date-time',
                        description: 'Last update timestamp'
                    },
                    metadata: { 
                        type: 'object',
                        description: 'Additional metadata'
                    },
                },
            },
            HealthResponse: {
                type: 'object',
                properties: {
                    ok: { type: 'boolean', description: 'Service health status' },
                    version: { type: 'string', description: 'API version' },
                    embedding: { 
                        type: 'object',
                        description: 'Embedding provider information'
                    },
                    tier: { 
                        type: 'string',
                        enum: ['fast', 'smart', 'deep', 'hybrid'],
                        description: 'Performance tier'
                    },
                    dim: { type: 'integer', description: 'Vector dimension' },
                    cache: { type: 'integer', description: 'Cache segments' },
                    expected: {
                        type: 'object',
                        properties: {
                            recall: { type: 'number' },
                            qps: { type: 'string' },
                            ram: { type: 'string' },
                            use: { type: 'string' }
                        }
                    }
                },
            },
            Error: {
                type: 'object',
                properties: {
                    err: { type: 'string', description: 'Error message' },
                },
            },
            AddMemoryRequest: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string', description: 'Memory content text' },
                    tags: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Associated tags'
                    },
                    metadata: { 
                        type: 'object',
                        description: 'Additional metadata'
                    },
                    user_id: { 
                        type: 'string',
                        description: 'Associated user ID'
                    },
                },
            },
        },
    },
    paths: {
        '/health': {
            get: {
                summary: 'Health check endpoint',
                description: 'Returns the health status of the OpenMemory service along with configuration details',
                tags: ['System'],
                responses: {
                    '200': {
                        description: 'Server health status and configuration',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/HealthResponse'
                                },
                                examples: {
                                    healthy: {
                                        summary: 'Healthy server response',
                                        value: {
                                            ok: true,
                                            version: '2.0-hsg-tiered',
                                            embedding: { provider: 'ollama', dimensions: 256 },
                                            tier: 'hybrid',
                                            dim: 256,
                                            cache: 3,
                                            expected: { recall: 98, qps: '700-800', ram: '0.5gb/10k', use: 'For high accuracy' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/memory/add': {
            post: {
                summary: 'Add a new memory',
                description: 'Store new content as a memory with optional metadata and tags',
                tags: ['Memory'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/AddMemoryRequest'
                            },
                            examples: {
                                simple: {
                                    summary: 'Simple memory',
                                    value: {
                                        content: 'User prefers dark mode UI',
                                        tags: ['preference', 'ui']
                                    }
                                },
                                with_metadata: {
                                    summary: 'Memory with metadata',
                                    value: {
                                        content: 'Project deadline is March 15th',
                                        tags: ['project', 'deadline'],
                                        metadata: { priority: 'high', project_id: 'proj_123' },
                                        user_id: 'user_456'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Memory successfully added',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        primary_sector: { type: 'string' },
                                        sectors: { type: 'array', items: { type: 'string' } },
                                        chunks: { type: 'integer' }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request - missing content',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/memory/query': {
            post: {
                summary: 'Query memories',
                description: 'Search for memories using semantic similarity',
                tags: ['Memory'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['query'],
                                properties: {
                                    query: { type: 'string', description: 'Search query text' },
                                    limit: { 
                                        type: 'integer',
                                        minimum: 1,
                                        maximum: 100,
                                        default: 10,
                                        description: 'Maximum number of results'
                                    },
                                    min_similarity: { 
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1,
                                        default: 0.7,
                                        description: 'Minimum similarity threshold'
                                    },
                                    user_id: { 
                                        type: 'string',
                                        description: 'Filter by user ID'
                                    },
                                    tags: { 
                                        type: 'array', 
                                        items: { type: 'string' },
                                        description: 'Filter by tags'
                                    },
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Query results',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        allOf: [
                                            { $ref: '#/components/schemas/Memory' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    similarity: {
                                                        type: 'number',
                                                        description: 'Similarity score'
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/memory/ingest': {
            post: {
                summary: 'Ingest document',
                description: 'Extract and store content from various document formats',
                tags: ['Memory'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['content_type', 'data'],
                                properties: {
                                    content_type: { 
                                        type: 'string',
                                        enum: ['text/plain', 'text/html', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                                        description: 'Content type'
                                    },
                                    data: { 
                                        type: 'string',
                                        description: 'Base64 encoded content or raw text'
                                    },
                                    metadata: { 
                                        type: 'object',
                                        description: 'Additional metadata'
                                    },
                                    user_id: { 
                                        type: 'string',
                                        description: 'Associated user ID'
                                    },
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Document successfully ingested'
                    }
                }
            }
        },
        '/memory/all': {
            get: {
                summary: 'Get all memories',
                description: 'Retrieve all stored memories with optional pagination',
                tags: ['Memory'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                parameters: [
                    {
                        in: 'query',
                        name: 'offset',
                        schema: { type: 'integer', minimum: 0, default: 0 },
                        description: 'Number of memories to skip'
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
                        description: 'Maximum number of memories to return'
                    }
                ],
                responses: {
                    '200': {
                        description: 'List of memories',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Memory' }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/memory/{id}': {
            get: {
                summary: 'Get memory by ID',
                description: 'Retrieve a specific memory by its unique identifier',
                tags: ['Memory'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Memory ID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Memory details',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Memory' }
                            }
                        }
                    },
                    '404': {
                        description: 'Memory not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' }
                            }
                        }
                    }
                }
            },
            patch: {
                summary: 'Update memory',
                description: 'Update an existing memory content, tags, or metadata',
                tags: ['Memory'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Memory ID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Memory successfully updated'
                    }
                }
            },
            delete: {
                summary: 'Delete memory',
                description: 'Remove a memory from the system',
                tags: ['Memory'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Memory ID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Memory successfully deleted'
                    }
                }
            }
        },
        '/api/temporal/fact': {
            post: {
                summary: 'Create temporal fact',
                description: 'Add a new temporal fact to the knowledge graph',
                tags: ['Temporal'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['subject', 'predicate', 'object'],
                                properties: {
                                    subject: { type: 'string', description: 'Fact subject' },
                                    predicate: { type: 'string', description: 'Fact predicate/relationship' },
                                    object: { type: 'string', description: 'Fact object/value' },
                                    confidence: { 
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1,
                                        default: 1.0,
                                        description: 'Confidence level'
                                    },
                                    metadata: { 
                                        type: 'object',
                                        description: 'Additional metadata'
                                    },
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Temporal fact successfully created',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TemporalFact' }
                            }
                        }
                    }
                }
            },
            get: {
                summary: 'Query temporal facts',
                description: 'Search for temporal facts with optional filters',
                tags: ['Temporal'],
                security: [
                    { bearerAuth: [] },
                    { apiKeyAuth: [] }
                ],
                parameters: [
                    {
                        in: 'query',
                        name: 'subject',
                        schema: { type: 'string' },
                        description: 'Filter by subject'
                    },
                    {
                        in: 'query',
                        name: 'predicate',
                        schema: { type: 'string' },
                        description: 'Filter by predicate'
                    },
                    {
                        in: 'query',
                        name: 'object',
                        schema: { type: 'string' },
                        description: 'Filter by object'
                    }
                ],
                responses: {
                    '200': {
                        description: 'List of matching temporal facts',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/TemporalFact' }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/sectors': {
            get: {
                summary: 'Get memory sectors',
                description: 'Retrieve information about memory sector configuration',
                tags: ['System'],
                responses: {
                    '200': {
                        description: 'Memory sector configuration',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        sectors: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    config: { type: 'object' }
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
        '/api/namespaces': {
            get: {
                summary: 'List all namespaces',
                description: 'Retrieve all available namespaces and their configurations',
                tags: ['Namespaces'],
                responses: {
                    '200': {
                        description: 'List of namespaces',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        namespaces: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    namespace: { type: 'string', description: 'Namespace identifier' },
                                                    description: { type: 'string', description: 'Namespace description' },
                                                    ontology_profile: { type: 'string', description: 'Optional ontology profile name' },
                                                    metadata: { type: 'object', description: 'Optional metadata' },
                                                    created_at: { type: 'string', format: 'date-time' },
                                                    updated_at: { type: 'string', format: 'date-time' },
                                                    active: { type: 'number' }
                                                }
                                            }
                                        },
                                        total: { type: 'number', description: 'Total number of namespaces' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: 'Create a new namespace',
                description: 'Create a new namespace with optional ontology profile and metadata',
                tags: ['Namespaces'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['namespace'],
                                properties: {
                                    namespace: { 
                                        type: 'string', 
                                        description: 'Namespace identifier (alphanumeric, hyphens, underscores)',
                                        pattern: '^[a-zA-Z0-9_-]+$'
                                    },
                                    description: { 
                                        type: 'string', 
                                        description: 'Namespace description' 
                                    },
                                    ontology_profile: { 
                                        type: 'string', 
                                        description: 'Ontology profile name (e.g., "default_agentic_memory_ontology")' 
                                    },
                                    metadata: { 
                                        type: 'object', 
                                        description: 'Additional metadata as key-value pairs' 
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Namespace created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        namespace: { type: 'string' },
                                        description: { type: 'string' },
                                        ontology_profile: { type: 'string' },
                                        metadata: { type: 'object' },
                                        created_at: { type: 'string', format: 'date-time' },
                                        updated_at: { type: 'string', format: 'date-time' },
                                        message: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: { type: 'string' },
                                        message: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/namespaces/{namespace}': {
            get: {
                summary: 'Get namespace details',
                description: 'Retrieve detailed information about a specific namespace',
                tags: ['Namespaces'],
                parameters: [
                    {
                        in: 'path',
                        name: 'namespace',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Namespace identifier'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Namespace details',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        namespace: { type: 'string' },
                                        description: { type: 'string' },
                                        ontology_profile: { type: 'string' },
                                        metadata: { type: 'object' },
                                        created_at: { type: 'string', format: 'date-time' },
                                        updated_at: { type: 'string', format: 'date-time' },
                                        active: { type: 'number' }
                                    }
                                }
                            }
                        }
                    },
                    '404': {
                        description: 'Namespace not found',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            put: {
                summary: 'Update namespace',
                description: 'Update namespace description, ontology profile, or metadata',
                tags: ['Namespaces'],
                parameters: [
                    {
                        in: 'path',
                        name: 'namespace',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Namespace identifier'
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    ontology_profile: { type: 'string' },
                                    metadata: { type: 'object' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Namespace updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        namespace: { type: 'string' },
                                        description: { type: 'string' },
                                        ontology_profile: { type: 'string' },
                                        metadata: { type: 'object' },
                                        created_at: { type: 'string', format: 'date-time' },
                                        updated_at: { type: 'string', format: 'date-time' },
                                        message: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    '404': {
                        description: 'Namespace not found'
                    }
                }
            },
            delete: {
                summary: 'Deactivate namespace',
                description: 'Soft delete a namespace by setting it as inactive',
                tags: ['Namespaces'],
                parameters: [
                    {
                        in: 'path',
                        name: 'namespace',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Namespace identifier'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Namespace deactivated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        namespace: { type: 'string' },
                                        message: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    '404': {
                        description: 'Namespace not found'
                    }
                }
            }
        },
        '/api/proxy-info': {
            get: {
                summary: 'Get proxy service information',
                description: 'Retrieve MCP proxy service capabilities and statistics',
                tags: ['Proxy'],
                responses: {
                    '200': {
                        description: 'Proxy service information',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        service: { type: 'string' },
                                        version: { type: 'string' },
                                        description: { type: 'string' },
                                        capabilities: {
                                            type: 'object',
                                            properties: {
                                                namespace_isolation: { type: 'boolean' },
                                                agent_registration: { type: 'boolean' },
                                                shared_namespaces: { type: 'boolean' },
                                                api_key_auth: { type: 'boolean' }
                                            }
                                        },
                                        statistics: {
                                            type: 'object',
                                            properties: {
                                                total_agents: { type: 'number' },
                                                total_namespaces: { type: 'number' },
                                                total_requests: { type: 'number' }
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
        '/api/proxy-health': {
            get: {
                summary: 'Proxy health check',
                description: 'Check the health status of the MCP proxy service',
                tags: ['Proxy'],
                responses: {
                    '200': {
                        description: 'Proxy service health status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                                        timestamp: { type: 'string', format: 'date-time' },
                                        uptime: { type: 'number', description: 'Uptime in seconds' },
                                        database_status: { type: 'string' },
                                        active_connections: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/mcp-proxy': {
            post: {
                summary: 'MCP proxy protocol endpoint',
                description: 'Model Context Protocol endpoint for multi-agent namespace management',
                tags: ['MCP'],
                security: [
                    { apiKeyAuth: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    jsonrpc: { type: 'string', enum: ['2.0'] },
                                    method: { 
                                        type: 'string',
                                        enum: ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read']
                                    },
                                    id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                    params: { type: 'object' }
                                }
                            },
                            examples: {
                                register_agent: {
                                    summary: 'Register new agent',
                                    value: {
                                        jsonrpc: '2.0',
                                        id: 1,
                                        method: 'tools/call',
                                        params: {
                                            name: 'register_agent',
                                            arguments: {
                                                agent_id: 'my-agent-v1',
                                                namespace: 'my-workspace',
                                                permissions: ['read', 'write'],
                                                description: 'My AI assistant'
                                            }
                                        }
                                    }
                                },
                                query_memory: {
                                    summary: 'Query memories',
                                    value: {
                                        jsonrpc: '2.0',
                                        id: 2,
                                        method: 'tools/call',
                                        params: {
                                            name: 'query_memory',
                                            arguments: {
                                                agent_id: 'my-agent-v1',
                                                query: 'machine learning concepts',
                                                k: 5
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'MCP JSON-RPC response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        jsonrpc: { type: 'string', enum: ['2.0'] },
                                        id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                        result: { type: 'object' },
                                        error: {
                                            type: 'object',
                                            properties: {
                                                code: { type: 'number' },
                                                message: { type: 'string' },
                                                data: { type: 'object' }
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
        '/lgm/config': {
            get: {
                summary: 'Get LangGraph configuration',
                description: 'Returns current LangGraph mode configuration and node-sector mappings',
                tags: ['LangGraph'],
                security: [{ apiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'LangGraph configuration',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        mode: { type: 'string', example: 'standard' },
                                        namespace_default: { type: 'string', example: 'default' },
                                        max_context: { type: 'integer', example: 50 },
                                        reflective: { type: 'boolean', example: true },
                                        node_sector_map: {
                                            type: 'object',
                                            properties: {
                                                observe: { type: 'string', example: 'episodic' },
                                                plan: { type: 'string', example: 'semantic' },
                                                reflect: { type: 'string', example: 'reflective' },
                                                act: { type: 'string', example: 'procedural' },
                                                emotion: { type: 'string', example: 'emotional' }
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
        '/lgm/store': {
            post: {
                summary: 'Store LangGraph node memory',
                description: 'Store memory from a LangGraph node execution',
                tags: ['LangGraph'],
                security: [{ apiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['node', 'content'],
                                properties: {
                                    node: { 
                                        type: 'string',
                                        enum: ['observe', 'plan', 'reflect', 'act', 'emotion'],
                                        description: 'LangGraph node type'
                                    },
                                    content: { type: 'string', description: 'Memory content' },
                                    namespace: { type: 'string', default: 'default' },
                                    graph_id: { type: 'string', description: 'Graph session ID' },
                                    metadata: { type: 'object', description: 'Additional metadata' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Memory stored successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        memory: { type: 'object' },
                                        reflection: { type: 'object', nullable: true }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        err: { type: 'string' },
                                        message: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/lgm/retrieve': {
            post: {
                summary: 'Retrieve LangGraph node memories',
                description: 'Retrieve memories for a specific LangGraph node',
                tags: ['LangGraph'],
                security: [{ apiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['node'],
                                properties: {
                                    node: { 
                                        type: 'string',
                                        enum: ['observe', 'plan', 'reflect', 'act', 'emotion']
                                    },
                                    namespace: { type: 'string', default: 'default' },
                                    graph_id: { type: 'string' },
                                    limit: { type: 'integer', default: 10 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Retrieved memories',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        memories: { 
                                            type: 'array',
                                            items: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/lgm/context': {
            post: {
                summary: 'Get LangGraph context',
                description: 'Get aggregated context across all node types for a graph session',
                tags: ['LangGraph'],
                security: [{ apiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['graph_id'],
                                properties: {
                                    graph_id: { type: 'string' },
                                    namespace: { type: 'string', default: 'default' },
                                    limit: { type: 'integer', default: 50 }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Aggregated context',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        episodic: { type: 'array', items: { type: 'object' } },
                                        semantic: { type: 'array', items: { type: 'object' } },
                                        procedural: { type: 'array', items: { type: 'object' } },
                                        reflective: { type: 'array', items: { type: 'object' } },
                                        emotional: { type: 'array', items: { type: 'object' } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/lgm/reflection': {
            post: {
                summary: 'Generate LangGraph reflection',
                description: 'Generate a reflection memory from existing graph memories',
                tags: ['LangGraph'],
                security: [{ apiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['graph_id'],
                                properties: {
                                    graph_id: { type: 'string' },
                                    namespace: { type: 'string', default: 'default' },
                                    source_memories: { 
                                        type: 'array',
                                        items: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Generated reflection',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        reflection: { type: 'object' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/chat/integrate': {
            post: {
                summary: 'Process chat history',
                description: 'Extract and store memories from chat conversation history',
                tags: ['Chat'],
                security: [{ apiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['messages'],
                                properties: {
                                    messages: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['role', 'content'],
                                            properties: {
                                                role: { 
                                                    type: 'string',
                                                    enum: ['user', 'assistant', 'system']
                                                },
                                                content: { type: 'string' }
                                            }
                                        }
                                    },
                                    namespaces: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        default: ['global']
                                    },
                                    model: { type: 'string', description: 'LLM model for extraction' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Chat processed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        memories_created: { type: 'integer' },
                                        memories: { type: 'array', items: { type: 'object' } },
                                        extracted: { type: 'object' }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request'
                    },
                    '500': {
                        description: 'Processing error'
                    }
                }
            }
        },
        '/api/chat/config': {
            get: {
                summary: 'Get chat LLM configuration',
                description: 'Returns current LLM provider and model configuration for chat processing',
                tags: ['Chat'],
                security: [{ apiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'LLM configuration',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        provider: { type: 'string', enum: ['ollama', 'openai'] },
                                        model: { type: 'string', example: 'llama3.2:latest' },
                                        temperature: { type: 'number', example: 0.7 },
                                        max_tokens: { type: 'integer', example: 2000 }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/metrics': {
            get: {
                summary: 'Get system metrics',
                description: 'Returns namespace-level statistics and system metrics',
                tags: ['Metrics'],
                security: [{ apiKeyAuth: [] }],
                parameters: [
                    {
                        name: 'namespace',
                        in: 'query',
                        schema: { type: 'string' },
                        description: 'Filter metrics by namespace'
                    }
                ],
                responses: {
                    '200': {
                        description: 'System metrics',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        timestamp: { type: 'string', format: 'date-time' },
                                        service: { type: 'string' },
                                        version: { type: 'string' },
                                        architecture: { type: 'string' },
                                        namespaces: {
                                            type: 'object',
                                            properties: {
                                                total: { type: 'integer' },
                                                active: { type: 'integer' }
                                            }
                                        },
                                        memories: {
                                            type: 'object',
                                            properties: {
                                                total: { type: 'integer' },
                                                by_namespace: { type: 'object' },
                                                by_sector: { type: 'object' }
                                            }
                                        },
                                        embeddings: {
                                            type: 'object',
                                            properties: {
                                                total: { type: 'integer' },
                                                info: { type: 'object' }
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
    tags: [
        {
            name: 'System',
            description: 'System health and configuration endpoints',
        },
        {
            name: 'Memory',
            description: 'Core memory management operations',
        },
        {
            name: 'Temporal',
            description: 'Temporal graph fact management',
        },
        {
            name: 'Compression',
            description: 'Memory compression and optimization',
        },
        {
            name: 'Users',
            description: 'User management and summaries',
        },
        {
            name: 'IDE',
            description: 'IDE integration features',
        },
        {
            name: 'Namespaces',
            description: 'Namespace management for multi-agent isolation',
        },
        {
            name: 'Proxy',
            description: 'MCP proxy service information and health',
        },
        {
            name: 'MCP',
            description: 'Model Context Protocol endpoints',
        },
        {
            name: 'LangGraph',
            description: 'LangGraph workflow node memory management',
        },
        {
            name: 'Chat',
            description: 'Chat history processing and memory extraction',
        },
        {
            name: 'Metrics',
            description: 'System and namespace-level metrics',
        },
    ],
};

export const setupSwagger = (app: any) => {
    // Serve OpenAPI spec as JSON
    app.get('/openapi.json', (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.json(swaggerSpec);
    });

    // Simple Swagger UI HTML page
    app.get('/api-docs', (req: any, res: any) => {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>OpenMemory API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            // Get saved API key from localStorage
            const savedApiKey = localStorage.getItem('swagger_apiKey') || '';
            
            // Store UI instance for requestInterceptor
            let uiInstance = null;
            
            const ui = SwaggerUIBundle({
                url: '/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                persistAuthorization: true,
                requestInterceptor: function(request) {
                    // Try to get API key from Swagger's auth state
                    let apiKey = null;
                    
                    try {
                        if (uiInstance && uiInstance.auth) {
                            const auth = uiInstance.auth();
                            if (auth && auth.apiKeyAuth) {
                                apiKey = auth.apiKeyAuth.value;
                            }
                        }
                    } catch (e) {
                        // Ignore errors accessing auth state
                    }
                    
                    // Fall back to localStorage
                    if (!apiKey) {
                        apiKey = localStorage.getItem('swagger_apiKey');
                    }
                    
                    // Apply API key to request
                    if (apiKey) {
                        request.headers['x-api-key'] = apiKey;
                        localStorage.setItem('swagger_apiKey', apiKey);
                        console.log('[Swagger] API key applied to request');
                    } else {
                        console.warn('[Swagger] No API key - request will likely fail');
                    }
                    
                    return request;
                }
            });
            
            // Store UI instance after creation
            uiInstance = ui;
            window.ui = ui;
            
            // Auto-apply saved API key after UI loads
            setTimeout(function() {
                if (savedApiKey) {
                    try {
                        ui.preauthorizeApiKey('apiKeyAuth', savedApiKey);
                        console.log('[Swagger] Auto-applied saved API key');
                    } catch (e) {
                        console.error('[Swagger] Failed to auto-apply API key:', e);
                    }
                }
            }, 1000);
            
            // Add helpful message
            setTimeout(function() {
                const topbar = document.querySelector('.topbar');
                if (topbar) {
                    const helpText = document.createElement('div');
                    helpText.style.cssText = 'padding: 10px; background: #ffc107; color: #000; text-align: center; font-size: 14px;';
                    helpText.innerHTML = '🔑 <strong>Authentication Required:</strong> Click "Authorize" button (🔓) and enter API key: <code style="background:#fff;padding:2px 6px;border-radius:3px;">knickknacks</code> then click "Authorize" and "Close"';
                    topbar.insertAdjacentElement('afterend', helpText);
                }
            }, 500);
        };
    </script>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });

    console.log(`[SWAGGER] OpenAPI documentation available at:`);
    console.log(`  - Swagger UI: http://localhost:${env.port}/api-docs`);
    console.log(`  - OpenAPI spec: http://localhost:${env.port}/openapi.json`);
};