#!/usr/bin/env python3
"""Build the full soundtrack (narration + looping, ducked music) outside the browser.

Mirrors animations/src/timeline.ts (segment placement) and animations/src/PrayerVideo.tsx
(musicLevel envelope + LoopingMusic crossfades) exactly, so long videos can be rendered as
muted video chunks and muxed with this mix instead of paying the browser per frame for audio.

usage: python3 scripts/audio/build_mix.py scripts/projects/restoration_full.json out.wav
"""
import json, math, subprocess, sys
import numpy as np

SR, FPS = 48000, 30
MUSIC_SPEECH, MUSIC_PAUSE, MUSIC_EDGES, NARRATION = 0.15, 0.30, 0.36, 1.0  # keep in sync with PrayerVideo.tsx
ROOT = __file__.rsplit('/scripts/', 1)[0]


def decode(path, channels):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(channels), '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


def duration(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True, check=True).stdout)


def ease(x):  # Easing.inOut(Easing.sin)
    return (1 - np.cos(np.pi * x)) / 2


def ramp(t, a, b, va, vb, eased=True):
    x = np.clip((t - a) / (b - a), 0, 1)
    x = ease(x) if eased else x
    return va + (vb - va) * x


def main(project_path, out_path):
    project = json.load(open(project_path))
    script = {s['id']: s for s in json.load(open(f'{ROOT}/scripts/narration_script.json'))['segments']}
    ids = list(script) if project['segments'] == 'all' else project['segments']

    # timeline (timeline.ts)
    t, segs = project['leadInSeconds'], []
    for i in ids:
        p = f'{ROOT}/assets/narration/{i}.mp3'
        d = duration(p)
        segs.append((i, t, d, p))
        t += d + project['gapSeconds']
    total = t - project['gapSeconds'] + project['outroSeconds']
    frames = math.ceil(total * FPS)
    n = round(frames / FPS * SR)
    mix = np.zeros((n, 2), np.float32)
    print(f'{len(segs)} segments, {frames} frames, {frames / FPS / 60:.2f} min')

    # narration: Sequence from=round(start*fps); mono -> stereo at -3 dB per channel (as Remotion mixes)
    for i, start, d, p in segs:
        v = decode(p, 1)[:, 0] * NARRATION * np.float32(math.sqrt(0.5))
        s0 = round(round(start * FPS) / FPS * SR)
        e = min(n, s0 + len(v))
        mix[s0:e] += v[:e - s0, None]

    # music envelope (musicLevel)
    if project.get('music'):
        music = decode(f"{ROOT}/assets/music/{project['music']}", 2)
        mdur = len(music) / SR
        tt = np.arange(n) / SR

        def level(x):
            speech = np.zeros_like(x)
            for _, start, d, _ in segs:
                a = ramp(x, start - 1.6, start - 0.15, 0, 1)
                b = ramp(x, start + d + 0.3, start + d + 0.3 + 1.6, 1, 0)
                speech = np.maximum(speech, np.minimum(a, b))
            first, (_, ls, ld, _) = segs[0][1], segs[-1]
            edge = np.where((x < first) | (x > ls + ld), MUSIC_EDGES, MUSIC_PAUSE)
            lvl = speech * MUSIC_SPEECH + (1 - speech) * edge
            fade_in = ramp(x, 0, 4, 0, 1, eased=False)
            fade_out = ramp(x, total - 6, total, 1, 0, eased=False)
            return lvl * fade_in * fade_out

        # LoopingMusic: overlapping copies with equal-power crossfades
        xf = 6.0
        period = mdur - xf
        copies = math.ceil(total / period) + 1
        for c in range(copies):
            frm = round(c * period * FPS)
            if frm >= frames:
                break
            s0 = round(frm / FPS * SR)
            length = min(len(music), n - s0)
            local = np.arange(length) / SR
            in_g = np.ones(length) if c == 0 else np.sin(np.pi / 2 * np.minimum(local / xf, 1))
            out_g = np.cos(np.pi / 2 * np.clip((local - period) / xf, 0, 1))
            g = (level(c * period + local) * in_g * out_g).astype(np.float32)
            mix[s0:s0 + length] += music[:length] * g[:, None]

    peak = float(np.abs(mix).max())
    print(f'peak {20 * math.log10(peak + 1e-9):.2f} dBFS')
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', out_path],
                   input=pcm, check=True)
    print('wrote', out_path)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
