# Texture credits

| File | Source | License |
|---|---|---|
| `turf/turf-albedo.jpg` | ambientCG **Grass004** (`Color`), https://ambientcg.com/view?id=Grass004 | CC0 1.0 |
| `turf/turf-normal.jpg` | ambientCG **Grass004** (`NormalGL`), same asset | CC0 1.0 |

ambientCG assets are public domain (CC0 1.0 Universal); attribution is not
required but is kept here so the provenance is obvious.

Processing: the 1K-JPG download was re-encoded with sharp (mozjpeg) --
albedo 1024px q72, normal 512px q82. If the albedo is replaced, re-measure its
linear mean colour and update `MAP_MEAN` in `lib/golf/turf.ts`.

`bulkhead/bulkhead-tile.jpg` predates this file: generated in-house (Nano Banana
image model), not a third-party asset -- see commit `3e33474`.
