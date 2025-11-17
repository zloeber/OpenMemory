# Proxy-Only Mode

## Overview

OpenMemory supports a **Proxy-Only Mode** feature flag that restricts the server to only expose MCP proxy and agent management endpoints. When enabled, all standard OpenMemory API endpoints (memory operations, embeddings, etc.) are disabled, and only proxy-related functionality is available.

## Use Cases

- **Dedicated Proxy Service**: Run a standalone MCP proxy server without the full OpenMemory API surface
- **Security**: Reduce attack surface by disabling unnecessary endpoints in proxy-only deployments
- **Microservices Architecture**: Deploy specialized proxy instances alongside standard OpenMemory instances
- **Resource Optimization**: Run lightweight proxy-only services with minimal overhead

## Configuration

### Environment Variable

Enable proxy-only mode by setting the `OM_PROXY_ONLY_MODE` environment variable:

```bash
OM_PROXY_ONLY_MODE=true
```

### Default Behavior

- **Default**: `false` - All endpoints are available (standard mode)
- **When enabled**: `true` - Only proxy and agent management endpoints are accessible

## Available Endpoints in Proxy-Only Mode

When `OM_PROXY_ONLY_MODE=true`, only the following endpoints are accessible:

### MCP Protocol
- `POST /mcp-proxy` - MCP protocol endpoint for agent communication

### Agent Management
- `GET /api/agents` - List all registered agents
- `GET /api/agents/:id` - Get specific agent details
- `POST /api/agents` - Register a new agent
- `DELETE /api/agents/:id` - Deactivate an agent

### Namespace Management
- `GET /api/namespaces` - List all namespaces
- `GET /api/namespaces/summary` - Get namespace usage statistics
- `POST /api/namespaces` - Create a new namespace
- `PUT /api/namespaces/:namespace` - Update namespace details
- `DELETE /api/namespaces/:namespace` - Deactivate a namespace

### Service Information
- `GET /` - Root endpoint with service information
- `GET /api/proxy-info` - Detailed proxy service information
- `GET /api/proxy-health` - Proxy health check
- `GET /api/registration-template/:format` - Agent registration templates
- `GET /health` - System health check
- `GET /sectors` - Memory sector information

### Dashboard
- `GET /dashboard/*` - All dashboard endpoints for monitoring and visualization

### Documentation
- `GET /api-docs` - Swagger API documentation
- Swagger UI endpoints

## Blocked Endpoints in Proxy-Only Mode

When proxy-only mode is enabled, the following standard OpenMemory endpoints return `403 Forbidden`:

- `/api/memory/*` - Memory operations (store, query, update, delete)
- `/api/compression/*` - Compression operations
- `/api/temporal/*` - Temporal graph operations
- `/api/ide/*` - IDE integration endpoints
- `/users/*` - User management
- MCP endpoints other than `/mcp-proxy`

## Error Response

When attempting to access blocked endpoints in proxy-only mode:

```json
{
  "error": "Forbidden",
  "message": "This endpoint is not available in proxy-only mode. Only MCP proxy, agent management, and monitoring endpoints are accessible.",
  "available_endpoints": [
    "/mcp-proxy",
    "/api/agents",
    "/api/namespaces",
    "/api/proxy-info",
    "/api/registration-template",
    "/api/proxy-health",
    "/api-docs",
    "/swagger",
    "/health",
    "/sectors",
    "/dashboard",
    "/"
  ]
}
```

## Deployment Examples

### Docker Compose - Proxy-Only Service

```yaml
version: '3.8'
services:
  openmemory-proxy:
    image: openmemory:latest
    environment:
      - OM_PROXY_ONLY_MODE=true
      - OM_MCP_PROXY_ENABLED=true
      - OM_PORT=8080
      - OM_DB_PATH=/data/openmemory.sqlite
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
```

### Standalone Proxy Server

For a completely standalone proxy service, use the dedicated proxy server:

```bash
# Using the dedicated proxy-server.ts
npm run start:proxy

# Or via tsx
tsx backend/src/proxy-server.ts
```

### Combined Deployment

Run both standard OpenMemory and a dedicated proxy-only instance:

```yaml
version: '3.8'
services:
  openmemory:
    image: openmemory:latest
    environment:
      - OM_MCP_PROXY_ENABLED=false
      - OM_PORT=8080
    ports:
      - "8080:8080"
  
  openmemory-proxy:
    image: openmemory:latest
    environment:
      - OM_PROXY_ONLY_MODE=true
      - OM_MCP_PROXY_ENABLED=true
      - OM_PORT=8081
      - OM_DB_PATH=/data/openmemory.sqlite
    ports:
      - "8081:8081"
    volumes:
      - ./data:/data
```

