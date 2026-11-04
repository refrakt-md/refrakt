{% work id="WORK-708" status="done" priority="medium" complexity="moderate" source="SPEC-187" tags="docs, runes, reference, rollout, guard" milestone="v0.48.0" pr="refrakt-md/refrakt#772" %}

# Every rune page opens with the intro, the install hint goes, and the guard keeps it gone

SPEC-187 D1 and D6: all 119 pages under `site/content/runes/` open with the intro include. The
hand-written `# Title`, the "This rune is part of @refrakt-md/…" hint (on 45 pages) and any opening
paragraph that only restates the description are removed.

## Acceptance Criteria
- [x] Every rune reference page opens with `{% include file="rune-intro.md" … /%}` in place of its `# Title`
- [x] No rune page carries the install hint
- [x] An opening paragraph that restates the frontmatter `description` is merged into it or cut, page by page, so the blurb is not repeated
- [x] `scripts/check-rune-docs.mjs` fails on a rune page without the intro include, or with the old hint
- [x] `refrakt validate --site main` and `--site staging` report nothing new, and `npm run format:md:check` passes

## Blocked by
- {% ref "WORK-706" /%}

## References
- {% ref "SPEC-187" /%}: D1, D6.

## Resolution

Completed: 2026-11-04

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#772

### What was done
- All 99 rune reference pages (every `type: rune` page with its own record; the other files under `site/content/runes/` are plugin overviews and guides) replace their `# Title` with the `rune-intro.md` include; the 45 install hints are removed.
- Opening paragraphs checked against the description: the restating first sentence cut on 26 pages, the paragraph cut on 2 (gallery, toc); kept whole on 4 where the rest would not stand alone or the paragraph is the explanation (include, sidenote, swatch, work).
- `scripts/check-rune-docs.mjs`: `introCoverage` fails a rune page whose first line is not its own intro include, that keeps the install hint, or that hand-writes a `# ` title outside a fence; tests in `scripts/check-rune-docs.test.mjs`.

### Notes
- The item's "119 pages" counted every file under `site/content/runes/`; 99 are rune pages.
- Built site: on all 99 pages the first `<h1>` in `<main>` is the record's title, the Source drawer is present, and plugin pages have the Install drawer. Warning counts unchanged.
- WORK-707 (the staging badge) is not done: pages have no per-site value, and a `data` `root` from a missing variable fails the build.

{% /work %}
