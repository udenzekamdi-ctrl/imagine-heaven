import { staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import script from '../../scripts/narration_script.json';

export type Overlay = { ref: string; quote: string | null };
export type Segment = { id: string; kind: string; environment: string; text: string; overlays: Overlay[] };
export type Project = {
  id: string; title: string; segments: string[] | 'all'; music: string | null;
  leadInSeconds: number; gapSeconds: number; outroSeconds: number; showTitleCard: boolean;
};
export type PlacedSegment = Segment & { start: number; duration: number; src: string };
export type PlacedOverlay = Overlay & { start: number; duration: number };
export type Timeline = { segments: PlacedSegment[]; overlays: PlacedOverlay[]; total: number; music: string | null; musicDuration: number; project: Project };

const allSegments = (script as { segments: Segment[] }).segments;

// keep on-screen quotes short and elegant: cut at a phrase boundary
function shortQuote(q: string | null): string | null {
  if (!q) return null;
  if (q.length <= 120) return q;
  const cut = q.slice(0, 120);
  const at = Math.max(cut.lastIndexOf(','), cut.lastIndexOf(';'), cut.lastIndexOf(':'));
  return (at > 50 ? cut.slice(0, at) : cut.slice(0, cut.lastIndexOf(' '))) + '…';
}

export async function buildTimeline(project: Project): Promise<Timeline> {
  const ids = project.segments === 'all' ? allSegments.map((s) => s.id) : project.segments;
  const segs = ids.map((id) => {
    const s = allSegments.find((x) => x.id === id);
    if (!s) throw new Error(`Segment ${id} not in narration_script.json`);
    return s;
  });
  let t = project.leadInSeconds;
  const placed: PlacedSegment[] = [];
  const overlays: PlacedOverlay[] = [];
  for (const s of segs) {
    const src = staticFile(`narration/${s.id}.mp3`);
    const duration = await getAudioDurationInSeconds(src);
    placed.push({ ...s, start: t, duration, src });
    // estimate when each reference is spoken from its character position in the narration
    const spokenRefs = [...s.text.matchAll(/(?:(?:First|Second|Third) )?[A-Z][a-z]+(?: [A-Z][a-z]+)?, (?:chapter [a-z -]+, )?verses? [a-z -]+|Psalm [a-z -]+, verses? [a-z -]+/g)];
    s.overlays.forEach((o, i) => {
      const m = spokenRefs[i];
      const frac = m ? (m.index ?? 0) / s.text.length : 0.1;
      const q = shortQuote(o.quote);
      const len = 3.5 + (q ? q.length / 15 : 0);
      overlays.push({ ref: o.ref, quote: q, start: t + frac * duration + 0.2, duration: Math.min(Math.max(len, 7), 13) });
    });
    t += duration + project.gapSeconds;
  }
  const total = t - project.gapSeconds + project.outroSeconds;
  let musicDuration = 0;
  if (project.music) musicDuration = await getAudioDurationInSeconds(staticFile(`music/${project.music}`));
  return { segments: placed, overlays, total, music: project.music, musicDuration, project };
}
