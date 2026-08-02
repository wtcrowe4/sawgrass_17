"use client";

import { useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, SMAA, Vignette } from "@react-three/postprocessing";
import * as THREE from 'three';

import { Green } from "./parts/Green";
import { Bulkhead } from "./parts/Bulkhead";
import { Water } from "./parts/Water";
import { Terrain } from "./parts/Terrain";
import { TeeAreas } from "./parts/TeeAreas";
import { CartPath } from "./parts/CartPath";
import { Pin } from "./parts/Pin";
import { Trees } from "./parts/Trees";
import { Tracers } from "./parts/Tracers";
import { SatelliteOverlay } from "./parts/SatelliteOverlay";
import { TreeIsland } from "./parts/TreeIsland";
import { FlowerBed } from "./parts/FlowerBed";
import { GrassApproach } from "./parts/GrassApproach";
import { IslandBunker } from "./parts/IslandBunker";
import { GaussianSplat } from "./parts/GaussianSplat";
import { Grandstands } from "./parts/Grandstands";
import { StandingCrowds } from "./parts/Crowd";
import { TracerPlane } from "./parts/TracerPlane";
import { Hole16 } from "./parts/Hole16";

import { PALETTE } from "@/lib/golf/palette";
import type { Shot } from "@/lib/golf/types";
import type { PinPosition } from "@/lib/golf/geometry";

// --- Types --------------------------------------------------------------------
export interface Sawgrass17Props {
  shots?: Shot[];
  pin?: PinPosition;
  onHoverShot?: (shot: Shot | null) => void;
  showSatellite?: boolean;
  satRotation?: number;
  traceMode?: boolean;
  onTracePoint?: (x: number, z: number) => void;
  intro?: boolean;
  showSplat?: boolean;
  splatUrl?: string;
  /** Tournament dressing (stands, crowds, treeline, island oak, hole 16).
   *  Default OFF -- terrain/lighting work happens on a clean scene.
   *  Nothing is deleted; flip this on to check prop scale. */
  showProps?: boolean;
  /** Postprocessing stack. ?nopost=1 disables for A/B. */
  post?: boolean;
}

// --- Camera config ------------------------------------------------------------
// Broadcast tower cam: behind + above the pro tee (world z ~ -46), on the
// tee->green axis. Target sits mid-lake so the tee pads land at the bottom
// of the frame (bottom frustum edge hits ground ~z=-46) and the green sits
// upper-center. Full tee->green tracer story is visible.
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 20, -64);
const DEFAULT_TARGET = new THREE.Vector3(3.5, 0, -24);
const FOV = 42;

const INTRO_DURATION = 3.0;
const INTRO_START_POS = new THREE.Vector3(20, 9, -28);

function useCinematicIntro(enabled: boolean) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const done = useRef(!enabled);

  if (enabled && !done.current) {
    camera.position.copy(INTRO_START_POS);
  }

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = Math.min(elapsed.current / INTRO_DURATION, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(INTRO_START_POS, DEFAULT_CAMERA_POS, ease);
    if (t >= 1) done.current = true;
  });
}

// --- Lighting -----------------------------------------------------------------
// ONE light rig, matched to the HDRI. Measured 2026-08-01 by decoding
// public/hdr/venice_sunset_1k.hdr and finding its peak-luminance texel:
//   texel (614,246) of 1024x512 -> dir (0.587, 0.058, 0.807), elevation 3.3 deg,
//   azimuth 36 deg.
// We want the sun raking from the west (screen-left) across the lake, i.e.
// azimuth 107 deg, so the environment is rotated +71.3 deg (1.244 rad) about Y
// to bring its sun and its reflections onto the same bearing as the directional.
// Elevation is the one deliberate deviation: the HDRI sun sits at 3.3 deg, which
// throws shadows longer than the 100wu terrain. The directional is lifted to
// ~12 deg so shadows stay on the map. Ambient and the old fill lights are gone --
// the HDRI supplies all indirect now.
const ENV_ROTATION_Y = 1.244;
const SUN_POS = new THREE.Vector3(45, 10, -14); // azimuth 107 deg, elevation 12 deg

function Lighting() {
  return (
    <directionalLight
      position={SUN_POS}
      intensity={2.7}
      color="#ffb36b"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-far={200}
      shadow-camera-left={-55}
      shadow-camera-right={55}
      shadow-camera-top={55}
      shadow-camera-bottom={-55}
      shadow-bias={-0.0005}
      shadow-normalBias={0.02}
    />
  );
}

// --- Scene --------------------------------------------------------------------
interface SceneProps {
  shots: Shot[];
  pin: PinPosition;
  onHoverShot?: (shot: Shot | null) => void;
  showSatellite?: boolean;
  satRotation?: number;
  traceMode?: boolean;
  onTracePoint?: (x: number, z: number) => void;
  intro: boolean;
  showSplat?: boolean;
  splatUrl?: string;
  showProps: boolean;
  post: boolean;
}

