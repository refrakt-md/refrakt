{% work id="WORK-710" status="done" priority="medium" complexity="moderate" tags="runes, source, comments, docs" milestone="v0.48.0" pr="refrakt-md/refrakt#773" %}

# Rune source files carry comments only where the code would mislead

The rune intro's Source drawer shows every rune's source file to readers. Those files carried
2,278 comment lines against 13,095 lines of code, 382 of them citing specs, work items, bugs and
ADRs: history and cross-references written for whoever was implementing, not for someone reading
the rune. The `call-to-action` alias was also dropped by omission when `cta` went live, not by a
decision, and comes back.

## Acceptance Criteria
- [x] Comments in `packages/runes/src/tags/*.ts` and every plugin's `src/tags/*.ts` are removed, except tool directives (`biome-ignore`, `@ts-…`, `eslint-…`, `@deprecated`) and a one-line comment where the code would otherwise mislead
- [x] No comment or user-facing string in those files, or in a plugin's `runes/*.md`, cites a plan entity, except an ID given as an example of its format; a test enforces it
- [x] The composed `cta` declares `aliases: [call-to-action]`; the `refrakt migrate cta` codemod, its test and its docs are removed, and the unreleased changeset says the alias stays
- [x] Builds, tests, contracts and the generated rune data are unchanged apart from the rewritten descriptions

## Resolution

Completed: 2026-11-04

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#773

### What was done
- Removed 1,423 comments (2,290 lines) from `packages/runes/src/tags/*.ts` and every plugin's `src/tags/*.ts` with a TypeScript-aware pass; kept tool directives and added back eight one-line comments where the code would mislead.
- Rewrote user-facing strings citing plan entities (attribute descriptions, error messages, a deprecation warning, the composed definitions' descriptions).
- `packages/runes/test/rune-source-plan-ids.test.ts` keeps plan IDs out of rune source (IDs given as format examples excepted).
- `plugins/marketing/runes/cta.md` declares `aliases: [call-to-action]`; `refrakt migrate cta`, its test and its docs mention removed; the unreleased changeset updated.

### Notes
- Scope is the files the Source drawer shows. `packages/runes/src/lib/` and the other packages carry the same comment style and are untouched.

{% /work %}
