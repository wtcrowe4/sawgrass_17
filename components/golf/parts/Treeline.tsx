"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  buildFlora,
  makeBlobGeometry,
  makeTrunkGeometry,
  makeFrondGeometry,
  type Instance,
} from "@/lib/golf/flora";

// Treeline -- species-correct horizon ring (asset bible item 1). Always on:
// the sky band and the water's reflection content both come from this.
//
// Replaces the 2026-11-10 sphere/cone ring. All placement and species data
// live in lib/golf/flora.ts; this component only turns instance lists into
// InstancedMeshes (white base material + per-instance colour, the palette
// exception shared with Crowd/Trees). ~10 draw calls total.

function toInstancedMesh(
  geo: THREE.BufferGeometry,
  list: Instance[],
  mat: THREE.Material
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  const m = new THREE.Matrix4();
  for (let i = 0; i < list.length; i++) {
    const inst = list[i];
    m.compose(inst.pos, inst.quat, inst.scale);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, inst.color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  // ring surrounds the camera -- never let three cull it as one bound
  mesh.frustumCulled = false;
  return mesh;
}

export function Treeline() {
  const group = useMemo(() => {
    const flora = buildFlora();
    const g = new THREE.Group();
    g.name = "treeline";

    const foliageMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 1,
      metalness: 0,
    });
    const frondMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.95,
      metalness: 0,
    });

    const blobGeos = [4901, 4902, 4903].map(makeBlobGeometry);
    flora.oakBlobs.forEach((list, i) =>
      g.add(toInstancedMesh(blobGeos[i], list, foliageMat))
    );
    g.add(toInstancedMesh(blobGeos[0].clone(), flora.hedge, foliageMat));
    g.add(toInstancedMesh(blobGeos[1].clone(), flora.pineCrowns, foliageMat));

    const trunkGeo = makeTrunkGeometry();
    g.add(toInstancedMesh(trunkGeo, flora.pineTrunks, trunkMat));
    g.add(toInstancedMesh(trunkGeo.clone(), flora.palmTrunks, trunkMat));

    g.add(toInstancedMesh(makeFrondGeometry(), flora.palmFronds, frondMat));

    return g;
  }, []);

  useEffect(() => () => {
    group.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
        o.dispose();
      }
    });
  }, [group]);

  return <primitive object={group} />;
}
