/* Galleris is read from the first address that answers. The bare
   gallerismuseum.com once answered nothing while www did, and every gallery
   came back empty: a phone with no work on it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

// The open-access gallery's pictures are paths on Galleris's own site, so a
// copy of the sample with one picture written that way.
const raw = JSON.parse(readFileSync(new URL('../fixtures/sample.json', import.meta.url), 'utf8'));
const media = raw.media ?? raw.images;
const first = Object.keys(media)[0];
media[first] = typeof media[first] === 'string' ? '/art/x.jpg' : { ...media[first], src: '/art/x.jpg' };
const sample = JSON.stringify(raw);

test('a dead first address falls through to the next', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/demos/sample.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(sample); return; }
    res.writeHead(404); res.end();
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const live = `http://127.0.0.1:${server.address().port}`;
  delete process.env.GALLERIS_LOCAL_DIR;
  process.env.GALLERIS_ORIGIN = `http://127.0.0.1:9,${live}`;          // port 9: nothing there
  process.env.GALLERIS_BUCKET = 'http://127.0.0.1:9';
  const { loadGallery } = await import(`../lib/gallery.js?origin=${Date.now()}`);
  const g = await loadGallery('sample');
  server.close();
  assert.ok(g, 'no gallery: the second address was never asked');
  assert.ok(g.works.length > 0);
  assert.ok(g.works.some((w) => w.image === `${live}/art/x.jpg`), 'pictures must come from the address that answered');
});
