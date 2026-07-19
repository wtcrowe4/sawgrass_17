# HANDOFF -- Window A: Geometry polish (sawgrass_17)

Read `CLAUDE.md` first. It is accurate. This doc = your task list + exit criteria.
Master plan: `~/dev/thomascrowe/.claude/SHIP_PLAN.md`. Timeline: Phase 1 (days 1-4). Ship pressure is real -- polish, not perfection.

## Setup check (do first)

```bash
npm ci && npm run typecheck   # must be green before any edits
PORT=3001 npm run dev         # verify scene renders at localhost:3001
```

## Tasks (priority order, from CLAUDE.md pending list)

1. **Grandstands** -- removed earlier, need proper placement. Reference: `reference-photos/image1.jpg`, `image7.jpg`. Low-poly boxes with roof planes are fine; broadcast-stylized, not photoreal. Screen-right of green (world -x). Verify against satellite overlay (ROT already calibrated at -26).
2. **Tree island east of green** -- completely missing, visible in reference photos. World +x side. Reuse Background.tsx tree silhouette approach or simple cone/sphere clusters.
3. **Tee box x-offset** -- slightly left-of-center in real life. Small change in TeeBox.tsx position + verify tracer origins in sample-shots still look right.
4. **Green polygon refinement** -- tongue could be wider. Edit `makeGreenShape()` points in `lib/golf/geometry.ts`. HIGH-CONFLICT FILE: you are the only agent allowed in it. After edit: verify file ends with `}`, run typecheck, check fringe offset still hugs green.
5. **Pin colors per day** -- flag tint per pin position (sunday/thursday/friday/saturday). Pin.tsx + PIN_POSITIONS. Pick 4 distinct colors that read against sky; keep outcome color map untouched.

## Exit criteria (GEOMETRY FREEZE)

- All 5 tasks done, typecheck zero errors, visual check vs reference photos + satellite overlay.
- Commit, tag: `git tag geo-freeze && git push origin main --tags`
- Announce freeze in `~/dev/thomascrowe/.claude/SHIP_PLAN.md` (append line with date) so Window B starts the copy.

## Do NOT

- Use browser / Playwright / screenshot tools to verify the scene. This runs in WSL with NO GPU, so WebGL falls back to software rendering (swiftshader) and pins every CPU core for 30+ minutes without finishing. Verify with `npm run typecheck` and `npm run build` ONLY. Visual review of the rendered scene is the human's job in a real Windows browser at localhost:3001 -- that is why the exit criteria say "stop and report."
- Start splat/DataGolf/postprocessing work (cut list).
- Touch thomascrowe repo.
- Edit Sawgrass17Client.tsx HUD beyond pin color legend if needed.
