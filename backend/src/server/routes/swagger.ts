import { swaggerSpec } from "../swagger";
import fs from "fs";
import path from "path";

let swaggerDistPath: string | null = null;
try {
    swaggerDistPath = require("swagger-ui-dist").getAbsoluteFSPath();
} catch (e) {
    console.error("[SWAGGER] swagger-ui-dist not found");
}

const CONTENT_TYPES: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".map": "application/json",
};

function getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return CONTENT_TYPES[ext] || "application/octet-stream";
}

export function swagger(app: any) {
    if (!swaggerDistPath) {
        console.warn("[SWAGGER] Swagger UI not available - swagger-ui-dist not installed");
        return;
    }

    // Serve Swagger JSON spec at /api-docs.json
    app.get("/api-docs.json", (_req: any, res: any) => {
        res.json(swaggerSpec);
    });

    // Generate swagger-ui-init.js with our spec
    const swaggerInit = `
window.onload = function() {
    window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(swaggerSpec)},
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
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
    });
};
`;

    // Custom HTML page
    const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OpenMemory API Documentation</title>
    <link rel="stylesheet" type="text/css" href="/api-docs/swagger-ui.css">
    <link rel="icon" type="image/png" href="/api-docs/favicon-32x32.png" sizes="32x32">
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6 }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="/api-docs/swagger-ui-bundle.js"></script>
    <script src="/api-docs/swagger-ui-standalone-preset.js"></script>
    <script>${swaggerInit}</script>
</body>
</html>
`;

    // Serve main HTML page
    app.get("/api-docs", (_req: any, res: any) => {
        res.status(200);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(swaggerHtml);
    });

    app.get("/api-docs/", (_req: any, res: any) => {
        res.status(200);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(swaggerHtml);
    });

    // Serve swagger-ui-dist static files
    app.get("/api-docs/:file", (req: any, res: any) => {
        const fileName = req.params.file;
        
        // Prevent directory traversal
        if (fileName.includes("..") || fileName.includes("/")) {
            res.status(400).end("Bad request");
            return;
        }

        const filePath = path.join(swaggerDistPath!, fileName);
        
        fs.readFile(filePath, (err: any, data: Buffer) => {
            if (err) {
                res.status(404).end("Not found");
                return;
            }
            res.status(200);
            res.setHeader("Content-Type", getContentType(fileName));
            res.end(data);
        });
    });

    console.log("[SWAGGER] API documentation available at /api-docs");
}
