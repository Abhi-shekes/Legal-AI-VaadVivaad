"""Dictation in, and the hearing read out.

`translation.py` opens by saying that a person describing a police matter
will not do it in a second language, and it supports English, Hindi, Marathi,
Bengali, Tamil, Telugu and Gujarati. The only way into the product is a
textarea. That contradiction is this feature.

**In.** faster-whisper behind an OpenAI-compatible transcription endpoint.
The transcript joins the existing path — `translation.to_english()` then
`intake.prepare()` — so nothing downstream changes and a case dictated in
Marathi becomes the same `CaseStructure` a typed one does. Whisper reports
the language it heard, which is a better signal than
`translation.detect_script()` can get from a script range alone: Hindi and
Marathi share Devanagari and are indistinguishable by codepoint.

**Out.** Piper: ~50 MB, faster than realtime on a CPU, one voice per persona
so prosecution, defence and bench are audibly distinct as
`sockets/debate.py` streams each turn. A hearing you can listen to is a
different product from a hearing you have to read, particularly for someone
who is more comfortable in speech than in legal English.

Both are optional and both fail soft. Without them the textarea works exactly
as it does today; `available()` reports which half, if either, is running.
"""

from __future__ import annotations

import asyncio
import io
import json
import wave
from typing import Dict, List, Optional, Tuple

import httpx

from app.core.config import settings
from app.core.errors import ValidationFailed
from app.core.logging import Timer, get_logger
from app.domain.schemas import Side

log = get_logger(__name__)

# Whisper accepts far more, but these are what a browser's MediaRecorder
# actually produces, plus the two upload formats people try by hand.
SUPPORTED_AUDIO = {
    "audio/webm", "audio/ogg", "audio/wav", "audio/x-wav",
    "audio/mpeg", "audio/mp4", "audio/m4a", "audio/flac",
}

# 25 MB is roughly twenty minutes of speech. A case description is a minute or
# two; anything approaching this is a mistake or an attempt to tie up the
# worker.
MAX_AUDIO_BYTES = 25 * 1024 * 1024

# One voice per role, so the transcript is followable by ear. Piper ships
# these; any installed voice name works.
PERSONA_VOICES: Dict[str, str] = {
    Side.PROSECUTION.value: "en_GB-alan-medium",
    Side.DEFENCE.value: "en_US-lessac-medium",
    "bench": "en_GB-northern_english_male-medium",
}
DEFAULT_VOICE = "en_US-lessac-medium"


def _describe(exc: Exception) -> str:
    """A usable message even when the exception carries none.

    httpx timeouts stringify to "", and an HTTP error's own body is where the
    server explains itself -- "Model X is not installed locally" is the whole
    diagnosis, and losing it costs an hour.
    """
    detail = str(exc).strip()
    body = ""
    response = getattr(exc, "response", None)
    if response is not None:
        try:
            body = f" body={response.text[:200]}"
        except Exception:
            body = ""
    return f"{type(exc).__name__}: {detail[:160]}{body}" if detail or body \
        else type(exc).__name__


def validate_audio(content_type: str, size: int) -> str:
    kind = (content_type or "").split(";")[0].strip().lower()
    if size == 0:
        raise ValidationFailed("empty audio",
                               user_message="No audio was recorded.")
    if size > MAX_AUDIO_BYTES:
        raise ValidationFailed(
            f"audio is {size // (1024 * 1024)} MB",
            user_message=f"That recording is too long. The limit is "
                         f"{MAX_AUDIO_BYTES // (1024 * 1024)} MB.",
        )
    if kind not in SUPPORTED_AUDIO:
        raise ValidationFailed(
            f"unsupported audio type {kind}",
            user_message="That audio format is not supported. Record in the "
                         "browser, or upload a WAV, MP3 or M4A file.",
        )
    return kind


# Whisper implementations disagree here: some return an ISO code ("hi"),
# OpenAI's own API returns the English name ("hindi"). Both are normalised to
# the codes `translation.SUPPORTED` uses.
LANGUAGE_NAMES = {
    "english": "en", "hindi": "hi", "marathi": "mr", "bengali": "bn",
    "tamil": "ta", "telugu": "te", "gujarati": "gu", "kannada": "kn",
    "malayalam": "ml", "punjabi": "pa", "urdu": "ur", "odia": "or",
}


