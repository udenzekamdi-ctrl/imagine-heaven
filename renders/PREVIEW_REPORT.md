# Imagine Heaven — Preview render report

**File:** `renders/imagine_heaven_preview.mp4` (82.3 MB)
**Composition:** `Preview` (title card + intro + Prayer 1), environment `courts_entrance`
**Rendered:** 2026-11-06, cloud container (4 vCPU, 15 GB RAM, **no GPU**)

## Render settings

| Setting | Value |
|---|---|
| Resolution / fps | 1920×1080, 30 fps, 3,829 frames (127.633 s) |
| WebGL | `--gl=swangle` (SwiftShader software rendering, because there is no GPU) |
| Video | H.264 High, yuv420p. Rendered at `--crf=18`, then re-encoded at **CRF 20** (`-preset slow`) to fit under 95 MB (the CRF 18 file was 122.8 MB) |
| Audio | AAC LC, 48 kHz stereo, `-b:a 320k` |
| Music | none (`"music": null`, unchanged) |

**How it was rendered.** One frame costs about 3 s in software WebGL, so a single `remotion render` run (~3.4 h) would outlast the container's 2 h limit on background jobs. The video was therefore rendered in six 640-frame chunks with the same settings as the brief's command, plus `--frames=a-b --muted`. The chunks were then joined losslessly (`ffmpeg -f concat -c copy`).

The audio track was built with ffmpeg from the same timeline Remotion uses: intro at frame 180 (6.000 s), Prayer 1 at frame 1745 (58.167 s), volume 1.0, trimmed to 3,829 frames. Remotion's audio-only render path still evaluates every frame in the browser, which would have doubled the CPU time. The scripts are `renders/chunks/render_chunks.sh` and `finish.sh` (not committed).

## Timing

| Chunk | Frames | Time |
|---|---|---|
| 1 | 0–639 | 2,347 s (contended with an aborted audio render) |
| 2 | 640–1279 | 1,990 s |
| 3 | 1280–1919 | 2,005 s |
| 4 | 1920–2559 | 1,971 s |
| 5 | 2560–3199 | 1,966 s |
| 6 | 3200–3828 | 1,954 s |
| **Total** | **3,829** | **12,233 s ≈ 3 h 24 min** |

- **Average: 3.19 s/frame** (about 3.1 s/frame steady state). The shader before my changes measured **~6.9 s/frame**, which would have been ~7.3 h.
- Raising Remotion's `--concurrency` doesn't help. SwiftShader already uses every core: 24 frames took 172 s at concurrency 1 and 190 s at concurrency 4.
- **Implication for the full 30-prayer video:** at ~3 s/frame, a 60-minute video would take ~90 hours on a CPU. The full production needs a GPU renderer (`--gl=angle` on a GPU machine, or a GPU cloud instance) or a cheaper scene.

## Verification

| Check | Result |
|---|---|
| Container / streams (ffprobe) | MP4 · video H.264 High 1920×1080, 30/1 fps, yuv420p, 3,829 frames · audio AAC LC 48 kHz **stereo** |
| Duration | video 127.633 s, audio 127.633 s, container 127.633 s, matching the timeline (6 + 47.673 + 4.5 + 61.440 + 8 = 127.613 s → ceil to 3,829 frames) |
| Narration present | `silencedetect` (−50 dB, 2 s) finds silence only where expected: 0–6.1 s lead-in, 53.4–58.2 s gap between intro and Prayer 1, 119.3 s→end outro |
| Clipping (`volumedetect`) | mean −18.0 dB, **max −2.6 dB**, so no clipping |
| Audio bitrate | encoder set to 320k. The AAC encoder averages ~211 kbps on this content (mono voice duplicated to both channels), so it doesn't need the full budget |
| File size | 82,340,680 bytes (under 95 MB) |
| Motion smoothness | Mean absolute luma difference between consecutive frames: **median 1.64 / 255, max 2.44** outside the fades. No spikes at the five chunk joins (all 1.3–2.1). The largest differences (≤ 3.1) are in the opening fade from black |
| 6 evenly spaced frames | frames 319, 957, 1595, 2233, 2871, 3509 in `renders/stills/check/`, with a contact sheet at `renders/stills/contact_6frames.jpg`. They show continuous forward motion with a slow drift and no pops or exposure jumps |

