/* The simulated Alexa+ side: calls GAID's MCP server (/api/mcp) the way
   Alexa+ would, one tools/call per question, Model Context Protocol
   2025-11-25. Returns the tool's structuredContent, or null on any failure. */

const PROTOCOL = '2025-11-25';
let next = 0;

export async function callTool(name, args, ms = 9000) {
  const id = (next += 1);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch('/api/mcp', {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': PROTOCOL },
      body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }),
    });
    const body = await res.json();
    // A captive portal or proxy can answer 200 with JSON of its own: only a
    // reply to THIS request, carrying words to say, counts.
    const out = body?.jsonrpc === '2.0' && body.id === id ? body.result?.structuredContent : null;
    return out && typeof out.say === 'string' ? out : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
