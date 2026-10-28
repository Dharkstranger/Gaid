"""GAID's voice engine on Modal (modal.com): a T4 GPU that switches off when
nobody is speaking. Deploy from the repository root:

    modal secret create gaid-voice GAID_VOICE_TOKEN=<long random> GAID_SITE=https://gaid-taupe.vercel.app
    modal deploy voice/modal_app.py

The free plan's monthly credit pays for roughly fifty GPU hours (docs/voices.md).
"""
import modal

image = (
    modal.Image.debian_slim(python_version='3.11')
    .apt_install('ffmpeg')
    .pip_install_from_requirements('voice/requirements.txt')
    .env({'HF_HOME': '/cache/hf', 'GAID_VOICE_ROOT': '/voices'})
    .add_local_python_source('voice')
)
app = modal.App('gaid-voice')
voices = modal.Volume.from_name('gaid-voices', create_if_missing=True)
cache = modal.Volume.from_name('gaid-voice-models', create_if_missing=True)


@app.function(image=image, gpu='T4', timeout=900, scaledown_window=300,
              volumes={'/voices': voices, '/cache': cache}, secrets=[modal.Secret.from_name('gaid-voice')])
@modal.asgi_app()
def web():
    from voice.app import create
    from voice.models import Models
    return create(lambda: Models(cache='/cache'), saved=voices.commit, fresh=voices.reload)
