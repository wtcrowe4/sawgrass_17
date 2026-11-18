"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { parabolaPoints } from "@/lib/golf/geometry";
import { greenReliefAt } from "@/lib/golf/elevation";
import { OUTCOME_COLOR, type Shot } from "@/lib/golf/types";

// ReplayRig -- cinematic chase-cam replay of one real shot.
//
// Mount it (keyed by shot.id) and it takes the camera: saves the current
// pose, disables OrbitControls, chases the ball from behind along the arc,
// holds on the landing, then eases back to the saved pose and calls onDone.
// Unmount at any time is safe -- the effect cleanup re-enables controls.
//
// Phases: fly (chase) -> hold (low over the landing) -> return (ease back).

const FLY_S    = 4.0;
const HOLD_S   = 1.3;
const RETURN_S = 1.1;
const SEGMENTS = 160;

const CHASE_BACK = 5.0; // wu behind the ball
const CHASE_UP   = 1.9; // wu above the ball

interface ReplayRigProps {
  shot: Shot;
  onDone: () => void;
}

interface ControlsLike {
  enabled: boolean;
  update?: () => void;
}

export function ReplayRig({ shot, onDone }: ReplayRigProps) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const ballRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const doneFired = useRef(false);
  const savedPos = useRef(new THREE.Vector3());
  const savedQuat = useRef(new THREE.Quaternion());

  const { arc, dir, landing } = useMemo(() => {
    const arc = parabolaPoints(shot.tee, shot.landing, 0.2, SEGMENTS);
    // Lift the terminal point by the green relief so the hold shot does not
    // sink the camera into the back-left shelf.
    const landing = arc[arc.length - 1].clone();
    landing.y += greenReliefAt(landing.x, landing.z);
    const dir = new THREE.Vector3(
      landing.x - arc[0].x, 0, landing.z - arc[0].z
    ).normalize();
    return { arc, dir, landing };
  }, [shot]);

  const { line, lineGeo } = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(arc);
    g.setDrawRange(0, 0);
    const m = new THREE.LineBasicMaterial({
      color: new THREE.Color(OUTCOME_COLOR[shot.outcome]),
      transparent: true,
      opacity: 0.95,
    });
    return { line: new THREE.Line(g, m), lineGeo: g };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arc, shot.outcome]);

  // Camera takeover for the lifetime of this mount.
  useEffect(() => {
    savedPos.current.copy(camera.position);
    savedQuat.current.copy(camera.quaternion);
    if (controls) controls.enabled = false;
    return () => {
      if (controls) {
        controls.enabled = true;
        controls.update?.();
      }
    };
  }, [camera, controls]);

  useEffect(() => () => {
    lineGeo.dispose();
    (line.material as THREE.Material).dispose();
  }, [lineGeo, line]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;
    const n = arc.length;
    const ball = ballRef.current;

    if (t < FLY_S) {
      const p = t / FLY_S;
      const f = p * (n - 1);
      const i = Math.min(n - 2, Math.floor(f));
      const pos = arc[i].clone().lerp(arc[i + 1], f - i);
      if (ball) {
        ball.position.copy(pos);
        ball.visible = true;
      }
      lineGeo.setDrawRange(0, Math.max(2, Math.ceil(p * n)));
      const desired = pos
        .clone()
        .addScaledVector(dir, -CHASE_BACK)
        .add(new THREE.Vector3(0, CHASE_UP, 0));
      camera.position.lerp(desired, 1 - Math.exp(-5 * delta));
      camera.lookAt(pos);
    } else if (t < FLY_S + HOLD_S) {
      if (ball) ball.position.copy(landing);
      lineGeo.setDrawRange(0, n);
      const desired = landing
        .clone()
        .addScaledVector(dir, -3.2)
        .add(new THREE.Vector3(0, 1.1, 0));
      camera.position.lerp(desired, 1 - Math.exp(-3 * delta));
      camera.lookAt(landing);
    } else if (t < FLY_S + HOLD_S + RETURN_S) {
      camera.position.lerp(savedPos.current, 1 - Math.exp(-4 * delta));
      camera.quaternion.slerp(savedQuat.current, 1 - Math.exp(-4 * delta));
    } else if (!doneFired.current) {
      doneFired.current = true;
      camera.position.copy(savedPos.current);
      camera.quaternion.copy(savedQuat.current);
      onDone();
    }
  });

  return (
    <group name="replay-rig">
      <primitive object={line} />
      <mesh ref={ballRef} visible={false} castShadow>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.25}
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}
