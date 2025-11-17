# Proxy-Only Mode - Quick Reference

## Enable Proxy-Only Mode

```bash
# Environment variable
export OM_PROXY_ONLY_MODE=true

# Or in .env file
OM_PROXY_ONLY_MODE=true
```

## What Changes?

### ✅ Available Endpoints
- `/mcp-proxy` - MCP protocol endpoint
- `/api/agents` - Agent management
- `/api/namespaces` - Namespace management
- `/api/proxy-info` - Service info
- `/api/proxy-health` - Health check
- `/api/registration-template/:format` - Registration templates
- `/health` - System health check
- `/sectors` - Memory sector information
- `/dashboard/*` - All dashboard endpoints
- `/` - Root endpoint (with mode info)
- `/api-docs` - Swagger docs

### ❌ Disabled Endpoints
- `/api/memory/*` - Memory operations
- `/api/compression/*` - Compression
- `/api/temporal/*` - Temporal graph
- `/api/ide/*` - IDE integration
- `/users/*` - User management

## Use Cases

1. **Dedicated Proxy Service** - Run standalone MCP proxy without memory API
2. **Security** - Reduce attack surface in production
3. **Microservices** - Deploy specialized proxy instances
4. **Resource Optimization** - Lightweight proxy-only deployments

## Quick Start

### Docker
```bash
docker run -e OM_PROXY_ONLY_MODE=true -p 8080:8080 openmemory:latest
```

### Docker Compose
```yaml
services:
  openmemory-proxy:
    image: openmemory:latest
    environment:
      - OM_PROXY_ONLY_MODE=true
      - OM_MCP_PROXY_ENABLED=true
    ports:
      - "8080:8080"
```

### Local Development
```bash
# In .env
OM_PROXY_ONLY_MODE=true

# Start server
npm run dev
```

## Verify Mode

```bash
# Check root endpoint
curl http://localhost:8080/

# Look for "mode": "proxy-only" in response
```

## Error Response

Attempting to access disabled endpoints returns:

```json
{
  "error": "Forbidden",
  "message": "This endpoint is not available in proxy-only mode...",
  "available_endpoints": [...]
}
```

## Deployment Patterns

### Pattern 1: Separate Services
```yaml
# Standard OpenMemory (no proxy)
openmemory:
  environment:
    - OM_MCP_PROXY_ENABLED=false
  ports:
    - "8080:8080"

# Proxy-only service
openmemory-proxy:
  environment:
    - OM_PROXY_ONLY_MODE=true
  ports:
    - "8081:8081"
```

### Pattern 2: Single Proxy-Only
```yaml
# Just proxy functionality
openmemory-proxy:
  environment:
    - OM_PROXY_ONLY_MODE=true
    - OM_MCP_PROXY_ENABLED=true
  ports:
    - "8080:8080"
```

### Pattern 3: Integrated (default)
```yaml
# Both memory API and proxy
openmemory:
  environment:
    - OM_MCP_PROXY_ENABLED=true
  ports:
    - "8080:8080"
```

## Performance Impact

- ✅ Faster startup (fewer routes)
- ✅ Lower memory usage
- ✅ Reduced CPU (no background processes)
- ✅ Higher proxy throughput

## Troubleshooting

### Getting 403 errors?
→ You're trying to access standard API endpoints in proxy-only mode

### Need both proxy and standard endpoints?
→ Set `OM_PROXY_ONLY_MODE=false` or run two instances

### Proxy endpoints not working?
→ Ensure `OM_MCP_PROXY_ENABLED` is not set to `false`

## See Full Documentation

[docs/PROXY_ONLY_MODE.md](./PROXY_ONLY_MODE.md)
