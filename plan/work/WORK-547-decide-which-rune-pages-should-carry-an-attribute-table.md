{% work id="WORK-547" status="ready" priority="high" complexity="simple" source="SPEC-128" milestone="v0.33.0" tags="docs,runes,reference" %}

# Decide which rune pages should carry an attribute table

Only 13 of ~115 rune pages have an `## Attributes` section. Before generating
anything, work out why — the answer sets the scope of
{% ref "WORK-548" /%} and nothing sensible can be estimated without it.

Two possibilities, with very different consequences:

- **Deliberate.** Simple runes are fully explained by their examples and a table
  would be ceremony. Generation then applies to a minority of pages.
- **Drift.** Pages were written before their runes grew attributes, and the
  absence is the same bug as an incomplete table, only total. Scope is then the
  whole catalogue.

The answer is probably "mostly the first, with some of the second".

## Acceptance Criteria
- [ ] Every rune with own or base-preset attributes is checked for whether its page has a table — across **every configured site**, not just the default one
- [ ] Pages documenting rune attributes outside `/runes/` are included, such as `plan/docs/plan-entities.md`
- [ ] Pages whose runes have non-trivial attributes but no table are listed
- [ ] A recorded rule for when a page should carry one — not a page-by-page verdict, a criterion the generator and reviewers can apply
- [ ] The rule covers the **27 child runes documented across 23 parent pages** (counted from `PAGELESS`), and the two internal runes that belong on no page
- [ ] The outcome is written back into {% ref "SPEC-128" /%}, replacing its open question

## Approach

Mechanical to gather: `refrakt reference <name> --format json` gives each rune's
own and base-preset attributes; the page tree gives which have an
`## Attributes` section. The judgment is in the rule, not the data.

**Pass `--site` per site.** The plan runes come from `@refrakt-md/plan`, which is
only in the `plan` site's plugin set — `refrakt reference work --format json`
reports "Unknown rune" without `--site plan`. A survey run against the default
site alone would conclude the plan runes have no pages, when in fact they have a
page that {% ref "BUG-007" /%} shows is drifted.

A workable starting criterion: a page needs a table when the rune has more than
one own attribute, or any required one. `{% xref %}` is the case that motivates
the second half — {% ref "BUG-006" /%} found its page omits `primary`, its only
*required* attribute, which is the worst thing to leave to prose.

Handle child runes by reusing `check-rune-docs.mjs`'s `PAGELESS` mapping rather
than inventing a second list — it already models them, and
{% ref "SPEC-128" /%} D5 turns its parent annotations from comments into data.
Note the scale: **27 child runes across 23 parent pages**, not the handful an
earlier draft of this item claimed. Nearly every plugin contributes some, so a
rule that only works for `bento-cell` will not survive contact.

This is deliberately a survey, not an implementation. Its output is a decision
and a list.

{% /work %}
