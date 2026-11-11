"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeIslandBunkerShape } from "@/lib/golf/geometry";
import { greenReliefAt } from "@/lib/golf/elevation";
import { ROUGHNESS } from "@/lib/golf/palette";

// IslandBunker -- greenside sand bunker on the island.
// Radial-gradient texture sells the depression: darker shadowed center,
// lighter rim. Rim catches sunlight; center implies depth.

const BUNKER_Y     = 0.055;
const SAND_RIM     = "#d8c897";    // sun-bleached top edge
const SAND_CENTER  = "#a89668";    // shadowed lower bowl

function buildBunkerTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");

  const g = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.05,
    size / 2, size / 2, size * 0.5
  );
  g.addColorStop(0.0, SAND_CENTER);
  g.addColorStop(0.55, "#bfae7e");
  g.addColorStop(1.0, SAND_RIM);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Add subtle granular noise so it doesn't look like a flat disc
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i]     = Math.max(0, Math.min(255, img.data[i]     + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function IslandBunker() {
  const { geo, tex } = useMemo(() => {
    const shape = makeIslandBunkerShape();
    const g = new THREE.ShapeGeometry(shape, 16);

    // UV-map vertices to 0..1 across bunker bounding box so the
    // radial gradient hits centered.
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const w = bb.max.x - bb.min.x;
    const h = bb.max.y - bb.min.y;
    const pos = g.attributes.position;
    const uv = new Float32Array((pos.count) * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2]     = (pos.getX(i) - bb.min.x) / w;
      uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / h;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.rotateX(-Math.PI / 2);

    // Follow the green's relief (front-right runoff dips here) so the sand
    // sits IN the depression instead of hovering over it. All vertices are
    // on the outline; the fill interpolates, which is fine at this size.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, p.getY(i) + greenReliefAt(p.getX(i), p.getZ(i)));
    }
    p.needsUpdate = true;
    g.computeVertexNormals();

    return { geo: g, tex: buildBunkerTexture() };
  }, []);

  return (
    <mesh name="island-bunker" geometry={geo} position={[0, BUNKER_Y, 0]} receiveShadow>
      <meshStandardMaterial
        map={tex}
        roughness={ROUGHNESS.sand}
        metalness={0.0}
      />
    </mesh>
  );
}
