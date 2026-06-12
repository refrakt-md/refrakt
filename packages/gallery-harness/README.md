# @refrakt-md/gallery-harness

Visual-regression harness for the refrakt gallery (SPEC-094 / WORK-409). It
screenshots the two gallery subjects — **rune cells** (per `data-gallery-cell`,
light + dark) and **layout fixtures** (whole-page, per viewport) — and diffs
them against committed per-theme golden baselines.

**Opt-in.** This package carries the only Playwright/browser dependency in the
repo; nothing in the CLI or runtime install path depends on it.

## What it does

1. `globalSetup` runs `refrakt gallery --site main` → `.artifacts/` (rune
   gallery + the four layout fixtures, light/dark).
2. `tests/lumina.spec.ts` registers screenshots via the shared
   `registerGalleryTests` (`src/harness.ts`):
   - rune gallery → per-cell element clips, per mode;
   - layouts → whole-page, per mode × viewport.
3. Network/iframe runes (`map`, `sandbox`, `embed`) are excluded — their output
   isn't deterministic.

## Running

Requires a browser, so it runs in CI's pinned container
(`mcr.microsoft.com/playwright:v1.60.0-jammy`) or locally after
`npm run install-browser`:

```bash
npm run build                                  # build the CLI the harness drives
npm run update -w @refrakt-md/gallery-harness  # capture / refresh baselines
npm test   -w @refrakt-md/gallery-harness      # verify against baselines
```

Baselines live under `__screenshots__/<theme>/…` and are platform-free (the
pinned container fixes rendering), so they're portable between CI and a matching
local container.

## Why it matters

This is the empty-diff proof for the SPEC-094 skeleton/skin extraction
(WORK-410 / v0.23.0) and ratifies the WORK-405 typography normalization: capture
the baseline, refactor, re-shoot — the diff must be empty.

## Adding a theme

Add a sibling spec mirroring `lumina.spec.ts`: generate that theme's gallery and
call `registerGalleryTests` with its artifacts. Baselines namespace by `theme`.
