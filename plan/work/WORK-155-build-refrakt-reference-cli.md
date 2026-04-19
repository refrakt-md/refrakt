{% work id="WORK-155" status="ready" priority="high" complexity="moderate" tags="cli, runes, ai-workflow" source="SPEC-041" %}

# Build refrakt reference CLI commands

> Ref: {% ref "SPEC-041" /%} (Commands section)

## Summary

The user-facing surface of SPEC-041: three subcommands under `refrakt reference` that emit rune syntax docs derived from the now-shared infrastructure (WORK-149), the content-model renderer (WORK-150), and the attribute preset registry (WORK-151).

- `refrakt reference <name>` — print one rune's syntax reference
- `refrakt reference list` — enumerate available runes
- `refrakt reference dump` — write the full reference to a file (default `AGENTS.md`)

## Acceptance Criteria

- [ ] `packages/cli/src/commands/reference.ts` exists, exporting the three subcommand handlers
- [ ] Wired into the CLI entry point alongside `inspect`, `contracts`, `validate`
- [ ] `refrakt reference <name>` prints markdown by default; `--format json` emits the structured `RuneInfo` shape with `attributes.own`, `attributes.base`, `attributes.universal`, `contentModel`, `authoringHints`, `example`
- [ ] `refrakt reference <name>` exits 1 with a clear message when the rune isn't recognised in the merged config; exits 2 on invalid args / missing config
- [ ] `refrakt reference list` groups runes by source package; supports `--package <name>` filter; supports `--format json`
- [ ] `refrakt reference dump` writes a complete reference document to `--output` (default `AGENTS.md`); supports `--format markdown` (default) and `--format json`
- [ ] `refrakt reference dump --check` exits 1 if the output file is out of date relative to the current config (CI gate)
- [ ] Dump output hoists universal attributes and registered presets into dedicated top-level sections so per-rune blocks reference them by name instead of repeating definitions
- [ ] Dump preserves any `--section`-named block in an existing file rather than clobbering it (so users can interleave human notes)
- [ ] All commands respect `--config <path>` to locate `refrakt.config.json`; defaults to cwd
- [ ] Tests cover each subcommand: golden-file tests for markdown output, structural assertions for JSON output, exit-code tests for error paths

## Approach

1. Create `packages/cli/src/commands/reference.ts` with three exported handlers.
2. The handlers load the project's `refrakt.config.json`, run `mergePackages()` to get the full rune set, then call `describeRune()` (markdown) or build the JSON shape directly.
3. The dump handler emits universal attributes once, then walks every registered preset and emits each once, then per-rune sections that reference the preset names. Use `lookupAttributePreset()` from WORK-151 to identify presets per rune.
4. The `--check` mode runs the same render in-memory and compares to the file contents (string equality); exit 1 with a diff hint on mismatch.
5. Wire the new commands into `packages/cli/src/index.ts` (or wherever subcommand registration lives).
6. Tests in `packages/cli/test/commands/reference.test.ts`.

## Dependencies

- WORK-149 (shared infrastructure)
- WORK-150 (content-model renderer)
- WORK-151 (attribute preset registry)
- WORK-153 (final field name for `authoringHints`)

## References

- {% ref "SPEC-041" /%} — Commands section
- {% ref "SPEC-022" /%} — Plan CLI (pattern for namespaced subcommands and `--format json`)

{% /work %}
