// Main entry point for Codebase MCP Server

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerRepositoryTools } from "./tools/repository.tools.js";
import { registerSearchTools } from "./tools/search.tools.js";

// Create MCP server instance
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// Register all tools
registerRepositoryTools(server);
registerSearchTools(server);

/**
 * Run server with stdio transport (for local/CLI use)
 */
async function runStdio(): Promise<void> {
  console.error(`Starting ${SERVER_NAME} v${SERVER_VERSION} (stdio transport)`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Server connected and ready");
}

/**
 * Run server with HTTP transport (for remote/web use)
 */
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION });
  });

  // MCP endpoint
  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => transport.close());

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    console.error(`${SERVER_NAME} v${SERVER_VERSION} running on http://localhost:${port}/mcp`);
  });
}

// Determine transport based on environment
const transport = process.env.TRANSPORT || "stdio";

if (transport === "http") {
  runHTTP().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
