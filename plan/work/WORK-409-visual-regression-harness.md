{% work id="WORK-409" status="pending" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,testing,playwright,ci" %}

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

- [ ] A reusable harness screenshots both subjects (rune clips per mode; layout pages per mode × viewport), diffs against a baseline, and runs end-to-end in the pinned container.
- [x] Baselines are ephemeral (`__screenshots__/` gitignored) — no committed golden PNGs; capture-then-compare + prove-inert workflows are documented.
- [x] A second theme could adopt it with a spec + script only (no logic copy).
- [x] The harness ships as an opt-in package; the core CLI / runtime install pulls no browser binaries.
- [ ] CI compare-against-base job: informational by default, opt-in `expect-empty` (follow-up — browser-dependent).

## Dependencies

- Requires {% ref "WORK-407" /%} and {% ref "WORK-408" /%} (the subjects to photograph).
- The gallery now inlines behaviors ({% ref "WORK-416" /%}), so the harness must **wait for behaviors to settle** before shooting and **exclude the network-dependent runes** (`map` tiles, `sandbox` external iframe/CDN) from deterministic baselines (stub/skip). Synchronous runes (PE runes, `diagram`, `chart`, `nav`) baseline fine after settle.

## References

- {% ref "SPEC-094" /%} · Playwright · `packages/lumina/`.

{% /work %}
