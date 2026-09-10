{% work id="WORK-547" status="done" priority="high" complexity="simple" source="SPEC-128" milestone="v0.33.0" tags="docs,runes,reference" %}

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
- [x] Every rune with own or base-preset attributes is checked for whether its page has a table — across **every configured site**, not just the default one
- [x] Pages documenting rune attributes outside `/runes/` are included, such as `plan/docs/plan-entities.md`
- [x] Pages whose runes have non-trivial attributes but no table are listed
- [x] A recorded rule for when a page should carry one — not a page-by-page verdict, a criterion the generator and reviewers can apply
- [x] The rule covers the **27 child runes documented across 23 parent pages** (counted from `PAGELESS`), and the two internal runes that belong on no page
- [x] The outcome is written back into {% ref "SPEC-128" /%}, replacing its open question

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

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### Outcome

**The missing tables are drift, not editorial restraint.** The spec guessed
"mostly deliberate, some drift"; the survey says the opposite, in the direction
that widens scope.

Surveyed across both configured sites (`main`, `plan`), 118 runes:

| | |
|---|---|
| runes with >=1 own or base-preset attribute | 108 |
| ...whose page carries `## Attributes` | 18 |
| ...with a page and no table | 72 |
| ...that are child runes, on a parent's page | 16 |
| runes with zero own/base attributes | 10 |
| ...carrying a table anyway | 0 |

The "deliberate" hypothesis predicts untabled runes are the simple ones. It
fails: `bg` (15 own), `grid` (13), `sandbox` (12), `work` (12), `bug` (10) are
all untabled, as are **17 runes with a required attribute** — `bond` (from, to),
`swatch` (color, label), `embed` (url), `form` (action), `api` (path), and all
five plan entity runes.

All 10 zero-attribute runes have no table. Practice is right exactly where it is
defensible and absent everywhere else — the signature of drift.

### The rule

A page carries a generated table when its rune has **at least one own or
base-preset attribute**. All 108. Child runes render onto the parent's page.

Simpler than this item's original proposal ("more than one own attribute, or any
required"). A threshold made sense when tables were hand-written; generated, a
one-row table costs nothing, so a threshold buys only less content at the price
of a rule to remember and a reader who cannot tell "no attributes" from "below
the bar".

### The 72 untabled runes with a page

bond swatch work bug faction realm decision spec form blog character milestone
embed lore plot api icon bg grid sandbox hero playlist recipe card feature
backlog mockup plan-progress track audio chart pagination juxtapose nav showcase
symbol typography budget datatable event gallery palette preview codegroup
compare diff figure mediatext testimonial textblock breadcrumb decision-log
details diagram howto itinerary pullquote storyboard toc accordion annotate cast
changelog conversation hint layout organization plan-activity reveal sidenote
spacing timeline

### Also found — filed as BUG-009

The generator's data source disagrees with itself about which runes exist:

- `reference dump` emits `music-playlist` / `music-recording`, which
  `reference <name>` cannot resolve. They are registered as separate
  `Plugin.runes` entries with self-referential aliases rather than as aliases on
  `playlist` / `track`. The artifact would carry phantom entries.
- `EXCLUDED_RUNES` hides nine core child runes (`accordion-item`, `tab`,
  `form-field`, ...) from every reference output, while the twenty equivalent
  plugin child runes (`bento-cell`, `tier`, `map-pin`, ...) are reported in full.
  Nothing distinguishes the groups. Those nine cannot be generated at all.

WORK-548 is now blocked on BUG-009 rather than on this item.

### Notes

- Written back into SPEC-128, replacing its "prior question" section and its
  first acceptance criterion.
- WORK-548 gained the corrected scope (108 runes, not a minority) and the new
  dependency.
- Survey method: `reference dump --format json` per site, joined against every
  `.md` under each site's contentDir by `## Attributes` heading, with `PAGELESS`
  for child runes and `__`-prefixed attributes filtered.

{% /work %}
