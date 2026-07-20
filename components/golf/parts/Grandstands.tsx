"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { CrowdRows } from "./Crowd";

// Grandstands + hospitality -- THE PLAYERS tournament build-out around 17.
// Layout derived 2026-07-11 from reference-photos image3 (tournament aerial,
// oriented against the calibrated satellite tile) + image4 (ground photo from
// tee) + image7 (aerial from east):
//   - Main multi-tier grandstand LEFT of the pro tee (SW, over members tee tip)
//   - Stand directly behind the pro tee, smaller stand right of the tee
//   - Long stand on the NE shore between 16 green and 17 green
//   - Stand on the mound behind the green (north)
//   - Hospitality suite row along the west shore (18th-hole side), outside
//     the cart path
// All positions in WORLD units. yds -> world: world.x = -x_yds*0.3,
// world.z = -y_yds*0.3.  Pro tee center world ~ (0.67, -46).

const GREEN_AIM = { x: 4.5, z: -5.5 };  // world green center -- stands face this
const LAKE_AIM  = { x: 2.0, z: -15.0 }; // suites face the lake

// Getty tournament refs (2082122646, 2205306924): stands are deep NAVY
// lower walls with a white top-tier rail + white tarp roof and roof flags.
const STRUCTURE = "#1c2b4d"; // TPC navy wall
const SEATING   = "#33405c";
const ROOF      = "#f2f1ea"; // white tarp roof
const TRIM      = "#e8e9ec"; // white rail band
const POST      = "#8a8f98";
const TENT_WALL = "#e8e6dd";

const BASE_H    = 0.4;
const SEAT_RISE = 1.1;
const ROOF_H    = 2.3;
const POST_R    = 0.05;

interface StandCfg {
  x: number;
  z: number;
  len: number;    // wu along the front edge
  depth: number;  // wu front-to-back
  scale?: number; // vertical scale (main stand is taller)
}

// Grandstands (see layout notes above).
const STANDS: StandCfg[] = [
  { x:  9.0, z: -48.5, len: 11.0, depth: 3.2, scale: 1.4 }, // main -- left of tee (SW), stadium scale
  { x: -2.4, z: -50.5, len: 9.0, depth: 2.8, scale: 1.15 }, // behind pro tee
  { x: -8.2, z: -45.5, len: 5.5, depth: 2.4 },              // right of tee (E)
  // Behind the green, east of the videoboard
  { x: -6.0, z: 10.0, len: 7.0, depth: 2.4 },
  // West-shore stadium row facing the island green (getty 1248046004:
  // the big multi-tier stands line the WEST side; the east bank is the
  // 16th fairway corridor and stays clear)
  { x: 17.0, z: -4.0, len: 9.0, depth: 2.8, scale: 1.2 },
  { x: 16.5, z: -13.5, len: 9.0, depth: 3.0, scale: 1.3 },
  { x: 15.5, z: -23.0, len: 9.0, depth: 2.8, scale: 1.2 },
];

// Hospitality suites -- west shore row + back-shore row flanking the
// videoboard (getty 2113291318: white peaked tents line the shore behind green).
const TENTS: { x: number; z: number }[] = [
  // Outboard of the west-shore stadium row (concourse side)
  { x: 20.8, z: -6.0 },
  { x: 20.3, z: -11.5 },
  { x: 19.8, z: -17.0 },
  { x: 19.5, z: -22.5 },
  { x: 18.0, z: -27.5 },
  { x: 19.8, z:  2.0 },  // NW shore (lake lobe covers x 10..16 up here)
  { x:  6.2, z: 10.4 },  // west of videoboard
  { x:  8.7, z: 11.0 },
];

function aimRotY(x: number, z: number, aim: { x: number; z: number }): number {
  return Math.atan2(aim.x - x, aim.z - z);
}

