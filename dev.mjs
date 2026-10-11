/* Local server: the files in public/ and the two functions in api/, the same
   way Vercel serves them. `npm run dev`, then open http://localhost:5173/ */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
// The same headers Vercel sends, so a page that breaks the live site's
// security policy breaks here too, not first in production.
const HEADERS = Object.fromEntries(JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  .headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value]));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

export function start(port = PORT) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname.startsWith('/api/')) {
        const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
        const mod = await import(path.join(ROOT, 'api', `${name}.js`));
        const handler = mod[req.method];
        if (!handler) { res.writeHead(405).end(); return; }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const request = new Request(url, {
          method: req.method, headers: req.headers,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
        });
        const out = await handler(request);
        res.writeHead(out.status, Object.fromEntries(out.headers));
        res.end(Buffer.from(await out.arrayBuffer()));
        return;
      }
      let rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (!path.extname(rel)) rel += '.html';            // clean URLs, as vercel.json asks
      const file = path.join(ROOT, 'public', path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      const body = await readFile(file);
      res.writeHead(200, { ...HEADERS, 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().then(() => console.log(`GAID on http://localhost:${PORT}/`));
}
