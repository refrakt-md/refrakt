{% work id="WORK-411" status="ready" priority="high" complexity="complex" source="SPEC-102" milestone="v0.22.0" tags="fixtures,runes,cli,tooling" %}

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

- [ ] The `.md` + frontmatter format is implemented with a frontmatter validator; `<rune>.md` and `<rune>.<scenario>.md` both load.
- [ ] The loader parses frontmatter + scenarios and stays backward-compatible with bare `.md` fixtures.
- [ ] Core fixtures live in `packages/runes/fixtures/**.md`; a generated manifest replaces hand-authored `RUNE_EXAMPLES`, guarded by a drift test; existing `RUNE_EXAMPLES` + `cli/lib/fixtures.ts` content is migrated with none lost.
- [ ] `getFixture`, the gallery, the editor, and `reference` resolve from the unified manifest (plugin → manifest → stub); the `cli/lib/fixtures.ts` duplication is removed.

## References

- {% ref "SPEC-102" /%} · `packages/runes/src/examples.ts` (`RUNE_EXAMPLES`) · `packages/cli/src/lib/fixtures.ts` · `discoverPluginFixtures` in `packages/runes/src/plugins.ts` · generation precedent {% ref "WORK-406" /%}.

{% /work %}
