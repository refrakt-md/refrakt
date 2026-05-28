{% work id="WORK-297" status="ready" priority="medium" complexity="simple" source="SPEC-076" tags="aggregate,docs,site" milestone="v0.16.0" %}

# Document the aggregate rune on the site

Document `aggregate` on the site, matching the depth of `collection.md` / `relationships.md`. The page should land alongside its siblings in the nav and cross-link with them.

## Acceptance Criteria
- [ ] New `site/content/runes/aggregate.md` describes both modes (single-number and body-zoned), the `$item` projection per zone (`count` / `value` / `percent` / `total` / `key` / `shown`), and the `value` sub-filter attribute that defines the achieved subset. Includes live `{% preview source=true %}` examples for each mode.
- [ ] Explains the relationship to `collection` and `relationships` — three sibling query runes (items / edges / numbers) sharing the field-match grammar and zone semantics.
- [ ] Calls out the `value` attribute clearly with a worked example (the progress-bar use case): `value="status:done"` drives `$item.value` / `$item.percent`.
- [ ] Documents the count vs total distinction — `count` is the in-context denominator (preamble: primary set; template: this group); `total` is the all-groups constant.
- [ ] Cross-links: `collection`, `relationships`, `progress`, `badge`, `humanize` (the typical co-stars of an aggregate body).
- [ ] Linked from `site/content/runes/_layout.md` nav (or wherever the rune catalog lives) and from any catalog index page.
- [ ] If the rune authoring docs or any "post-process query runes" landing page exists, `aggregate` is mentioned there too.

## Approach
Model the page on `collection.md` — same section order (selection / sort-group-limit / value+achieved / body zones / attributes / output contract / see also). Use `{% preview source=true %}` blocks for examples so readers see the rendered output beside the source. Note explicitly that `aggregate` resolves in post-process and works on both file-backed and dynamic routes.

## Dependencies
- {% ref "WORK-294" /%} — the rune must exist for previews to render in the docs.

## References
- {% ref "SPEC-076" /%}

{% /work %}
