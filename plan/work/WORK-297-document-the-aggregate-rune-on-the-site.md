{% work id="WORK-297" status="done" priority="medium" complexity="simple" source="SPEC-076" tags="aggregate,docs,site" milestone="v0.16.0" %}

# Document the aggregate rune on the site

Document `aggregate` on the site, matching the depth of `collection.md` / `relationships.md`. The page should land alongside its siblings in the nav and cross-link with them.

## Acceptance Criteria
- [x] New `site/content/runes/aggregate.md` describes both modes (single-number and body-zoned), the `$item` projection per zone (`count` / `value` / `percent` / `total` / `key` / `shown`), and the `value` sub-filter attribute that defines the achieved subset. Includes live `{% preview source=true %}` examples for each mode.
- [x] Explains the relationship to `collection` and `relationships` — three sibling query runes (items / edges / numbers) sharing the field-match grammar and zone semantics.
- [x] Calls out the `value` attribute clearly with a worked example (the progress-bar use case): `value="status:done"` drives `$item.value` / `$item.percent`.
- [x] Documents the count vs total distinction — `count` is the in-context denominator (preamble: primary set; template: this group); `total` is the all-groups constant.
- [x] Cross-links: `collection`, `relationships`, `progress`, `badge`, `humanize` (the typical co-stars of an aggregate body).
- [x] Linked from `site/content/runes/_layout.md` nav (or wherever the rune catalog lives) and from any catalog index page.
- [x] If the rune authoring docs or any "post-process query runes" landing page exists, `aggregate` is mentioned there too.

## Approach
Model the page on `collection.md` — same section order (selection / sort-group-limit / value+achieved / body zones / attributes / output contract / see also). Use `{% preview source=true %}` blocks for examples so readers see the rendered output beside the source. Note explicitly that `aggregate` resolves in post-process and works on both file-backed and dynamic routes.

## Dependencies
- {% ref "WORK-294" /%} — the rune must exist for previews to render in the docs.

## References
- {% ref "SPEC-076" /%}

## Resolution

Completed: 2026-05-28

Branch: `claude/v0.16.0`

### What was done
- `site/content/runes/aggregate.md` — new docs page modeled on `collection.md` / `relationships.md`. Sections: lead (positions aggregate as the third sibling — items / edges / numbers), single-number form with a live preview, body-zoned form with the $item-per-zone projection table, the value sub-filter (worked progress-bar example), grouping with domain-aware ordering, sort + limit on groups, empty state and precedence rules, attributes table, output contract for both modes, and a See Also block linking collection / relationships / progress / badge / humanize. Three `{% preview source=true %}` blocks — inline single-number form, ungrouped progress-bar body, grouped badge-per-status template — let readers see source beside rendered output.
- `site/content/runes/_layout.md` — added `aggregate` to the Content nav between `relationships` and `card`.
- `site/content/runes/rune-catalog.md` — added the aggregate row to the Content catalog table, with a one-line description that distinguishes it from collection / relationships.
- `site/content/extend/plugin-authoring/pipeline.md` — expanded the "Domain-aware ordering" intro to mention `aggregate` alongside `collection` / `relationships`, since the three share the same ordering machinery.

### Notes
- The doc explicitly frames the count-vs-total distinction (in-context denominator vs all-groups constant) as a small table row in the $item projection — and the prose under it spells out why `count === total` in the preamble. That was the clearest place to land the SPEC-076 nuance for readers.
- No standalone "post-process query runes" landing page exists today; `aggregate` is wired into the same page (`pipeline.md`) where `collection` / `relationships` are already referenced for the same machinery, which is where a reader following that thread would land.
- Live previews use `type="work"` since `work` entities are registered on the docs site (the existing collection.md previews use the same setup).

{% /work %}
