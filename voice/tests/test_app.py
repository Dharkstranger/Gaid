"""The engine's four doors, through FastAPI's test client, with the stand-in model.
Skipped where FastAPI is not installed (GAID's Node tests do not need it)."""
import tempfile
import unittest

try:
    from fastapi.testclient import TestClient
except ImportError:          # pragma: no cover
    TestClient = None

from voice import store
from voice.tests import fake

A = 180.0


@unittest.skipIf(TestClient is None, 'fastapi not installed')
class Doors(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from voice.app import create
        cls.root = tempfile.mkdtemp()
        cls.client = TestClient(create(fake.Models, root=cls.root, token='t0ken', site='https://gaid.example'))
        cls.files = [('samples', ('a.wav', fake.audio(A, 40, 1), 'audio/wav')), ('samples', ('b.wav', fake.audio(A, 40, 2), 'audio/wav')),
                     ('consent', ('c.wav', fake.audio(A, 6, 9), 'audio/wav'))]
        cls.form = {'name': 'Ada Obi', 'kind': 'self', 'at': '2026-10-28', 'ref': 'consent-001', 'languages': 'English,Pidgin'}

    def test_enrol_needs_a_ticket(self):
        r = self.client.post('/enrol', data={**self.form, 'ticket': 'forged.ticket'}, files=self.files)
        self.assertEqual(r.status_code, 401)

    def test_enrol_speak_withdraw(self):
        r = self.client.post('/enrol', data={**self.form, 'ticket': store.ticket('t0ken')}, files=self.files)
        self.assertEqual(r.status_code, 200, r.text)
        rec = r.json()['record']
        auth = {'authorization': 'Bearer t0ken'}
        self.assertEqual(self.client.post('/speak', json={'voiceId': rec['voiceId'], 'text': 'Hello.'}).status_code, 401, 'no token, no voice')
        s = self.client.post('/speak', json={'voiceId': rec['voiceId'], 'text': 'Hello.', 'lang': 'English'}, headers=auth)
        self.assertEqual(s.headers['content-type'], 'audio/mpeg')
        self.assertEqual(self.client.get(f"/voices/{rec['voiceId']}", headers=auth).json()['record'], rec)
        self.assertTrue(self.client.post('/withdraw', json={'voiceId': rec['voiceId']}, headers=auth).json()['deleted'])
        self.assertEqual(self.client.post('/speak', json={'voiceId': rec['voiceId'], 'text': 'Hello.', 'lang': 'English'}, headers=auth).status_code, 404)

    def test_a_refusal_says_why(self):
        r = self.client.post('/enrol', data={**self.form, 'ticket': store.ticket('t0ken')}, files=self.files[:1] + self.files[2:])
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()['why'], 'too-short')

    def test_only_gaid_site_may_send_from_a_browser(self):
        ok = self.client.options('/enrol', headers={'origin': 'https://gaid.example', 'access-control-request-method': 'POST'})
        self.assertEqual(ok.headers.get('access-control-allow-origin'), 'https://gaid.example')
        bad = self.client.options('/enrol', headers={'origin': 'https://evil.example', 'access-control-request-method': 'POST'})
        self.assertNotEqual(bad.headers.get('access-control-allow-origin'), 'https://evil.example')


if __name__ == '__main__':
    unittest.main()
