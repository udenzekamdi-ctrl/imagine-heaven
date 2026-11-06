import plan from '../../../scripts/footage_plan.json';
import type { Timeline } from '../timeline';

export type Grade = { warmth?: number; sat?: number; bright?: number; contrast?: number };
export type ClipInfo = {
  pexelsId: number; title: string; page: string; file: string;
  fps: number; duration: number; rateMin: number; grade: Grade;
};
type PlanShot = { clip: string; from: number; weight: number };
type FootagePlan = {
  crossfadeSeconds: number; preferredRate: number;
  clips: Record<string, ClipInfo>; segments: Record<string, PlanShot[]>;
};

export const FOOTAGE = plan as unknown as FootagePlan;

/** One placed shot on the composition timeline (seconds). */
export type Shot = {
  key: string;
  clip: string;
  info: ClipInfo;
  start: number;      // when it begins fading in (over the previous shot's tail)
  visible: number;    // time it is the "current" shot, excluding the overlap into the next one
  length: number;     // visible + crossfade into the next shot (0 overlap for the last shot)
  fadeIn: number;     // 0 for the very first shot (the video already fades up from black)
  sourceFrom: number; // seconds into the clip
  rate: number;       // playback rate (slow motion)
  motion: number;     // index used to vary the camera move
};

/**
 * Lay the footage plan over the narration timeline.
 * Each narration segment owns the window from its start to the next segment's start
 * (the first window begins at 0, the last ends at the end of the video). Inside a window,
 * shots share time by weight, but no shot may be stretched below its clip's minimum
 * playback rate (that would stutter). Time a capped shot can't fill goes to the others.
 */
export function buildShots(tl: Timeline): Shot[] {
  const XF = FOOTAGE.crossfadeSeconds;
  const shots: Shot[] = [];
  let motion = 0;
  tl.segments.forEach((seg, si) => {
    const list = FOOTAGE.segments[seg.id];
    if (!list?.length) throw new Error(`footage_plan.json has no shots for ${seg.id}`);
    const winStart = si === 0 ? 0 : seg.start;
    const winEnd = si === tl.segments.length - 1 ? tl.total : tl.segments[si + 1].start;
    const W = winEnd - winStart;

    const caps = list.map((s) => {
      const c = FOOTAGE.clips[s.clip];
      if (!c) throw new Error(`Unknown clip ${s.clip}`);
      const avail = Math.max(c.duration - s.from - 0.25, 1);
      return avail / c.rateMin - XF; // longest visible time this clip can cover
    });
    // weighted share with redistribution from capped shots
    const len = new Array(list.length).fill(0);
    let free = list.map((_, i) => i);
    let remaining = W;
    for (let iter = 0; iter < 6 && free.length; iter++) {
      const wsum = free.reduce((a, i) => a + list[i].weight, 0);
      const next: number[] = [];
      let used = 0;
      for (const i of free) {
        const want = (remaining * list[i].weight) / wsum;
        if (want > caps[i]) { len[i] = caps[i]; used += caps[i]; } else next.push(i);
      }
      if (next.length === free.length) {
        for (const i of free) len[i] = (remaining * list[i].weight) / wsum;
        free = [];
      } else { remaining -= used; free = next; }
    }
    const filled = len.reduce((a, b) => a + b, 0);
    if (filled < W - 0.01) {
      // every shot capped: stretch proportionally (rare; the plan should give enough material)
      const k = W / filled; for (let i = 0; i < len.length; i++) len[i] *= k;
    }

    let t = winStart;
    list.forEach((s, i) => {
      const c = FOOTAGE.clips[s.clip];
      const isLastOverall = si === tl.segments.length - 1 && i === list.length - 1;
      const length = len[i] + (isLastOverall ? 0 : XF);
      const avail = Math.max(c.duration - s.from - 0.25, 1);
      // caps above keep avail/length >= rateMin (except the rare all-capped stretch)
      const rate = Math.min(FOOTAGE.preferredRate, avail / length);
      shots.push({
        key: `${seg.id}-${i}-${s.clip}`, clip: s.clip, info: c,
        start: t, visible: len[i], length, fadeIn: shots.length === 0 ? 0 : XF,
        sourceFrom: s.from, rate, motion: motion++,
      });
      t += len[i];
    });
  });
  return shots;
}
