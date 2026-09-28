# Opening audio

Opening is **silent** for now (no underscore on the cover linger).

- The previous ffmpeg-generated `opening-underscore.mp3` pad was removed — it read as too ominous / too electronic.
- `public/video/trailer-v5.mp4` audio was checked as a recovery source: it is a continuous trailer bed with voiceover mixed throughout (no clean music-only / loopable segment). Prefer silence over a VO bleed or another bad pad until the trailer is rebuilt with a separable music stem.
- `trailerEnabled` stays `false` (no Play / no trailer on open). Begin only.
