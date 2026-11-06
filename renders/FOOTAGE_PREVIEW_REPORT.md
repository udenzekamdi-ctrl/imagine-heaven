# Imagine Heaven — footage preview report

**File:** `renders/imagine_heaven_preview_footage.mp4` (57.4 MB) · `Preview` composition (title card + intro + Prayer 1)
**Background:** Pexels footage from your curated list, plus an original atmosphere layer. Narration, title card and Scripture overlays are unchanged.

## Footage
- **All 24 clips downloaded** via Pexels' public download link (the site's own Download button; no API key, no scraping). 17 are 4K; the rest are 2560×1440 or 1080p.
- Logged in `scripts/footage_manifest.csv`: source page, Pexels id, file, resolution, date, licence, and people/trademark notes.
- **Creator names are not filled in.** Pexels pages block automated reads, so these need copying from each page if you want to credit them. The Pexels licence does not require credit.
- **Proxies:** 2304×1296, 16:9, centre-cropped, native fps (60 fps clips give real slow motion). Built by `scripts/footage/fetch_footage.sh`. They are gitignored at 2.5 GB.
- **Aspect ratios:** B03, B04 (4096×2160) and E04 (4096×1974) were centre-cropped to 16:9.
- **B03** was strongly blue at source and is colour-corrected (desaturated, then warmed) in its proxy.

### Clip notes
- **B01 / B02 (marble hall):** a red-walled municipal hall with signage and identifiable people walking through. Used only briefly and softly in prayers 3 and 22. **I recommend replacing these.**
- **C04 (aerial forest and river):** shows a man-made structure. Used lightly.

## How footage follows the prayers
`scripts/footage_plan.json` assigns clips by meaning, not by link order:

| Prayers | Footage |
|---|---|
| Intro | Sunrise above clouds |
| 1 (confession) | Quiet church windows → sunrise breaking over clouds |
| 3 (the courts) | Grand hall → mountain cloudscape ("Mount Sion") |
| 6–7 ("take your journey", "crooked places straight") | Misty mountains |
| 8–13 (clean heart, healing, provision, forgiveness) | Waterfalls, forest sunbeams, flowers |
| 18 ("wings as eagles") | Flight above the clouds |
| 28 ("tree by the rivers") | Forest stream |
| 29 ("new every morning") | Dawn cloudscape |
| 30 (closing) | Back above the clouds, to bookend the opening |

## Treatment (Remotion)
- **Dissolves:** 7 s between shots.
- **Slow motion:** about 0.5–0.82×, never slower than each clip's smooth minimum.
- **Camera moves:** slow push-in, pull-back, rise or glide on every shot.
- **Per-clip grade:** a warm cinematic wash and golden glow from above.
- **Atmosphere:** slow god-rays, two layers of drifting mist, 64 floating light motes, and a vignette.
- **Text:** same ivory and gold Scripture typography with a soft scrim.

## Verification
| Check | Result |
|---|---|
| Format | 1920×1080, 30 fps, H.264, 3,829 frames, 127.63 s, stereo AAC 48 kHz |
| Audio | Narration present; mean −21.0 dB, peak −5.7 dB (no clipping). Remotion's own mono→stereo mix plays about 3 dB quieter than the earlier ffmpeg mix |
| Smoothness | Median change between frames 0.23/255, max 2.93. The largest change is a real sunbeam sweeping past a window in B04, not a glitch |
| Render | 2,134 s for 3,829 frames, **0.56 s/frame** on a 4-core CPU with no GPU (the shader version was 3.19 s/frame) |

## Still to do
- **Narration for prayers 2–30** doesn't exist yet; only the intro and Prayer 1 are narrated.
- **Background music:** none is included (`"music": null`), because no music file is available. The music ducking is already built in; add a file to `assets/music/` and set it in the project JSON.
- **Full-length render time:** a ~30-minute video at 0.56 s/frame is about 8–9 h on this machine. It would be rendered in chunks, as with the shader preview.
