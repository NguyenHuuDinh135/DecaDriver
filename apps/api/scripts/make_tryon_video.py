#!/usr/bin/env python3
"""Create a short local MP4 from a final try-on image.

This is a deterministic fallback for demos when no external image-to-video API is
wired: it outputs a clean product video with slow zoom and subtle vertical pan.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", help="Input final try-on PNG/JPG")
    parser.add_argument("--output", default=None, help="Output MP4 path")
    parser.add_argument("--duration", type=float, default=5.0)
    parser.add_argument("--fps", type=int, default=24)
    args = parser.parse_args()

    image = Path(args.image).expanduser().resolve()
    if not image.exists():
        raise FileNotFoundError(image)
    output = Path(args.output).expanduser().resolve() if args.output else image.with_suffix(".mp4")
    output.parent.mkdir(parents=True, exist_ok=True)

    frames = max(1, int(args.duration * args.fps))
    # Keep the product centered, add tiny zoom for a presentable demo video.
    vf = (
        f"scale=1080:1440:force_original_aspect_ratio=decrease,"
        f"pad=1080:1440:(ow-iw)/2:(oh-ih)/2:white,"
        f"zoompan=z='1+0.035*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={frames}:s=1080x1440:fps={args.fps},"
        f"format=yuv420p"
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(image),
        "-vf",
        vf,
        "-t",
        str(args.duration),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-movflags",
        "+faststart",
        str(output),
    ]
    subprocess.run(cmd, check=True)
    sys.stdout.write(str(output) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
