{% work id="WORK-712" status="done" priority="high" complexity="moderate" source="SPEC-193" tags="docs, runes, template, attributes" milestone="v0.49.0" pr="refrakt-md/refrakt#779" %}

# A rune page has one shape, and the attribute table renders a rune's family

SPEC-193 D1. Rune pages have no fixed section order, and the attribute table sits under H2, H3 or
H4, often nested under the example before it. About 20 pages include the attribute partial once per
child rune, and two document only the child.

## Acceptance Criteria
- [x] The rune page template (D1: intro, opening paragraph, "Basic usage", "How Markdown is read", task sections, "Attributes", "See also") is written down in `extend/rune-authoring/`
- [x] The attribute partial, included once with the parent rune, renders the parent's table and then each child's under its own `###`, from the child-to-parent mapping (`PAGELESS`)
- [x] Every rune page has exactly one attribute include, under `## Attributes`, after its task sections; pricing and steps document their parent rune too
- [x] `check-rune-docs` fails on a rune page whose attribute include is missing, repeated, or not under `## Attributes`
- [x] "See also" is the one name for related links; the two "Related" sections are renamed

## Blocked by
- {% ref "WORK-711" /%}

## References
- {% ref "SPEC-193" /%}: D1.
- {% ref "SPEC-128" /%}: the generated attribute tables.

## Resolution

Completed: 2026-11-05

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#779

### What was done
- `scripts/generate-rune-attributes.mjs`: a `children` partition (27 rows), keyed by the parent rune, from `PAGELESS`.
- `site/content/_partials/rune-attributes.md`: after the parent's block, each child under `### child`, with its own, inherited and universal attributes (`####`), as nested `data` queries.
- All rune pages: one include of the page's rune under `## Attributes`, after the task sections and before "See also"; 16 family pages lose their child includes; pricing, steps and tabs include the parent; bar, code and deflist gain the include; code's hand-written "None." removed; "Related" renamed "See also" on code and include.
- `scripts/check-rune-docs.mjs`: `attributeSections` guard; `attributeCoverage` counts a child rendered by its parent; tests in `check-rune-docs.test.mjs`.
- `site/content/extend/rune-authoring/reference-pages.md`: the page template, added to the extend nav.

### Notes
- `include` does not pass variables through (`variables={r: $r}` arrives empty), so the child block is inline in the partial rather than a second partial.
- Adding the generated include to bar and deflist (a WORK-714 criterion) happened here, since the new guard requires it.

{% /work %}
