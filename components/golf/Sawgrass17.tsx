"use client";

import { useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
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
import { Shoreline } from "./parts/Shoreline";
import { GrassApproach } from "./parts/GrassApproach";
import { IslandBunker } from "./parts/IslandBunker";
import { GaussianSplat } from "./parts/GaussianSplat";
import { Grandstands } from "./parts/Grandstands";
import { StandingCrowds } from "./parts/Crowd";
import { TracerPlane } from "./parts/TracerPlane";
import { Hole16 } from "./parts/Hole16";

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
// Golden hour -- low warm sun from the west (+x, screen-left), long shadows,
// cool blue counter-fill from the east so shadow sides don't go black.
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} color="#ffe2c4" />
      <directionalLight
        position={[45, 10, -14]}
        intensity={3.4}
        color="#ffb36b"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={160}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-30, 9, -35]} intensity={0.4} color="#6a86c8" castShadow={false} />
      <directionalLight position={[0, 22, 25]} intensity={0.15} color="#ffd9b0" castShadow={false} />
    </>
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
}

function Scene({ shots, pin, onHoverShot, showSatellite, satRotation, traceMode, onTracePoint, intro, showSplat, splatUrl }: SceneProps) {
  useCinematicIntro(intro);

  return (
    <>
      {/* Golden hour sky -- warm peach haze, fog fades terrain into it */}
      <color attach="background" args={["#e0a878"]} />
      <fog attach="fog" args={["#dba57e", 110, 320]} />
      <Lighting />
      {/* HDR environment -- sunset sky drives warm water reflections */}
      <Environment preset="sunset" background={false} environmentIntensity={0.65} />
      {/* Contact shadow patch under green for ground grounding */}
      <ContactShadows
        position={[2, 0.07, -5]}
        scale={28}
        opacity={0.55}
        blur={2.4}
        far={6}
        resolution={512}
        color="#0a1414"
      />
      <Terrain />
      <Shoreline />
      <TreeIsland />
      <Water />
      <Green />
      <Bulkhead />
      <GrassApproach />
      <IslandBunker />
      <CartPath />
      <TeeAreas />
      <Pin pin={pin} />
      <Hole16 />
      <Trees />
      <Grandstands />
      <StandingCrowds />
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
}: Sawgrass17Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.5, far: 500, position: DEFAULT_CAMERA_POS.toArray() }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}
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
      />
    </Canvas>
  );
}