Test stills from the final code: `renders/stills/f0060` (title card), `f0300`, `f0900`, `f1380` (Joel 2:25), `f1800`, `f2280` (1 John 1:9), `f3000`.

## What I changed

### Shader (`animations/src/env/courtsEntrance.glsl.ts`)
There were no compile errors or black frames to fix. All changes are for speed and appearance:

1. **Light shafts: analytic occlusion instead of raymarched shadows.** Each of the 14 volumetric samples used to march the full SDF up to 10 times, which was ~50% of the frame cost. The colonnade is regular, so the sun ray is now intersected with the four column-row planes (x = ±3.6, ±12.5) and tested against the nearest column and arch opening, with soft edges. The shafts look the same and cost ~0.2 s instead of ~3.4 s per frame.
2. **Polished-marble floor instead of a wet floor.**
   - Removed the high-frequency normal jitter that made reflections wobble like water.
   - The march now counts a ray that runs out of steps close to a surface as a hit. Before, sky colour leaked through column silhouettes as bright streaks. The fallback is limited to the first 40 m, because a looser version produced gold streaks in the sky down the corridor.
   - Reflections use a lighter shading path: no soft shadow, no AO, no specular. Specular glints on the column flutes, with no shadow term, had shown as bright vertical lines. Reflected detail fades faster with distance, and reflectance is slightly lower.
3. **Gold accents:** keystone and frieze gold now only appear on the inner arcade. Before, the colossal outer columns had stray gold rings at 10 m and 12 m.
4. **Marble:** cheaper veining (5+3 octaves instead of 6+6). Veins are 45% softer on vertical faces, where they had read as wood grain on the plinths.
5. **Grade:** exposure 0.82 → 0.86 plus a gentle 22% S-curve after ACES, so the image reads less milky. The camera path is unchanged; it was already slow and smooth.

### Typography (`animations/src/components/Typography.tsx`)
- The Scripture references ("Joel 2:25", "1 John 1:9") in muted gold were close to invisible on the white floor. The gold is now brighter (#E4C98E), the text larger (27 px), and a warm-dark radial scrim fades in and out with each overlay and the title card. A stronger warm halo sits behind the text. The text stays restrained, with no boxes or bars.
- The title subtitle uses weight 500 and 38 px, at full opacity.

### Fonts
- `@remotion/google-fonts` failed: Chrome rejected the TLS certificate from the network proxy, so the render aborted. Cormorant Garamond (normal and italic, variable) and Cinzel are now self-hosted in `assets/fonts/` (SIL OFL) and loaded with `FontFace` and `delayRender`. Renders now also work offline.

## Remaining visual weaknesses

- **Wide-angle lean:** columns near the left and right edges lean noticeably, especially when the camera yaws. A slightly longer focal length (1.55 → ~1.8) would calm this down, at the cost of seeing less of the colonnade.
- **Reflections are a single sharp sample.** Polished marble would show a softer, blurred reflection. Some thin vertical streaks remain in the reflections of the nearest fluted columns.
- **Sun is mostly hidden.** The sun sits behind the left arcade for most of the shot and reads as a glow, not a visible low disc. The "sea of clouds" below the platform is so fogged at this camera height that it barely shows. Lowering the sun or moving it towards the corridor axis, and showing the platform edge, would sell "heaven" more.
- **Palette** is pale ivory with cool blue-grey shadow sides. It is reverent but a little cool and flat. A warmer key light and a deeper sky would add richness.
- **Plinth faces** still show faint wavy veining that can read as ripples.
- **Typography overlap:** the 1 John 1:9 quote overlaps the nearest plinth for part of its run. The scrim keeps it legible.
- **Render cost:** ~3 s/frame on a CPU is fine for a 2-minute preview but not for the 30-prayer video without a GPU.

## Not changed (per brief)
Narration audio, `scripts/narration_script.json`, the voice, the prayer text, and `"music": null`.
