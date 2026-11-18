"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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

interface Sawgrass17ClientProps {
  /** Portfolio embed: minimal HUD, idle auto-orbit, dot-click replay only.
   *  ?embed=1 forces it too (for direct links and headless checks). */
  embed?: boolean;
}

export function Sawgrass17Client({ embed: embedProp = false }: Sawgrass17ClientProps = {}) {
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
  // ?embed=1 -- portfolio embed: minimal HUD (title, legend, attribution),
  // no editor controls, slow idle orbit until the user grabs the view.
  // Landing-dot click replay stays live.
  const [embedParam, setEmbedParam] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("nointro")) setNoIntro(true);
    if (q.has("nopost")) setNoPost(true);
    if (q.has("embed")) setEmbedParam(true);
  }, []);
  const embed = embedProp || embedParam;

  const [showStats, setShowStats] = useState(false);
  const [replayShot, setReplayShot] = useState<Shot | null>(null);
  const handleSelectShot = useCallback((shot: Shot) => setReplayShot(shot), []);
  const handleReplayDone = useCallback(() => setReplayShot(null), []);

  const handleHover = useCallback((shot: Shot | null) => setHoveredShot(shot), []);

  const handleTracePoint = useCallback((x: number, z: number) => {
    setPoints((prev) => [...prev, [x, z]]);
  }, []);

  const visibleShots = REAL_SHOTS_2025.filter((s) => s.pin === pin);

  // Round stats computed from the real data for the selected pin.
  const stats = useMemo(() => {
    const n = visibleShots.length;
    const outcomes = ["birdie", "par", "bogey", "double+", "water"] as const;
    const counts = Object.fromEntries(outcomes.map((o) => [o, 0])) as Record<(typeof outcomes)[number], number>;
    let carrySum = 0;
    const clubs = new Map<string, number>();
    for (const s of visibleShots) {
      counts[s.outcome] += 1;
      carrySum += s.carryYds;
      if (s.club) clubs.set(s.club, (clubs.get(s.club) ?? 0) + 1);
    }
    const topClubs = [...clubs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return {
      n,
      counts,
      avgCarry: n ? carrySum / n : 0,
      birdiePct: n ? (100 * counts.birdie) / n : 0,
      waterPct: n ? (100 * counts.water) / n : 0,
      topClubs,
      maxCount: Math.max(1, ...outcomes.map((o) => counts[o])),
    };
  }, [visibleShots]);

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
        replayShot={replayShot}
        onReplayDone={handleReplayDone}
        onSelectShot={handleSelectShot}
        autoRotate={embed}
        embed={embed}
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

      {/* top-right controls -- hidden entirely in embed mode */}
      {!embed && (
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

        {/* REPLAY -- chase-cam replay of a random shot; click a landing dot
            to replay that exact shot instead. Click again to cancel. */}
        <button
          onClick={() => {
            if (replayShot) setReplayShot(null);
            else if (visibleShots.length > 0)
              setReplayShot(visibleShots[Math.floor(Math.random() * visibleShots.length)]);
          }}
          style={{
            background: replayShot ? "rgba(251,146,60,0.18)" : "rgba(10,10,10,0.75)",
            border: `1px solid ${replayShot ? "#fb923c" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 6, color: replayShot ? "#fb923c" : "rgba(250,250,250,0.5)",
            fontFamily: "ui-monospace, monospace", fontSize: 11,
            padding: "5px 10px", cursor: "pointer", letterSpacing: "0.06em",
          }}
        >REPLAY</button>

        {/* STATS panel toggle */}
        <button
          onClick={() => setShowStats((v) => !v)}
          style={{
            background: showStats ? "rgba(96,165,250,0.15)" : "rgba(10,10,10,0.75)",
            border: `1px solid ${showStats ? "#60a5fa" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 6, color: showStats ? "#60a5fa" : "rgba(250,250,250,0.5)",
            fontFamily: "ui-monospace, monospace", fontSize: 11,
            padding: "5px 10px", cursor: "pointer", letterSpacing: "0.06em",
          }}
        >STATS</button>

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
      )}

      {/* stats panel -- bottom-left, above the legend */}
      {showStats && !traceMode && !embed && (
        <div style={{
          position: "absolute", bottom: 52, left: 16, zIndex: 15,
          ...HUD_CARD, border: "1px solid rgba(96,165,250,0.3)",
          padding: "10px 12px", width: 236,
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", color: "#60a5fa", fontWeight: 700, marginBottom: 7 }}>
            {pin.toUpperCase()} PIN &middot; {stats.n} TEE SHOTS
          </div>
          {(["birdie", "par", "bogey", "double+", "water"] as const).map((o) => (
            <div key={o} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ width: 46, fontSize: 9, fontFamily: "ui-monospace, monospace", color: "rgba(250,250,250,0.6)", textTransform: "uppercase" }}>
                {o}
              </span>
              <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${(100 * stats.counts[o]) / stats.maxCount}%`,
                  height: "100%", background: OUTCOME_COLOR[o], borderRadius: 3,
                }} />
              </div>
              <span style={{ width: 26, textAlign: "right", fontSize: 9, fontFamily: "ui-monospace, monospace", color: "rgba(250,250,250,0.7)" }}>
                {stats.counts[o]}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 7, fontSize: 9, fontFamily: "ui-monospace, monospace", color: "rgba(250,250,250,0.5)", lineHeight: 1.7 }}>
            birdie {stats.birdiePct.toFixed(0)}% &middot; water {stats.waterPct.toFixed(0)}% &middot; avg carry {stats.avgCarry.toFixed(0)} yds
            {stats.topClubs.length > 0 && (
              <>
                <br />clubs: {stats.topClubs.map(([c, k]) => `${c} (${k})`).join(", ")}
              </>
            )}
          </div>
        </div>
      )}

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
        <div style={{ marginTop: 4, fontSize: 9, color: "rgba(250,250,250,0.35)", textAlign: "right" }}>
          Shot data: pgatour.com &middot; THE PLAYERS Championship 2025
          <br />Personal project &middot; not affiliated with the PGA TOUR
        </div>
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
