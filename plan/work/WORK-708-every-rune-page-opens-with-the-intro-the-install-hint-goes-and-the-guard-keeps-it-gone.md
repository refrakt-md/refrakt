{% work id="WORK-708" status="ready" priority="medium" complexity="moderate" source="SPEC-187" tags="docs, runes, reference, rollout, guard" milestone="v0.48.0" %}

# Every rune page opens with the intro, the install hint goes, and the guard keeps it gone

SPEC-187 D1 and D6: all 119 pages under `site/content/runes/` open with the intro include. The
hand-written `# Title`, the "This rune is part of @refrakt-md/…" hint (on 45 pages) and any opening
paragraph that only restates the description are removed.

## Acceptance Criteria
- [ ] Every rune reference page opens with `{% include file="rune-intro.md" … /%}` in place of its `# Title`
- [ ] No rune page carries the install hint
- [ ] An opening paragraph that restates the frontmatter `description` is merged into it or cut, page by page, so the blurb is not repeated
- [ ] `scripts/check-rune-docs.mjs` fails on a rune page without the intro include, or with the old hint
- [ ] `refrakt validate --site main` and `--site staging` report nothing new, and `npm run format:md:check` passes

## Blocked by
- {% ref "WORK-706" /%}

## References
- {% ref "SPEC-187" /%}: D1, D6.

{% /work %}
