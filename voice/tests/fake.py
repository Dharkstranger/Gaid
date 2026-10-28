"""A stand-in for the two models: each 'person' is a tone with its own pitch,
and a fingerprint is the shape of the spectrum. Same pitch, same person.
`drift` makes a copier that copies badly - a different pitch."""
import tempfile
from pathlib import Path

import numpy as np

from voice import store

SR = 16000


def person(hz, seconds, seed=1, sr=SR):
    rng = np.random.default_rng(seed)
    t = np.arange(int(seconds * sr)) / sr
    voiced = sum(np.sin(2 * np.pi * hz * k * t) / k for k in (1, 2, 3))
    syllables = (np.sin(2 * np.pi * 3 * t) > -0.6).astype(np.float32)      # speech-like on/off
    return (0.3 * voiced * syllables + 0.003 * rng.standard_normal(len(t))).astype(np.float32)


def audio(hz, seconds, seed=1):
    """As a phone would upload it: an encoded file."""
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'a.wav'
        store.to_wav_file(person(hz, seconds, seed), SR, p)
        return p.read_bytes()


def pitch(wav, sr):
    w = np.asarray(wav, dtype=np.float64)
    spec = np.abs(np.fft.rfft(w * np.hanning(len(w))))
    f = np.fft.rfftfreq(len(w), 1 / sr)
    band = (f > 60) & (f < 500)
    return float(f[band][np.argmax(spec[band])])


class Models:
    METHOD = 'fake-pitch'

    def __init__(self, drift=0.0):
        self.drift = drift
        self.saved = {}

    def embed(self, wav16k):
        w = np.asarray(wav16k, dtype=np.float64)[:SR * 5]
        spec = np.abs(np.fft.rfft(w, n=SR))[:1000]
        bins = spec.reshape(100, 10).sum(axis=1)
        return bins + 1e-3

    def prepare(self, ref_path):
        return {'hz': pitch(store.decode(Path(ref_path).read_bytes(), SR), SR)}

    def save(self, conds, path):
        Path(path).write_text(str(conds['hz']))

    def load(self, path):
        return {'hz': float(Path(path).read_text())}

    def generate(self, text, lang, conds):
        seconds = max(2.0, len(text) / 15)
        return person(conds['hz'] * (1 + self.drift), seconds, seed=len(text), sr=24000)
