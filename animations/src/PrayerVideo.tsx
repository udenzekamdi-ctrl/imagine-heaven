import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { ShaderEnvironment } from './env/ShaderEnvironment';
import { FootageEnvironment } from './footage/FootageEnvironment';
import { Atmosphere } from './footage/Atmosphere';
import { ScriptureOverlay, TitleCard } from './components/Typography';
import type { Timeline } from './timeline';

const MUSIC_SPEECH = 0.11;   // music level under narration (≈ -19 dB)
const MUSIC_PAUSE = 0.30;    // gentle swell between prayers
const MUSIC_EDGES = 0.36;    // opening / closing
const NARRATION = 1.0;

// Smooth ducking envelope computed from the narration timeline (no abrupt changes).
function musicLevel(t: number, tl: Timeline): number {
  const ramp = 1.6;
  let speech = 0;
  for (const s of tl.segments) {
    const a = interpolate(t, [s.start - ramp, s.start - 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
    const b = interpolate(t, [s.start + s.duration + 0.3, s.start + s.duration + 0.3 + ramp], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
    speech = Math.max(speech, Math.min(a, b));
  }
  const first = tl.segments[0]?.start ?? 0;
  const last = tl.segments[tl.segments.length - 1];
  const edge = t < first || (last && t > last.start + last.duration) ? MUSIC_EDGES : MUSIC_PAUSE;
  const lvl = speech * MUSIC_SPEECH + (1 - speech) * edge;
  const fadeIn = interpolate(t, [0, 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(t, [tl.total - 6, tl.total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return lvl * fadeIn * fadeOut;
}

// Seamless looping: overlapping copies of the track with equal-power crossfades.
const LoopingMusic: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!tl.music || !tl.musicDuration) return null;
  const xf = 6;
  const period = tl.musicDuration - xf;
  const copies = Math.ceil(tl.total / period) + 1;
  return (
    <>
      {Array.from({ length: copies }).map((_, i) => {
        const from = Math.round(i * period * fps);
        if (from >= durationInFrames) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.round(tl.musicDuration * fps)} layout="none">
            <Audio
              src={staticFile(`music/${tl.music}`)}
              volume={(f) => {
                const local = f / fps;
                const inG = i === 0 ? 1 : Math.sin((Math.PI / 2) * Math.min(local / xf, 1));
                const outG = Math.cos((Math.PI / 2) * Math.min(Math.max((local - period) / xf, 0), 1));
                return musicLevel(i * period + local, tl) * inG * outG;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};

export const PrayerVideo: React.FC<{ timeline: Timeline }> = ({ timeline: tl }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fromBlack = interpolate(frame, [0, 3 * fps], [1, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const toBlack = interpolate(frame, [durationInFrames - 5 * fps, durationInFrames], [0, 1], { extrapolateLeft: 'clamp', easing: Easing.in(Easing.quad) });
  const env = tl.segments[0]?.environment ?? 'courts_entrance';
  const titleLen = Math.round((tl.segments[0]?.start ?? 6) * fps + 1.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {tl.project.visuals === 'shader' ? (
        <ShaderEnvironment env={env} />
      ) : (
        <>
          <FootageEnvironment timeline={tl} />
          <Atmosphere />
        </>
      )}

      {tl.project.showTitleCard ? (
        <Sequence durationInFrames={titleLen}>
          <TitleCard durationInFrames={titleLen} subtitle="Courts of Heaven Prayers for Complete Restoration" />
        </Sequence>
      ) : null}

      {tl.overlays.map((o, i) => (
        <Sequence key={i} from={Math.round(o.start * fps)} durationInFrames={Math.round(o.duration * fps)}>
          <ScriptureOverlay reference={o.ref} quote={o.quote} durationInFrames={Math.round(o.duration * fps)} />
        </Sequence>
      ))}

      {tl.segments.map((s) => (
        <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.ceil((s.duration + 0.5) * fps)} layout="none">
          <Audio src={s.src} volume={NARRATION} />
        </Sequence>
      ))}
      <LoopingMusic tl={tl} />

      <AbsoluteFill style={{ backgroundColor: '#000', opacity: Math.max(fromBlack, toBlack), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
