/* Listening and speaking, for any GAID page. The browser's own speech: the
   page says so in its foot. GAID is said "guide" (spoken()). */
import { spoken } from './words.js';

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canListen = Boolean(Recognition);

/** Listen once. onState('listening'|'idle'); onText(final words). Returns stop(). */
export function listen({ lang = 'en-GB', onText, onHeard, onState }) {
  if (!Recognition) return () => {};
  const rec = new Recognition();
  rec.lang = lang; rec.interimResults = true; rec.maxAlternatives = 1;
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

/** Say it aloud. onState('speaking'|'idle'). */
export function say(text, { lang = 'en-GB', onState } = {}) {
  const synth = globalThis.speechSynthesis;
  if (!synth || !text) { onState?.('idle'); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(spoken(text));
  u.lang = lang; u.rate = 0.96;
  const v = synth.getVoices().find((x) => x.lang?.toLowerCase().startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  u.onstart = () => onState?.('speaking');
  u.onend = u.onerror = () => onState?.('idle');
  synth.speak(u);
}

export function hush() { globalThis.speechSynthesis?.cancel(); }
