"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { parabolaPoints } from "@/lib/golf/geometry";
import { OUTCOME_COLOR, Y2W, type Shot } from "@/lib/golf/types";

// Tracers -- animated parabolic arcs from tee to landing for each shot.
// Performance: geometry/material created ONCE per tracer via useMemo.
// Animation uses imperative drawRange + position updates in useFrame only.

const STAGGER_S    = 0.25;
const DURATION_S   = 1.6;
const BALL_R       = 0.07;
const DOT_R        = 0.12;
const LINE_OPACITY = 0.75;
const ARC_SEGMENTS = 64;

// Tooltip
function ShotTooltip({ shot, visible }: { shot: Shot; visible: boolean }) {
  if (!visible) return null;
  const color = OUTCOME_COLOR[shot.outcome];
  return (
    <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
      <div style={{
        background: "rgba(10,10,10,0.92)",
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: "6px 10px",
        color: "#fafafa",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}>
        <div style={{ color, fontWeight: 700, marginBottom: 2 }}>
          {shot.outcome.toUpperCase()} &middot; {shot.carryYds} yds
        </div>
        <div style={{ opacity: 0.8 }}>{shot.player} ({shot.year})</div>
        {shot.club && <div style={{ opacity: 0.6 }}>{shot.club}</div>}
      </div>
    </Html>
  );
}

// Single tracer
interface TracerProps {
  shot: Shot;
  index: number;
  globalTime: number;
  stagger: number;
  dotR: number;
  onHover?: (shot: Shot | null) => void;
}

function SingleTracer({ shot, index, globalTime, stagger, dotR, onHover }: TracerProps) {
  const ballRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color     = OUTCOME_COLOR[shot.outcome];
  const startTime = index * stagger;

  const arcPoints = useMemo(
    () => parabolaPoints(shot.tee, shot.landing, 0.2, ARC_SEGMENTS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shot.id]
  );

  const landingW = useMemo(
    () => new THREE.Vector3(-shot.landing.x * Y2W, 0.06, shot.landing.y * Y2W),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shot.id]
  );

  // Geometry + material created once -- never recreated during animation
  const { linePrimitive, arcGeo } = useMemo(() => {
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    arcGeo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: LINE_OPACITY,
    });
    const linePrimitive = new THREE.Line(arcGeo, mat);
    return { linePrimitive, arcGeo };
  }, [arcPoints, color]);

  // Imperative animation -- drawRange + ball position, no state writes
  useFrame(() => {
    const t = globalTime - startTime;
    if (t < 0) return;
    const progress = Math.min(1, t / DURATION_S);
    const done     = progress >= 1;
    const count    = done
      ? arcPoints.length
      : Math.max(2, Math.floor(progress * arcPoints.length));

    arcGeo.setDrawRange(0, count);

    if (ballRef.current) {
      if (!done) {
        const idx = Math.min(arcPoints.length - 1, Math.floor(progress * (arcPoints.length - 1)));
        ballRef.current.position.copy(arcPoints[idx]);
        ballRef.current.visible = true;
      } else {
        ballRef.current.visible = false;
      }
    }
  });

  const handleOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover?.(shot);
  }, [shot, onHover]);

  const handleOut = useCallback(() => {
    setHovered(false);
    onHover?.(null);
  }, [onHover]);

  const elapsed   = globalTime - startTime;
  if (elapsed < 0) return null;
  const progress  = Math.min(1, elapsed / DURATION_S);
  const done      = progress >= 1;

  return (
    <group name={`tracer-${shot.id}`}>
      <primitive object={linePrimitive} />

      <mesh ref={ballRef} visible={!done} castShadow>
        <sphereGeometry args={[BALL_R, 8, 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.4}
          emissive={color}
          emissiveIntensity={0.6}
        />
      </mesh>

      {done && (
        <mesh position={landingW} onPointerOver={handleOver} onPointerOut={handleOut} castShadow>
          <sphereGeometry args={[dotR, 10, 10]} />
          <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={0.3}
            emissive={color}
            emissiveIntensity={hovered ? 0.9 : 0.35}
          />
          <ShotTooltip shot={shot} visible={hovered} />
        </mesh>
      )}
    </group>
  );
}

// Tracers container
interface TracersProps {
  shots: Shot[];
  onHoverShot?: (shot: Shot | null) => void;
}

export function Tracers({ shots, onHoverShot }: TracersProps) {
  const timeRef = useRef(0);
  const [globalTime, setGlobalTime] = useState(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    setGlobalTime(timeRef.current);
  });

  // Real datasets are 70-140 shots per round -- compress the launch window
  // to ~6s total and shrink dots so the green stays readable.
  const stagger = shots.length > 30 ? 6 / shots.length : STAGGER_S;
  const dotR = shots.length > 30 ? 0.08 : DOT_R;

  return (
    <group name="tracers">
      {shots.map((shot, i) => (
        <SingleTracer
          key={shot.id}
          shot={shot}
          index={i}
          globalTime={globalTime}
          stagger={stagger}
          dotR={dotR}
          onHover={onHoverShot}
        />
      ))}
    </group>
  );
}
