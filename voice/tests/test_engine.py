"""Every rule of the voice engine, with a stand-in model (tests/fake.py).
Run: python3 -m unittest discover -s voice/tests -t .   (from the repository root)"""
import tempfile
import time
import unittest
from pathlib import Path

from voice import engine, likeness as L, store
from voice.tests import fake

A, B = 180.0, 330.0                                 # two people
CONSENT = {'kind': 'self', 'at': '2026-10-28', 'ref': 'consent-001'}


class Enrol(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.samples = [fake.audio(A, 40, seed=1), fake.audio(A, 40, seed=2)]   # eighty seconds of A
        cls.consent_a = fake.audio(A, 6, seed=9)
        cls.consent_b = fake.audio(B, 6, seed=9)

    def setUp(self):
        self.root = tempfile.mkdtemp()

    def enrol(self, models=None, samples=None, consent=..., meta=None):
        return engine.enrol(models or fake.Models(), self.root, self.samples if samples is None else samples,
                            self.consent_a if consent is ... else consent, meta or {'name': 'Ada Obi', 'consent': CONSENT})

    def left(self):
        return list(Path(self.root).iterdir())

    def test_a_good_copy_becomes_a_voice_id(self):
        m = self.enrol()
        self.assertRegex(m['voiceId'], r'^gv[0-9a-f]{16}$')
        self.assertTrue(m['check']['passed'])
        self.assertGreaterEqual(m['check']['ratio'], L.PASS_RATIO)
        self.assertTrue(m['consentCheck']['same'])
        r = engine.record(m)
        self.assertEqual(r['provider'], 'gaid')
        self.assertEqual(set(r), {'id', 'name', 'provider', 'voiceId', 'languages', 'consent', 'check'})
        self.assertEqual(r['check']['passed'], True)

    def test_a_copy_that_does_not_sound_like_them_is_refused_and_not_kept(self):
        with self.assertRaises(engine.Refused) as r:
            self.enrol(models=fake.Models(drift=0.35))
        self.assertEqual(r.exception.why, 'not-alike')
        self.assertLess(r.exception.detail['ratio'], L.PASS_RATIO)
        self.assertEqual(self.left(), [], 'nothing of a failed copy is kept')

    def test_less_than_a_minute_of_speech_is_refused(self):
        with self.assertRaises(engine.Refused) as r:
            self.enrol(samples=[fake.audio(A, 40)])
        self.assertEqual(r.exception.why, 'too-short')

    def test_no_consent_no_voice(self):
        for c in [{}, {'kind': 'self', 'at': '2026-10-28'}, {'kind': 'friend', 'at': '2026-10-28', 'ref': 'x'}, {'kind': 'self', 'at': 'soon', 'ref': 'x'}]:
            with self.assertRaises(engine.Refused, msg=str(c)) as r:
                self.enrol(meta={'name': 'Ada', 'consent': c})
            self.assertEqual(r.exception.why, 'no-consent')

    def test_a_living_person_must_read_the_consent_sentence_themselves(self):
        with self.assertRaises(engine.Refused) as r:
            self.enrol(consent=None)
        self.assertEqual(r.exception.why, 'no-consent-recording')
        with self.assertRaises(engine.Refused) as r:
            self.enrol(consent=self.consent_b)
        self.assertEqual(r.exception.why, 'consent-voice-differs', 'somebody else read the consent')
        self.assertEqual(self.left(), [])

    def test_an_estate_signs_for_somebody_who_has_died(self):
        m = self.enrol(consent=None, meta={'name': 'Chief Bello', 'consent': {'kind': 'estate', 'at': '2026-10-28', 'ref': 'estate-002'}})
        self.assertTrue(m['check']['passed'])

    def test_speak_in_the_voice_and_only_in_its_languages(self):
        m = self.enrol()
        mp3 = engine.speak(fake.Models(), self.root, m['voiceId'], 'Hello. This is the lagoon at dawn.', 'English')
        self.assertTrue(mp3[:3] == b'ID3' or mp3[0] == 0xFF, 'an MP3')
        with self.assertRaises(engine.Refused) as r:
            engine.speak(fake.Models(), self.root, m['voiceId'], 'Ẹ káàbọ̀.', 'Yoruba')
        self.assertEqual(r.exception.why, 'language')

    def test_withdrawing_deletes_everything(self):
        m = self.enrol()
        self.assertTrue(store.withdraw(self.root, m['voiceId']))
        self.assertEqual(self.left(), [])
        with self.assertRaises(engine.Refused) as r:
            engine.speak(fake.Models(), self.root, m['voiceId'], 'Hello.', 'English')
        self.assertEqual(r.exception.why, 'no-voice')


class Doors(unittest.TestCase):
    def test_a_ticket_is_for_one_purpose_for_half_an_hour(self):
        t = store.ticket('secret')
        self.assertTrue(store.ticket_ok(t, 'secret'))
        self.assertFalse(store.ticket_ok(t, 'other secret'))
        self.assertFalse(store.ticket_ok(t, 'secret', kind='speak'))
        self.assertFalse(store.ticket_ok(t, 'secret', now=time.time() + store.TICKET_TTL_S + 5))
        body, mac = t.split('.')
        self.assertFalse(store.ticket_ok(body[:-2] + 'xx.' + mac, 'secret'))
        self.assertFalse(store.ticket_ok(t, ''), 'no secret set: no tickets')

    def test_only_gaid_server_may_speak(self):
        self.assertTrue(store.bearer_ok('Bearer s3cret', 's3cret'))
        self.assertFalse(store.bearer_ok('Bearer wrong', 's3cret'))
        self.assertFalse(store.bearer_ok('Bearer ', ''))

    def test_a_voice_id_cannot_reach_outside_its_folder(self):
        for bad in ['../etc', 'gv../../x', 'GV0123456789abcdef', '']:
            with self.assertRaises(ValueError):
                store.folder('/voices', bad)


class Arithmetic(unittest.TestCase):
    def test_the_bar_is_relative_to_the_person(self):
        same = [[1, 0.1, 0], [1, 0.12, 0], [1, 0.09, 0.01]]
        self.assertTrue(L.likeness(same, same, [[1, 0.1, 0]])['passed'])
        self.assertFalse(L.likeness(same, same, [[0, 1, 0]])['passed'])

    def test_every_third_piece_is_held_back(self):
        train, held = L.split(list(range(12)))
        self.assertEqual(held, [2, 5, 8, 11])
        self.assertEqual(len(train), 8)


if __name__ == '__main__':
    unittest.main()
