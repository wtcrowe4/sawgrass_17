"use client";

import { useEffect, useState } from "react";
import {
  DropInViewer,
  LogLevel,
  SceneRevealMode,
} from "@mkkellogg/gaussian-splats-3d";

// GaussianSplat -- mounts a 3D Gaussian Splat scene as an R3F primitive.
// DropInViewer extends THREE.Group, so it slots straight into the scene.
//
// Demo splat URL note: default points at antimatter15's classic "train"
// scene (CORS-enabled, public). Replace with hole-17 splats once captured
// (drop .splat / .ksplat / .spz / .ply files in /public/splats/).

export interface GaussianSplatProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];   // euler radians
  scale?: number | [number, number, number];
  visible?: boolean;
  alphaThreshold?: number;
}

export function GaussianSplat({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  visible = true,
  alphaThreshold = 5,
}: GaussianSplatProps) {
  // Recreate viewer when url changes (resource intensive -- keep urls stable).
  const [viewer] = useState(() => new DropInViewer({
    sharedMemoryForWorkers: false,    // avoids SharedArrayBuffer/COOP requirement
    gpuAcceleratedSort: true,
    sceneRevealMode: SceneRevealMode.Gradual,
    antialiased: false,
    logLevel: LogLevel.Warning,
  }));

  // Load splat scene
  useEffect(() => {
    let cancelled = false;
    viewer.addSplatScene(url, {
      splatAlphaRemovalThreshold: alphaThreshold,
      showLoadingUI: false,
      progressiveLoad: true,
    }).then(() => {
      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.log("[GaussianSplat] loaded:", url);
    }).catch((err: unknown) => {
      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.error("[GaussianSplat] load failed:", url, err);
    });
    return () => { cancelled = true; };
  }, [viewer, url, alphaThreshold]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      viewer.dispose().catch(() => { /* swallow */ });
    };
  }, [viewer]);

  const s = typeof scale === "number" ? [scale, scale, scale] as const : scale;

  return (
    <primitive
      object={viewer}
      position={position}
      rotation={rotation}
      scale={[s[0], s[1], s[2]]}
      visible={visible}
    />
  );
}
