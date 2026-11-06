import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { continueRender, delayRender, staticFile } from 'remotion';

// Fonts are self-hosted in assets/fonts (SIL OFL, from Google Fonts) so renders work offline
// and behind proxies. Both Cormorant Garamond files are variable fonts (weights 300–700).
const FONTS: { family: string; file: string; style: string; weight: string }[] = [
  { family: 'IH Cormorant', file: 'fonts/CormorantGaramond-Normal.woff2', style: 'normal', weight: '300 700' },
  { family: 'IH Cormorant', file: 'fonts/CormorantGaramond-Italic.woff2', style: 'italic', weight: '300 700' },
  { family: 'IH Cinzel', file: 'fonts/Cinzel.woff2', style: 'normal', weight: '400 900' },
];
if (typeof document !== 'undefined') {
  const handle = delayRender('Loading fonts');
  Promise.all(
    FONTS.map((f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)}) format('woff2')`, { style: f.style, weight: f.weight });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => { console.error(err); continueRender(handle); });
}
const serif = "'IH Cormorant', Georgia, serif";
const serifItalic = serif;
const caps = "'IH Cinzel', 'Trajan Pro', serif";

const IVORY = '#F6EFE1';
const GOLD = '#E4C98E';
// The scene is bright ivory marble, so text needs a warm-dark halo + a soft scrim to stay legible.
const shadow = '0 0 22px rgba(38,24,6,0.70), 0 0 6px rgba(38,24,6,0.55), 0 2px 3px rgba(30,18,4,0.55)';
const Scrim: React.FC<{ opacity: number; at: string; size: string; strength: number }> = ({ opacity, at, size, strength }) => (
  <AbsoluteFill style={{ opacity, background: `radial-gradient(ellipse ${size} at ${at}, rgba(34,22,8,${strength}) 0%, rgba(34,22,8,${strength * 0.55}) 45%, rgba(34,22,8,0) 100%)` }} />
);

function useFade(durationInFrames: number, fadeIn = 1.4, fadeOut = 1.6) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = interpolate(frame, [0, fadeIn * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const o = interpolate(frame, [durationInFrames - fadeOut * fps, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const drift = interpolate(frame, [0, durationInFrames], [6, -6]);
  return { opacity: Math.min(i, o), drift };
}

// Minimal Scripture overlay: muted-gold reference, ivory quotation. Lower third, centred, never full captions.
export const ScriptureOverlay: React.FC<{ reference: string; quote?: string | null; durationInFrames: number }> = ({ reference, quote, durationInFrames }) => {
  const { opacity, drift } = useFade(durationInFrames);
  return (
    <AbsoluteFill>
    <Scrim opacity={opacity} at="50% 84%" size="62% 30%" strength={0.42} />
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 118 }}>
      <div style={{ opacity, transform: `translateY(${drift}px)`, textAlign: 'center', maxWidth: 1180 }}>
        {quote ? (
          <div style={{ fontFamily: serifItalic, fontStyle: 'italic', fontSize: 46, lineHeight: 1.32, color: IVORY, textShadow: shadow, letterSpacing: 0.3 }}>
            “{quote}”
          </div>
        ) : null}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <span style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
          <span style={{ fontFamily: caps, fontSize: 27, letterSpacing: 6, color: GOLD, textShadow: shadow }}>{reference}</span>
          <span style={{ width: 70, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
        </div>
      </div>
    </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TitleCard: React.FC<{ durationInFrames: number; subtitle: string }> = ({ durationInFrames, subtitle }) => {
  const { opacity, drift } = useFade(durationInFrames, 2.4, 2.2);
  return (
    <AbsoluteFill>
    <Scrim opacity={opacity} at="50% 50%" size="58% 34%" strength={0.36} />
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, transform: `translateY(${drift * 0.6}px)`, textAlign: 'center' }}>
        <div style={{ fontFamily: caps, fontSize: 84, letterSpacing: 26, color: IVORY, textShadow: shadow, paddingLeft: 26 }}>IMAGINE HEAVEN</div>
        <div style={{ margin: '26px auto 22px', width: 260, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 38, letterSpacing: 2, color: IVORY, textShadow: shadow }}>{subtitle}</div>
      </div>
    </AbsoluteFill>
    </AbsoluteFill>
  );
};
