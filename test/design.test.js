/* The design system holds only if nothing goes round it. Every colour, type
   size and space on a GAID page comes from public/tokens.css. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const pub = new URL('../public/', import.meta.url);
const read = (f) => readFileSync(new URL(f, pub), 'utf8');
const sheets = readdirSync(pub).filter((f) => f.endsWith('.css') && f !== 'tokens.css');
const pages = readdirSync(pub).filter((f) => f.endsWith('.html'));

// The CSS of a sheet, or of a page's <style> blocks, without comments.
const cssOf = (f) => (f.endsWith('.html')
  ? [...read(f).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
  : read(f)).replace(/\/\*[\s\S]*?\*\//g, '');

// Rules for drawing inside an SVG use the drawing's own units (centimetres), not the page's.
const rulesOf = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim(), body: m[2] }))
  .filter((r) => !/\.p-scale\s/.test(r.sel) && !/^@keyframes|^(from|to|\d+%)$/.test(r.sel));

test('the tokens file defines every token a page uses', () => {
  const tokens = read('tokens.css');
  const defined = new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  for (const f of [...sheets, ...pages]) {
    // A var with a fallback, var(--z, 1), is set by script while the page runs (Look closer), not a token.
    for (const [, name] of cssOf(f).matchAll(/var\((--[a-z0-9-]+)\)/g)) {
      assert.ok(defined.has(name), `${f} uses ${name}, which tokens.css does not define`);
    }
  }
});

test('no colour is written anywhere but the tokens', () => {
  for (const f of [...sheets, ...pages]) {
    const css = cssOf(f);
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, `${f} writes a colour by hand`);
    assert.doesNotMatch(css, /\b(rgb|rgba|hsl|hsla)\(/i, `${f} writes a colour by hand`);
  }
});

test('every type size is a step on the scale', () => {
  for (const f of sheets) {
    for (const r of rulesOf(cssOf(f))) {
      if (r.sel === 'html') continue;                     // the TV's root size sets the scale itself
      for (const m of r.body.matchAll(/font-size\s*:\s*([^;]+)/g)) {
        if (m[1].trim() === 'inherit') continue;
        assert.match(m[1].trim(), /^var\(--t-[1-6]\)$/, `${f} ${r.sel}: font-size ${m[1]}`);
      }
      for (const m of r.body.matchAll(/(?:^|;)\s*font\s*:\s*([^;]+)/g)) {
        if (m[1].trim() === 'inherit') continue;
        assert.match(m[1], /var\(--t-[1-6]\)/, `${f} ${r.sel}: font ${m[1]}`);
      }
    }
  }
});

// Split "a b calc(c - d)" into its values, leaving what is inside brackets whole.
function parts(v) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of v) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

test('every space is a step on the scale', () => {
  const ok = /^(0|auto|var\(--(s-[1-7]|gut)\)|calc\(.*var\(--.*\)|\d+(\.\d+)?%)$/;
  for (const f of sheets) {
    for (const r of rulesOf(cssOf(f))) {
      for (const m of r.body.matchAll(/(?:^|;)\s*(margin|padding|gap|margin-top|padding-top|padding-bottom|padding-left|padding-right)\s*:\s*([^;]+)/g)) {
        for (const part of parts(m[2].trim())) {
          assert.match(part, ok, `${f} ${r.sel}: ${m[1]} ${m[2]}`);
        }
      }
    }
  }
});

test('every control clears the tap size', () => {
  const css = cssOf('style.css');
  for (const sel of ['.talk', '.ask input', '.go', '.chips button', '.lang select', '.to-screen', '.brand']) {
    const rule = rulesOf(css).find((r) => r.sel === sel);
    assert.ok(rule, `no rule for ${sel}`);
    assert.match(rule.body, /min-height:\s*(var\(--tap\)|calc\(var\(--tap\))/, `${sel} has no tap-size floor`);
  }
});

test('the voice stops moving when motion is reduced', () => {
  assert.match(read('tokens.css'), /prefers-reduced-motion:\s*reduce\)\{[^}]*--m-slow:\s*0ms/);
  assert.match(cssOf('style.css'), /prefers-reduced-motion:reduce\)\{\.talk \.voice i\{animation:none\}/);
  assert.match(cssOf('screen.css'), /prefers-reduced-motion:reduce\)\{\.panel\.in\{animation:none\}/);
});

test('a work is never set on black: every mount is the mount colour', () => {
  for (const f of sheets) {
    for (const r of rulesOf(cssOf(f)).filter((x) => /(^|\s)\.(mount|thumb)$/.test(x.sel) && /background/.test(x.body))) {
      assert.match(r.body, /background:var\(--mount\)/, `${f} ${r.sel}`);
    }
  }
});

test('fonts come from GAID itself, with the letters Nigerian languages need', () => {
  for (const f of pages) assert.doesNotMatch(read(f), /fonts\.(googleapis|gstatic)\.com/, `${f} asks a font host`);
  const faces = read('fonts/fonts.css');
  for (const fam of ['Big Shoulders Display', 'Work Sans']) {
    for (const sub of ['latin', 'latin-ext', 'vietnamese']) {
      assert.match(faces, new RegExp(`font-family:'${fam}'[^}]*-${sub}-`), `${fam} has no ${sub} file`);
    }
  }
  // ẹ ọ ị ụ (Yoruba, Igbo) live in U+1EA0-1EF9; ṣ in U+1E00-1E9F; ɓ ɗ ƙ in U+0100-02AF; the dot below is U+0323.
  for (const range of ['U+1EA0-1EF9', 'U+1E00-1E9F', 'U+0100-02AF', 'U+0323']) assert.ok(faces.includes(range), range);
  // Work Sans has no ɓ ɗ ƙ ǹ; Noto Sans draws them, and must sit next in the body stack.
  assert.match(faces, /font-family:'Noto Sans'[^}]*U\+0100-02AF/);
  assert.match(read('tokens.css'), /--font-body:\s*"Work Sans", "Noto Sans"/);
});

test('eyes up: the phone fades while GAID speaks, but not during Look closer', () => {
  assert.match(cssOf('phone.css'), /\.v\[data-voice="speaking"\]:not\(\[data-look\]\) :is\(\.v-top,\.v-mount,\.v-strip\)\{opacity:var\(--eyes-up\)\}/);
  const app = read('app.js');
  assert.match(app, /querySelector\('\.v'\)\.dataset\.voice = s/);
  assert.match(app, /dataset\.look = 'on'/);
});

test('danfo yellow is never text or an edge on the wall: 1.5:1', () => {
  for (const f of sheets) {
    for (const r of rulesOf(cssOf(f))) {
      // Yellow text only where its own ground is ink.
      if (/(^|;)\s*color:var\(--accent\)/.test(r.body)) assert.match(r.body, /background:var\(--ink\)/, `${f} ${r.sel}: yellow text`);
      assert.doesNotMatch(r.body, /(border|outline|stroke)[a-z-]*:[^;]*var\(--accent\)/, `${f} ${r.sel}: yellow edge`);
    }
  }
});

test('every page counts its views with Vercel Web Analytics', () => {
  for (const f of pages) assert.match(read(f), /<script type="module" src="\/insights\.js"><\/script>/, f);
});
