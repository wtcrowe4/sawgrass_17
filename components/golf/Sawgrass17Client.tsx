"use client";

import { useState, useCallback, useEffect } from "react";
import { Sawgrass17 } from "./Sawgrass17";
import { REAL_SHOTS_2025 } from "@/data/real-shots-2025";
import type { Shot } from "@/lib/golf/types";
import type { PinPosition } from "@/lib/golf/geometry";
import { OUTCOME_COLOR } from "@/lib/golf/types";
import { PIN_COLORS } from "./parts/Pin";

const PIN_OPTIONS: PinPosition[] = ["sunday", "thursday", "friday", "saturday"];
const Y2W = 0.3;

const HUD_CARD: React.CSSProperties = {
  background: "rgba(10,10,10,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  color: "#fafafa",
};

// Convert world (x, z) to LAKE_POLY_WU entry [x_wu, y_wu]
// LAKE_POLY_WU.x = -world.x   (toSceneX inverts x)
// LAKE_POLY_WU.y = -world.z   (shape.y -> world.-z, so shape.y = -world.z)
function toLakePoly(wx: number, wz: number): string {
  const lx = Math.round(-wx * 100) / 100;
  const ly = Math.round(-wz * 100) / 100;
  return `  [${lx.toFixed(2)}, ${ly.toFixed(2)}],`;
}

// Convert world (x, z) to GREEN_POLY_YDS entry [x_yds, y_yds]
function toGreenPoly(wx: number, wz: number): string {
  const gx = Math.round((-wx / Y2W) * 10) / 10;
  const gy = Math.round((-wz / Y2W) * 10) / 10;
  return `  [${gx.toFixed(1)}, ${gy.toFixed(1)}],`;
}

type TraceTarget = "lake" | "green";

// Postprocessing is installed and wired but OFF: EffectComposer breaks
// MeshReflectorMaterial and flattens the lake. Flip to true to re-evaluate.
const POST_FX = false;

