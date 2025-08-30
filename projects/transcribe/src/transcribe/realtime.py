from __future__ import annotations

import asyncio
import sys

import numpy as np
import sounddevice as sd
from agents.realtime import (
    RealtimeAgent,
    RealtimeRunner,
    RealtimeSession,
    RealtimeSessionEvent,
)

from .agent import SYSTEM_PROMPT, connect, delete_item, draw_item, set_service
from .service import WhiteboardService

# Audio configuration for realtime streaming
CHUNK_LENGTH_S = 0.05  # 50ms
SAMPLE_RATE = 24000
FORMAT = np.int16
CHANNELS = 1


def _truncate_str(s: str, max_length: int) -> str:
    if len(s) > max_length:
        return s[:max_length] + "..."
    return s


def create_realtime_agent() -> RealtimeAgent:
    """Create a RealtimeAgent with our whiteboard tools and instructions."""
    return RealtimeAgent(
        name="WhiteboardRealtimeAgent",
        instructions=SYSTEM_PROMPT,
        tools=[draw_item, connect, delete_item],
    )


class WhiteboardRealtimeApp:
    """Realtime whiteboard controller using the Agents SDK Realtime API."""

    def __init__(self) -> None:
        self.service = WhiteboardService()
        set_service(self.service)

        self.session: RealtimeSession | None = None
        self.audio_stream: sd.InputStream | None = None
        self.recording = False

    async def run(self) -> None:
        print("[Realtime] Connecting (this may take a few seconds)...")
        agent = create_realtime_agent()
        runner = RealtimeRunner(agent)

        async with await runner.run() as session:
            self.session = session
            print("[Realtime] Connected. Starting audio recording...")
            await self.start_audio_recording()
            print("[Realtime] Audio recording started. Speak your commands.")

            async for event in session:
                await self._on_event(event)

        print("[Realtime] Session ended")

    async def start_audio_recording(self) -> None:
        """Start recording audio from the microphone."""
        self.audio_stream = sd.InputStream(
            channels=CHANNELS,
            samplerate=SAMPLE_RATE,
            dtype=FORMAT,
        )
        self.audio_stream.start()
        self.recording = True
        asyncio.create_task(self.capture_audio())

    async def capture_audio(self) -> None:
        """Capture audio from the microphone and send to the realtime session."""
        if not self.audio_stream:
            return
        if not self.session:
            return

        read_size = int(SAMPLE_RATE * CHUNK_LENGTH_S)

        try:
            while self.recording:
                if self.audio_stream.read_available < read_size:
                    await asyncio.sleep(0.01)
                    continue

                data, _ = self.audio_stream.read(read_size)
                await self.session.send_audio(data.tobytes())
                await asyncio.sleep(0)
        except Exception as e:
            print(f"[Realtime] Audio capture error: {e}")
        finally:
            if self.audio_stream and self.audio_stream.active:
                self.audio_stream.stop()
            if self.audio_stream:
                self.audio_stream.close()

    async def _on_event(self, event: RealtimeSessionEvent) -> None:
        """Handle session events for debugging and visibility."""
        try:
            if event.type == "agent_start":
                print(f"[Realtime] Agent started: {event.agent.name}")
            elif event.type == "agent_end":
                print(f"[Realtime] Agent ended: {event.agent.name}")
            elif event.type == "handoff":
                print(f"[Realtime] Handoff from {event.from_agent.name} to {event.to_agent.name}")
            elif event.type == "tool_start":
                print(f"[Realtime] Tool started: {event.tool.name}")
            elif event.type == "tool_end":
                print(f"[Realtime] Tool ended: {event.tool.name}; output: {event.output}")
            elif event.type == "transcript" or event.type == "transcription":
                # Some SDKs emit explicit transcription events
                print(f"[Realtime] Transcript: {_truncate_str(str(event.text), 80)}")
            elif event.type == "audio":
                # We skip playback for now; you can attach an audio output if desired
                pass
            elif event.type == "audio_end":
                pass
            elif event.type == "audio_interrupted":
                print("[Realtime] Audio interrupted")
            elif event.type == "error":
                print(f"[Realtime] Error: {event.error}")
            elif event.type in {"history_updated", "history_added"}:
                # Too verbose for console
                pass
            elif event.type == "raw_model_event":
                print(f"[Realtime] Raw model event: {_truncate_str(str(event.data), 60)}")
            else:
                print(f"[Realtime] Unknown event type: {event.type}")
        except Exception as e:
            print(f"[Realtime] Error processing event: {_truncate_str(str(e), 50)}")


async def main() -> None:
    app = WhiteboardRealtimeApp()
    try:
        await app.run()
    except KeyboardInterrupt:
        print("\n[Realtime] Exiting...")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
