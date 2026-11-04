{% spec id="SPEC-192" status="draft" tags="simplification, cleanup, packaging, lumina, contracts, scripts" %}

# A subtraction pass: dead code, duplicate artifacts and unguarded packages

A sweep that removes what nothing needs any more: duplicated committed artifacts, dead CSS and
code, one-off scripts that have done their job, overdue deprecations that aren't attribute-shaped
(the attribute-shaped ones go through {% ref "SPEC-189" /%}), allowlists that only ever grow, and
two publishable packages the build doesn't guard. Each item is small; the point of one spec is
that they share a rule (D1), so the next sweep isn't needed.

## Why

The rune-to-composition migration deletes code a rune at a time. The rest of the codebase has no
such pressure, so things accumulate: a file kept "for now", a second copy kept in sync by a test,
an allowlist entry for a selector that no rune emits any more. None of them is costly alone. They
are costly together, because each is something a reader has to understand before they can be
sure it's safe to ignore.

## Decisions

### D1 — a list that tolerates gaps also reports entries that no longer apply

`KNOWN_MISSING_SELECTORS` in `packages/lumina/test/css-coverage.test.ts` has ~116 entries, and the
test only checks one direction: an entry that has gained CSS must be removed. An entry for a
selector that is no longer *expected* is never reported, so they pile up. About 60 look stale:

- the `*-badge` and `*__meta-item` entries for spec, work, decision, milestone, bug, symbol,
  character, realm, lore, faction, plot, recipe, howto, budget, event and playlist (badges are now
  `data-name="badge"`);
- `.rf-*__header` for spec, bug, decision, milestone, recipe, budget and event;
- `.rf-testimonial__quote` (testimonial is a composition now);
- comparison and preview preamble/eyebrow/headline/blurb/image entries;
- `.rf-playlist__eyebrow` and `.rf-playlist__image`, which are listed twice.

The test gains the reverse check, and the stale entries go. The same rule applies to every
allowlist or pending-list in the suite: `UNSTYLED_BLOCKS`, `NOT_YET_STAGED` in
`staging-convention.test.ts`, and the plugin-vocabulary lists.

### D2 — a generated artifact is committed once

`contracts/structures.json` and `packages/lumina/contracts/structures.json` are byte-identical
8,716-line files, held together by `packages/lumina/test/contracts.test.ts` and an instruction in
`CLAUDE.md` to regenerate both. The root copy is deleted; `refrakt contracts -o` and `--check` in
this repo point at Lumina's copy, and `CLAUDE.md` is updated. The root `contracts/` folder keeps
`plugin-vocabulary.json` and `seo-baseline/`.

### D3 — dead code and CSS go

- `packages/lumina/styles/runes/plan-ref.css` and its import (`lumina/index.css:143`): nothing
  emits `rf-plan-ref`.
- `readPropText` (`packages/runes/src/config.ts:71`): no callers.
- `SplitablePageSectionModel = undefined` (`tags/common.ts:8`, re-exported at `index.ts:302`).
- `property` on `TransformResult` (`lib/component.ts:13-17`) and on `EmitsDeclaration`
  (`lib/slots.ts`): marked "removed in the release after" v0.43.0.
- `HeroProps`, `CtaProps`, `TestimonialProps` exported from `plugins/marketing/src/index.ts`,
  if no composition consumer needs them.
- Deprecation labels that are not deprecations: `baseConfig` (~240 references) and
  `SplitLayoutModel` (8 runes) are marked deprecated "during transition" with no transition in
  progress. Either finish the rename or drop the label; a `@deprecated` tag nobody acts on teaches
  readers to ignore the tag.

### D4 — one-off scripts are deleted when their work item is done

- `scripts/validation-blast-radius.mjs` (201 lines): WORK-557 is done, nothing calls it.
- `scripts/backfill-rune-metadata.mjs`: deleted by {% ref "SPEC-188" /%} D5.
- `scripts/sd-validator-spike.mjs`: kept until WORK-629 is decided. If WORK-629 is cancelled, it
  goes with it.

Rule: a script written for a work item names that item in its header, and is deleted in the work
item's last change unless a `package.json` script or workflow calls it.

### D5 — every publishable package is built or private

