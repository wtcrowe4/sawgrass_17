// Flora -- species-correct procedural vegetation (asset bible item 1).
//
// Everything is INSTANCED: a handful of unit geometries (noise-displaced
// crown blobs, trunk, drooping frond) and per-instance matrix + colour
// lists. The builders return raw instance data; Treeline.tsx turns each
// list into one THREE.InstancedMesh, so the whole horizon is <=10 draw
// calls regardless of tree count.
//
// Species, per the reference photos (docs/ASSET-BIBLE.md):
//  - Live-oak wall: lumpy overlapping crowns, 4-7 blobs per tree, dark
//    two-tone, plus a low hedge band that closes the line to the ground.
//  - Slash pines: bare leaning trunks with sparse umbrella crowns ABOVE
//    the oak line (image4's hero pine leans ~9 deg behind the tee).
//  - Sabal palms: curved trunks + fan heads near the tee and banks.
//
// Scale: 1 wu = 3.05 m. Oaks ~5-7 wu, pines ~8-10 wu, palms ~3-5 wu.

import * as THREE from "three";
import { heightAt } from "./elevation";
import { PALETTE } from "./palette";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Instance {
  pos: THREE.Vector3;
  scale: THREE.Vector3;
  quat: THREE.Quaternion;
  color: THREE.Color;
}

export interface FloraData {
  oakBlobs: Instance[][]; // one list per blob geometry variant
  hedge: Instance[];
  pineTrunks: Instance[];
  pineCrowns: Instance[];
  palmTrunks: Instance[];
  palmFronds: Instance[];
}

// --- Unit geometries -----------------------------------------------------

/** Noise-displaced sphere -- a lumpy crown blob. Three seeds = 3 variants. */
export function makeBlobGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 10, 8);
  const rng = mulberry32(seed);
  // displace along the normal with 3 random low-freq waves
  const f = [1.3 + rng(), 1.7 + rng(), 2.3 + rng()];
  const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const d =
      0.14 * Math.sin(f[0] * v.x + ph[0]) +
      0.12 * Math.sin(f[1] * v.y + ph[1]) +
      0.1 * Math.sin(f[2] * v.z + ph[2]);
    v.addScaledVector(n, d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Tapered trunk, unit height, origin at the base. */
export function makeTrunkGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.55, 1, 1, 7, 1);
  g.translate(0, 0.5, 0);
  return g;
}

/** Drooping palm frond, unit length along +x, origin at the stem. */
export function makeFrondGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 0.26, 5, 1);
  g.translate(0.5, 0, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    // droop increases toward the tip; taper the blade a little
    pos.setY(i, pos.getY(i) * (1 - 0.55 * x) - 0.55 * x * x);
  }
  g.computeVertexNormals();
  return g;
}

// --- Instance builders ---------------------------------------------------

const CENTER = new THREE.Vector2(0, -15);
const R_MIN = 55;
const R_MAX = 88;

const UP = new THREE.Vector3(0, 1, 0);

function compose(
  x: number, y: number, z: number,
  sx: number, sy: number, sz: number,
  quat: THREE.Quaternion,
  color: THREE.Color
): Instance {
  return {
    pos: new THREE.Vector3(x, y, z),
    scale: new THREE.Vector3(sx, sy, sz),
    quat: quat.clone(),
    color,
  };
}

const Q0 = new THREE.Quaternion();

function leanQuat(rng: () => number, maxRad: number): THREE.Quaternion {
  const axis = new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5).normalize();
  return new THREE.Quaternion().setFromAxisAngle(axis, rng() * maxRad);
}

