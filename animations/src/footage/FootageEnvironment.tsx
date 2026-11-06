import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Timeline } from '../timeline';
import { buildShots, type Grade, type Shot } from './plan';

// Slow, continuous camera moves. Proxies are 2304×1296 (1.2× the frame), so zooming up to ~1.12 stays sharp.
const MOVES = [
  { s: [1.02, 1.1], x: [0.8, -0.8], y: [0, -0.4] },   // gentle push-in with a drift
  { s: [1.1, 1.03], x: [-0.9, 0.7], y: [-0.3, 0.2] },  // slow pull-back
  { s: [1.04, 1.1], x: [0, 0.4], y: [0.9, -0.9] },     // rising push-in
  { s: [1.07, 1.08], x: [-1.4, 1.4], y: [0, 0] },      // lateral glide
];

function gradeFilter(g: Grade): string {
  const warmth = 0.16 + (g.warmth ?? 0);
  return `sepia(${warmth.toFixed(2)}) saturate(${(1.03 * (g.sat ?? 1)).toFixed(2)}) brightness(${(1.02 * (g.bright ?? 1)).toFixed(2)}) contrast(${(1.03 * (g.contrast ?? 1)).toFixed(2)})`;
}

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.max(1, Math.round(shot.length * fps));
  const p = interpolate(frame, [0, total], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const m = MOVES[shot.motion % MOVES.length];
  const scale = m.s[0] + (m.s[1] - m.s[0]) * p;
  const tx = m.x[0] + (m.x[1] - m.x[0]) * p;
  const ty = m.y[0] + (m.y[1] - m.y[0]) * p;
  const opacity = shot.fadeIn > 0
    ? interpolate(frame, [0, shot.fadeIn * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) })
    : 1;
  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
      <OffthreadVideo
        src={staticFile(`footage/${shot.clip}.mp4`)}
        muted
        trimBefore={Math.round(shot.sourceFrom * fps)}
        playbackRate={shot.rate}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
          filter: gradeFilter(shot.info.grade),
        }}
      />
    </AbsoluteFill>
  );
};

export const FootageEnvironment: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const { fps } = useVideoConfig();
  const shots = useMemo(() => buildShots(timeline), [timeline]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b0906' }}>
      {shots.map((s) => (
        <Sequence key={s.key} from={Math.round(s.start * fps)} durationInFrames={Math.max(1, Math.round(s.length * fps))} layout="none">
          <ShotView shot={s} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
