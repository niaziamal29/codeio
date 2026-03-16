# OpenHands Docs MCP App

This example is a `tool-only` ChatGPT app scaffold for connector-like or sync-oriented use cases. It exposes a local slice of the OpenHands repository docs through the standard `search` and `fetch` MCP tools so it can work as a data-only app without a widget.

## Why this shape

- Primary archetype: `tool-only`
- Architecture choice: data-only MCP server, no UI resources
- Upstream starting point: the official `search`/`fetch` example in the Apps SDK server guide's company knowledge compatibility section
- Why not a widget example: the current OpenAI examples page is focused on UI-heavy Pizzaz examples, which is not the right fit for a connector-style read-only app

## Repo shape

```text
examples/chatgpt-apps/openhands-docs-mcp/
├─ package.json
├─ tsconfig.json
├─ README.md
└─ src/
   ├─ documents.ts
   └─ index.ts
```

## What it indexes

The app reads a curated set of OpenHands markdown files from this repository, including:

- `README.md`
- `Development.md`
- `CONTRIBUTING.md`
- `openhands/README.md`
- `frontend/README.md`
- `enterprise/README.md`
- `openhands/runtime/mcp/proxy/README.md`

Each fetched document returns a canonical GitHub URL so ChatGPT can cite the source.

## Tools

### `search`

- Input: `{ "query": string }`
- Output: one MCP text content item whose `text` is JSON containing `{ results: [{ id, title, url }] }`
- Behavior: keyword search across the local documentation corpus

### `fetch`

- Input: `{ "id": string }`
- Output: one MCP text content item whose `text` is JSON containing `{ id, title, text, url, metadata }`
- Behavior: returns the full markdown content for a document id returned by `search`

## Local run

```bash
cd examples/chatgpt-apps/openhands-docs-mcp
npm install
npm run build
npm start
```

By default the server listens on `http://localhost:8787/mcp`.

Optional environment variables:

- `PORT`: override the HTTP port
- `OPENHANDS_DOCS_REPO_ROOT`: override the repository root used for loading markdown files

## Local validation

Type check and compile:

```bash
npm run check
npm run build
```

End-to-end MCP smoke check against a running local server:

```bash
npm run smoke
```

Health check:

```bash
curl http://localhost:8787/
```

Inspect with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest --server-url http://localhost:8787/mcp --transport http
```

## Connect from ChatGPT

1. Start the server locally.
2. Expose it with HTTPS, for example: `ngrok http 8787`
3. In ChatGPT, enable Developer Mode under `Settings → Apps & Connectors → Advanced settings`.
4. Use `Settings → Apps & Connectors → Create`.
5. Paste the public MCP URL with `/mcp`, for example `https://example.ngrok.app/mcp`.
6. Refresh the app after changing tool metadata.

## Docs used

- [Quickstart](https://developers.openai.com/apps-sdk/quickstart/)
- [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server/)
- [Build your ChatGPT UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui/)
- [Examples](https://developers.openai.com/apps-sdk/build/examples/)
- [Define tools](https://developers.openai.com/apps-sdk/plan/tools/)
- [Reference](https://developers.openai.com/apps-sdk/reference/)
- [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt/)
