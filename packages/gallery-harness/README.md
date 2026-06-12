# @refrakt-md/gallery-harness

Visual-regression harness for the refrakt gallery (SPEC-094 / WORK-409). It
screenshots the two gallery subjects — **rune cells** (per `data-gallery-cell`,
light + dark) and **layout fixtures** (whole-page, per viewport) — and diffs
them against a baseline.

**Opt-in.** This package carries the only Playwright/browser dependency in the
repo; nothing in the CLI or runtime install path depends on it.

## Baselines are ephemeral — not committed

We deliberately **do not commit golden PNGs**. The fixtures and theme CSS churn
constantly (new fixtures, restyles), so committed goldens would mean endless
binary diffs and a re-baseline commit on nearly every PR — noise that trains
everyone to ignore the check.

Instead the baseline is **whatever you're comparing against in the moment**, and
`__screenshots__/` is gitignored. Two ways to use it:

**Capture-then-compare (local working session).** The before/after tool for a
restyle, or the AI iteration loop:

```bash
npm run build                                   # build the CLI the harness drives
npm run update -w @refrakt-md/gallery-harness   # capture the current state
# …make your change…
npm test   -w @refrakt-md/gallery-harness       # diff against the capture
```

**Prove-inert (a refactor that should change nothing).** The empty-diff proof
for the skeleton/skin extraction (WORK-410) or pure token plumbing — capture on
the base, switch to your branch, diff:

```bash
git switch main && npm run build && npm run update -w @refrakt-md/gallery-harness
git switch my-branch && npm run build && npm test -w @refrakt-md/gallery-harness
# a non-empty diff means the "inert" refactor wasn't inert
```

Requires a browser, so run it in the pinned container
(`mcr.microsoft.com/playwright:v1.60.0-jammy`) or after `npm run install-browser`.

## CI (follow-up)

The intended CI job is **compare-against-base**: render the gallery on the PR's
merge-base and on the PR head, diff, and **report** the result —

- **Informational by default.** A non-empty diff uploads the diff images / posts
  a summary ("14 cells changed across `hint`, `badge`; 1 layout") and **passes**.
  Visual changes are usually legitimate; the diff is a review aid, not a gate.
- **Opt-in `expect-empty`** for refactors that assert zero visual change, where a
  non-empty diff *is* a failure.

This compare-against-base automation isn't built yet (it needs a browser to
develop against); the reusable test logic and the local workflows above are.

## What it shoots

- Rune gallery → per-`data-gallery-cell` element clips, per mode.
- Layouts → whole-page, per mode × viewport.
- `fonts.ready` + a behaviors-settle wait; network/iframe runes (`map`,
  `sandbox`, `embed`) excluded (non-deterministic).

## Adding a theme

Add a sibling spec mirroring `tests/lumina.spec.ts`: generate that theme's
gallery and call `registerGalleryTests` with its artifacts — no logic copy.
