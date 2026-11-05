# Imagine Heaven — rendering

Remotion project in `animations/`; media in `assets/` (it's the Remotion public dir).

```bash
cd animations
npm ci
npx remotion still src/index.ts Preview ../renders/stills/f0300.png --frame=300
npx remotion render src/index.ts Preview ../renders/imagine_heaven_preview.mp4 --codec=h264 --crf=16 --audio-bitrate=320k
```

- Without a GPU, add `--gl=swangle` (software WebGL). On Windows with a GPU, `--gl=angle`.
- Compositions: `Preview` (intro + first prayer) and `FullRestoration` (all 30 prayers, needs every `assets/narration/pXX.mp3`).
- Output: 1920×1080, 30 fps, H.264 MP4, stereo AAC 320 kbps.
- Music: put the file in `assets/music/` and set `"music"` in `scripts/projects/*.json`. Leave it `null` until then.
- Narrator: see `scripts/voice_config.json` (Nathaniel C – Calm Medical Support Agent).
