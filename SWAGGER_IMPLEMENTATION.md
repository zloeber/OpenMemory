# Swagger/OpenAPI Implementation Summary

This document summarizes the Swagger/OpenAPI integration added to OpenMemory.

## Overview

Added optional Swagger UI documentation that can be enabled via environment variable. The implementation provides:
- Interactive API documentation at `/api-docs`
- OpenAPI JSON specification at `/api-docs.json`
- Easy-to-update endpoint definitions
- Support for authentication testing
- Zero impact when disabled

## Files Changed

### 1. `backend/package.json`
- Added `swagger-ui-express@^5.0.1` to dependencies
- Added `@types/swagger-ui-express@^4.1.6` to devDependencies

### 2. `backend/src/core/cfg.ts`
- Added `swagger_enabled` configuration option
- Reads from `OM_SWAGGER_ENABLED` environment variable

### 3. `backend/src/server/swagger.ts` (NEW)
- Complete OpenAPI 3.0 specification
- Defines all major endpoints:
  - System: `/health`, `/api/stats`
  - Memory: `/api/memory/add`, `/api/memory/query`, `/api/memory/list`, `/api/memory/delete/:id`
  - Compression: `/api/compression/compress`
  - Temporal: `/api/temporal/add_fact`, `/api/temporal/query`
  - Users: `/api/users/list`, `/api/users/delete/:user_id`
  - IDE: `/api/ide/event`
  - Dashboard: `/api/dashboard/metrics`
- Includes reusable schemas, security definitions, and response templates

### 4. `backend/src/server/routes/swagger.ts` (NEW)
- Route handler for Swagger UI
- Serves Swagger UI at `/api-docs`
- Serves OpenAPI JSON at `/api-docs.json`
- Gracefully handles missing `swagger-ui-express` package
- Custom styling and configuration options

### 5. `backend/src/server/routes/index.ts`
- Conditionally loads Swagger routes when `OM_SWAGGER_ENABLED=true`
- Integrates with existing route structure

### 6. `.env.example`
- Added `OM_SWAGGER_ENABLED=false` with documentation
- Placed in the Server Settings section

### 7. `backend/docs/SWAGGER.md` (NEW)
- Quick start guide
- Instructions for enabling and accessing Swagger UI
- Guide for updating documentation when adding new endpoints
- Best practices and examples

### 8. `README.md`
- Added "API Documentation (Swagger)" section
- Placed after Dashboard section
- Quick overview with link to detailed docs

## Usage

### Enable Swagger

Add to `.env`:
```bash
OM_SWAGGER_ENABLED=true
```

### Install Dependencies

```bash
cd backend
npm install
```

### Start Server

```bash
npm run dev
```

### Access Documentation

- Swagger UI: http://localhost:8080/api-docs
- OpenAPI JSON: http://localhost:8080/api-docs.json

## Adding New Endpoints

When you add or modify API endpoints:

1. Edit `backend/src/server/swagger.ts`
2. Add the endpoint to the `paths` object
3. Define any new schemas in `components.schemas`
4. Group with appropriate tags
5. Refresh browser (no restart needed)

Example:
```typescript
"/api/your/endpoint": {
    post: {
        tags: ["Category"],
        summary: "Brief description",
        description: "Detailed description",
        requestBody: { ... },
        responses: { ... }
    }
}
```

## Architecture

The implementation follows the existing OpenMemory patterns:

- **Configuration**: Uses `cfg.ts` for environment-based toggle
- **Graceful Degradation**: Works without the package installed (logs warning)
- **Conditional Loading**: Only loads when explicitly enabled
- **Zero Dependencies**: No impact on existing functionality when disabled
- **Middleware Pattern**: Integrates with the existing server framework

## Security

- Swagger UI respects the same authentication middleware as other routes
- Public endpoints (like `/health`) are marked with `security: []`
- API key authentication is documented and testable in the UI
- Recommended to disable in production (`OM_SWAGGER_ENABLED=false`)

## Benefits

1. **Developer Experience**: Interactive testing of all endpoints
2. **Documentation**: Auto-generated, always accurate
3. **Discoverability**: Easy to explore available APIs
4. **Validation**: Request/response schemas prevent errors
5. **Maintainability**: Single source of truth for API definitions

## Production Considerations

- Set `OM_SWAGGER_ENABLED=false` in production environments
- Consider serving documentation separately
- Use IP whitelisting for internal documentation access
- The OpenAPI JSON can be used with other tools (Postman, API clients, etc.)

## Testing

To verify the implementation:

1. Set `OM_SWAGGER_ENABLED=true` in `.env`
2. Run `npm install` in backend
3. Start the server with `npm run dev`
4. Navigate to http://localhost:8080/api-docs
5. Test an endpoint (e.g., GET /health)
6. Try authentication with the "Authorize" button

## Next Steps

- Install dependencies: `cd backend && npm install`
- Enable in your local `.env`
- Restart the backend server
- Access the Swagger UI and explore the API
- Update endpoint definitions as you add new features
