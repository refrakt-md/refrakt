{% work id="WORK-718" status="done" priority="medium" complexity="simple" source="SPEC-193" tags="docs, nav, concepts, redirects" milestone="v0.49.0" pr="refrakt-md/refrakt#791" %}

# Concept guides move to a Concepts group, and fixtures leave the rune catalogue

SPEC-193 D7. surfaces, media-guests, image-schemes and motion are concept guides in the rune
catalogue; plan/examples is a fixture page; plan/cli documents a CLI.

## Acceptance Criteria
- [x] A Concepts group in the docs nav holds surfaces, media-guests, image-schemes and motion, with page-sections and tint moved from Authoring
- [x] The moved pages keep their URLs working through redirects, and every link to them is updated
- [x] plan/examples is no longer a published page in the rune section; the examples still render their data
- [x] plan/cli moves to `docs/cli/` and documents `plan migrate` and `validate --against`
- [x] The rune nav's Essentials group holds only the catalogue

## Blocked by
- {% ref "WORK-711" /%}

## References
- {% ref "SPEC-193" /%}: D7.

## Resolution

Completed: 2026-11-10

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- `docs/concepts/` holds surfaces, media-guests, image-schemes, motion (from `runes/`) and page-sections, tint (from `docs/authoring/`); `redirect:` stubs at the old paths; 56 links updated; Concepts group added to the docs nav after Guide; the rune nav's Essentials holds only the catalogue.
- `runes/plan/examples` is `draft: true`; `plugins/plan/src/pipeline.ts` registers entities from a draft page without a URL, so the examples show them unlinked.
- `runes/plan/cli` → `docs/cli/plan` (redirect, CLI nav group); documents `plan validate --against` and `plan migrate` (filenames, dependencies, pr-attrs, ids).
- `packages/runes/src/nodes.ts`: an inline `{% link %}` with an empty href renders unlinked (test `link-tag.test.ts`). Changeset `draft-entities-and-empty-links.md`.

{% /work %}
