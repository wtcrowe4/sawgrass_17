"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PIN_POSITIONS, type PinPosition } from "@/lib/golf/geometry";
import { greenReliefAt } from "@/lib/golf/elevation";

// ─── Pin (flagstick + flag) ───────────────────────────────────────────────────
// Flagstick: thin cylinder, 2.5 wu tall (≈ 8.3 ft, standard pin height)
// Flag: small tapered plane, waves gently on wind axis
//
// Flag tints to current pin position color (broadcast convention):
//   sunday → #fb923c (orange)
//   thursday → #ffffff (white)
//   friday → #facc15 (yellow)
//   saturday → #60a5fa (blue)

export const PIN_COLORS: Record<PinPosition, string> = {
  sunday: "#fb923c",   // orange — brand color
  thursday: "#ffffff", // white
  friday: "#facc15",   // yellow
  saturday: "#60a5fa", // blue
};

const STICK_HEIGHT = 1.6;       // wu — flagstick height
const STICK_R = 0.018;          // wu — stick radius
const FLAG_W = 0.45;             // wu — flag width
const FLAG_H = 0.30;            // wu — flag height (tapered toward tip)
const FLAG_Y_OFFSET = STICK_HEIGHT - FLAG_H * 0.5 - 0.05; // flag center y

interface PinProps {
  pin: PinPosition;
}

export function Pin({ pin }: PinProps) {
  const flagRef = useRef<THREE.Mesh>(null);
  const pinPos = PIN_POSITIONS[pin];
  // The real 17 flag is tournament yellow every round (getty 2265188811,
  // 2082122646). PIN_COLORS stays for the HUD selector swatches only.
  const flagColor = "#f2c744";

  // Gentle flag wave — sine-driven rotation on Y axis
  useFrame(({ clock }) => {
    if (!flagRef.current) return;
    const t = clock.getElapsedTime();
    // Small oscillation — broadcast quality, not cartoon
    flagRef.current.rotation.y = Math.sin(t * 1.4) * 0.18;
    flagRef.current.position.x = FLAG_W * 0.5 + STICK_R + Math.sin(t * 1.4) * 0.02;
  });

  return (
    <group name="pin" position={[pinPos.x, 0.05 + greenReliefAt(pinPos.x, pinPos.z), pinPos.z]}>
      {/* Flagstick */}
      <mesh castShadow position={[0, STICK_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[STICK_R, STICK_R, STICK_HEIGHT, 8]} />
        <meshStandardMaterial
          color="#d4d4d4"
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Flag — attaches at top of stick */}
      <mesh
        ref={flagRef}
        castShadow
        position={[FLAG_W * 0.5 + STICK_R, FLAG_Y_OFFSET, 0]}
      >
        {/*
          Simple rectangular flag geometry with 2 segments so we can
          animate it later if needed. Tapered by adjusting vertex positions.
        */}
        <planeGeometry args={[FLAG_W, FLAG_H, 4, 2]} />
        <meshStandardMaterial
          color={flagColor}
          roughness={0.7}
          metalness={0.0}
          side={THREE.DoubleSide}
          emissive={flagColor}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Pin shadow disk on green surface — cheap AO approximation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial
          color="#000000"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
