import React from 'react';
import { Composition } from 'remotion';
import { PrayerVideo } from './PrayerVideo';
import { buildTimeline, type Project, type Timeline } from './timeline';
import preview from '../../scripts/projects/restoration_preview.json';
import full from '../../scripts/projects/restoration_full.json';

const FPS = 30;
const projects = [preview, full] as Project[];

export const Root: React.FC = () => (
  <>
    {projects.map((p) => (
      <Composition
        key={p.id}
        id={p.id}
        component={PrayerVideo}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={FPS * 60}
        defaultProps={{ timeline: null as unknown as Timeline }}
        calculateMetadata={async () => {
          const timeline = await buildTimeline(p);
          return { durationInFrames: Math.ceil(timeline.total * FPS), props: { timeline } };
        }}
      />
    ))}
  </>
);
