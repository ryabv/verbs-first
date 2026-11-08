"""
Пакетный синтез через edge-tts одним процессом.
stdin: JSON [{"text": ..., "out": ...}, ...]; stdout: по строке JSON на каждую фразу.
Бережный режим: последовательно, пауза между запросами, повторы с нарастающей паузой.
"""
import asyncio
import json
import os
import sys

import edge_tts

VOICE = os.environ.get("TTS_VOICE", "el-GR-NestorasNeural")
RATE = os.environ.get("TTS_RATE", "-10%")
PAUSE = float(os.environ.get("TTS_PAUSE", "0.8"))
RETRIES = 4
MAX_CONSECUTIVE_FAILURES = 5  # похоже на блокировку — лучше остановиться и перезапустить позже


async def synth(text: str, out: str) -> None:
    tmp = out + ".part"
    await asyncio.wait_for(edge_tts.Communicate(text, VOICE, rate=RATE).save(tmp), timeout=30)
    if os.path.getsize(tmp) == 0:
        os.remove(tmp)
        raise RuntimeError("empty audio")
    os.replace(tmp, out)


async def main() -> None:
    items = json.load(sys.stdin)
    consecutive_failures = 0
    for item in items:
        error = None
        for attempt in range(RETRIES):
            try:
                await synth(item["text"], item["out"])
                error = None
                break
            except Exception as exc:  # noqa: BLE001
                error = f"{type(exc).__name__}: {exc}"
                await asyncio.sleep(5 * 2**attempt)  # 5, 10, 20, 40 c
        print(json.dumps({"text": item["text"], "ok": error is None, "error": error}, ensure_ascii=False), flush=True)
        consecutive_failures = consecutive_failures + 1 if error else 0
        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
            print(f"{MAX_CONSECUTIVE_FAILURES} фраз подряд без звука — сервис, вероятно, ограничил запросы. Остановка.", file=sys.stderr)
            break
        await asyncio.sleep(PAUSE)


asyncio.run(main())
