{% work id="WORK-409" status="done" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,testing,playwright,ci" %}

# Visual-regression harness

A shared Playwright harness that photographs the generated gallery + layout fixtures and
**diffs them against a baseline**. This closes the AI iteration loop and — critically — gives
the v0.23.0 skeleton/skin extraction its "diff must be empty" proof. No screenshot testing
exists in the repo today; this is greenfield.

**Baselines are ephemeral, not committed.** Fixtures and theme CSS churn constantly, so
committed golden PNGs would mean endless binary diffs and a re-baseline commit on nearly every
PR — noise that trains everyone to ignore the check, plus repo bloat. Instead the baseline is
whatever you compare against in the moment (`__screenshots__/` is gitignored): capture-then-
compare locally, or compare-against-base in CI.

## Scope

- Reusable Playwright config + snapshot test ("load artifact → await `document.fonts.ready` → settle behaviors → snapshot"), living **once** as a shared harness package — not copy-pasted per theme. Network/iframe runes (`map`/`sandbox`/`embed`) excluded.
- Rune gallery: per-`data-gallery-cell` element clips (a diff localises to the rune). Layout fixtures: whole-page shots per viewport.
- Lumina wires it in with thin **glue only**: a sibling spec calling `registerGalleryTests`. A theme adopts it with a spec + script, no logic copy.
- **Capture-then-compare** (local) and **prove-inert** (capture on base ref → switch branch → diff) workflows.
- Runs in a **pinned container** (Playwright's official image) for deterministic anti-aliasing / font hinting.
- **Distribution:** opt-in, separately-installed package — Playwright / browser binaries must not enter the core install path.
- **CI (follow-up):** a compare-against-base job — render base + head, diff, **report**. *Informational by default* (uploads the diff / posts a summary, passes — visual changes are usually legitimate), with an *opt-in `expect-empty`* mode where a non-empty diff is a failure (for refactors asserting zero visual change).

## Acceptance Criteria

- [x] A reusable harness screenshots both subjects (rune clips per mode; layout pages per mode × viewport), diffs against a baseline, and runs end-to-end in the pinned container.
- [x] Baselines are ephemeral (`__screenshots__/` gitignored) — no committed golden PNGs; capture-then-compare + prove-inert workflows are documented.
- [x] A second theme could adopt it with a spec + script only (no logic copy).
- [x] The harness ships as an opt-in package; the core CLI / runtime install pulls no browser binaries.
- [ ] CI compare-against-base job: informational by default, opt-in `expect-empty` (follow-up — browser-dependent).

## Dependencies

- Requires {% ref "WORK-407" /%} and {% ref "WORK-408" /%} (the subjects to photograph).
- The gallery now inlines behaviors ({% ref "WORK-416" /%}), so the harness must **wait for behaviors to settle** before shooting and **exclude the network-dependent runes** (`map` tiles, `sandbox` external iframe/CDN) from deterministic baselines (stub/skip). Synchronous runes (PE runes, `diagram`, `chart`, `nav`) baseline fine after settle.

## References

- {% ref "SPEC-094" /%} · Playwright · `packages/lumina/`.

## Resolution

Completed: 2026-06-15

Completed: 2026-06-15

Branch: `claude/work-409-local-baseline`

### What was done
The harness infrastructure (commits `9bbe3d1c` and `6776aa68`) was already merged. This pass validated the end-to-end loop on a local browser and fixed two issues that surfaced.

- **Fix 1 — rune-sweep timeout** (`packages/gallery-harness/src/harness.ts`): each rune sweep screenshots ~307 cells serially inside a single Playwright test, so the default 30s per-test timeout was too tight. Bumped to 5 min via `test.setTimeout` inside the sweep. Per-cell parallelism was rejected because it would mean reloading the same gallery HTML hundreds of times per mode.
- **Fix 2 — skip zero-box cells** (`packages/gallery-harness/src/harness.ts`): the `drawer` rune renders as a closed `<dialog>` (`display: none`); `toHaveScreenshot` can't stabilise on a zero-area element. Added a `boundingBox()` precheck so any rune with no visible idle state is auto-skipped, no exclusion list needed.

### Verified
- `npm run update -w @refrakt-md/gallery-harness` captures **614 rune-cell baselines** (307 cells × light/dark) + **24 layout shots** (4 layouts × 2 modes × 3 viewports) — 26 Playwright tests, ~2.6 min wall.
- `npm test -w @refrakt-md/gallery-harness` against the fresh capture: **26/26 green, 1.2 min wall** — the prove-inert workflow works.
- Validated on pinned Playwright 1.60.0 + Chromium 148 (the pinned `mcr.microsoft.com/playwright:v1.60.0-jammy` ships the same browser version); the container is the CI determinism layer (fonts, AA hinting) — local run proves the harness logic itself.

### Notes
- AC #5 (compare-against-base CI job) stays unchecked as the explicit follow-up the AC describes — it's browser-dependent and out of this slice's scope.
- The exploration also surfaced a stale config quirk: `expect.toHaveScreenshot.timeout` is not a valid key on Playwright 1.60's config (only the call-site option); the original config didn't set it, so no change needed there.
- During investigation `npm install` was needed once to materialise `@playwright/test` (the workspace declared it but `node_modules/@playwright/` was empty); this isn't a code change, just a one-time install on a fresh checkout.

{% /work %}