// Seamed tarp texture so big roofs read as segmented canopies instead of
// flat white slabs (getty 1248046004 drone view shows bay seams + trusses).
let tarpTexCache: THREE.CanvasTexture | null = null;
function buildTarpTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (tarpTexCache) return tarpTexCache;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 32;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#f0eee6";
  g.fillRect(0, 0, 128, 32);
  for (let x = 0; x < 128; x += 16) {
    g.fillStyle = "#d9d6ca";
    g.fillRect(x, 0, 2, 32);
    // subtle per-bay shading gradient
    const grad = g.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, "rgba(180,178,168,0.25)");
    grad.addColorStop(0.5, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(180,178,168,0.18)");
    g.fillStyle = grad;
    g.fillRect(x, 0, 16, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tarpTexCache = tex;
  return tex;
}

function Stand({ cfg, index }: { cfg: StandCfg; index: number }) {
  const tarpTex = useMemo(() => buildTarpTexture(), []);
  const s = cfg.scale ?? 1;
  const rotY = aimRotY(cfg.x, cfg.z, GREEN_AIM);
  // Positive angle: deck rises toward the BACK of the stand (real rake)
  const slopeAng = 0.32;
  const seatLen = cfg.len - 0.3;

  const posts = useMemo(() => {
    const p: [number, number][] = [];
    const hx = cfg.len / 2 - 0.35;
    const hz = cfg.depth / 2 - 0.25;
    p.push([-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]);
    return p;
  }, [cfg.len, cfg.depth]);

  return (
    <group position={[cfg.x, 0, cfg.z]} rotation={[0, rotY, 0]}>
      {/* seated spectators on the raked deck (outside the y-scale so bodies keep proportion) */}
      <CrowdRows
        len={seatLen}
        depth={cfg.depth * 0.8}
        y0={s * (BASE_H + SEAT_RISE / 2 + 0.13)}
        slope={0.315 * s}
        seed={index}
      />
      <group scale={[1, s, 1]}>
      {/* base platform */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[cfg.len, BASE_H, cfg.depth]} />
        <meshStandardMaterial color={STRUCTURE} roughness={0.85} />
      </mesh>
      {/* sloped seating deck -- rises toward the back */}
      <mesh
        position={[0, BASE_H + SEAT_RISE / 2, -0.15]}
        rotation={[slopeAng, 0, 0]}
        castShadow
      >
        <boxGeometry args={[seatLen, 0.18, cfg.depth * 0.92]} />
        <meshStandardMaterial color={SEATING} roughness={0.9} />
      </mesh>
      {/* back wall -- navy with a white rail band on top */}
      <mesh position={[0, BASE_H + SEAT_RISE * 0.75, -cfg.depth / 2 + 0.1]} castShadow>
        <boxGeometry args={[cfg.len, SEAT_RISE * 1.5, 0.16]} />
        <meshStandardMaterial color={STRUCTURE} roughness={0.85} />
      </mesh>
      <mesh position={[0, BASE_H + SEAT_RISE * 1.5 + 0.08, -cfg.depth / 2 + 0.1]} castShadow>
        <boxGeometry args={[cfg.len, 0.16, 0.18]} />
        <meshStandardMaterial color={TRIM} roughness={0.6} />
      </mesh>
      {/* navy side skirts below the deck (real stands read as solid navy walls) */}
      <mesh position={[-cfg.len / 2 + 0.08, BASE_H + SEAT_RISE * 0.45, 0]} castShadow>
        <boxGeometry args={[0.14, SEAT_RISE * 0.9, cfg.depth * 0.9]} />
        <meshStandardMaterial color={STRUCTURE} roughness={0.85} />
      </mesh>
      <mesh position={[cfg.len / 2 - 0.08, BASE_H + SEAT_RISE * 0.45, 0]} castShadow>
        <boxGeometry args={[0.14, SEAT_RISE * 0.9, cfg.depth * 0.9]} />
        <meshStandardMaterial color={STRUCTURE} roughness={0.85} />
      </mesh>
      {/* gabled tarp roof -- two tilted panels meet at a center ridge, navy
          fascia band on the eaves so the roof doesn't read as a white slab
          from above (getty 1248046004) */}
      <group position={[0, ROOF_H, 0]} rotation={[0.06, 0, 0]}>
        <mesh position={[0, 0.16, -(cfg.depth / 4 + 0.08)]} rotation={[0.42, 0, 0]} castShadow>
          <boxGeometry args={[cfg.len + 0.4, 0.08, cfg.depth * 0.62]} />
          <meshStandardMaterial
            color={tarpTex ? "#ffffff" : ROOF}
            map={tarpTex ?? undefined}
            roughness={0.6}
          />
        </mesh>
        <mesh position={[0, 0.16, cfg.depth / 4 + 0.08]} rotation={[-0.42, 0, 0]} castShadow>
          <boxGeometry args={[cfg.len + 0.4, 0.08, cfg.depth * 0.62]} />
          <meshStandardMaterial
            color={tarpTex ? "#ffffff" : ROOF}
            map={tarpTex ?? undefined}
            roughness={0.6}
          />
        </mesh>
        {/* navy fascia on all four eaves */}
        <mesh position={[0, -0.1, cfg.depth / 2 + 0.12]} castShadow>
          <boxGeometry args={[cfg.len + 0.44, 0.34, 0.07]} />
          <meshStandardMaterial color={STRUCTURE} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.1, -(cfg.depth / 2 + 0.12)]} castShadow>
          <boxGeometry args={[cfg.len + 0.44, 0.34, 0.07]} />
          <meshStandardMaterial color={STRUCTURE} roughness={0.8} />
        </mesh>
        <mesh position={[-(cfg.len / 2 + 0.19), -0.1, 0]} castShadow>
          <boxGeometry args={[0.07, 0.34, cfg.depth + 0.3]} />
          <meshStandardMaterial color={STRUCTURE} roughness={0.8} />
        </mesh>
        <mesh position={[cfg.len / 2 + 0.19, -0.1, 0]} castShadow>
          <boxGeometry args={[0.07, 0.34, cfg.depth + 0.3]} />
          <meshStandardMaterial color={STRUCTURE} roughness={0.8} />
        </mesh>
      </group>
      {/* corner posts */}
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, ROOF_H / 2, pz]} castShadow>
          <cylinderGeometry args={[POST_R, POST_R, ROOF_H, 6]} />
          <meshStandardMaterial color={POST} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* roof flags */}
      {[-cfg.len / 2 + 0.6, cfg.len / 2 - 0.6].map((fx, i) => (
        <group key={`flag-${i}`} position={[fx, ROOF_H, -cfg.depth / 4]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.7, 5]} />
            <meshStandardMaterial color={POST} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0.15, 0.58, 0]}>
            <planeGeometry args={[0.3, 0.17]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#1c2b4d" : "#c8a12f"}
              side={THREE.DoubleSide}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
      </group>
    </group>
  );
}

