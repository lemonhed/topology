from __future__ import annotations

import asyncio
import sys

from dotenv import load_dotenv
from transcribe.realtime import main as realtime_main


async def main() -> None:
    load_dotenv()
    await realtime_main()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)