function Scene({ shots, pin, onHoverShot, showSatellite, satRotation, traceMode, onTracePoint, intro, showSplat, splatUrl, showProps, post }: SceneProps) {
  useCinematicIntro(intro);

  return (
    <>
      {/* Golden hour sky -- warm peach haze, fog fades terrain into it */}
      <color attach="background" args={[PALETTE.sky]} />
      <fog attach="fog" args={[PALETTE.fog, 110, 320]} />
      <Lighting />
      {/* HDR environment -- sunset sky drives warm water reflections.
          Vendored locally: preset="sunset" fetches from a CDN at runtime
          and intermittently fails (and would break offline/deploy). */}
      <Environment
        files="/hdr/venice_sunset_1k.hdr"
        background={false}
        environmentIntensity={1.15}
        environmentRotation={[0, ENV_ROTATION_Y, 0]}
      />
      {/* Contact shadow patch under green for ground grounding */}
      {/* ContactShadows only with props. DEVIATION from the session plan's
          "ContactShadows under all objects": its catcher plane sits above the
          water line, so any patch big enough to cover the island also lays a
          grey wash across the lake. The directional shadow map (normalBias
          0.02) grounds the terrain correctly on its own. Stands and crowds on
          grass genuinely benefit, so it comes back with them. */}
      {showProps && (
        <ContactShadows
          position={[2, 0.07, -5]}
          scale={30}
          opacity={0.45}
          blur={2.2}
          far={6}
          resolution={1024}
          color="#0a1414"
        />
      )}
      <Terrain />
      {/* Shoreline's wet-stone tube is retired: it drew at a fixed y=0.04 and
          would hover over the sloped bank now that the water sits lower. The
          bank + flower bed + bulkhead cover the edge. File kept. */}
      <FlowerBed />
      <TreeIsland showTree={showProps} />
      <Water />
      <Green />
      <Bulkhead />
      <GrassApproach />
      <IslandBunker />
      <CartPath />
      <TeeAreas />
      <Pin pin={pin} />
      {showProps && (
        <>
          <Hole16 />
          <Trees />
          <Grandstands />
          <StandingCrowds />
        </>
      )}
      {showSplat && splatUrl && (
        <GaussianSplat
          url={splatUrl}
          position={[0, 1.0, -8]}
          rotation={[0, 0, 0]}
          scale={0.4}
        />
      )}
      <SatelliteOverlay visible={showSatellite ?? false} rotDeg={satRotation ?? 0} />
      <TracerPlane active={traceMode ?? false} onPoint={onTracePoint ?? (() => {})} />
      <Tracers shots={shots} onHoverShot={onHoverShot} />
      {/* Post -- DEFAULT OFF. Measured 2026-08-01: attaching EffectComposer
          flattens the lake from the reflector's blue depth to dead grey.
          MeshReflectorMaterial runs its own render pass, which the composer's
          takeover of the render target breaks. Water is the scene's most
          important surface, so a mild vignette is not worth losing it.
          Everything stays wired -- pass post to re-enable, or ?nopost=1 to
          force off. Revisit when water moves to a custom shader.
          SMAA replaces the canvas MSAA (gl.antialias is off below).
          Bloom is threshold-gated ABOVE the tracers' emissive output: landing
          dots run emissiveIntensity 0.35-0.9 and haloing them would smear the
          one layer that carries the data. */}
      {post && (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <SMAA />
        <Bloom intensity={0.35} luminanceThreshold={0.92} luminanceSmoothing={0.15} mipmapBlur />
        <Vignette offset={0.28} darkness={0.42} eskil={false} />
      </EffectComposer>
      )}
      <OrbitControls
        target={DEFAULT_TARGET}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={Math.PI * 0.52}
        minDistance={15}
        maxDistance={150}
        makeDefault
      />
    </>
  );
}

// --- Sawgrass17 ---------------------------------------------------------------
export function Sawgrass17({
  shots = [],
  pin = "sunday",
  onHoverShot,
  showSatellite = false,
  satRotation = 0,
  traceMode = false,
  onTracePoint,
  intro = true,
  showSplat = false,
  splatUrl,
  showProps = false,
  post = false,
}: Sawgrass17Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.5, far: 500, position: DEFAULT_CAMERA_POS.toArray() }}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}
      shadows={{ type: THREE.PCFShadowMap }}
      style={{ background: "#0a0a0a", width: "100%", height: "100%" }}
    >
      <Scene
        shots={shots}
        pin={pin}
        onHoverShot={onHoverShot}
        showSatellite={showSatellite}
        satRotation={satRotation}
        traceMode={traceMode}
        onTracePoint={onTracePoint}
        intro={intro}
        showSplat={showSplat}
        splatUrl={splatUrl}
        showProps={showProps}
        post={post}
      />
    </Canvas>
  );
}
