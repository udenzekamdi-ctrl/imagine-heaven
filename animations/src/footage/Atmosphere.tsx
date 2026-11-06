import React, { useMemo } from 'react';
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

// Original atmosphere laid over the footage so every clip shares one heavenly look:
// warm grade wash, soft golden illumination, slow god-rays, drifting mist and floating motes of light.
// All of it is 2D (gradients, two pre-baked PNGs, small divs), so it renders quickly without a GPU.

type Mote = { x: number; y: number; r: number; speed: number; sway: number; phase: number; twinkle: number; a: number; bokeh: boolean };

function makeMotes(n: number): Mote[] {
  return Array.from({ length: n }).map((_, i) => {
    const bokeh = i < 9;
    return {
      x: random(`mx${i}`), y: random(`my${i}`),
      r: bokeh ? 14 + random(`mr${i}`) * 22 : 1.6 + random(`mr${i}`) * 3.2,
      speed: (bokeh ? 4 : 7) + random(`ms${i}`) * (bokeh ? 6 : 16), // px per second, upward
      sway: 6 + random(`mw${i}`) * 22, phase: random(`mp${i}`) * Math.PI * 2,
      twinkle: 0.25 + random(`mt${i}`) * 0.6, a: bokeh ? 0.06 + random(`ma${i}`) * 0.07 : 0.35 + random(`ma${i}`) * 0.45,
      bokeh,
    };
  });
}

export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const motes = useMemo(() => makeMotes(64), []);

  const rayOpacity = 0.13 + 0.05 * Math.sin(t * 0.11) + 0.03 * Math.sin(t * 0.037 + 1.3);
  const glowX = 58 + 6 * Math.sin(t * 0.021);
  const glowY = 16 + 3 * Math.sin(t * 0.017 + 0.7);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* warm cinematic wash (soft-light keeps shadows and highlights) */}
      <AbsoluteFill style={{ background: '#e8b56a', mixBlendMode: 'soft-light', opacity: 0.32 }} />
      {/* soft golden illumination from above */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at ${glowX}% ${glowY}%, rgba(255,214,150,0.30) 0%, rgba(255,200,130,0.10) 45%, rgba(0,0,0,0) 75%)`, mixBlendMode: 'screen' }} />
      {/* slow god-rays */}
      <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: rayOpacity }}>
        <Img src={staticFile('fx/rays.png')} style={{ width: '100%', height: '100%', transform: `rotate(${1.4 * Math.sin(t * 0.03)}deg) scale(1.3) translateX(${1.2 * Math.sin(t * 0.019)}%)`, transformOrigin: '50% 40%' }} />
      </AbsoluteFill>
      {/* drifting mist, two layers at different speeds, weighted to the lower frame */}
      {[{ sp: 9, op: 0.16, sc: 1, off: 0 }, { sp: 16, op: 0.1, sc: 1.6, off: 700 }].map((l, i) => (
        <AbsoluteFill key={i} style={{
          backgroundImage: `url(${staticFile('fx/mist.png')})`, backgroundRepeat: 'repeat',
          backgroundSize: `${2304 * l.sc}px ${1152 * l.sc}px`,
          backgroundPosition: `${-(t * l.sp + l.off)}px ${Math.sin(t * 0.05 + i) * 12}px`,
          opacity: l.op,
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%)',
        }} />
      ))}
      {/* floating motes of light */}
      <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
        {motes.map((m, i) => {
          const travel = height + 120;
          const y = ((m.y * travel - t * m.speed) % travel + travel) % travel - 60;
          const x = m.x * width + Math.sin(t * 0.25 + m.phase) * m.sway;
          const tw = 0.6 + 0.4 * Math.sin(t * m.twinkle * 2 + m.phase * 3);
          const edge = Math.min(1, y / 140, (height - y) / 200); // fade near top/bottom
          const a = Math.max(0, m.a * tw * edge);
          const d = m.r * 2;
          return (
            <div key={i} style={{
              position: 'absolute', left: x - m.r, top: y - m.r, width: d, height: d, borderRadius: '50%', opacity: a,
              background: m.bokeh
                ? 'radial-gradient(circle, rgba(255,232,190,0.9) 0%, rgba(255,214,150,0.35) 45%, rgba(255,214,150,0) 70%)'
                : 'radial-gradient(circle, rgba(255,250,235,1) 0%, rgba(255,226,170,0.55) 35%, rgba(255,214,150,0) 70%)',
            }} />
          );
        })}
      </AbsoluteFill>
      {/* vignette */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 85% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(20,12,4,0.42) 100%)' }} />
    </AbsoluteFill>
  );
};
