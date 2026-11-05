import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { loadFont as loadCormorant } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';

const { fontFamily: serif } = loadCormorant('normal', { weights: ['400', '500'], subsets: ['latin'] });
const { fontFamily: serifItalic } = loadCormorant('italic', { weights: ['400'], subsets: ['latin'] });
const { fontFamily: caps } = loadCinzel('normal', { weights: ['400'], subsets: ['latin'] });

const IVORY = '#F6EFE1';
const GOLD = '#CDAE72';
const shadow = '0 0 28px rgba(60,40,10,0.45), 0 2px 10px rgba(40,25,5,0.35)';

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
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 118 }}>
      <div style={{ opacity, transform: `translateY(${drift}px)`, textAlign: 'center', maxWidth: 1180 }}>
        {quote ? (
          <div style={{ fontFamily: serifItalic, fontStyle: 'italic', fontSize: 46, lineHeight: 1.32, color: IVORY, textShadow: shadow, letterSpacing: 0.3 }}>
            “{quote}”
          </div>
        ) : null}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <span style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
          <span style={{ fontFamily: caps, fontSize: 24, letterSpacing: 6, color: GOLD, textShadow: shadow }}>{reference}</span>
          <span style={{ width: 70, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TitleCard: React.FC<{ durationInFrames: number; subtitle: string }> = ({ durationInFrames, subtitle }) => {
  const { opacity, drift } = useFade(durationInFrames, 2.4, 2.2);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, transform: `translateY(${drift * 0.6}px)`, textAlign: 'center' }}>
        <div style={{ fontFamily: caps, fontSize: 84, letterSpacing: 26, color: IVORY, textShadow: shadow, paddingLeft: 26 }}>IMAGINE HEAVEN</div>
        <div style={{ margin: '26px auto 22px', width: 260, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div style={{ fontFamily: serif, fontSize: 36, letterSpacing: 2, color: IVORY, textShadow: shadow, opacity: 0.92 }}>{subtitle}</div>
      </div>
    </AbsoluteFill>
  );
};
