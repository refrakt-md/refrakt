{% work id="WORK-387" status="done" priority="low" complexity="simple" source="SPEC-092" milestone="v0.21.0" tags="registry,tooling,ci,runes" %}

# Rune-doc drift guardrail

Frontmatter-driven catalogues can drift from code — add a `defineRune` without a
doc page and it silently vanishes from the generated catalogue. Turn that into a
build signal. Fast-follow to the catalogue work.

## Acceptance Criteria
- [x] A check (a `refrakt inspect` mode and/or a test) asserts every core `defineRune` and every plugin `Plugin.runes` entry has a corresponding `/runes/<name>` doc page, and flags doc pages with no backing rune.
- [x] Runnable in CI; a missing page is a clear failure naming the rune.

## Dependencies
- {% ref "WORK-385" /%} (establishes the `/runes/<name>` doc-page convention to check against).

## References
- {% ref "SPEC-092" /%} (drift guardrail) · `refrakt inspect --list` / `refrakt reference` (the existing programmatic catalogue)

## Resolution

Completed: 2026-06-11

Branch: `claude/work-385-rune-catalogue`.

### What was done
- `scripts/check-rune-docs.mjs` — the drift guardrail. Loads the active package set's runes (`refrakt inspect --list --site main --json`) and the `/runes` doc tree, then asserts:
  - **Coverage** — every documentable rune has a `/runes/<name>` page (carrying `type: rune`).
  - **Orphans** — every page that declares `type: rune` has a backing rune.
  - **Mislabelled** — a rune page missing its `type: rune` frontmatter.
  Child/internal runes (documented inside a parent's page, or `error`/`region`) are listed in an explicit, parent-annotated `PAGELESS` set — the same "known gaps" pattern as lumina's `KNOWN_MISSING_SELECTORS`. Exits 1 on drift, naming each rune with a fix hint. `npm run runes:check-docs` alias added.
- `scripts/check-rune-docs.test.mjs` — 6 unit tests for the diff logic (missing/orphan/mislabelled/alias/PAGELESS/concept-page handling) + 2 live parity tests over the real package set & doc tree (skipped when the CLI isn't built; runs in CI's `npm test`). Also asserts no `PAGELESS` rune actually has a page, keeping the set honest.
- **CLI enabler** (`@refrakt-md/cli`): `reference list` / `dump` / `<name>` gained `--site`. Previously `buildReferenceContext` only read the flat `config.plugins`, so on a multi-site config it silently returned core-only; it now resolves the named site's plugins (via `resolveSite`), which is what lets the guardrail see plugin runes. Graceful core-only fallback preserved when `--site` is omitted on a multi-site config.

### Verification
- `node scripts/check-rune-docs.mjs` → green ("rune docs in parity"). The guardrail test passes (8). `reference list --site main` now returns 116 runes across all 9 plugins (was core-only). All runes/cli/scripts suites pass (904).

{% /work %}
