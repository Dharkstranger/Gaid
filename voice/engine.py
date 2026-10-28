"""GAID's own voice engine: from a person's recordings to a voice ID, and from
a voice ID to speech. Owner, 28 October: "ElevenLabs is too expensive; do ours".

The models are passed in (models.py loads the real ones; the tests pass
stand-ins), so every rule here is tested without a GPU:

  enrol   recordings + consent -> a voice ID, only if
          - there is at least a minute of speech,
          - the consent is complete (the person, or an estate with its form),
          - for a living person, the voice reading the consent sentence is the
            voice in the recordings, and
          - the copy passes the likeness test (likeness.py).
          A copy that fails is not kept: its folder is deleted.
  speak   a voice ID + text -> MP3, in a language the model speaks
  withdraw  deletes everything held for the voice
"""
import datetime as dt
import re

import numpy as np

from . import likeness as L
from . import store

SR = 24000        # what the copying model speaks at
EMBED_SR = 16000  # what the fingerprint model listens at

# What the copying model speaks (Chatterbox Multilingual, 23 languages).
# Pidgin is written in English spelling. Yoruba, Igbo and Hausa are not among
# them; they come with GAID's own language work (docs/voices.md, section 5).
LANGS = {'English': 'en', 'Pidgin': 'en', 'French': 'fr', 'Swahili': 'sw', 'Arabic': 'ar', 'Portuguese': 'pt',
         'Spanish': 'es', 'German': 'de', 'Italian': 'it', 'Dutch': 'nl', 'Chinese': 'zh', 'Hindi': 'hi'}

# Said by every new copy for the likeness test; never in anybody's recordings.
TEST_SENTENCES = [
    'This painting was made with oil on a wooden panel, more than seven hundred years ago.',
    'Walk to the next room and you will find the sculpture the gallery bought last spring.',
    'Ask me who made it, when it was made, or what it is made of.',
]
MAX_TEXT = 1200


class Refused(Exception):
    def __init__(self, why, detail=None):
        super().__init__(why)
        self.why = why
        self.detail = detail or {}


def _day(v):
    try:
        dt.date.fromisoformat(str(v)[:10])
        return str(v)[:10]
    except ValueError:
        return ''


def clean_meta(meta):
    name = str(meta.get('name', '')).strip()[:120]
    c = meta.get('consent') or {}
    kind, at, ref = c.get('kind'), _day(c.get('at', '')), str(c.get('ref', '')).strip()[:120]
    if not name:
        raise Refused('no-name')
    if kind not in ('self', 'estate') or not at or not ref:
        raise Refused('no-consent')
    langs = [x for x in (meta.get('languages') or ['English', 'Pidgin']) if x in LANGS][:12] or ['English']
    return {'name': name, 'consent': {'kind': kind, 'at': at, 'ref': ref}, 'languages': langs}


def enrol(models, root, samples, consent_clip, meta, today=None):
    m = clean_meta(meta)
    speech = np.concatenate([L.speech_only(store.decode(s, EMBED_SR), EMBED_SR) for s in samples]) if samples else np.zeros(0, np.float32)
    seconds = len(speech) / EMBED_SR
    if seconds < L.MIN_SPEECH_S:
        raise Refused('too-short', {'seconds': round(seconds, 1), 'needs': L.MIN_SPEECH_S})
    pieces = L.segments(speech, EMBED_SR)
    train, held = L.split(pieces)
    tv = [models.embed(p) for p in train]
    hv = [models.embed(p) for p in held]

    consent = None
    if m['consent']['kind'] == 'self':
        # A living person reads the consent sentence themselves, live.
        if not consent_clip:
            raise Refused('no-consent-recording')
        said = L.speech_only(store.decode(consent_clip, EMBED_SR), EMBED_SR)
        if len(said) < EMBED_SR * 2:
            raise Refused('no-consent-recording')
        consent = L.same_speaker(models.embed(said), tv, hv)
        if not consent['same']:
            raise Refused('consent-voice-differs', consent)

    voice_id = store.new_id()
    d = store.folder(root, voice_id)
    (d / 'held').mkdir(parents=True, exist_ok=True)
    try:
        # The clearest ten seconds, at the copying model's own rate.
        i = L.best_reference(tv)
        ref16 = np.concatenate([train[i], train[i + 1]]) if len(train) > 1 else train[0]
        rs = getattr(models, 'resample', _resample)
        ref = rs(ref16, EMBED_SR, SR)
        store.to_wav_file(ref, SR, d / 'reference.wav')
        conds = models.prepare(str(d / 'reference.wav'))
        models.save(conds, str(d / 'conds.pt'))
        for k, p in enumerate(held):
            store.to_wav_file(p, EMBED_SR, d / 'held' / f'{k:03d}.wav')
        if consent_clip:
            (d / 'consent.audio').write_bytes(consent_clip)

        copies = [models.generate(t, 'en', conds) for t in TEST_SENTENCES]
        cv = [models.embed(rs(w, SR, EMBED_SR)) for w in copies]
        check = L.likeness(tv, hv, cv)
        check['at'] = (today or dt.date.today()).isoformat()
        check['method'] = getattr(models, 'METHOD', 'ecapa')
        if not check['passed']:
            raise Refused('not-alike', check)
        meta_out = {**m, 'id': voice_id, 'provider': 'gaid', 'voiceId': voice_id, 'check': check,
                    'consentCheck': consent, 'speechSeconds': round(seconds, 1), 'created': check['at']}
        store.save_meta(root, voice_id, meta_out)
        return meta_out
    except Exception:
        store.withdraw(root, voice_id)    # a copy that is not used is not kept
        raise


def record(meta):
    """The voice record a gallery publishes (lib/voices.js), from an enrolment."""
    return {k: meta[k] for k in ('id', 'name', 'provider', 'voiceId', 'languages', 'consent')} | {
        'check': {k: meta['check'][k] for k in ('passed', 'similarity', 'at')}}


SENTENCE = re.compile(r'(?<=[.!?])\s+')


def chunks(text, size=240):
    """Short pieces: the model speaks about forty seconds at most at a time."""
    out, cur = [], ''
    for s in SENTENCE.split(str(text).strip()):
        if cur and len(cur) + len(s) + 1 > size:
            out.append(cur)
            cur = s
        else:
            cur = f'{cur} {s}'.strip()
    if cur:
        out.append(cur)
    return [c[:size] for c in out]


def speak(models, root, voice_id, text, lang='English'):
    meta = store.load_meta(root, voice_id)
    if not meta:
        raise Refused('no-voice')
    if lang not in meta.get('languages', []) or lang not in LANGS:
        raise Refused('language')
    text = str(text or '').strip()[:MAX_TEXT]
    if not text:
        raise Refused('no-text')
    conds = models.load(str(store.folder(root, voice_id) / 'conds.pt'))
    gap = np.zeros(int(SR * 0.25), dtype=np.float32)
    parts = []
    for c in chunks(text):
        parts += [np.asarray(models.generate(c, LANGS[lang], conds), dtype=np.float32), gap]
    return store.to_mp3(np.concatenate(parts[:-1]), SR)


def _resample(wav, a, b):
    if a == b:
        return np.asarray(wav, dtype=np.float32)
    n = int(round(len(wav) * b / a))
    x = np.linspace(0, len(wav) - 1, n)
    return np.interp(x, np.arange(len(wav)), wav).astype(np.float32)