export function Sawgrass17Client() {
  const [pin, setPin]                 = useState<PinPosition>("sunday");
  const [hoveredShot, setHoveredShot] = useState<Shot | null>(null);
  const [showSat, setShowSat]         = useState(false);
  const [satRot, setSatRot]           = useState(-26); // calibrated 2026-05-11
  const [traceMode, setTraceMode]     = useState(false);
  const [traceTarget, setTraceTarget] = useState<TraceTarget>("lake");
  const [points, setPoints]           = useState<[number, number][]>([]); // [world.x, world.z]
  const [showSplat, setShowSplat]     = useState(false);
  const [showProps, setShowProps]     = useState(false); // tournament dressing -- off while terrain is being built
  const [splatUrl, setSplatUrl]       = useState("https://antimatter15.com/splat/train.splat");

  // ?nointro=1 -- skip the cinematic camera sweep. Headless screenshots
  // fast-forward virtual time, which never advances useFrame deltas, so the
  // intro would otherwise freeze the camera at its start position.
  // Set in an effect (not during render) to keep SSR/client markup identical.
  const [noIntro, setNoIntro] = useState(false);
  const [noPost, setNoPost] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("nointro")) setNoIntro(true);
    if (q.has("nopost")) setNoPost(true);
  }, []);

  const handleHover = useCallback((shot: Shot | null) => setHoveredShot(shot), []);

  const handleTracePoint = useCallback((x: number, z: number) => {
    setPoints((prev) => [...prev, [x, z]]);
  }, []);

  const visibleShots = REAL_SHOTS_2025.filter((s) => s.pin === pin);

  const polyLines = points
    .map(([x, z]) => traceTarget === "lake" ? toLakePoly(x, z) : toGreenPoly(x, z))
    .join("\n");

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Sawgrass17
        shots={visibleShots}
        pin={pin}
        onHoverShot={handleHover}
        showSatellite={showSat}
        satRotation={satRot}
        traceMode={traceMode}
        onTracePoint={handleTracePoint}
        intro={!traceMode && !noIntro}
        showSplat={showSplat}
        splatUrl={splatUrl}
        showProps={showProps}
        post={!noPost && POST_FX}
      />

      {/* top-left: hole info */}
      <div style={{ position: "absolute", top: 16, left: 16, pointerEvents: "none", zIndex: 10 }}>
        <div style={{ ...HUD_CARD, border: "1px solid rgba(251,146,60,0.3)", padding: "10px 14px" }}>
          <div style={{ color: "#fb923c", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}>
            TPC SAWGRASS
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
            HOLE 17 &middot; ISLAND GREEN &middot; PAR 3 &middot; 137 YDS
          </div>
        </div>
      </div>

      {/* top-right controls */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", gap: 6, alignItems: "center" }}>
        {/* SAT toggle */}
        <button
          onClick={() => setShowSat((v) => !v)}
          style={{
            background: showSat ? "rgba(34,211,238,0.15)" : "rgba(10,10,10,0.75)",
            border: `1px solid ${showSat ? "#22d3ee" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 6, color: showSat ? "#22d3ee" : "rgba(250,250,250,0.5)",
            fontFamily: "ui-monospace, monospace", fontSize: 11,
            padding: "5px 10px", cursor: "pointer", letterSpacing: "0.06em",
          }}
        >SAT</button>

        {/* ROT input -- only when SAT active */}
        {showSat && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#22d3ee" }}>ROT</label>
            <input
              type="number" value={satRot} step={0.5}
              onChange={(e) => setSatRot(parseFloat(e.target.value) || 0)}
              style={{
                width: 52, padding: "3px 5px",
                background: "rgba(10,10,10,0.85)", border: "1px solid #22d3ee44",
                borderRadius: 4, color: "#22d3ee",
                fontFamily: "ui-monospace, monospace", fontSize: 11, textAlign: "right",
              }}
            />
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#22d3ee66" }}>deg</span>
          </div>
        )}

        {/* TRACE toggle */}
        <button
          onClick={() => setTraceMode((v) => !v)}
          style={{
            background: traceMode ? "rgba(251,191,36,0.15)" : "rgba(10,10,10,0.75)",
            border: `1px solid ${traceMode ? "#fbbf24" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 6, color: traceMode ? "#fbbf24" : "rgba(250,250,250,0.5)",
            fontFamily: "ui-monospace, monospace", fontSize: 11,
            padding: "5px 10px", cursor: "pointer", letterSpacing: "0.06em",
          }}
        >TRACE</button>

        {/* PROPS toggle -- stands, crowds, treeline, island oak, hole 16 */}
        <button
          onClick={() => setShowProps((v) => !v)}
          style={{
            background: showProps ? "rgba(52,211,153,0.16)" : "rgba(10,10,10,0.75)",
            border: `1px solid ${showProps ? "#34d399" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 6, color: showProps ? "#34d399" : "rgba(250,250,250,0.5)",
            fontFamily: "ui-monospace, monospace", fontSize: 11,
            padding: "5px 10px", cursor: "pointer", letterSpacing: "0.06em",
          }}
        >PROPS</button>

        {/* SPLAT toggle */}
        <button
          onClick={() => setShowSplat((v) => !v)}
          style={{
            background: showSplat ? "rgba(167,139,250,0.18)" : "rgba(10,10,10,0.75)",
            border: `1px solid ${showSplat ? "#a78bfa" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 6, color: showSplat ? "#a78bfa" : "rgba(250,250,250,0.5)",
            fontFamily: "ui-monospace, monospace", fontSize: 11,
            padding: "5px 10px", cursor: "pointer", letterSpacing: "0.06em",
          }}
        >SPLAT</button>

        {showSplat && (
          <input
            type="text"
            value={splatUrl}
            onChange={(e) => setSplatUrl(e.target.value)}
            placeholder=".splat / .ksplat / .ply / .spz URL"
            style={{
              width: 240, padding: "4px 6px",
              background: "rgba(10,10,10,0.85)", border: "1px solid #a78bfa44",
              borderRadius: 4, color: "#a78bfa",
              fontFamily: "ui-monospace, monospace", fontSize: 10,
            }}
          />
        )}

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

        {PIN_OPTIONS.map((p) => (
          <button
            key={p} onClick={() => setPin(p)}
            style={{
              background: pin === p ? "rgba(251,146,60,0.2)" : "rgba(10,10,10,0.75)",
              border: `1px solid ${pin === p ? "#fb923c" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 6, color: pin === p ? "#fb923c" : "rgba(250,250,250,0.6)",
              fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 11,
              fontWeight: pin === p ? 700 : 400, letterSpacing: "0.06em",
              padding: "5px 10px", cursor: "pointer", textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            {/* flag color swatch -- matches Pin.tsx PIN_COLORS */}
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: PIN_COLORS[p], flexShrink: 0,
              border: "1px solid rgba(0,0,0,0.4)",
            }} />
            {p}
          </button>
        ))}
      </div>

      {/* trace panel -- bottom-left when active */}
      {traceMode && (
        <div style={{
          position: "absolute", bottom: 52, left: 16, zIndex: 20,
          ...HUD_CARD, border: "1px solid #fbbf2444",
          padding: "10px 12px", minWidth: 320, maxWidth: 420,
        }}>
          {/* mode selector + actions */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            {(["lake", "green"] as TraceTarget[]).map((t) => (
              <button
                key={t} onClick={() => setTraceTarget(t)}
                style={{
                  background: traceTarget === t ? "rgba(251,191,36,0.2)" : "transparent",
                  border: `1px solid ${traceTarget === t ? "#fbbf24" : "rgba(255,255,255,0.2)"}`,
                  borderRadius: 4, color: traceTarget === t ? "#fbbf24" : "rgba(250,250,250,0.5)",
                  fontFamily: "ui-monospace, monospace", fontSize: 10, padding: "3px 8px", cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >{t}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setPoints((p) => p.slice(0, -1))}
              disabled={points.length === 0}
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 4, color: "rgba(250,250,250,0.5)",
                fontFamily: "ui-monospace, monospace", fontSize: 10, padding: "3px 8px", cursor: "pointer",
              }}
            >UNDO</button>
            <button
              onClick={() => setPoints([])}
              disabled={points.length === 0}
              style={{
                background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 4, color: "rgba(239,68,68,0.7)",
                fontFamily: "ui-monospace, monospace", fontSize: 10, padding: "3px 8px", cursor: "pointer",
              }}
            >CLEAR</button>
          </div>

          <div style={{ fontSize: 10, color: "#fbbf24", marginBottom: 6, letterSpacing: "0.04em" }}>
            {points.length} pts &middot; click scene to trace {traceTarget} outline
          </div>

          {/* output for copy-paste into geometry.ts */}
          {points.length > 0 && (
            <textarea
              readOnly
              value={polyLines}
              style={{
                width: "100%", height: 120,
                background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4, color: "#86efac",
                fontFamily: "ui-monospace, monospace", fontSize: 10,
                padding: "6px 8px", resize: "vertical", boxSizing: "border-box",
              }}
            />
          )}
        </div>
      )}

      {/* bottom-left: legend (when not tracing) */}
      {!traceMode && (
        <div style={{
          position: "absolute", bottom: 16, left: 16, pointerEvents: "none", zIndex: 10,
          display: "flex", gap: 12, ...HUD_CARD, padding: "7px 12px",
        }}>
          {(["birdie", "par", "bogey", "double+", "water"] as const).map((outcome) => (
            <div key={outcome} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(250,250,250,0.65)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: OUTCOME_COLOR[outcome], flexShrink: 0 }} />
              {outcome.toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {/* bottom-right: shot count */}
      <div style={{
        position: "absolute", bottom: 16, right: 16, pointerEvents: "none", zIndex: 10,
        ...HUD_CARD, padding: "7px 12px",
        fontFamily: "ui-monospace, monospace", fontSize: 10, color: "rgba(250,250,250,0.5)",
      }}>
        {visibleShots.length} shots &middot; {pin} pin
        {showSat && <span style={{ marginLeft: 8, color: "#22d3ee" }}>SAT {satRot}deg</span>}
        {traceMode && <span style={{ marginLeft: 8, color: "#fbbf24" }}>TRACE {traceTarget.toUpperCase()}</span>}
      </div>

      {/* hovered shot tooltip */}
      {!traceMode && hoveredShot && (
        <div style={{
          position: "absolute", bottom: 52, right: 16, pointerEvents: "none", zIndex: 10,
          ...HUD_CARD, padding: "8px 12px", fontSize: 11,
          border: `1px solid ${OUTCOME_COLOR[hoveredShot.outcome]}44`,
        }}>
          <div style={{ color: OUTCOME_COLOR[hoveredShot.outcome], fontWeight: 700 }}>
            {hoveredShot.outcome.toUpperCase()}
          </div>
          <div style={{ opacity: 0.7, marginTop: 2 }}>{hoveredShot.player} &middot; {hoveredShot.year}</div>
          <div style={{ opacity: 0.6, marginTop: 1 }}>
            {hoveredShot.carryYds} yds{hoveredShot.club ? <> &middot; {hoveredShot.club}</> : null}
          </div>
        </div>
      )}
    </div>
  );
}
