import { GREEN_DIMENSIONS_YDS } from "@/lib/golf/geometry";
import type { Shot, HoleData } from "@/lib/golf/types";

// ─── Sample shot dataset — TPC Sawgrass Hole 17 ───────────────────────────────
// Coordinates: yards from front-center of green
// x: lateral (+= right looking from tee)
// y: depth from green front (+= toward back of green; tee is at y = -137)
// Tee position: traced PGA pro tee box centroid (x ~ -2, y ~ -152). Per-shot variation across tee width.

export const SAMPLE_SHOTS: Shot[] = [
  // ── Sunday pin (tongue, front-right) ─────────────────────────────────────
  {
    id: "s001",
    player: "Scottie Scheffler",
    year: 2024,
    pin: "sunday",
    tee: { x: 1.5, y: -153.8 },
    landing: { x: -6.6, y: -9.8 },    // 3 yds back, 5 right — tight to tongue
    outcome: "birdie",
    carryYds: 134,
    club: "9-iron",
  },
  {
    id: "s002",
    player: "Rory McIlroy",
    year: 2024,
    pin: "sunday",
    tee: { x: -5.0, y: -152.7 },
    landing: { x: -7.0, y: -6.9 },    // just right of the tongue
    outcome: "par",
    carryYds: 138,
    club: "9-iron",
  },
  {
    id: "s003",
    player: "Viktor Hovland",
    year: 2023,
    pin: "sunday",
    tee: { x: 3.3, y: -149.9 },
    landing: { x: -7.1, y: -3.4 },  // safe, center-back
    outcome: "par",
    carryYds: 140,
    club: "8-iron",
  },
  {
    id: "s004",
    player: "Tommy Fleetwood",
    year: 2023,
    pin: "sunday",
    tee: { x: 6.1, y: -153.5 },
    landing: { x: -1.1, y: -1.3 },  // in water — missed short-left
    outcome: "water",
    carryYds: 121,
    club: "9-iron",
  },
  {
    id: "s005",
    player: "Fred Couples",
    year: 1992,
    pin: "sunday",
    tee: { x: -2.4, y: -153.8 },
    landing: { x: -9.1, y: -15.9 },    // mid-right, safe
    outcome: "par",
    carryYds: 136,
    club: "9-iron",
  },

  // ── Thursday pin (mid-right) ──────────────────────────────────────────────
  {
    id: "t001",
    player: "Collin Morikawa",
    year: 2024,
    pin: "thursday",
    tee: { x: -6.1, y: -151.0 },
    landing: { x: -10.5, y: -28.6 },   // 1 yd from pin
    outcome: "birdie",
    carryYds: 133,
    club: "9-iron",
  },
  {
    id: "t002",
    player: "Jon Rahm",
    year: 2023,
    pin: "thursday",
    tee: { x: -9.5, y: -152.8 },
    landing: { x: -17.2, y: -25.2 },   // left of pin
    outcome: "par",
    carryYds: 136,
    club: "8-iron",
  },
  {
    id: "t003",
    player: "Xander Schauffele",
    year: 2022,
    pin: "thursday",
    tee: { x: 1.7, y: -150.7 },
    landing: { x: -9.0, y: -13.8 },    // right edge, close to fringe
    outcome: "bogey",
    carryYds: 139,
    club: "9-iron",
  },
  {
    id: "t004",
    player: "Will Zalatoris",
    year: 2022,
    pin: "thursday",
    tee: { x: -6.0, y: -150.5 },
    landing: { x: -2.1, y: -1.7 }, // water — short left
    outcome: "water",
    carryYds: 118,
    club: "9-iron",
  },
  {
    id: "t005",
    player: "Patrick Cantlay",
    year: 2024,
    pin: "thursday",
    tee: { x: 4.6, y: -154.0 },
    landing: { x: -17.9, y: -22.0 },   // back-right, two-putt
    outcome: "par",
    carryYds: 141,
    club: "8-iron",
  },

  // ── Friday pin (center-back) ──────────────────────────────────────────────
  {
    id: "f001",
    player: "Ludvig Åberg",
    year: 2024,
    pin: "friday",
    tee: { x: 4.5, y: -149.8 },
    landing: { x: -15.5, y: -21.2 },   // 1 yd from flag
    outcome: "birdie",
    carryYds: 136,
    club: "8-iron",
  },
  {
    id: "f002",
    player: "Brooks Koepka",
    year: 2023,
    pin: "friday",
    tee: { x: -3.9, y: -153.1 },
    landing: { x: -20.5, y: -28.8 },  // back-left fringe
    outcome: "bogey",
    carryYds: 143,
    club: "8-iron",
  },
  {
    id: "f003",
    player: "Justin Thomas",
    year: 2021,
    pin: "friday",
    tee: { x: 7.2, y: -152.0 },
    landing: { x: -16.2, y: -18.1 },   // 3 yds short of flag, birdie putt
    outcome: "birdie",
    carryYds: 132,
    club: "9-iron",
  },
  {
    id: "f004",
    player: "Max Homa",
    year: 2024,
    pin: "friday",
    tee: { x: -8.3, y: -153.4 },
    landing: { x: 0.2, y: -0.4 },  // water — pushed right into the drink
    outcome: "water",
    carryYds: 129,
    club: "9-iron",
  },
  {
    id: "f005",
    player: "Hideki Matsuyama",
    year: 2021,
    pin: "friday",
    tee: { x: 5.3, y: -150.4 },
    landing: { x: -23.5, y: -21.6 },  // back-left, center
    outcome: "par",
    carryYds: 138,
    club: "8-iron",
  },

  // ── Saturday pin (left peninsula) ────────────────────────────────────────
  {
    id: "a001",
    player: "Dustin Johnson",
    year: 2020,
    pin: "saturday",
    tee: { x: 4.5, y: -149.6 },
    landing: { x: -24.0, y: -27.6 },  // 1 yd from flag on peninsula
    outcome: "birdie",
    carryYds: 135,
    club: "9-iron",
  },
  {
    id: "a002",
    player: "Tiger Woods",
    year: 2013,
    pin: "saturday",
    tee: { x: -0.3, y: -148.2 },
    landing: { x: -22.7, y: -22.6 },  // peninsula, left edge
    outcome: "par",
    carryYds: 137,
    club: "9-iron",
  },
  {
    id: "a003",
    player: "Phil Mickelson",
    year: 2007,
    pin: "saturday",
    tee: { x: -3.2, y: -150.7 },
    landing: { x: -19.4, y: -19.3 },   // missed peninsula, center safe
    outcome: "bogey",
    carryYds: 140,
    club: "8-iron",
  },
  {
    id: "a004",
    player: "Adam Scott",
    year: 2016,
    pin: "saturday",
    tee: { x: 4.9, y: -150.3 },
    landing: { x: -10, y: 0.3 }, // water — missed left
    outcome: "water",
    carryYds: 126,
    club: "9-iron",
  },
  {
    id: "a005",
    player: "Shane Lowry",
    year: 2022,
    pin: "saturday",
    tee: { x: 5.5, y: -150.5 },
    landing: { x: -24.4, y: -28.5 },  // tight to pin
    outcome: "birdie",
    carryYds: 133,
    club: "9-iron",
  },
];

// ─── Full hole dataset ────────────────────────────────────────────────────────
export const HOLE_17_DATA: HoleData = {
  holeId: "tpc-sawgrass-17",
  course: "TPC Sawgrass — Stadium Course",
  holeNumber: 17,
  par: 3,
  yardage: 152, // PGA pro tee (traced 2026-05-13)
  greenWidthYds: Number(GREEN_DIMENSIONS_YDS.width.toFixed(1)),
  greenDepthYds: Number(GREEN_DIMENSIONS_YDS.depth.toFixed(1)),
  shots: SAMPLE_SHOTS,
  fieldStrokesGained: {
    offTheTee: 0,
    approach: -0.42, // island green plays hard — negative strokes gained typical
    aroundGreen: 0.0,
    putting: 0.0,
    total: -0.42,
  },
};
