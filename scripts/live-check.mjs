/* Is the live GAID working? Run from a GitHub runner, which can reach it.
   Reads only; spends at most one Amazon Nova answer. */
import { openRelay, topicFor, newCode } from '../public/relay.js';

const SITE = 'https://gaid-taupe.vercel.app';
const out = []; let bad = 0;
const ok = (cond, what, detail = '') => { out.push(`${cond ? 'PASS' : 'FAIL'}  ${what}${detail ? '  — ' + detail : ''}`); if (!cond) bad += 1; };
const mcp = async (name, args) => {
  const r = await fetch(`${SITE}/api/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  return (await r.json())?.result?.structuredContent ?? null;
};

for (const path of ['/', '/screen', '/home?gallery=openaccess&words=Major', '/about', '/curator?gallery=openaccess']) {
  const r = await fetch(SITE + path);
  const html = await r.text();
  ok(r.status === 200 && html.includes('GAID') && !/vercel\.com\/login|Authentication Required/i.test(html), `page ${path}`, `status ${r.status}`);
}
const g = await (await fetch(`${SITE}/api/gallery?slug=openaccess`)).json();
ok(g?.ok && g.gallery.works.length === 24, 'gallery openaccess: 24 works', `${g?.gallery?.works?.length}`);
ok(g?.gallery?.faq?.length > 0, 'gallery questions and answers arrive', `${g?.gallery?.faq?.length}`);
const img = g?.gallery?.works?.[0]?.image;
const ir = img ? await fetch(img, { method: 'HEAD' }) : null;
ok(ir?.status === 200 && /image\//.test(ir.headers.get('content-type') ?? ''), 'first painting loads', `${img} ${ir?.status}`);
out.push(`INFO  Nova switched on: ${g?.translate} | voice copy set up: ${g?.voice}`);

const who = await mcp('ask_work', { gallery: 'openaccess', work_id: 'p1', question: 'Who made it?' });
ok(/Grifo di Tancredi/.test(who?.say ?? ''), 'MCP ask_work: who made it', who?.say);
const faq = await mcp('ask_work', { gallery: 'openaccess', work_id: 'p1', question: 'Are the works real?' });
ok(/National Gallery of Art/.test(faq?.say ?? ''), 'curator answer, word for word', faq?.say?.slice(0, 80));
const nova = await mcp('ask_work', { gallery: 'openaccess', work_id: 'p1', question: 'Why is the background gold?' });
out.push(`INFO  open question → source: ${nova?.source} — ${nova?.say?.slice(0, 160)}`);

const me = await mcp('ask_work', { gallery: 'openaccess', work_id: 'p1', question: 'Are you AI?' });
ok(/living label/.test(me?.say ?? '') && !/\bAI\b/.test(me?.say ?? ''), 'what GAID is: a living label', me?.say);
const sale = await mcp('ask_work', { gallery: 'openaccess', work_id: 'p1', question: 'Is it for sale?' });
out.push(`INFO  for sale → ${sale?.say} | enquire: ${sale?.enquire?.channel ?? 'none'}`);
const api = await (await fetch(`${SITE}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: 'openaccess', at: 'p1', question: 'Are the works real?' }) })).json().catch(() => null);
ok(api?.ok === true && typeof api.answer === 'string' && Array.isArray(api.sources) && typeof api.unknown === 'boolean', 'Galleris contract: { ok, answer, sources, unknown }', JSON.stringify(api?.sources));
const nxt = await mcp('ask_work', { gallery: 'openaccess', work_id: 'p1', question: 'switch to the next artwork' });
ok(nxt?.action?.type === 'goto' && nxt?.action?.id !== 'p1', '"next artwork" moves', JSON.stringify(nxt?.action));
const intro = await mcp('ask_work', { gallery: 'openaccess', work_id: 'p1', question: 'Tell me about the work in front of me' });
out.push(`INFO  introduction → source: ${intro?.source} — ${intro?.say?.slice(0, 200)}`);
const sp = await fetch(`${SITE}/api/speak`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phrase: 'paired', lang: 'English' }) });
out.push(`INFO  voice copy: ${sp.status} why=${sp.headers.get('x-gaid-voice')} ${sp.headers.get('content-type')} ${sp.status === 200 ? (await sp.arrayBuffer()).byteLength + ' bytes' : ''}`);
const va = await fetch(`${SITE}/_vercel/insights/script.js`);
out.push(`INFO  Vercel Analytics script: ${va.status} (404 until Web Analytics is switched on in Vercel)`);
const v = await fetch(`${SITE}/vendor/vercel-analytics.js`);
ok(v.status === 200, 'analytics module is served');

const topic = topicFor('openaccess', newCode());
const heard = new Promise((res) => { const tv = openRelay({ topic, onMessage: (m) => { tv.close(); res(m); } }); setTimeout(() => res(null), 20000); });
await new Promise((r) => setTimeout(r, 3000));
const phone = openRelay({ topic, onMessage: () => {} });
setTimeout(() => phone.send({ type: 'ping', slug: 'openaccess' }), 2500);
const got = await heard; phone.close();
ok(got?.type === 'ping', 'phone reaches TV over the live link');

console.log(out.join('\n'));
process.exit(bad ? 1 : 0);
