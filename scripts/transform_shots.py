#!/usr/bin/env python3
"""Transform raw pgatour.com scatterData (tourcast survey feet) into the
scene's yard coordinates and emit data/real-shots-<year>.ts.

Usage: python3 scripts/transform_shots.py <raw.json> <year>

Coordinate mapping (derived + validated 2026-07-11):
  - tourcast coords are FEET on a course-local survey grid (verified:
    tee->R1-pin distance = 412 ft = 137.5 yds = the hole yardage).
  - The survey grid is mirrored relative to the scene's yds frame (the scene
    frame is left-handed: +x east-ish, +y toward-tee/SE), so y is negated
    before rotating.
  - Rotation/translation grid-searched to maximize tee shots inside the
    traced island polygon: 94% on island, 4/4 real pins inside the traced
    putting surface, 26 water balls (matches 2025 reports), median
    proximity to the day's pin 6-15 yds. Orientation independently
    confirmed against the tourcast "pickle" overhead (bunker front-right,
    walkway back-left).
  - Shot convention in data files: landing/tee = {x: x_yds, y: -y_yds}
    (world.x = -x*0.3, world.z = +y*0.3 after negation -- see Tracers.tsx).
"""
import json
import math
import re
import sys

# Similarity transform: yds = R(THETA) @ mirror(tourcast_ft/3 - tee) + O
TEE_TC = (11167.98, 8410.44)     # real tee anchor, tourcast ft (shotDetailsV3)
THETA = None                     # set below from stored calibration
CALIB = {"theta": 0.5294462894994075, "ox": -7.738888888888889, "oy": 146.39999999999998}

OUTCOME = {
    "ACE": "birdie", "EAGLE": "birdie", "BIRDIE": "birdie",
    "PAR": "par", "BOGEY": "bogey",
}
ROUND_PIN = {1: "thursday", 2: "friday", 3: "saturday", 4: "sunday"}


def poly(src: str, name: str):
    block = re.search(name + r"[^=]*=\s*\[(.*?)\];", src, re.S).group(1)
    return [(float(a), float(b))
            for a, b in re.findall(r"\[\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]", block)]


def inside(pt, pts):
    x, y = pt
    ins = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ins = not ins
        j = i
    return ins


def main():
    raw_path, year = sys.argv[1], int(sys.argv[2])
    theta = CALIB["theta"] if CALIB["theta"] is not None else 0.529553
    c, s = math.cos(theta), math.sin(theta)

    def xform(tx, ty):
        x = (tx - TEE_TC[0]) / 3.0
        y = -(ty - TEE_TC[1]) / 3.0
        return (x * c - y * s + CALIB["ox"], x * s + y * c + CALIB["oy"])

    geo = open("lib/golf/geometry.ts").read()
    landmass = poly(geo, "GREEN_POLY_YDS")
    approach = poly(geo, "GRASS_APPROACH_POLY_YDS")
    lake = [(x / 0.3, y / 0.3) for x, y in poly(geo, "LAKE_POLY_WU")]

    d = json.load(open(raw_path))
    rounds = d["data"]["scatterData"]["rounds"]

    shots = []
    pins = {}
    for r in rounds:
        rn = r["num"]
        pc = r["pinCoords"]["green"]["portraitCoords"]
        pins[rn] = xform(pc["tourcastX"], pc["tourcastY"])
        for st in r["strokes"]:
            if st["strokeNumber"] != 1:
                continue
            for ps in st["playerShots"]:
                o = ps["shotCoords"]["overview"]["portraitCoords"]
                lx, ly = xform(o["tourcastX"], o["tourcastY"])
                water = (inside((lx, ly), lake)
                         and not inside((lx, ly), landmass)
                         and not inside((lx, ly), approach))
                outcome = "water" if water else OUTCOME.get(ps["result"], "double+")
                pid = ps["player"]["id"]
                # deterministic tee jitter across the pad width
                jit = (int(pid) * 2654435761 % 1000) / 1000.0 - 0.5
                tx_yds = CALIB["ox"] + jit * 6.0
                ty_yds = CALIB["oy"]
                carry = math.hypot(lx - tx_yds, ly - ty_yds)
                shots.append({
                    "id": f"y{year}r{rn}-{pid}",
                    "player": ps["player"]["name"],
                    "year": year,
                    "pin": ROUND_PIN[rn],
                    "tee": (round(tx_yds, 1), round(-ty_yds, 1)),
                    "landing": (round(lx, 2), round(-ly, 2)),
                    "outcome": outcome,
                    "carry": round(carry),
                })

    out = ["import type { Shot } from \"@/lib/golf/types\";", "",
           f"// Real THE PLAYERS {year} shot data -- every tee shot on hole 17.",
           "// Source: pgatour.com scatterData (ShotLink tourcast coords),",
           "// fetched once via scripts/fetch-shots.sh and transformed by",
           "// scripts/transform_shots.py. Do not hand-edit.", "",
           f"export const REAL_SHOTS_{year}: Shot[] = ["]
    for sh in shots:
        out.append(
            f'  {{ id: "{sh["id"]}", player: "{sh["player"]}", year: {sh["year"]}, '
            f'pin: "{sh["pin"]}", tee: {{ x: {sh["tee"][0]}, y: {sh["tee"][1]} }}, '
            f'landing: {{ x: {sh["landing"][0]}, y: {sh["landing"][1]} }}, '
            f'outcome: "{sh["outcome"]}", carryYds: {sh["carry"]} }},')
    out.append("];")
    out.append("")

    path = f"data/real-shots-{year}.ts"
    with open(path, "w") as f:
        f.write("\n".join(out))
    n_water = sum(1 for x in shots if x["outcome"] == "water")
    print(f"wrote {path}: {len(shots)} shots, {n_water} water")
    print("real pins (yds):", {k: (round(v[0], 2), round(v[1], 2)) for k, v in pins.items()})


if __name__ == "__main__":
    main()