export function buildFlora(): FloraData {
  const oakBlobs: Instance[][] = [[], [], []];
  const hedge: Instance[] = [];
  const pineTrunks: Instance[] = [];
  const pineCrowns: Instance[] = [];
  const palmTrunks: Instance[] = [];
  const palmFronds: Instance[] = [];

  const dark = new THREE.Color(PALETTE.canopyDark);
  const mid = new THREE.Color(PALETTE.canopyMid);
  const light = new THREE.Color(PALETTE.canopyLight);
  const bark = new THREE.Color(PALETTE.bark);
  const pineGreen = new THREE.Color("#26402b");
  const palmGreen = new THREE.Color("#44632f");
  const palmTrunkCol = new THREE.Color("#6e6253");

  // --- Live-oak wall: ~95 trees of 4-7 blobs on the ring ----------------
  {
    const rng = mulberry32(4101);
    const trees = 95;
    for (let t = 0; t < trees; t++) {
      const ang = (t / trees) * Math.PI * 2 + (rng() - 0.5) * 0.05;
      const r = R_MIN + Math.pow(rng(), 0.65) * (R_MAX - R_MIN);
      const cx = CENTER.x + Math.cos(ang) * r;
      const cz = CENTER.y + Math.sin(ang) * r;
      const base = heightAt(cx, cz);
      const H = 4.5 + rng() * 2.5;
      const W = H * (0.7 + rng() * 0.4);
      // per-tree colour bias, per-blob jitter
      const bias = rng();
      const blobs = 4 + Math.floor(rng() * 4);
      for (let b = 0; b < blobs; b++) {
        const bx = cx + (rng() - 0.5) * W * 0.8;
        const bz = cz + (rng() - 0.5) * W * 0.8;
        const byF = 0.45 + rng() * 0.45; // fraction of H
        const br = H * (0.22 + rng() * 0.16);
        const c = new THREE.Color().copy(dark).lerp(mid, bias * 0.8 + rng() * 0.3);
        if (byF > 0.75) c.lerp(light, 0.2 * rng()); // sun-lit top blobs
        c.multiplyScalar(0.92 + rng() * 0.16);
        oakBlobs[b % 3].push(
          compose(bx, base + byF * H, bz, br * (1 + rng() * 0.3), br * (0.7 + rng() * 0.3), br * (1 + rng() * 0.3),
            leanQuat(rng, 0.6), c)
        );
      }
    }
  }

  // --- Hedge band: closes the wall to the ground ------------------------
  {
    const rng = mulberry32(4202);
    const n = 150;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.04;
      // hug the wall base -- anything further in reads as a stray bush
      const r = R_MIN - 0.5 + rng() * 3;
      const cx = CENTER.x + Math.cos(ang) * r;
      const cz = CENTER.y + Math.sin(ang) * r;
      const base = heightAt(cx, cz);
      const w = 1.8 + rng() * 1.6;
      const c = new THREE.Color().copy(dark).multiplyScalar(0.75 + rng() * 0.2);
      hedge.push(compose(cx, base + w * 0.18, cz, w, w * 0.4, w, Q0, c));
    }
  }

  // --- Slash pines: sparse emergents above the oak line -----------------
  {
    const rng = mulberry32(4303);
    const n = 40;
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const r = R_MIN + 4 + rng() * (R_MAX - R_MIN - 6);
      addPine(
        CENTER.x + Math.cos(ang) * r,
        CENTER.y + Math.sin(ang) * r,
        7.5 + rng() * 2.8,
        leanQuat(rng, 0.09),
        rng
      );
    }
    // HERO: the leaning pine behind the championship tee (image4),
    // player's left of the tee line, ~9 deg lean toward +x. Far enough back
    // that its crown stays out of the default tower frame.
    const heroLean = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, -1), 0.16
    );
    addPine(5, -55, 8.5, heroLean, mulberry32(4444));

    function addPine(
      x: number, z: number, H: number,
      lean: THREE.Quaternion, prng: () => number
    ) {
      const base = heightAt(x, z);
      const trunkCol = bark.clone().multiplyScalar(0.9 + prng() * 0.2);
      pineTrunks.push(compose(x, base, z, 0.1, H * 0.84, 0.1, lean, trunkCol));
      // crown: 3-5 small flattened clusters hugging the top of the trunk
      const k = 3 + Math.floor(prng() * 3);
      for (let b = 0; b < k; b++) {
        const topF = 0.8 + prng() * 0.15;
        const tip = new THREE.Vector3(0, H * topF, 0).applyQuaternion(lean);
        const br = H * (0.1 + prng() * 0.06);
        const c = pineGreen.clone().multiplyScalar(0.85 + prng() * 0.3);
        pineCrowns.push(
          compose(
            x + tip.x + (prng() - 0.5) * H * 0.1,
            base + tip.y,
            z + tip.z + (prng() - 0.5) * H * 0.1,
            br * 1.35, br * 0.5, br * 1.35,
            leanQuat(prng, 0.3), c
          )
        );
      }
    }
  }

  // --- Sabal palms: tee-side cluster + bank singles (image1/4) ----------
  {
    const rng = mulberry32(4505);
    // [x, z, count] -- player's right of the tee is -x (image4 right edge)
    const clusters: [number, number, number][] = [
      [-8, -49, 3],
      [-18, -30, 2],
      [18, -48, 2],
      [-22, 2, 2],
    ];
    for (const [cx, cz, count] of clusters) {
      for (let p = 0; p < count; p++) {
        const x = cx + (rng() - 0.5) * 3;
        const z = cz + (rng() - 0.5) * 3;
        const base = heightAt(x, z);
        const H = 2.2 + rng() * 1.0;
        const lean = leanQuat(rng, 0.12);
        palmTrunks.push(
          compose(x, base, z, 0.07, H, 0.07, lean,
            palmTrunkCol.clone().multiplyScalar(0.9 + rng() * 0.2))
        );
        const head = new THREE.Vector3(0, H, 0).applyQuaternion(lean);
        const fronds = 11 + Math.floor(rng() * 4);
        for (let f = 0; f < fronds; f++) {
          const yaw = (f / fronds) * Math.PI * 2 + rng() * 0.4;
          const pitch = -0.1 - rng() * 0.6;
          const q = new THREE.Quaternion()
            .setFromAxisAngle(UP, yaw)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), pitch));
          const len = H * (0.28 + rng() * 0.1);
          palmFronds.push(
            compose(x + head.x, base + head.y, z + head.z, len, len * 0.7, len, q,
              palmGreen.clone().multiplyScalar(0.8 + rng() * 0.25))
          );
        }
      }
    }
  }

  return { oakBlobs, hedge, pineTrunks, pineCrowns, palmTrunks, palmFronds };
}
