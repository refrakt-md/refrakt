{% work id="WORK-637" status="done" priority="high" complexity="moderate" source="SPEC-145,SPEC-153" milestone="v0.41.0" tags="docs,composition,dx" pr="refrakt-md/refrakt#696" %}

# The authoring guide for composed runes

Composition ships to users in this milestone, and {% ref "SPEC-153" /%} D9 makes the definition
file the user-facing authoring surface. Today the only documentation is a `PluginRune` note in
`rune-authoring/authoring-overview.md`. Add a page under `site/content/extend/rune-authoring/`
written from {% ref "SPEC-145" /%}'s "template vocabulary, in one place" table. The guide is
the spine of that table rather than a summary of it.

It covers:

- **The file.** Frontmatter is the input declaration and the body is the output template.
  Slot names are the join. The filename is the rune's name.
- **The vocabulary:**
  - `{% slot %}` with fallback content;
  - `each` and `$each` (its fields are exactly `emitAttributes`);
  - `$attrs`;
  - `{% metablock %}`;
  - Markdoc's `{% if %}`, with D17's content-model consequence;
  - why there is no iteration tag.
- **What may be placed (D12).** The intersection of the no-peer-schema and no-required-parent
  exclusions, stated as one list, and the runes the WORK-621 survival test keeps out.
- **Every construction-time error**, with what it means and how to fix it.
- **Where definitions go.** A plugin's `runeDir` versus a project's `runes.dir`, the precedence
  rule, and why `schema` is allowed in one and not the other (D25), each with its reason.
- **The `bond` and `character` definitions** as worked examples, taken from the tested
  fixtures rather than retyped.

## Blocked by

- {% ref "WORK-633" /%}
- {% ref "WORK-634" /%}

## Acceptance Criteria

- [x] A composed-runes page exists under `site/content/extend/rune-authoring/`, linked from the overview, covering the file format, the full vocabulary, the placeable set and where definitions go
- [x] The authoring guide states the placeable set as one list — the intersection of the no-peer-schema and no-required-parent exclusions — not as two rules to combine (SPEC-145 D12)
- [x] The authoring guide states the project-versus-package asymmetry with the reason rather than as a convention (SPEC-153)
- [x] Every construction-time error message the compiler can produce is listed with its cause and fix, and a test fails if a new error is added without a docs entry
- [x] The worked examples are included from the tested fixture files, so the docs cannot drift from definitions that are proved to build
- [x] `refrakt validate` passes on the new page, and `refrakt.stale` reports no page pointing at the changed paths without review

## Resolution

Completed: 2026-10-08

Branch: `claude/v041-composed-runes-guide` (stacked on #695, which is stacked on #691)
PR: refrakt-md/refrakt#696

### What was done
- `site/content/extend/rune-authoring/composed-runes.md` (new):
  - the file and its frontmatter keys;
  - the template vocabulary, written from SPEC-145's table (slot, fallback, `each`/`$each`, `$attrs`, `metablock`, `if` with D17, no iteration tag);
  - the placeable set as one list, plus the excluded runes and the rebuilt node kinds;
  - where definitions go (`runeDir` / `runes.dir`, precedence, the declaration asymmetry and the `schema` asymmetry, each with its reason);
  - `bond` and `character` `{% snippet %}`-included from the tested fixtures, with review markers;
  - an Errors table of all 48 codes, each with its meaning and fix.
- Linked from `authoring-overview.md` (opening note and `PluginRune` paragraph) and from `extend/_layout.md`.
- `packages/runes/src/lib/composition-errors.ts` (new): `COMPOSITION_ERRORS`, and `CompositionError` with a `code`. Every throw site in `composition.ts`, `composed-rune.ts`, `rune-dir.ts`, `project-runes.ts`, and the `runeDir`/precedence/`runes.local`/template-entry paths in `plugins.ts`, now passes a code.
- `composition.ts`: a template tag carrying a critical Markdoc error (unclosed or unopened) is rejected as `template-parse`.
- `packages/content/test/placeable-set.ts` (new): D12's derivation, moved out of `slot-marker-survival.test.ts` and shared by both tests.
- `packages/content/test/composed-runes-guide.test.ts` (new, 40 tests):
  - every throw site carries a registered code;
  - every code has a docs entry, and the docs list no stale code;
  - 33 triggers assert each code is assigned correctly;
  - the three placement tables equal the derivation;
  - the worked examples are the tested files, not retyped.
- Changeset: minor for runes.

### Notes
- Finding: an unclosed or unopened template tag used to build silently, because only `error` nodes were checked. It is fixed here.
- The SiteConfig `file-ref` review marker went stale with #695's `runes.dir`. I re-read the prose and re-stamped it on #695 (`snippet review --check` is a CI gate).
- D12's "runes the WORK-621 survival test keeps out" is stated as its two lists:
  - `NOT_YET_PLACEABLE`: placeable, with a rebuilt node kind;
  - `PREPROCESS_ONLY`: rejected by D4.
- Revert demos: an uncoded `throw` and a code with no docs entry each fail the test.
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5622 passed.

{% /work %}
