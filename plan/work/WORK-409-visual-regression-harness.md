{% work id="WORK-409" status="pending" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,testing,playwright,ci" %}

# Visual-regression harness

A shared Playwright harness that photographs the generated gallery + layout fixtures into
per-theme golden baselines, image-diffed on every PR. This closes the AI iteration loop and —
critically — gives the v0.23.0 skeleton/skin extraction its "diff must be empty" proof. No
screenshot testing exists in the repo today; this is greenfield.

## Scope

- Reusable Playwright config + snapshot test ("load artifact → await `document.fonts.ready` → disable animation → snapshot"), living **once** as a shared harness package/config — not copy-pasted per theme.
- Rune gallery: per-`data-gallery-cell` element clips (a diff localises to the rune). Layout fixtures: whole-page shots per viewport.
- Lumina wires it in with thin **glue only**: a `playwright.config.ts`, committed baselines (`packages/lumina/gallery/__screenshots__/`), an npm script. `--update-snapshots` to refresh.
- Runs in a **pinned container** (Playwright's official image) for deterministic anti-aliasing / font hinting.
- **Distribution:** opt-in, separately-installed package — Playwright / browser binaries must not enter the core install path.

## Acceptance Criteria

- [ ] A shared harness snapshots both subjects (rune clips per mode; layout pages per viewport) into committed per-theme baselines.
- [ ] Lumina has baseline coverage for all runes and the four existing layouts; the suite runs in CI in a pinned container.
- [x] A second theme could adopt it with config + baselines + script only (no logic copy).
- [x] The harness ships as an opt-in package; the core CLI / runtime install pulls no browser binaries.

## Dependencies

- Requires {% ref "WORK-407" /%} and {% ref "WORK-408" /%} (the subjects to photograph).
- The gallery now inlines behaviors ({% ref "WORK-416" /%}), so the harness must **wait for behaviors to settle** before shooting and **exclude the network-dependent runes** (`map` tiles, `sandbox` external iframe/CDN) from deterministic baselines (stub/skip). Synchronous runes (PE runes, `diagram`, `chart`, `nav`) baseline fine after settle.

## References

- {% ref "SPEC-094" /%} · Playwright · `packages/lumina/`.

{% /work %}