`packages/language-server` (`@refrakt-md/language-server`) and `packages/vscode` (`refrakt-md`)
have no `"private": true` but are not in the root `build` script, and `vscode` is outside the
changesets `fixed` group. `npm run release` runs `npm run build && changeset publish`, so either
could be published without a `dist`. Each is either added to the build (and, for vscode, to a
deliberate release path) or marked private. A test checks that every non-private workspace
appears in the build script.

`packages/gallery-harness` and `packages/proof-skin` are private, unreferenced by any workflow,
and have no committed snapshots. Decide whether the visual harness is coming back; if not, both go.

### D6 — `config.ts` holds config

`packages/runes/src/config.ts` is 2,836 lines, of which only ~700 are rune config. The remaining
~2,000 are pipeline code (breadcrumb, nav, pagination and blog resolution,
`createCorePipelineHooks`). They move into `*-resolve.ts` modules beside the existing
`xref-resolve.ts` and `collection-resolve.ts`, leaving `config.ts` as data. No lines are saved,
but it makes {% ref "SPEC-188" /%}'s derivation visible: what remains in `config.ts` is exactly
what the schema can't say.

### D7 — plan migrations that are not going to run

- **`plan migrate pr-attrs`** (~240 lines + 139 test + CLI/MCP wiring): 483 of 684 done or fixed
  items still lack `pr=`, and the backfill reads git merge history that a shallow checkout doesn't
  have. `plan status` already falls back to the legacy `PR:` line. Delete it unless the backfill is
  going to be run.
- **`## Dependencies`**: deprecated by {% ref "SPEC-114" /%}, yet 327 plan files use it (109 use
  `## Blocked by`), and `plan/INSTRUCTIONS.md:131-147` still teaches it. Either run
  `plan migrate dependencies --apply` and fix the instructions, or undeprecate it as a plain alias
  of `## Blocked by` and delete the codemod (~220 lines including tests and wiring). See open
  questions.
- **`refrakt migrate snippets`** (342 lines + 219 test): the {% ref "SPEC-131" /%} D7 one-off. It
  uses `--fix` where every other migrate command uses `--apply`, and `lines=` remains supported. It
  is retired after one release with a deprecation note, or folded into {% ref "SPEC-189" /%}'s
  hand-written codemod registry.

### D8 — one Markdown file walker in the CLI

`migrate.ts`, `migrate-snippets.ts`, `snippet-review.ts` and `format.ts` each walk directories for
Markdown files. One helper replaces the four.

## Not in scope

- **The editor package.** It's built, published and behind `refrakt edit`.
- **Lumina vs. skeleton CSS.** The audit found only ~58 identical declaration lines across
  same-named files; the layer split is clean.
- **The config-shape deprecations** (flat shape, `packages`, `sandbox.examplesDir`), which keep
  their documented v1.0 removal.

## Open questions

- `## Dependencies`: migrate or undeprecate? Migrating keeps one canonical heading but touches
  327 files; undeprecating is a one-word change and deletes a codemod. The directed model
  ({% ref "SPEC-114" /%}) is the same either way, since both normalise to "blocked by".
- Is the visual gallery harness coming back?

## Acceptance Criteria

- [ ] `css-coverage.test.ts` reports allowlist entries that are no longer expected, and the stale entries are removed
- [ ] `contracts/structures.json` is committed once, and `CLAUDE.md` names one regeneration target
- [ ] `plan-ref.css`, `readPropText`, `SplitablePageSectionModel` and the `property` fields are deleted
- [ ] `baseConfig` and `SplitLayoutModel` are either renamed or no longer marked deprecated
- [ ] `scripts/validation-blast-radius.mjs` is deleted
- [ ] Every non-private workspace package is in the build script, and a test holds that
- [ ] The pipeline code in `packages/runes/src/config.ts` lives in its own modules
- [ ] `plan migrate pr-attrs` is deleted or has a decision to run it
- [ ] `## Dependencies` is either migrated across `plan/` or undeprecated, and `plan/INSTRUCTIONS.md` matches
- [ ] The CLI has one Markdown file walker

## References

- {% ref "SPEC-189" /%}: attribute-shaped deprecations and the migration table.
- {% ref "SPEC-188" /%}: deletes the metadata backfill script.
- {% ref "SPEC-191" /%}: the test-suite side of the same cleanup.
- {% ref "SPEC-114" /%}: the directed dependency model.
- {% ref "SPEC-131" /%}: the snippet anchors behind `migrate snippets`.

{% /spec %}
