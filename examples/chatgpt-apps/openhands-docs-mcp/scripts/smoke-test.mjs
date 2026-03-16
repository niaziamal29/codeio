import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

const serverUrl = process.env.MCP_SERVER_URL ?? "http://127.0.0.1:8787/mcp";

const client = new Client({
  name: "openhands-docs-mcp-smoke",
  version: "0.1.0",
});

const transport = new StreamableHTTPClientTransport(new URL(serverUrl));

try {
  await client.connect(transport);

  const tools = await client.request(
    {
      method: "tools/list",
      params: {},
    },
    ListToolsResultSchema,
  );

  const toolNames = tools.tools.map((tool) => tool.name).sort();
  if (!toolNames.includes("search") || !toolNames.includes("fetch")) {
    throw new Error(`Expected search/fetch tools, received: ${toolNames.join(", ")}`);
  }

  const searchResult = await client.request(
    {
      method: "tools/call",
      params: {
        name: "search",
        arguments: {
          query: "frontend setup",
        },
      },
    },
    CallToolResultSchema,
  );

  const searchPayload = JSON.parse(searchResult.content[0].text);
  const firstResult = searchPayload.results?.[0];
  if (!firstResult?.id) {
    throw new Error("Search returned no results.");
  }

  const fetchResult = await client.request(
    {
      method: "tools/call",
      params: {
        name: "fetch",
        arguments: {
          id: firstResult.id,
        },
      },
    },
    CallToolResultSchema,
  );

  const fetchPayload = JSON.parse(fetchResult.content[0].text);
  if (!fetchPayload?.text || !fetchPayload?.url) {
    throw new Error("Fetch response did not include text and url.");
  }

  console.log(
    JSON.stringify(
      {
        serverUrl,
        tools: toolNames,
        searchFirstResult: firstResult,
        fetchedTitle: fetchPayload.title,
      },
      null,
      2,
    ),
  );
} finally {
  await transport.close();
}
