import { swaggerSpec } from "../swagger";

let swaggerUi: any;
try {
    swaggerUi = require("swagger-ui-express");
} catch (e) {
    console.error("[SWAGGER] swagger-ui-express not installed. Run: npm install swagger-ui-express");
}

export function swagger(app: any) {
    if (!swaggerUi) {
        console.warn("[SWAGGER] Swagger UI not available - package not installed");
        return;
    }

    // Serve Swagger JSON spec at /api-docs.json
    app.get("/api-docs.json", (_req: any, res: any) => {
        res.json(swaggerSpec);
    });

    // Serve Swagger UI at /api-docs
    const swaggerMiddleware = swaggerUi.serve;
    const swaggerSetup = swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "OpenMemory API Documentation",
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #3b82f6 }
        `,
        customCssUrl: undefined,
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            tryItOutEnabled: true
        }
    });

    app.get("/api-docs", ...swaggerMiddleware, swaggerSetup);
    
    console.log("[SWAGGER] API documentation available at /api-docs");
}