def normalise_language(value: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return ""
    return LANGUAGE_NAMES.get(raw, raw[:5])


class SpeechToText:
    """faster-whisper over the OpenAI-compatible transcription API."""

    def __init__(self, base_url: str) -> None:
        self._base = (base_url or "").rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None
        self._warm = False
        self._warm_lock = asyncio.Lock()

    def configured(self) -> bool:
        return bool(self._base)

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base,
                # Transcription is slower than realtime on CPU for a long
                # clip, and a two-minute description is a normal input.
                timeout=settings.VOICE_TIMEOUT_SECONDS,
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _ensure_warm(self) -> None:
        """Make sure the model is installed and loaded before a recording.

        Two things, both learned the hard way:

        * The first transcription after a container start loads the model,
          which ran past the timeout and surfaced as "that recording could
          not be transcribed" -- pointing the user at their microphone rather
          than at a cold server.

        * `speaches` does **not** download a model on first use the way the
          older `faster-whisper-server` image did. It answers a transcription
          request for an uninstalled model with a 404 and a note saying to
          POST it first. So this installs it if it is missing, which is a
          no-op on any image that does auto-download.
        """
        if self._warm:
            return
        async with self._warm_lock:
            if self._warm:
                return
            model = settings.WHISPER_MODEL
            timeout = settings.VOICE_WARMUP_TIMEOUT_SECONDS
            try:
                response = await self._http().get(f"/v1/models/{model}",
                                                  timeout=timeout)
                if response.status_code == 404:
                    log.info("voice.installing_model", extra={"model": model})
                    install = await self._http().post(f"/v1/models/{model}",
                                                      timeout=timeout)
                    install.raise_for_status()
                    log.info("voice.model_installed", extra={"model": model})
            except Exception as exc:
                # Not fatal: an image that auto-downloads will still work, and
                # a genuine failure surfaces on the transcription itself with
                # the server's own message.
                log.warning("voice.warmup_failed",
                            extra={"model": model, "error": _describe(exc)})
            self._warm = True

    async def transcribe(self, data: bytes, content_type: str,
                         *, language: str = "") -> Tuple[str, str]:
        """(text, detected language code). Raises on failure — the caller
        asked for this explicitly and a silent empty string would look like
        the microphone failed."""
        kind = validate_audio(content_type, len(data))
        suffix = kind.split("/")[-1].replace("x-", "")
        await self._ensure_warm()

        # verbose_json, not json: the plain form returns only the text, and
        # the detected language is the reason this is preferred over
        # `translation.detect_script()` in the first place.
        form = {"model": settings.WHISPER_MODEL,
                "response_format": "verbose_json"}
        if language:
            # Passing the language skips detection and is materially more
            # accurate for short clips in Indian languages.
            form["language"] = language

        try:
            with Timer() as timer:
                response = await self._http().post(
                    "/v1/audio/transcriptions",
                    files={"file": (f"audio.{suffix}", data, kind)},
                    data=form,
                )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            log.warning("voice.transcribe_failed",
                        extra={"error": _describe(exc), "model": settings.WHISPER_MODEL})
            raise ValidationFailed(
                "transcription failed",
                user_message="That recording could not be transcribed. "
                             "Try again, or type the description instead.",
            ) from exc

        text = (payload.get("text") or "").strip()
        detected = normalise_language(payload.get("language") or language)
        log.info("voice.transcribed",
                 extra={"bytes": len(data), "chars": len(text),
                        "language": detected, "ms": timer.ms})
        return text, detected


class TextToSpeech:
    """Piper over the Wyoming protocol.

    Not HTTP. `wyoming-piper`'s web server is a voice *manager* -- it lists,
    uploads and deletes voices -- and synthesis is only available on the
    Wyoming socket. That was worth discovering rather than assuming: an
    earlier version of this posted text to `/` and got a 405.

    Wyoming is line-delimited JSON with optional binary payloads, which is
    little enough to speak directly and much less than pulling a second
    multi-gigabyte image for an OpenAI-compatible wrapper around the same
    engine. One exchange:

        -> {"type": "synthesize", "data": {"text": ..., "voice": {...}}}
        <- {"type": "audio-start", "data": {"rate": 22050, ...}}
        <- {"type": "audio-chunk", "payload_length": N} + N bytes   (xN)
        <- {"type": "audio-stop"}

    The chunks are raw PCM, so they are wrapped in a WAV header here; a
    browser will not play headerless PCM.
    """

    def __init__(self, url: str) -> None:
        self._host, self._port = _parse_tcp(url)

    def configured(self) -> bool:
        return bool(self._host)

    async def aclose(self) -> None:
        return None  # a connection per request; nothing is held open

    async def speak(self, text: str, *, role: str = "") -> Optional[bytes]:
        """WAV audio, or None when unavailable. Never raises: audio is a
        convenience and its absence must not break a page."""
        if not self.configured() or not text.strip():
            return None
        voice = PERSONA_VOICES.get(role, DEFAULT_VOICE)
        try:
            with Timer() as timer:
                audio, rate, width, channels = await self._synthesize(
                    text[:settings.TTS_MAX_CHARS], voice
                )
            if not audio:
                return None
            wav = _to_wav(audio, rate, width, channels)
            log.info("voice.spoke",
                     extra={"role": role or "bench", "voice": voice,
                            "chars": len(text), "bytes": len(wav),
                            "ms": timer.ms})
            return wav
        except Exception as exc:
            log.warning("voice.tts_failed",
                        extra={"role": role, "error": str(exc)[:160]})
            return None

    async def _synthesize(self, text: str, voice: str):
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(self._host, self._port),
            timeout=settings.VOICE_TIMEOUT_SECONDS,
        )
        try:
            await _send(writer, {
                "type": "synthesize",
                "data": {"text": text, "voice": {"name": voice}},
            })
            chunks: List[bytes] = []
            rate, width, channels = 22050, 2, 1
            while True:
                event, payload = await asyncio.wait_for(
                    _read(reader), timeout=settings.VOICE_TIMEOUT_SECONDS
                )
                if event is None:
                    break
                kind = event.get("type")
                if kind == "audio-start":
                    data = event.get("data") or {}
                    rate = int(data.get("rate", rate))
                    width = int(data.get("width", width))
                    channels = int(data.get("channels", channels))
                elif kind == "audio-chunk" and payload:
                    chunks.append(payload)
                elif kind in ("audio-stop", "error"):
                    if kind == "error":
                        log.warning("voice.piper_error",
                                    extra={"detail": str(event.get("data"))[:160]})
                    break
            return b"".join(chunks), rate, width, channels
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass


