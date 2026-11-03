{% work id="WORK-703" status="done" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, marketing, cta, go-live" milestone="v0.48.0" pr="refrakt-md/refrakt#769" %}

# The composed cta goes live in the marketing plugin

`site/staged-runes/cta.md` was reviewed with the hero in {% ref "WORK-689" /%}. It goes live on
the path {% ref "WORK-702" /%} opens: the marketing plugin's `runeDir`.

## Gates (SPEC-181 rollout)

1. and 2. Reviewed, and every difference explained: done in WORK-689.
3. The composition adds `align` (`start | center | end`), which the plugin cta does not declare;
   that is additive, so no existing content changes meaning. This item confirms no other attribute
   or content form differs, or adds the codemod and waits a release.
4. No dependency on a `draft` primitive spec: confirmed when the item starts.

## Acceptance Criteria
- [x] `cta.md` moves from `site/staged-runes/` into the marketing `runeDir` unchanged, and the `staging` site's `runes.prefer` entry for `cta` is removed
- [x] The plugin cta's schema, theme config entry and `cta.css` are removed, and the CSS coverage sets are updated
- [x] Both copies of `contracts/structures.json` and the SEO baseline are regenerated, and the diff is reviewed in the PR description
- [x] The cta reference page describes the rune as a composition, and every page that uses `cta` renders unchanged
- [x] A breaking changeset and a migration note list what authors and themes lose (`rf-cta*` classes) and what changed

## Blocked by
- {% ref "WORK-702" /%}

## References
- {% ref "SPEC-181" /%}: the rollout gates and D5.
- {% ref "WORK-689" /%}: the review.

## Resolution

Completed: 2026-11-03

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#769

### What was done
- `site/staged-runes/cta.md` → `plugins/marketing/runes/cta.md`, unchanged; `cta` removed from the staging site's `runes.prefer`.
- Removed the native cta: `plugins/marketing/src/tags/cta.ts`, its `CallToAction` theme entry, Lumina's and the skeleton's `cta.css`, `plugins/marketing/test/cta.test.ts`, and `composed-landing-register.test.ts` (its job, showing `hero.css` and `cta.css` could go, is done).
- `plugins/marketing/fixtures/cta.md` replaces the inline fixture.
- `refrakt migrate cta` renames the `call-to-action` alias, which the composition does not declare; `site/content` used none.
- Proof skin styles `.rf-section[data-prominence="display"]` and `actions` instead of `.rf-cta*`.
- `composed-cta.test.ts` keeps the comparison's findings as assertions on the composition; the slot-marker list and guide table add `cta` (the nesting limit recorded for hero in WORK-702).
- Docs: cta page gains its attribute table and "How it is built"; the theme-authoring context-modifier example uses `hint` instead of cta.
- Contracts (both copies), rune attribute data and plugin vocabulary regenerated; the SEO baseline does not change for cta (it publishes nothing).

### Notes
- Gate 3: beyond the additive `align`, two things differ for authors — the dropped `call-to-action` alias (codemod) and ADR-046's reading of two leading headings as headline and body (no cta in the repo opens with two headings; recorded in the changeset).
- `--in-hero` / `--in-pricing` dropped as WORK-666 decided; `in-pricing`'s alignment is `align="start"`. No cta sits inside a pricing table on the site.
- The native cta rendered `data-rune="call-to-action"`; the composition renders `cta`. Nothing in the repo targeted the old value.

{% /work %}
