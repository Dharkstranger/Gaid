"""The engine's web door. Four calls:

  POST /enrol     a browser, with a ticket GAID's server gave it (form + files)
  POST /speak     GAID's server only (Bearer token): { voiceId, text, lang } -> MP3
  POST /withdraw  GAID's server only: { voiceId } -> everything deleted
  GET  /voices/ID GAID's server only: the voice record to publish

GAID_VOICE_TOKEN is the one shared secret (Modal secret and Vercel env).
"""
import os
import threading

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from . import engine, store


def create(models_factory, root=None, token=None, site=None, saved=lambda: None, fresh=lambda: None):
    """`saved` runs after a voice is written or deleted, `fresh` before one is
    read: on Modal they commit and reload the shared disk, so every machine
    sees a new or withdrawn voice at once."""
    app = FastAPI(title='GAID voice engine', docs_url=None, redoc_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=[site or os.environ.get('GAID_SITE', 'https://gaid-taupe.vercel.app')],
                       allow_methods=['POST'], allow_headers=['content-type'])
    lock = threading.Lock()
    state = {}
    token = token if token is not None else os.environ.get('GAID_VOICE_TOKEN', '')
    root = root or store.root()

    def models():
        if 'm' not in state:
            state['m'] = models_factory()
        return state['m']

    def no(why, status=400, detail=None):
        return JSONResponse({'ok': False, 'why': why, **({'detail': detail} if detail else {})}, status_code=status)

    def server(request):
        return store.bearer_ok(request.headers.get('authorization', ''), token)

    @app.get('/health')
    def health():
        return {'ok': True}

    @app.post('/enrol')
    async def enrol(ticket: str = Form(''), name: str = Form(''), kind: str = Form(''), at: str = Form(''), ref: str = Form(''),
                    languages: str = Form('English,Pidgin'), consent: UploadFile | None = File(None),
                    samples: list[UploadFile] = File(default_factory=list)):
        if not store.ticket_ok(ticket, token):
            return no('ticket', 401)
        if not samples or len(samples) > 20:
            return no('samples')
        data = [await s.read() for s in samples]
        said = await consent.read() if consent else None
        meta = {'name': name, 'consent': {'kind': kind, 'at': at, 'ref': ref}, 'languages': [x.strip() for x in languages.split(',')]}
        try:
            with lock:
                m = engine.enrol(models(), root, data, said, meta)
                saved()
        except engine.Refused as r:
            return no(r.why, 422, r.detail)
        except ValueError:
            return no('not-audio', 422)
        return {'ok': True, 'record': engine.record(m), 'check': m['check']}

    @app.post('/speak')
    async def speak(request: Request):
        if not server(request):
            return no('token', 401)
        b = await request.json()
        try:
            with lock:
                fresh()
                mp3 = engine.speak(models(), root, str(b.get('voiceId', '')), b.get('text', ''), b.get('lang', 'English'))
        except (engine.Refused, ValueError) as r:
            return no(getattr(r, 'why', 'bad'), 404 if getattr(r, 'why', '') == 'no-voice' else 422)
        return Response(mp3, media_type='audio/mpeg')

    @app.post('/withdraw')
    async def withdraw(request: Request):
        if not server(request):
            return no('token', 401)
        b = await request.json()
        try:
            gone = store.withdraw(root, str(b.get('voiceId', '')))
            saved()
            return {'ok': True, 'deleted': gone}
        except ValueError:
            return no('voice-id')

    @app.get('/voices/{voice_id}')
    def voice(voice_id: str, request: Request):
        if not server(request):
            return no('token', 401)
        try:
            fresh()
            m = store.load_meta(root, voice_id)
        except ValueError:
            return no('voice-id')
        return {'ok': True, 'record': engine.record(m)} if m else no('no-voice', 404)

    return app
