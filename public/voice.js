/* Listening and speaking, for any GAID page. The browser's own speech.
   GAID is pronounced "guide" (spoken()). */
import { spoken } from './words.js';

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canListen = Boolean(Recognition);

/* The language tag a speech engine knows each language by. Nigerian Pidgin
   is written in English spelling, so an English voice reads it well enough;
   Yoruba, Igbo and Hausa are not, and are never read by an English voice. */
export const BCP = { English: 'en-GB', Pidgin: 'en-NG', Yoruba: 'yo-NG', Igbo: 'ig-NG', Hausa: 'ha-NG', French: 'fr-FR' };
const LOOSE = new Set(['English', 'Pidgin']);

const voices = () => globalThis.speechSynthesis?.getVoices?.() ?? [];
globalThis.speechSynthesis?.addEventListener?.('voiceschanged', () => {});

/* Most phones carry several voices for a language, and the first one listed
   is often the oldest and most robotic. The better ones say so in their
   names: Natural, Neural, Enhanced, Premium (Edge, Windows, iOS, macOS), or
   Google's own. Those come first; then the rest in the order given. */
const NATURAL = /natural|neural|enhanced|premium|wavenet|google/i;
export const rank = (list) => [...list].sort((a, b) => Number(NATURAL.test(b.name ?? '')) - Number(NATURAL.test(a.name ?? '')));

/** The best voice this phone has for the language, or null if it has none. */
export function voiceFor(lang) {
  const tag = (BCP[lang] ?? lang ?? 'en-GB').toLowerCase();
  const all = rank(voices());
  return all.find((v) => v.lang?.toLowerCase() === tag)
    ?? all.find((v) => v.lang?.toLowerCase().startsWith(tag.slice(0, 2)))
    ?? (LOOSE.has(lang) ? all.find((v) => v.lang?.toLowerCase().startsWith('en')) : null)
    ?? null;
}
export const canSpeak = (lang) => Boolean(globalThis.speechSynthesis) && (LOOSE.has(lang) || Boolean(voiceFor(lang)));

/** Listen once. onState('listening'|'idle'); onText(final words). Returns stop(). */
export function listen({ lang = 'English', onText, onHeard, onState }) {
  if (!Recognition) return () => {};
  const rec = new Recognition();
  rec.lang = BCP[lang] ?? 'en-GB'; rec.interimResults = true; rec.maxAlternatives = 1;
  let said = '';
  rec.onstart = () => onState?.('listening');
  rec.onresult = (e) => {
    const words = [...e.results].map((r) => r[0].transcript).join(' ');
    onHeard?.(words);
    if (e.results[e.results.length - 1].isFinal) said = words;
  };
  rec.onerror = () => {};
  rec.onend = () => { onState?.('idle'); if (said) onText?.(said); };
  try { rec.start(); } catch { onState?.('idle'); }
  return () => { try { rec.stop(); } catch { /* already */ } };
}

/** Say it aloud; resolves when it has been said (or could not be). */
export function say(text, { lang = 'English', onState } = {}) {
  return new Promise((done) => {
    const synth = globalThis.speechSynthesis;
    if (!synth || !text) { onState?.('idle'); done(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(spoken(text));
    u.lang = BCP[lang] ?? 'en-GB'; u.rate = 0.96;
    const v = voiceFor(lang);
    if (v) u.voice = v;
    u.onstart = () => onState?.('speaking');
    u.onend = u.onerror = () => { onState?.('idle'); done(); };
    synth.speak(u);
    // Some engines never fire onend for a cancelled line: do not wait forever.
    setTimeout(done, 1200 + String(text).length * 90);
  });
}

/* The owner's voice copy (api/speak.js), when the gallery says it is set up.
   Only GAID's own signed words (`voice`) or its fixed lines (`phrase`) can be
   spoken in it. Resolves true when it played; false means "use the phone's
   voice" — not set up, a language it does not speak, offline, or blocked. */
let natural = false;
let playing = null;
let ticket = 0;                                  // a stop while the audio is on its way wins
export function useNatural(on) { natural = Boolean(on); }
export const naturalOn = () => natural;
export async function sayNatural({ voice, phrase, words, lang = 'English', onState } = {}) {
  if (!natural || (!voice && !phrase)) return false;
  const mine = ++ticket;
  let url = null;
  try {
    const res = await fetch('/api/speak', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voice, phrase, words, lang }),
    });
    if (res.status !== 200 || !String(res.headers.get('content-type')).startsWith('audio/')) return false;
    const blob = await res.blob();
    if (mine !== ticket) return true;               // stopped meanwhile: say nothing at all
    url = URL.createObjectURL(blob);
    const a = new Audio(url);
    playing = a;
    await a.play();                                // refused (no tap yet): the phone's voice instead
    onState?.('speaking');
    await new Promise((ok) => { a.onended = a.onerror = a.onpause = ok; });
    onState?.('idle');
    return true;
  } catch {
    return false;
  } finally {
    if (url) URL.revokeObjectURL(url);
    playing = null;
  }
}

export function hush() { ticket += 1; globalThis.speechSynthesis?.cancel(); playing?.pause(); }