// Videoboard -- big navy tower with an LED leaderboard, on the shore directly
// behind the green, screen facing the tee (getty 2113291318 / 2205293816).
function buildBoardTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#0a1626";
  g.fillRect(0, 0, 256, 128);
  // gold header band
  g.fillStyle = "#c8a12f";
  g.fillRect(0, 0, 256, 22);
  g.fillStyle = "#0a1626";
  g.font = "bold 14px sans-serif";
  g.fillText("THE PLAYERS", 12, 16);
  // leaderboard rows: rank block, name bar, score block
  const rows = [
    ["#e8e9ec", "-12"], ["#e8e9ec", "-10"], ["#e8e9ec", "-9"],
    ["#e8e9ec", "-8"], ["#e8e9ec", "-7"],
  ];
  rows.forEach((r, i) => {
    const y = 30 + i * 19;
    g.fillStyle = "#13233d";
    g.fillRect(8, y, 240, 15);
    g.fillStyle = "#e8e9ec";
    g.fillRect(12, y + 3, 40 + ((i * 37) % 60), 9);
    g.fillStyle = "#d64541";
    g.font = "bold 11px sans-serif";
    g.fillText(r[1], 224, y + 12);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Videoboard() {
  const boardTex = useMemo(() => buildBoardTexture(), []);
  const x = 1.5;
  const z = 10.8;
  const rotY = aimRotY(x, z, { x: 0.67, z: -46 }); // screen faces the tee
  const W = 5.6;
  const H = 3.0;
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* navy tower body */}
      <mesh position={[0, H / 2 + 0.5, -0.35]} castShadow>
        <boxGeometry args={[W + 0.6, H + 1.0, 0.7]} />
        <meshStandardMaterial color={STRUCTURE} roughness={0.85} />
      </mesh>
      {/* LED screen */}
      <mesh position={[0, H / 2 + 0.7, 0.02]}>
        <planeGeometry args={[W, H * 0.78]} />
        <meshStandardMaterial
          color={boardTex ? "#ffffff" : "#0a1626"}
          map={boardTex ?? undefined}
          emissive="#ffffff"
          emissiveIntensity={0.35}
          emissiveMap={boardTex ?? undefined}
          roughness={0.4}
        />
      </mesh>
      {/* gold TPC band across the top */}
      <mesh position={[0, H + 1.15, 0.01]}>
        <planeGeometry args={[W + 0.6, 0.35]} />
        <meshStandardMaterial color="#c8a12f" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Tent({ x, z }: { x: number; z: number }) {
  const rotY = aimRotY(x, z, LAKE_AIM);
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.4, 1.1, 1.6]} />
        <meshStandardMaterial color={TENT_WALL} roughness={0.8} />
      </mesh>
      {/* peaked tarp roof -- 4-sided cone reads as a pyramid */}
      <mesh position={[0, 1.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.7, 0.7, 4]} />
        <meshStandardMaterial color={ROOF} roughness={0.55} />
      </mesh>
    </group>
  );
}

export function Grandstands() {
  return (
    <group name="grandstands">
      {STANDS.map((cfg, i) => (
        <Stand key={i} cfg={cfg} index={i} />
      ))}
      {TENTS.map((t, i) => (
        <Tent key={i} x={t.x} z={t.z} />
      ))}
      <Videoboard />
    </group>
  );
}
