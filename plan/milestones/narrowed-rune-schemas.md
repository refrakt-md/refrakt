{% milestone name="v0.32.0" status="planning" %}

# v0.32.0 — Narrowed rune schemas

The second half of {% ref "SPEC-125" /%}: a rune's Markdoc schema offers only the
universal attributes that can affect it, so `refrakt reference`, editor
completion and Markdoc validation stop over-promising — **without any of them
loading theme config**.

Depends on {% ref "v0.31.0" /%}, which corrects the data these schemas would
otherwise freeze.

## Why this is a minor, and what breaks

`{% card reading="prose" %}` moves from a silent no-op to a Markdoc validation
error. That is the intended outcome — the author gets no feedback whatsoever
today — but it will fail builds on existing content.

The exposure is narrower than it first appears. Most of it is content setting an
attribute that never did anything, on a rune that never could honour it; the
likely source is copy-paste between runes. And {% ref "v0.31.0" /%} removes the
sharpest cases in advance: the runes an author is most likely to have written
`reading` on are exactly the ones whose roles were missing, and those now work
rather than erroring.

The transitional option stays open until v0.31.0 quantifies real-world impact:
keep schemas permissive for one minor and have the tooling *annotate* rather than
reject, narrowing in the release after. Recorded in {% ref "ADR-028" /%}'s
rejected alternatives.

## Shape

**Phase 3 — narrow schemas and fix the consumers.**
`createContentModelSchema` merges only the applicable universal attributes.
The rule must be **declared**, not inherited from which constructor a schema
happened to use: six runes carry hand-written schemas and therefore no universal
attributes at all (`icon`, `tint`, `bg`, `xref`, `expand`, `badge`), and that
split is mostly principled — `xref`/`badge` are inline, `tint`/`bg` are
configurator runes that *supply* axis values to their parent. Migrating them is a
non-goal; expressing the rule is the requirement.

Consumers then fall out: `refrakt reference` stops printing "Universal
attributes (available on every rune)", and language-server completion narrows
automatically because it reads the schema. Separately, `reading`, `content-place`
and the cover `scrim*` family gain the dev warning their four siblings already
have — schema narrowing catches authored attributes, not values arriving through
scoped defaults or embed overrides ({% ref "ADR-027" /%}).

**Phase 4 — separate the prose capability from the `body` role.**
`body` carries two meanings merged by accident of timing: structural ("the main
content region", consumed by the dimension stylesheets) and editorial ("prose a
reading register applies to", added later by {% ref "SPEC-108" /%} as a proxy).
The proxy breaks on `DataTable`, `Showcase`, `Form`, `Api` and `Symbol` — without
this, `{% datatable reading="prose" dropcap=true %}` would validate and stamp a
drop cap onto a table.

The gate becomes a capability the facet declares and the rune provides, rather
than another hard-coded helper beside `hasBodySection` / `hasMediaSection` /
`hasPageSectionHeader`. Only one axis needs it initially; it is worth the general
shape now because {% ref "SPEC-124" /%} already gave every facet a declaration
point.

## Sequencing

Phase 4 **after** Phase 3, and the order is load-bearing rather than incidental.
Phase 4's central question is the default: default-on preserves the lossy proxy
and lets the bug recur for the next non-prose rune; default-off is honest but a
forgotten declaration silently disables `reading` — today's failure mode
returning. Default-off is only safe once schemas have narrowed, because then a
forgotten declaration is no longer silent: the attribute is not offered, and
`refrakt reference` says so.

## References

- {% ref "SPEC-125" /%} — the spec
- {% ref "ADR-028" /%} — applicability is rune identity, not theme configuration
- {% ref "SPEC-124" /%} — facet registry; the declaration point Phase 4 reuses

{% /milestone %}