## Comparison: Deployment Modes

| Feature | Standard Mode | Proxy-Only Mode | Standalone Proxy |
|---------|--------------|-----------------|------------------|
| Memory API | ✅ | ❌ | ❌ |
| MCP Protocol | ✅ (if enabled) | ✅ | ✅ |
| Agent Management | ✅ (if enabled) | ✅ | ✅ |
| Namespace Management | ✅ (if enabled) | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ❌ |
| Health & Sectors | ✅ | ✅ | ❌ |
| Temporal Graph | ✅ | ❌ | ❌ |
| IDE Integration | ✅ | ❌ | ❌ |
| Compression | ✅ | ❌ | ❌ |
| Entry Point | `server.ts` | `server.ts` | `proxy-server.ts` |
| Config Variable | Default | `OM_PROXY_ONLY_MODE=true` | N/A |

## Architecture

### Middleware Flow

```
Request
  ↓
CORS Middleware
  ↓
Swagger Setup
  ↓
Authentication
  ↓
[Proxy-Only Mode Middleware] ← Checks OM_PROXY_ONLY_MODE
  ↓
Route Handler
  ↓
Response
```

### Implementation Details

1. **Feature Flag**: Added `proxy_only_mode` to `env` configuration in `cfg.ts`
2. **Middleware**: `proxy_only_mode_middleware` in `proxy.ts` blocks non-proxy routes
3. **Route Setup**: Conditional route registration in `index.ts` based on the flag
4. **Root Endpoint**: Updated to show mode-specific information

## Monitoring

### Check Current Mode

```bash
# Check root endpoint
curl http://localhost:8080/

# Standard mode response includes:
{
  "service": "OpenMemory",
  "version": "2.0-hsg-tiered",
  ...
}

# Proxy-only mode response includes:
{
  "service": "OpenMemory MCP Proxy",
  "mode": "proxy-only",
  "note": "Standard OpenMemory API endpoints are disabled in proxy-only mode",
  ...
}
```

### Logs

Proxy-only mode logs at startup:

```
[CONFIG] Proxy-Only Mode: ENABLED - Standard API routes disabled
[OpenMemory] MCP Proxy service (PROXY-ONLY MODE) initialized on port 8080
[CONFIG] Standard OpenMemory API endpoints are DISABLED in proxy-only mode
```

## Migration Guide

### From Standard to Proxy-Only Mode

1. Set environment variable: `OM_PROXY_ONLY_MODE=true`
2. Ensure `OM_MCP_PROXY_ENABLED` is not set to `false`
3. Restart the service
4. Update client applications to use only proxy endpoints
5. Remove any dependencies on standard API endpoints

### From Proxy-Only to Standard Mode

1. Remove or set `OM_PROXY_ONLY_MODE=false`
2. Restart the service
3. All standard endpoints become available again

## Troubleshooting

### Issue: Getting 403 Forbidden on expected endpoints

**Solution**: Check that you're accessing proxy endpoints, not standard API endpoints. Refer to the "Available Endpoints" section above.

### Issue: Proxy endpoints not working

**Solution**: Ensure `OM_MCP_PROXY_ENABLED` is not set to `false`. The proxy must be enabled for proxy-only mode to work.

### Issue: Need both proxy and standard endpoints

**Solution**: Either:
1. Disable proxy-only mode: `OM_PROXY_ONLY_MODE=false`
2. Run two separate instances (one standard, one proxy-only)

## Security Considerations

- Proxy-only mode reduces the attack surface by disabling unused endpoints
- Agent API keys are still required for MCP operations
- Standard authentication applies to all proxy endpoints
- Consider using separate database instances for multi-service deployments
- Use network policies to restrict proxy service access in Kubernetes

## Performance

Proxy-only mode has minimal performance impact:
- Slightly faster startup (fewer routes to register)
- Reduced memory footprint (no memory management subsystems loaded)
- Lower CPU usage (no background decay/reflection processes)
- Ideal for high-throughput proxy scenarios

## See Also

- [MCP Proxy Implementation](./MCP_PROXY_IMPLEMENTATION.md)
- [Docker Deployment](./DOCKER_DEPLOYMENT.md)
- [Architecture](./ARCHITECTURE.md)
