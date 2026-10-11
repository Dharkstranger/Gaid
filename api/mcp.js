/* /api/mcp — GAID's MCP server for Alexa+, over Streamable HTTP.
   Model Context Protocol 2025-11-25. Stateless: each POST gets a fresh server
   and transport and answers with JSON, so it runs as a plain Vercel function
   with nothing held between requests. GET (a standing event stream) and
   DELETE (ending a session) have nothing to do here, and say so with 405. */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer } from '../lib/mcp.js';
import { caller } from './ask.js';

export async function POST(request) {
  const server = createServer({ caller: caller(request) });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,   // stateless
    enableJsonResponse: true,        // one JSON reply, no event stream to keep open
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // The reply is already built; close quietly so the function can end.
    queueMicrotask(() => { server.close().catch(() => {}); });
  }
}

const notHere = () => new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed: this server is stateless; POST only.' }, id: null }), {
  status: 405, headers: { allow: 'POST', 'content-type': 'application/json' },
});
export const GET = notHere;
export const DELETE = notHere;
