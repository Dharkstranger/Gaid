"""The two real models, loaded once per machine. Imported only where the
models run (Modal, a GitHub runner); engine.py never imports this file.

- Copying and speaking: Chatterbox Multilingual by Resemble AI, MIT licence
  (pypi chatterbox-tts; weights ResembleAI/chatterbox on Hugging Face). Every
  clip it makes carries Resemble's inaudible Perth watermark.
- Fingerprints for the likeness test: ECAPA-TDNN trained on VoxCeleb, from
  SpeechBrain (speechbrain/spkrec-ecapa-voxceleb). A different model from the
  one that copies, so the copier is not marking its own homework.
"""
import numpy as np
import torch
import torchaudio.functional as AF
from chatterbox.mtl_tts import ChatterboxMultilingualTTS, Conditionals
from speechbrain.inference.speaker import EncoderClassifier


class Models:
    METHOD = 'ecapa-voxceleb'

    def __init__(self, device=None, cache='/cache'):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.tts = ChatterboxMultilingualTTS.from_pretrained(device=self.device)
        self.ecapa = EncoderClassifier.from_hparams(source='speechbrain/spkrec-ecapa-voxceleb',
                                                    savedir=f'{cache}/ecapa', run_opts={'device': self.device})

    def embed(self, wav16k):
        with torch.inference_mode():
            x = torch.as_tensor(np.asarray(wav16k, dtype=np.float32))[None].to(self.device)
            return self.ecapa.encode_batch(x).squeeze().cpu().numpy()

    def prepare(self, ref_path):
        self.tts.prepare_conditionals(ref_path)
        return self.tts.conds

    def save(self, conds, path):
        conds.save(path)

    def load(self, path):
        return Conditionals.load(path, map_location=self.device).to(self.device)

    def generate(self, text, lang_code, conds):
        self.tts.conds = conds
        wav = self.tts.generate(text, language_id=lang_code)
        return wav.squeeze(0).cpu().numpy()

    @staticmethod
    def resample(wav, a, b):
        return AF.resample(torch.as_tensor(np.asarray(wav, dtype=np.float32)), a, b).numpy()
