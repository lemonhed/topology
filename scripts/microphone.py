"""Real-time microphone input for the voice pipeline."""

from __future__ import annotations

import asyncio
import contextlib
import signal
import sys
from typing import Any, AsyncGenerator

import numpy as np
import sounddevice as sd
from agents.voice import StreamedAudioInput
from dotenv import load_dotenv
from transcribe.voice import WhiteboardVoicePipeline


class MicrophoneStreamer:
    """Streams audio from microphone for real-time processing."""

    def __init__(self, sample_rate: int = 24000, channels: int = 1, device: str | None = None) -> None:
        self.sample_rate = sample_rate
        self.channels = channels
        self.device = device
        self._stream: sd.InputStream | None = None
        self._audio_queue: asyncio.Queue[np.ndarray] = asyncio.Queue()
        self._running = False

    def _audio_callback(self, indata: np.ndarray, frames: int, time: Any, status: Any) -> None:
        """Callback for audio input."""
        if status:
            print(f"[Microphone] Audio status: {status}")

        # Convert float32 to int16 for the pipeline
        audio_chunk = (indata[:, 0] * 32767).astype(np.int16)

        # Non-blocking queue put
        try:
            self._audio_queue.put_nowait(audio_chunk)
        except asyncio.QueueFull:
            print("[Microphone] Audio queue full, dropping chunk")

    async def start_streaming(self) -> AsyncGenerator[np.ndarray, None]:
        """Start streaming audio from microphone."""
        self._running = True

        # Start the audio input stream
        self._stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype=np.float32,
            callback=self._audio_callback,
            device=self.device,
        )

        with self._stream:
            self._stream.start()
            print(f"[Microphone] Started streaming from device: {self.device or 'default'}")

            try:
                while self._running:
                    # Get audio chunk with timeout
                    try:
                        chunk = await asyncio.wait_for(self._audio_queue.get(), timeout=0.1)
                        yield chunk
                    except asyncio.TimeoutError:
                        continue
            finally:
                self._stream.stop()
                print("[Microphone] Stopped streaming")

    def stop(self) -> None:
        """Stop the microphone streaming."""
        self._running = False


async def run_microphone_pipeline(device: str | None = None) -> None:
    """Run the voice pipeline with real microphone input."""
    pipeline = WhiteboardVoicePipeline()
    microphone = MicrophoneStreamer(device=device)

    print("[Microphone] Starting real-time voice whiteboard...")
    print("[Microphone] Speak commands like: 'Draw me a database, then draw me a person'")
    print("[Microphone] Press 'a' + Enter, send SIGUSR1, or Ctrl+C to stop")

    # Predefine variables to avoid possibly-unbound lints
    prev_sigusr1: Any | None = None
    prev_sigterm: Any | None = None
    stdin_task: asyncio.Task[Any] | None = None

    try:
        # Install signal-based stop handler
        def _signal_stop_handler(_sig: int, _frame: Any) -> None:
            microphone.stop()

        with contextlib.suppress(Exception):
            prev_sigusr1 = signal.getsignal(signal.SIGUSR1)
            signal.signal(signal.SIGUSR1, _signal_stop_handler)
        with contextlib.suppress(Exception):
            prev_sigterm = signal.getsignal(signal.SIGTERM)
            signal.signal(signal.SIGTERM, _signal_stop_handler)

        # Simple stdin watcher: press 'a' + Enter to stop
        async def _stdin_stop_watcher() -> None:
            while True:
                line: str = ""
                with contextlib.suppress(Exception):
                    line = await asyncio.to_thread(sys.stdin.readline)
                if not line:
                    return
                if line.strip().lower() == "a":
                    microphone.stop()
                    return

        stdin_task = asyncio.create_task(_stdin_stop_watcher())

        # Create streamed audio input
        streamed_input = StreamedAudioInput()

        # Start processing task and keep reference to it
        process_task = asyncio.create_task(pipeline.process_audio(streamed_input))

        # Stream from microphone
        chunk_count = 0
        try:
            async for chunk in microphone.start_streaming():
                chunk_count += 1
                if chunk_count % 50 == 0:  # Print every 50 chunks (~1 second)
                    print(f"[Microphone] Processed {chunk_count} audio chunks, chunk size: {len(chunk)}")
                await streamed_input.add_audio(chunk)
        except Exception as stream_error:
            print(f"[Microphone] Streaming error: {stream_error}")

        # Wait for processing to complete if it's still running
        if not process_task.done():
            print("[Microphone] Waiting for audio processing to complete...")
            try:
                await asyncio.wait_for(process_task, timeout=5.0)
            except asyncio.TimeoutError:
                print("[Microphone] Audio processing timeout")
                process_task.cancel()

    except KeyboardInterrupt:
        print("\n[Microphone] Stopping...")
    except Exception as e:
        print(f"[Microphone] Error: {e}")
    finally:
        microphone.stop()
        # Restore previous signal handlers
        if prev_sigusr1 is not None:
            with contextlib.suppress(Exception):
                signal.signal(signal.SIGUSR1, prev_sigusr1)
        if prev_sigterm is not None:
            with contextlib.suppress(Exception):
                signal.signal(signal.SIGTERM, prev_sigterm)
        # Cancel stdin watcher
        if stdin_task is not None:
            with contextlib.suppress(Exception):
                stdin_task.cancel()

        # Print final whiteboard state
        print(f"\n[Final] Whiteboard items: {pipeline.service.list_items()}")
        print(f"[Final] Whiteboard connections: {pipeline.service.list_edges()}")


async def main() -> None:
    """Main entry point for microphone-based voice control."""
    load_dotenv()
    await run_microphone_pipeline()


if __name__ == "__main__":
    asyncio.run(main())
