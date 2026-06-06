// ─── Shot outcome union ───────────────────────────────────────────────────────
export type ShotOutcome = "birdie" | "par" | "bogey" | "double+" | "water";

// ─── Pin position — correlates to flag color on broadcast ────────────────────
export type PinPosition = "sunday" | "thursday" | "friday" | "saturday";

// ─── Individual shot record ───────────────────────────────────────────────────
export interface Shot {
  id: string;
  player: string;
  year: number;
  pin: PinPosition;
  /** Landing position in yards, origin = front-center of green */
  landing: { x: number; y: number };
  /** Tee position in yards, origin = front-center of green */
  tee: { x: number; y: number };
  outcome: ShotOutcome;
  carryYds: number;
  club: string;
}

// ─── Full hole dataset ────────────────────────────────────────────────────────
export interface HoleData {
  holeId: string;
  course: string;
  holeNumber: number;
  par: number;
  yardage: number;
  greenWidthYds: number;
  greenDepthYds: number;
  shots: Shot[];
  fieldStrokesGained: {
    offTheTee: number;
    approach: number;
    aroundGreen: number;
    putting: number;
    total: number;
  };
}

// ─── Outcome → hex color (lock these per spec) ────────────────────────────────
export const OUTCOME_COLOR: Record<ShotOutcome, string> = {
  birdie: "#10b981",
  par: "#a3a3a3",
  bogey: "#fbbf24",
  "double+": "#ef4444",
  water: "#3b82f6",
};

// ─── World-unit conversion ────────────────────────────────────────────────────
/** 1 yard = 0.3 R3F world units */
export const Y2W = 0.3 as const;
