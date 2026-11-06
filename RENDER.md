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

## Footage mode (default)

The background is Pexels footage (see `scripts/footage_plan.json` and `scripts/footage_manifest.csv`) with an original
atmosphere layer (warm grade, golden glow, god-rays, mist, light motes) in `animations/src/footage/`.
Set `"visuals": "shader"` in `scripts/projects/*.json` to use the raymarched marble colonnade instead.

```bash
bash scripts/footage/fetch_footage.sh   # downloads clips + builds proxies in assets/footage/ (both gitignored)
cd animations
npx remotion render src/index.ts Preview ../renders/imagine_heaven_preview_footage.mp4 --codec=h264 --crf=18 --audio-bitrate=320k
```

- Which clip plays under which prayer is set per segment in `footage_plan.json` (`from` = source start in seconds,
  `weight` = share of the prayer). Shots dissolve over 7 s and play in slow motion (never below each clip's `rateMin`).
- Footage mode needs no WebGL, so `--gl` is not needed and it renders far faster than the shader.
