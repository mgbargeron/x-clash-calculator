# AGENTS.md

## Purpose
Work only on the user's requested task. Prefer the smallest correct change.

## Rules
- Read only files directly relevant to the task.
- Ask for clarification if the task is ambiguous.
- Prefer existing patterns over introducing new abstractions.
- Keep edits minimal, local, and reversible.
- Do not rename/move files unless necessary.
- Do not add dependencies unless explicitly justified.

## Stack
Electron 41 + React 19 + Vite 8 + TypeScript (strict). Single package, no monorepo.

## Commands
- `npm run dev` — starts Vite (port 5173) and Electron via `concurrently`. Electron waits for Vite with `wait-on`.
- `npm run build` — Vite production build only (writes to `dist/`).
- `npm run dist:mac` — build + package macOS DMG via electron-builder.
- `npm run dist:win:x64` — build + package Windows NSIS installer.
- No test runner, linter, or formatter is configured. Verification is `tsc --noEmit` (already the default) and visual inspection in dev.

## Project structure
- `src/` — all TypeScript/React source. `tsconfig.json` includes only `src/`.
- `electron/` — plain JS main and preload processes (not type-checked by tsconfig).
- `src/main.tsx` — React entrypoint, mounts `<App />` into `#root`.
- `src/App.tsx` — top-level state (page routing, grid values persisted to localStorage).
- `src/pages/` — three pages: `CalculatorPage`, `HeroExpPage`, `GameMapPage`.
- `src/components/gameMap/` — game map board, toolbar, tiles, scoring.
- `src/utils/` — pure helpers (decimal arithmetic via `decimal.js`, input sanitization, map config).
- `src/hooks/` — custom hooks (localStorage sync, scrolling, point summaries).
- `dist/` and `releases/` — gitignored build/packaging output.

## Electron IPC
- Preload exposes `window.electronAPI` with `getMapData()` and `setMapData(data)`.
- Main process persists `game-map-data.json` in Electron's `userData` directory.
- Dev mode loads Vite dev server URL; production loads `dist/index.html`.

## Map identity
- Game map team references must use stable team `id`, not mutable display fields (color, name, code).
- Map tiles, toolbar selection state, and score summaries should join rivals/enemies by team id only.
- If stored map data needs migration, convert legacy display-based references to team ids during normalization.

## Vite quirks
- `base` is set to `'./'` (relative paths) so the built app works from the Electron file:// protocol.
