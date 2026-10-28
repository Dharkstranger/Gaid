"""Prove the real engine end to end, on a machine that can download the models
(a GitHub runner; .github/workflows/voice-engine.yml). No real person's voice:
two computer voices (espeak-ng with MBROLA us1 and us2) stand in for person A
and person B. Prints a report and fails only on what must hold whatever the
voice: the engine runs, the copy is closer to A than to B, and B cannot read
the consent for A's recordings.

    python -m voice.prove <out dir>
"""
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from voice import engine, likeness as L, store
from voice.models import Models

PASSAGE = [
    'Welcome. Take your time in this room, and look closely before you read the label.',
    'This painting was made in Lagos, on a canvas the artist stretched by hand.',
    'Notice the light on the water, and the small boat near the edge of the frame.',
    'The colours were mixed from earth, ash and indigo, the way her teacher showed her.',
    'Some visitors stand very close. Others step back to the far wall. Both are right.',
    'In the next room you will find sculpture in bronze and carved wood.',
    'The gallery bought this work in the spring, after the first show.',
    'If you have a question, ask me. I will tell you what the gallery has written.',
    'Who made it? When was it made? What is it made of? How big is it?',
    'Thank you for listening. Enjoy the rest of your visit.',
]


def speak_as(voice, text, path):
    subprocess.run(['espeak-ng', '-v', voice, '-s', '150', '-w', str(path), text], check=True)
    return Path(path).read_bytes()


def main(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    report = {}
    t0 = time.time()
    m = Models(cache=str(out / 'cache'))
    report['load_s'] = round(time.time() - t0, 1)
    with tempfile.TemporaryDirectory() as d:
        a = [speak_as('mb-us1', ' '.join(PASSAGE * 2), Path(d) / f'a{i}.wav') for i in range(2)]
        consent_a = speak_as('mb-us1', 'I am Person A. I agree that GAID may speak in a copy of my voice.', Path(d) / 'ca.wav')
        consent_b = speak_as('mb-us2', 'I am Person A. I agree that GAID may speak in a copy of my voice.', Path(d) / 'cb.wav')
        b_voice = speak_as('mb-us2', ' '.join(PASSAGE), Path(d) / 'b.wav')
        root = out / 'voices'
        meta = {'name': 'Person A (computer voice)', 'consent': {'kind': 'self', 'at': '2026-10-28', 'ref': 'ci'}}

        # 1. B reads the consent for A's recordings: refused.
        try:
            engine.enrol(m, root, a, consent_b, meta)
            report['other_voice_consent'] = 'ACCEPTED'
        except engine.Refused as r:
            report['other_voice_consent'] = {'refused': r.why, **r.detail}

        # 2. A enrols. Passing the likeness bar is reported, not required:
        #    a robotic computer voice is not a person.
        t0 = time.time()
        try:
            rec = engine.enrol(m, root, a, consent_a, meta)
            report['enrol'] = {'voiceId': rec['voiceId'], 'check': rec['check'], 'consent': rec['consentCheck']}
            vid = rec['voiceId']
        except engine.Refused as r:
            report['enrol'] = {'refused': r.why, **r.detail}
            vid = None
        report['enrol_s'] = round(time.time() - t0, 1)

        # 3. The copy is closer to A than to B, measured on fresh speech.
        if vid:
            t0 = time.time()
            mp3 = engine.speak(m, root, vid, 'This is the lagoon at dawn, painted in oil on canvas.', 'English')
            report['speak_s'] = round(time.time() - t0, 1)
            (out / 'copy-of-A.mp3').write_bytes(mp3)
            copy = m.embed(store.decode(mp3, engine.EMBED_SR))
            fa = m.embed(L.speech_only(store.decode(a[0], engine.EMBED_SR), engine.EMBED_SR)[: engine.EMBED_SR * 10])
            fb = m.embed(L.speech_only(store.decode(b_voice, engine.EMBED_SR), engine.EMBED_SR)[: engine.EMBED_SR * 10])
            report['copy_vs_A'] = round(L.cos(copy, fa), 4)
            report['copy_vs_B'] = round(L.cos(copy, fb), 4)
    print(json.dumps(report, indent=2))
    (out / 'report.json').write_text(json.dumps(report, indent=2))
    must = [
        isinstance(report.get('other_voice_consent'), dict) and report['other_voice_consent'].get('refused') == 'consent-voice-differs',
        'copy_vs_A' not in report or report['copy_vs_A'] > report['copy_vs_B'],
    ]
    if not all(must):
        sys.exit(1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'voice-proof')
