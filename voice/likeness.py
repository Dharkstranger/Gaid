"""The likeness arithmetic, with no model in it, so it can be tested anywhere.

A voice fingerprint is a vector from a speaker-verification model (ECAPA,
trained on VoxCeleb). Two clips of the same person point the same way.

The bar is relative to the person themselves, because some voices vary more
than others: first measure how alike the person is to THEMSELVES (their
training clips against their held-back clips) - that is the ceiling. The copy
must reach at least PASS_RATIO of it, against the same held-back clips, which
the copy never heard.
"""
import numpy as np

PASS_RATIO = 0.90          # docs/voices.md, section 3
SEGMENT_S = 5.0            # speech is cut into five-second pieces
MIN_SPEECH_S = 60.0        # less than a minute of speech is refused
HOLD_EVERY = 3             # every third piece is held back for the test


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


def centroid(vectors):
    return unit(np.mean([unit(v) for v in vectors], axis=0))


def cos(a, b):
    return float(np.dot(unit(a), unit(b)))


def speech_only(wav, sr, frame_s=0.03, floor_db=-40.0):
    """Drop the silences: frames more than 40 dB below the loudest are cut."""
    wav = np.asarray(wav, dtype=np.float32)
    n = max(1, int(sr * frame_s))
    frames = len(wav) // n
    if frames == 0:
        return wav[:0]
    f = wav[: frames * n].reshape(frames, n)
    rms = np.sqrt(np.mean(f ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms / (rms.max() + 1e-12))
    return f[db > floor_db].reshape(-1)


def segments(wav, sr, seconds=SEGMENT_S):
    n = int(sr * seconds)
    return [wav[i:i + n] for i in range(0, len(wav) - n + 1, n)]


def split(pieces):
    """Training pieces and held-back pieces: every third is held back."""
    held = [p for i, p in enumerate(pieces) if i % HOLD_EVERY == HOLD_EVERY - 1]
    train = [p for i, p in enumerate(pieces) if i % HOLD_EVERY != HOLD_EVERY - 1]
    return train, held


def best_reference(train_vectors):
    """The index of the two neighbouring pieces most like the person overall:
    the clearest ten seconds, which the copying model is given."""
    c = centroid(train_vectors)
    scores = [cos(train_vectors[i], c) + cos(train_vectors[i + 1], c) for i in range(len(train_vectors) - 1)]
    return int(np.argmax(scores)) if scores else 0


def likeness(train_vectors, held_vectors, copy_vectors, ratio=PASS_RATIO):
    """{ similarity, ceiling, ratio, passed } - all against the held-back pieces."""
    target = centroid(held_vectors)
    ceiling = float(np.mean([cos(v, target) for v in train_vectors]))
    similarity = float(np.mean([cos(v, target) for v in copy_vectors]))
    r = similarity / ceiling if ceiling > 0 else 0.0
    return {
        'similarity': round(similarity, 4),
        'ceiling': round(ceiling, 4),
        'ratio': round(r, 4),
        'passed': bool(ceiling > 0 and r >= ratio),
    }


def same_speaker(consent_vector, train_vectors, held_vectors, ratio=PASS_RATIO):
    """Is the person reading the consent sentence the person in the samples?
    The same bar as the copy: as like them as they are to themselves."""
    r = likeness(train_vectors, held_vectors, [consent_vector], ratio)
    return {'score': r['similarity'], 'ceiling': r['ceiling'], 'same': r['passed']}
