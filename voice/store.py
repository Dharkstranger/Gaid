"""Where voices live, who may add one, and audio in and out. No model here.

A voice is a folder on the engine's own disk (a Modal Volume):
    <root>/<voice id>/meta.json     name, consent, languages, likeness result
    <root>/<voice id>/conds.pt      what the copying model needs to speak
    <root>/<voice id>/reference.wav the ten seconds it was given
    <root>/<voice id>/held/*.wav    the held-back pieces, kept to re-test
    <root>/<voice id>/consent.*     the consent sentence, as recorded
Withdrawing a voice deletes the folder. Nothing else holds a copy.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import subprocess
import time
from pathlib import Path

import numpy as np

VOICE_ID = re.compile(r'^gv[0-9a-f]{16}$')
TICKET_TTL_S = 30 * 60


def new_id():
    return 'gv' + secrets.token_hex(8)


def folder(root, voice_id):
    if not VOICE_ID.match(str(voice_id)):
        raise ValueError('not a voice id')
    return Path(root) / voice_id


def save_meta(root, voice_id, meta):
    d = folder(root, voice_id)
    d.mkdir(parents=True, exist_ok=True)
    (d / 'meta.json').write_text(json.dumps(meta, indent=2))


def load_meta(root, voice_id):
    try:
        return json.loads((folder(root, voice_id) / 'meta.json').read_text())
    except (FileNotFoundError, ValueError):
        return None


def withdraw(root, voice_id):
    d = folder(root, voice_id)
    existed = d.exists()
    shutil.rmtree(d, ignore_errors=True)
    return existed


# ---------------------------------------------------------------- who may ask

def bearer_ok(header, token):
    """GAID's server, holding the shared token."""
    if not token or not header or not header.startswith('Bearer '):
        return False
    return hmac.compare_digest(header[7:].encode(), token.encode())


def _b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def _unb64(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def ticket(token, kind='enrol', now=None):
    """A one-purpose pass GAID's server hands a browser, so the browser can send
    audio straight to the engine without ever holding the token. Same shape as
    lib/voiceticket.js, which makes them."""
    body = _b64(json.dumps({'k': kind, 'e': int((now or time.time()) + TICKET_TTL_S), 'n': secrets.token_hex(8)}).encode())
    mac = _b64(hmac.new(token.encode(), f'gaid.voice.v1:{body}'.encode(), hashlib.sha256).digest())
    return f'{body}.{mac}'


def ticket_ok(t, token, kind='enrol', now=None):
    try:
        body, mac = str(t).split('.')
        want = _b64(hmac.new(token.encode(), f'gaid.voice.v1:{body}'.encode(), hashlib.sha256).digest())
        if not token or not hmac.compare_digest(mac.encode(), want.encode()):
            return False
        p = json.loads(_unb64(body))
        return p.get('k') == kind and p.get('e', 0) >= (now or time.time())
    except Exception:
        return False


# ---------------------------------------------------------------- audio

MAX_BYTES = 25 * 1024 * 1024


def decode(data, sr):
    """Any audio a phone or a laptop makes (webm, m4a, mp3, wav) -> mono float32."""
    if not data or len(data) > MAX_BYTES:
        raise ValueError('audio missing or too large')
    p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', str(sr), '-f', 'f32le', 'pipe:1'],
                       input=data, capture_output=True, timeout=120)
    if p.returncode != 0 or not p.stdout:
        raise ValueError('not audio')
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def to_mp3(wav, sr):
    pcm = (np.clip(np.asarray(wav, dtype=np.float32), -1, 1) * 32767).astype('<i2').tobytes()
    p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', 'pipe:0',
                        '-codec:a', 'libmp3lame', '-b:a', '96k', '-f', 'mp3', 'pipe:1'], input=pcm, capture_output=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError('mp3')
    return p.stdout


def to_wav_file(wav, sr, path):
    pcm = (np.clip(np.asarray(wav, dtype=np.float32), -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', 'pipe:0', str(path)],
                   input=pcm, check=True, timeout=60)


def root():
    return os.environ.get('GAID_VOICE_ROOT', '/voices')
