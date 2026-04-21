{% work id="WORK-158" status="draft" priority="medium" complexity="simple" tags="plan, cli, tooling, conventions" %}

# Adopt `{ID}-{slug}.md` filename convention for plan items

Plan files currently live under `plan/{work,specs,decisions}/` with slug-only filenames (e.g. `plan-validate-command.md`). The ID (`WORK-033`) lives in the `{% work %}` frontmatter tag but doesn't appear in the filename. A few recent items (WORK-149 through WORK-156) started prefixing the ID, producing an inconsistent mix: 8 prefixed vs. 196 unprefixed across work/specs/decisions.

Standardising on `{ID}-{slug}.md` for every auto-ID type (work, bug, spec, decision) makes files grep-friendly, gives unambiguous references in commits/PRs/chat ("see WORK-158" points at exactly one file without a frontmatter scan), and sorts items by ID naturally in directory listings. Milestones keep their semver names (`v1.0.0.md`) since they don't use the numeric ID scheme.

## Acceptance Criteria

- [ ] `runCreate()` in `runes/plan/src/commands/create.ts` emits `{ID}-{slug}.md` for auto-ID types (work, bug, spec, decision); milestones still emit `{slug}.md`
- [ ] `runes/plan/test/create.test.ts` asserts the new filename format for each auto-ID type and that milestones are unchanged
- [ ] All 196 existing unprefixed files under `plan/work/`, `plan/specs/`, `plan/decisions/` are renamed to `{ID}-{slug}.md` via `git mv` (preserves history) in a single migration commit
- [ ] `refrakt plan validate` warns when a file's filename prefix doesn't match its frontmatter `id` attribute (or its `name` for milestones, which should pass through unchanged)
- [ ] `plan/INSTRUCTIONS.md` documents the filename convention under a new "Filename Convention" section alongside the existing "ID Conventions" table
- [ ] `CLAUDE.md`'s Plan section mentions the convention so agents creating new items match it
- [ ] Full test suite passes (`npm test`)
- [ ] Manual verification: `npx refrakt plan create work --title "Test item"` produces `plan/work/WORK-159-test-item.md`

## Approach

1. **CLI change** (`runes/plan/src/commands/create.ts`): in `runCreate`, after computing the `slug`, prepend the ID for auto-ID types — `const fileName = isAutoIdType(type) ? ${id}-${slug}.md : ${slug}.md;`. Reuse the existing `isAutoIdType` import from `./next-id.js`.

2. **Migration**: write a one-shot script (discarded after use, not checked in) that walks `plan/work`, `plan/specs`, `plan/decisions`, reads the frontmatter ID from each file, and runs `git mv {file} {dir}/{ID}-{existing-slug}.md` for any file that isn't already prefixed. Run it, review the diff, commit as "plan: rename files to {ID}-{slug}.md convention". The rename is mechanical — no file contents change.

3. **Validator**: in `runes/plan/src/commands/validate.ts`, add a check that extracts the ID prefix from each filename (regex `^(WORK|BUG|SPEC|ADR)-\d+`) and compares against the frontmatter ID. Mismatch → warning with both values. Skip milestones. Add a test in `runes/plan/test/` with a fixture pair (matching + mismatched).

4. **Docs**: add a short "Filename Convention" section to `plan/INSTRUCTIONS.md` directly after the ID Conventions table. Update the Plan section of `CLAUDE.md` to mention the convention in a single sentence near the existing ID-prefix guidance.

5. Verify no tooling reads plan files by filename rather than frontmatter scan — `scanPlanFiles` in `runes/plan/src/scanner.ts` is the canonical path and already keys off frontmatter, so CLI commands (`update`, `next`, `status`, `history`) are unaffected. Double-check any site-rendering code under `site/` that links to plan files.

## Risks

- Outbound links to specific plan files (from site pages, README snippets, external URLs) will break. Grep for `plan/work/`, `plan/specs/`, `plan/decisions/` across the repo before the migration commit and update any hard-coded references.
- Open PRs touching plan files will get merge conflicts. Low impact given the short review window — coordinate or rebase on merge.

## References

- Current naming inconsistency: 8 prefixed work items (WORK-149–156) vs. 149 unprefixed; 0/38 specs prefixed; 0/9 decisions prefixed
- `runes/plan/src/commands/create.ts` — where the filename is generated
- `runes/plan/src/scanner.ts` — frontmatter-based scan used by all other CLI commands (unaffected by rename)

{% /work %}