def _parse_tcp(url: str) -> Tuple[str, int]:
    """'tcp://piper:10200' or 'piper:10200' -> ('piper', 10200)."""
    raw = (url or "").strip()
    if not raw:
        return "", 0
    raw = raw.split("://", 1)[-1].strip("/")
    host, _, port = raw.partition(":")
    return host, int(port or 10200)


# A Wyoming message is three parts, not two, and getting that wrong is
# silent: the header alone parses fine, and the `data` block it did not
# consume is then read as the front of the *next* header.
#
#     {"type": ..., "data_length": D, "payload_length": P}\n
#     <D bytes of JSON>          the event's data
#     <P bytes>                  binary, e.g. a PCM chunk
async def _send(writer: asyncio.StreamWriter, event: Dict,
                payload: bytes = b"") -> None:
    data = json.dumps(event.get("data") or {}).encode("utf-8")
    header = {
        "type": event["type"],
        "data_length": len(data),
        "payload_length": len(payload) or None,
    }
    writer.write(json.dumps(header).encode("utf-8") + b"\n")
    writer.write(data)
    if payload:
        writer.write(payload)
    await writer.drain()


async def _read(reader: asyncio.StreamReader):
    """One Wyoming event and its payload. (None, b'') at end of stream."""
    line = await reader.readline()
    if not line:
        return None, b""
    try:
        header = json.loads(line)
    except ValueError:
        return None, b""

    data_length = int(header.get("data_length") or 0)
    if data_length:
        raw = await reader.readexactly(data_length)
        try:
            header["data"] = json.loads(raw)
        except ValueError:
            header["data"] = {}

    payload_length = int(header.get("payload_length") or 0)
    payload = await reader.readexactly(payload_length) if payload_length else b""
    return header, payload


def _to_wav(pcm: bytes, rate: int, width: int, channels: int) -> bytes:
    """Wrap raw PCM in a WAV header; browsers will not play it otherwise."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(channels)
        handle.setsampwidth(width)
        handle.setframerate(rate)
        handle.writeframes(pcm)
    return buffer.getvalue()


_stt: Optional[SpeechToText] = None
_tts: Optional[TextToSpeech] = None


def get_stt() -> SpeechToText:
    global _stt
    if _stt is None:
        _stt = SpeechToText(settings.WHISPER_URL)
    return _stt


def get_tts() -> TextToSpeech:
    global _tts
    if _tts is None:
        _tts = TextToSpeech(settings.PIPER_URL)
    return _tts


def set_providers(stt: Optional[SpeechToText] = None,
                  tts: Optional[TextToSpeech] = None) -> None:
    """Test seam."""
    global _stt, _tts
    _stt, _tts = stt, tts


async def close_providers() -> None:
    if _stt is not None:
        await _stt.aclose()
    if _tts is not None:
        await _tts.aclose()


def available() -> Dict[str, bool]:
    """What the UI should offer. Neither half implies the other."""
    return {"dictation": get_stt().configured(),
            "playback": get_tts().configured()}
