import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { courtsEntranceFrag, fullscreenVert } from './courtsEntrance.glsl';

// Registry of environments. Add new heavenly environments here (one fragment shader each);
// a prayer project's segments refer to them by key (see scripts/prepare_script.mjs → envFor).
export const ENVIRONMENTS: Record<string, string> = {
  courts_entrance: courtsEntranceFrag,
  // courts_hall, gardens, valley, horizon — added for the full production
};

const Quad: React.FC<{ frag: string; time: number; width: number; height: number; quality: number }> = ({ frag, time, width, height, quality }) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(width, height) },
          uQuality: { value: quality },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [frag, width, height, quality],
  );
  material.uniforms.uTime.value = time;
  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

export const ShaderEnvironment: React.FC<{ env: string; timeOffset?: number; quality?: number }> = ({ env, timeOffset = 0, quality = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const frag = ENVIRONMENTS[env] ?? ENVIRONMENTS.courts_entrance;
  return (
    <ThreeCanvas width={width} height={height} dpr={1} gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
      <Quad frag={frag} time={frame / fps + timeOffset} width={width} height={height} quality={quality} />
    </ThreeCanvas>
  );
};
