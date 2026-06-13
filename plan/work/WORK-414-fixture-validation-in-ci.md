{% work id="WORK-414" status="done" priority="medium" complexity="moderate" source="SPEC-102" milestone="v0.22.0" tags="fixtures,testing,ci" %}

# Fixture validation in CI

Guard the corpus: parse the frontmatter *fields* (the format established in {% ref "WORK-411" /%}
strips the block; this work consumes it), validate them against the schema, support
`<rune>.<scenario>.md` scenarios, and ensure every fixture parses + transforms. `plugin-validate`
reports `role` coverage instead of only warning "no fixture".

## Acceptance Criteria

- [x] Frontmatter fields (`role`, `attributes`, `demonstrates`, `notes`) are parsed into the manifest and `<rune>.<scenario>.md` scenarios load.
- [x] A CI test parses + transforms every fixture in the corpus and fails on errors.
- [x] Frontmatter is validated against the field schema (unknown keys / wrong types rejected).
- [x] `plugin-validate` reports role coverage (e.g. "rune X has no `canonical` fixture").

## Dependencies

- Requires {% ref "WORK-411" /%} (format + loader).

## References

- {% ref "SPEC-102" /%} · `packages/cli/src/commands/plugin-validate.ts`.

## Resolution

Completed: 2026-06-13

Branch: `claude/spec-106-image-src-schemes` (continued — fixture-validation work).

### What was done
- Added `packages/runes/src/fixtures.ts` — the fixture field schema + parser: `FIXTURE_ROLES`, `splitFixture`, `parseFixtureFilename` (`<rune>.<scenario>.md` → rune + scenario), `validateFixtureFrontmatter` (rejects unknown keys + wrong types), and `parseFixture` (YAML via the `yaml` package; throws on malformed/invalid frontmatter). Exported from `@refrakt-md/runes`. Added `yaml@2.8.2` to the runes deps.
- Upgraded the loader (`packages/runes/src/plugins.ts`): new `discoverPluginFixtureManifest` parses every `<rune>.md` / `<rune>.<scenario>.md` into `ParsedFixture[]`; `discoverPluginFixtures` now derives its `rune → body` map from the manifest (canonical scenario wins), staying backward-compatible with bare fixtures.
- Added `packages/runes/test/fixture-corpus.test.ts` — parses + validates + transforms every fixture in `packages/runes/fixtures`, failing on any error-level Markdoc diagnostic; plus direct schema-validator + filename-derivation + frontmatter-strip tests.
- Upgraded `plugin-validate` (`packages/cli/src/commands/plugin-validate.ts`): reads the plugin's `fixtures/` dir, maps each rune to its declared roles (bare/`<rune>.md` defaults to `canonical`), and reports both "no fixture at all" and "has fixtures but no `canonical`". Two new tests in `packages/cli/test/plugin-validate.test.ts`.

### Corpus fix surfaced by the new test
- The `budget` fixture set an undeclared `title=` attribute (the rune derives its title from a preamble H1, not an attribute) — `Markdoc.validate` flagged it as `attribute-undefined`. Replaced it with a `# Tokyo Trip` preamble heading (the supported path) and regenerated `RUNE_EXAMPLES`.

### Notes
- The `showcase` fixture's `shadow="soft"` emits a *deprecation warning* (SPEC-086 → `frame-shadow`) but `frame-shadow` isn't a declared showcase attribute, so swapping it would turn a warning into a validate error. Left as-is — deprecation warnings are valid usage; the corpus check fails only on errors. The SPEC-086 alias/schema gap is out of scope here.
- 1242 tests pass across runes/cli/editor/ai/content.

{% /work %}
