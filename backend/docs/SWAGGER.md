# Swagger API Documentation

OpenMemory includes optional Swagger/OpenAPI documentation for easy API exploration and testing.

## Quick Start

### 1. Enable Swagger

Add to your `.env` file:
```bash
OM_SWAGGER_ENABLED=true
```

### 2. Install Dependencies

```bash
cd backend && npm install
```

### 3. Start the Server

```bash
npm run dev
```

### 4. Access Documentation

- **Swagger UI**: http://localhost:8080/api-docs
- **OpenAPI JSON**: http://localhost:8080/api-docs.json

## Updating Documentation

The Swagger specification is in `backend/src/server/swagger.ts`. To add new endpoints:

1. Add the endpoint definition to the `paths` object
2. Define schemas in `components.schemas` for reusable types
3. Group endpoints using `tags`
4. Refresh your browser - no restart needed

See existing endpoints in `swagger.ts` for examples.
