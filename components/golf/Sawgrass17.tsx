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
import { DistanceMarkers } from "./parts/DistanceMarkers";
import { Pin } from "./parts/Pin";
import { Background } from "./parts/Background";
import { Tracers } from "./parts/Tracers";
import { SatelliteOverlay } from "./parts/SatelliteOverlay";
import { TreeIsland } from "./parts/TreeIsland";
import { Shoreline } from "./parts/Shoreline";
import { GrassApproach } from "./parts/GrassApproach";
import { IslandBunker } from "./parts/IslandBunker";
import { GaussianSplat } from "./parts/GaussianSplat";
import { TracerPlane } from "./parts/TracerPlane";

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
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 22, -38);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, -5);
const FOV = 42;

const INTRO_DURATION = 3.0;
const INTRO_START_POS = new THREE.Vector3(18, 8, -25);

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
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.18} color="#ffffff" />
      <directionalLight
        position={[18, 30, 10]}
        intensity={1.8}
        color="#ffe8c0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-20, 15, -50]} intensity={0.32} color="#22d3ee" castShadow={false} />
      <directionalLight position={[0, 10, 20]} intensity={0.12} color="#c0d8ff" castShadow={false} />
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
      <fog attach="fog" args={["#a8c0d8", 110, 320]} />
      <Lighting />
      {/* HDR environment -- sky, ambient bounce, reflections on water */}
      <Environment preset="park" background={false} environmentIntensity={0.85} />
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
      <DistanceMarkers />
      <TeeAreas />
      <Pin pin={pin} />
      <Background />
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
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
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
