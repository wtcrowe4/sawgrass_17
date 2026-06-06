# Multi-Agent Workflow -- Sawgrass 17

## How to run isolated (recommended)

Launch with the worktree flag so each session gets its own git branch:

  claude --worktree

Claude Code will create a branch like `worktree/session-<id>`, clone only the
working tree (node_modules and .next are symlinked -- see settings.json), and
open a PR when done. This is the safest way to run multiple agents in parallel.

## Component ownership map

If running agents WITHOUT --worktree (on main directly), agree on ownership
before starting. One agent per zone. Do not touch files outside your zone.

| Zone | Files | Notes |
|------|-------|-------|
| Green geometry | lib/golf/geometry.ts, parts/Green.tsx, parts/Bulkhead.tsx | Core shape -- coordinate any polygon changes with all agents |
| Water + terrain | parts/Water.tsx, parts/Terrain.tsx, parts/Shoreline.tsx | Lake shape lives in geometry.ts -- see Green geometry owner first |
| Scene extras | parts/Background.tsx, parts/TreeIsland.tsx, parts/TeeBox.tsx, parts/Bunkers.tsx, parts/Pin.tsx | Additive -- low conflict risk |
| Camera + scene | Sawgrass17.tsx, Sawgrass17Client.tsx, app/page.tsx | One agent at a time -- this is the assembly point |
| Data + types | lib/golf/types.ts, data/sample-shots.ts | Schema changes require all agents to update their usages |
| Tracers | parts/Tracers.tsx | Animation-only -- safe to isolate |

## Conflict rules

1. geometry.ts is the highest-conflict file -- it feeds every component.
   Treat it as a critical section. One agent edits at a time.

2. Sawgrass17.tsx is the scene root -- edit last, after all parts are stable.

3. Always run `npm run typecheck` before considering a task done.

4. File hygiene is mandatory -- no Unicode, no nulls. See CLAUDE.md.

## Lock file convention (without --worktree)

When starting work on a file, add a line to LOCK.tmp at the repo root:

  echo "agent-name: path/to/file" >> LOCK.tmp

Remove your lines when done. If a file appears in LOCK.tmp, ping the other
agent before editing. Delete LOCK.tmp entirely when all agents are finished.
