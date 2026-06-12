{% work id="WORK-411" status="done" priority="high" complexity="complex" source="SPEC-102" milestone="v0.22.0" tags="fixtures,runes,cli,tooling" %}

# Fixture format, loader & generated manifest

The foundation of {% ref "SPEC-102" /%}: pin down the fixture format and unify the four
fragmented stores into one source the CLI, gallery, editor, and reference all read. The
WORK-407 gallery exposed the cost of the status quo — `getFixture` reads only
`cli/lib/fixtures.ts` (13 runes), ignores `RUNE_EXAMPLES` (24), and 25 runes fall back to a
naive stub that renders wrong (`<p>` inside an inline `badge` span).

## Scope

- **Format** — Markdoc `.md` + validated YAML frontmatter (`rune`, `title`, `description`, `role`, `attributes`, `demonstrates`, `notes`) per SPEC-102 §1–2; `<rune>.md` / `<rune>.<scenario>.md` filenames (multiple scenarios per rune). A frontmatter validator.
- **Loader** — upgrade `discoverPluginFixtures` to parse frontmatter + scenarios, backward-compatible with bare `.md` (no frontmatter → defaults).
- **Single source** — core fixtures live in `packages/runes/fixtures/**.md`; a build step compiles them into a generated manifest that *replaces* the hand-authored `RUNE_EXAMPLES`, drift-guarded like {% ref "WORK-406" /%}'s token CSS. Existing content (`RUNE_EXAMPLES` + `cli/lib/fixtures.ts`) is migrated mechanically so nothing breaks (content *quality* gaps are {% ref "WORK-412" /%}).
- **Consumer rewiring** — `getFixture` (CLI) + the gallery resolve from the unified manifest (plugin fixture → manifest → stub); the `cli/lib/fixtures.ts` duplicate retires; editor + reference read the same manifest.

## Acceptance Criteria

- [x] The `.md` fixture format + `packages/runes/fixtures/` source dir are established (YAML frontmatter block + Markdoc body); existing `RUNE_EXAMPLES` + `cli/lib/fixtures.ts` content migrated with none lost.
- [x] `RUNE_EXAMPLES` is generated from `fixtures/*.md` at build time (frontmatter stripped, keyed by filename), guarded by a drift test; the hand-authored `examples.ts` is retired.
- [x] Loaders strip frontmatter (generator + `discoverPluginFixtures`), backward-compatible with bare `.md` fixtures.
- [x] `getFixture` / gallery / editor / `reference` resolve from the unified `RUNE_EXAMPLES` (plugin → manifest → stub); the `cli/lib/fixtures.ts` hardcoded set is removed.

(Frontmatter *field* parsing/validation — `role`, `attributes` — and `<rune>.<scenario>.md` scenarios are consumed in {% ref "WORK-412" /%}, so they land there.)

## References

- {% ref "SPEC-102" /%} · `packages/runes/src/examples.ts` (`RUNE_EXAMPLES`) · `packages/cli/src/lib/fixtures.ts` · `discoverPluginFixtures` in `packages/runes/src/plugins.ts` · generation precedent {% ref "WORK-406" /%}.

## Resolution

Completed: 2026-06-12

Branch: `claude/spec-102-fixture-corpus` (atop the WORK-407 gallery).

### What was done
- **`packages/runes/fixtures/*.md`** — new single source for core fixtures. Seeded by migrating the union of `RUNE_EXAMPLES` (27) + the CLI's `cli/lib/fixtures.ts` (13) → **29 `.md` files** (frontmatter `rune:` block + Markdoc body), none lost.
- **`scripts/generate-examples.mjs`** (runes) — reads `fixtures/*.md`, strips the frontmatter block, and emits `src/examples.ts` (`RUNE_EXAMPLES`, keyed by filename). Wired into the package build as `node scripts/generate-examples.mjs && tsc`. `src/examples.ts` is now a generated artifact with a "do not edit" header.
- **`test/examples-generation.test.ts`** — drift guard (committed `examples.ts` must equal generated output) + `stripFrontmatter` unit tests.
- **`getFixture`** (`packages/cli/src/lib/fixtures.ts`) — the ~120-line hardcoded `fixtures` object is removed; it now sources from the unified `RUNE_EXAMPLES` (`@refrakt-md/runes`). The gallery + `inspect` improve for free; the editor + `reference` already consumed `RUNE_EXAMPLES`, so they rewire automatically.
- **`discoverPluginFixtures`** (`packages/runes/src/plugins.ts`) — strips a leading frontmatter block from plugin `.md` fixtures (so it never leaks into rendered content); bare fixtures unaffected.

### Impact
- Gallery core-fixture coverage jumped **13 → 26** of 51 runes (the rest are the 25 WORK-412 will author). `accordion` etc. render correctly.
- Verified: full build clean; **908 runes+cli tests green** (incl. the new drift test); editor/reference unaffected (now see 29 examples vs 27).

### Notes / scope
- WORK-411 establishes the format + single source + generation + rewiring, and **strips** frontmatter. Frontmatter *field* parsing/validation (`role`, `attributes`) and `<rune>.<scenario>.md` scenarios are consumed by {% ref "WORK-412" /%} (where those fields matter for the variant matrix), so they moved there — the ACs were re-scoped accordingly.
- No new runtime dependency (frontmatter is stripped by regex; YAML field parsing arrives with WORK-412).

{% /work %}
