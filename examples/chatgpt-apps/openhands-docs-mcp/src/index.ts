import { createServer } from "node:http";
import { URL } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { describeCorpus, fetchDocument, searchDocuments } from "./documents.js";

const APP_NAME = "openhands-docs-mcp";
const APP_VERSION = "0.1.0";
const DEFAULT_PORT = 8787;
const MCP_PATH = "/mcp";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

const createSearchResponse = (query: string) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({
        results: searchDocuments(query),
      }),
    },
  ],
});

const createFetchResponse = (id: string) => {
  const document = fetchDocument(id);
  if (!document) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id,
            title: "Document not found",
            text: `No document with id "${id}" exists in the OpenHands docs corpus.`,
            url: "https://github.com/OpenHands/OpenHands",
            metadata: {
              error: "not_found",
            },
          }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(document),
      },
    ],
  };
};

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: APP_NAME,
    version: APP_VERSION,
  });

  server.registerTool(
    "search",
    {
      title: "Search OpenHands docs",
      description:
        "Use this when you need to search OpenHands repository documentation, setup guides, or architecture notes by keyword.",
      inputSchema: {
        query: z.string().min(1).describe("A natural-language query for repository documentation."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query }) => createSearchResponse(query),
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch OpenHands doc",
      description:
        "Use this when you already have a document id from search and need the full text of that OpenHands document for quoting or summarization.",
      inputSchema: {
        id: z.string().min(1).describe("The document id returned by the search tool."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => createFetchResponse(id),
  );

  return server;
}

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const corpus = describeCorpus();

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Missing URL" }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/healthz")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        name: APP_NAME,
        version: APP_VERSION,
        mcpPath: MCP_PATH,
        repoRoot: corpus.repoRoot,
        indexedDocuments: corpus.documents,
      }),
    );
    return;
  }

  const allowedMcpMethods = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && allowedMcpMethods.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

httpServer.listen(port, () => {
  console.log(`${APP_NAME} listening on http://localhost:${port}${MCP_PATH}`);
});
