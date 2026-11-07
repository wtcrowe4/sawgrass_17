"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "@/lib/golf/palette";

// Gradient sky dome -- replaces the flat <color> background that made the
// horizon a razor line. Horizon stays PALETTE.sky (fog must keep matching it),
// blending up through skyMid to a muted golden-hour blue at the zenith, with
// a soft warm glow around the sun bearing (SUN_POS in Sawgrass17.tsx).
// The dome ignores fog and writes no depth; everything draws in front of it.

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uMid;
uniform vec3 uZenith;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.3, h));
  col = mix(col, uZenith, smoothstep(0.25, 0.8, h));
  float sun = pow(max(dot(d, uSunDir), 0.0), 10.0);
  col += vec3(1.0, 0.72, 0.4) * sun * 0.22;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

// Matches SUN_POS (45, 10, -14) in Sawgrass17.tsx -- azimuth 107, elev 12.
const SUN_DIR = new THREE.Vector3(45, 10, -14).normalize();

export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uHorizon: { value: new THREE.Color(PALETTE.sky) },
          uMid: { value: new THREE.Color(PALETTE.skyMid) },
          uZenith: { value: new THREE.Color(PALETTE.skyZenith) },
          uSunDir: { value: SUN_DIR },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(450, 32, 16), []);
  return <mesh geometry={geo} material={mat} renderOrder={-10} frustumCulled={false} />;
}
