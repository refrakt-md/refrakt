{% work id="WORK-331" status="done" priority="medium" complexity="moderate" source="SPEC-082" tags="runes,engine,cleanup,data-channel,fields,contract" milestone="v0.18.0" %}

# Drop dual-emitted data-field metas from rune output (Tier 1)

Re-open the high-value slice of {% ref "WORK-323" /%} (descoped as a whole):
stop emitting the **dual-emit modifier/field `<meta data-field>` tags** so the
`data-rune-fields` bag is the *only* representation of field data in the rune
tree. The risk being closed is that theme developers treat `data-field` metas as
part of the output contract; this removes them from the pre-engine tree (they
are already stripped from rendered output) without touching the engine input
contract.

## Background — measured state (2026-06-03 investigation)

Three meta populations all use the `data-field` attribute; **only population 1
is in scope here:**

1. **Dual-emit modifier/field metas** (`prepTime`, `layout`, `role`, …) —
   emitted via `createComponentRenderable` `properties`, copied into the bag,
   and already **stripped from rendered output** at engine step 7. They linger
   only in the pre-engine serialized tree. *This is the target.*
2. **Vestigial property metas** (e.g. `toc/ordered`) — emitted via `properties`
   but the key is not a declared modifier, so step 7 does not strip them and
   they **leak** into rendered output. Fix in scope (declare as modifier or stop
   emitting).
3. **Cross-page sentinels** (`collection-*`, `aggregate-*`, `relationships-*`,
   `file-ref-*`, `blog/folder`, `plan-*`) — built *directly* (not via
   `properties`), not in the bag, consumed by the `postProcess` pipeline.
   **Out of scope** — they must survive the engine. (A future, larger effort
   could move this deferred-resolution channel off `data-field`.)

Measured cost of the drop: **120 failing assertions across 50 files**, *all* the
same mechanical pattern (`findTag(meta data-field=X).content` →
`JSON.parse(tag['data-rune-fields'])[X]`). **Zero** rendered-output / contract /
css-coverage / seo failures — output is provably unchanged.

## Acceptance Criteria

- [x] `createComponentRenderable` no longer emits population-1 `<meta data-field>`
  children (the value still lands in the `data-rune-fields` bag). SEO
  `<meta property>` carriers and the directly-built sentinel metas are untouched.
- [x] The ~120 rune/plugin test assertions that read field data from a pre-engine
  `<meta data-field>` are migrated to read the `data-rune-fields` bag (a shared
  test helper, e.g. `field(tag, name)`, is acceptable to collapse the churn).
- [x] The population-2 leaks (`toc/ordered`, plus any found by an audit of
  non-modifier `properties` metas) no longer reach rendered output.
- [x] Any post-engine reader of a population-1 meta is rerouted to the bag.
  (Known: confirm `blog`'s folder hook — it reads `data-field="folder"` from
  children post-engine.)
- [x] Theme-authoring docs state that `data-field` is an internal engine
  attribute, not a theming hook (themes target BEM classes + `data-name` + the
  documented `data-*` modifiers).
- [x] Rendered output unchanged; full suite + both structure contracts green.

## Approach

- Single change point: in `createComponentRenderable`, collect pure-data metas
  (those that received `data-field` and are not SEO carriers) and filter them
  from `childArray` — keep building the bag exactly as today. (Proven in the
  investigation; ~1 line plus the collection set.)
- Keep the engine's `readField` bag-first / meta-fallback read for now — real
  runes always emit the bag, so output is unchanged; the fallback stays as a
  safety net (its removal is `WORK-332`).
- Migrate the failing assertions; prefer a `field()` test helper over 120
  bespoke edits.

## Dependencies

- {% ref "WORK-328" /%}, {% ref "WORK-329" /%} — pre-engine consumers (SEO,
  register hooks) already read the bag.

## References

- {% ref "SPEC-082" /%} — typed node data channel.
- {% ref "WORK-323" /%} — the original (descoped) full-excision item; this is
  its high-value slice.
- `WORK-332` — Tier 2: remove the now-dead engine machinery (depends on this).

## Progress

**Step 1 done — bag-first reroute (output-neutral hardening).** Implementing
the drop surfaced that 8 runes' hooks read field *values* from the metas and
break in production (not caught by tests, which use hand-built meta fixtures).
The disciplined sequence is to move every consumer onto the bag *first*, while
the metas remain as a fallback — so the eventual drop only removes a dead path.

Landed:

- The engine now threads the parsed `data-rune-fields` bag into the
  `postTransform` context (`context.fields`) — it previously stripped the bag
  attribute from the result before `postTransform` ran, so engine-`postTransform`
  hooks had no access to it.
- Rerouted to bag-first `readField(node, name, context.fields)` (meta-fallback
  retained): **embed, chart, diagram, sandbox** (core), **mockup** (design),
  **comparison** table-level fields (marketing). Cross-page **blog**
  (folder/sort/filter/limit) reroutes to `readField(tag, name)` (the bag
  attribute is present on the pre-engine tree).
- Output-neutral: full suite green (3075) with the metas still emitted.

Remaining for the drop (pending decision):

- Stop emitting the population-1 metas (`createComponentRenderable`).
- Migrate the ~120 pre-engine-meta test assertions + the hand-built pipeline
  fixtures (e.g. `blog-pipeline`'s `createBlogTag`) to the bag, so they validate
  the real path.
- **Nested-node gap:** a column's own bag is stripped before the *parent's*
  `postTransform` runs, so `comparison`'s `highlighted` (read off a column) still
  rides its meta. The drop must thread child fields another way (e.g. the
  comparison transform lifting `highlighted` into the table-level bag).
- Population-2 leaks (`toc/ordered`); docs note that `data-field` is internal.

## Resolution

Completed: 2026-06-03

Branch: claude/rune-contract-hardening

### What was done
Landed the drop on top of the step-1 reroute. The dual-emit data metas are gone
from the pre-engine tree; the data-rune-fields bag is the sole field channel.

- createComponentRenderable filters pure-data property metas (those that got
  data-field and aren't SEO carriers) out of the emitted children — the value
  still lands in the bag. SEO property= metas and directly-built sentinels are
  untouched.
- Re-measured against the post-WORK-335 tree: 95 mechanical assertion failures
  across 44 files (down from the original 120/50 — WORK-335 + the chart seam
  removed field-metas from 6 runes). ZERO behavioral/pipeline/contract/css/seo
  failures — output-neutral.
- Migrated the 95 assertions to read the bag via a shared fields(tag) helper
  added to 9 test/helpers.ts (parallelized across the packages).
- drawer-pipeline.ts: rerouted the register hook's side/size/shortcut reads to
  the bag (bag-first readField). This was a BESPOKE meta reader missed by the
  step-1 audit (which grepped readMeta/findMeta, not local helpers) — caught
  here by the drawer register test. The genuine hidden-coupling case.
- Population-2 leaks (e.g. toc/ordered) stop reaching output (they were property
  metas, now dropped).
- Docs: corrected the now-stale <meta data-field> field-data references in
  theme-authoring (config-api / overview / components) to the data-rune-fields
  bag, noting it is an internal channel, not a theming hook.

### Notes
- Deliberate deviation from the AC wording: did NOT add a blanket "data-field is
  internal" claim, because the def-list block ROW marker (<div data-name=row
  data-field=created>) is a separate, still-valid theming hook. Scoped the docs
  note to the field-data channel only.
- The nested-column comparison/highlighted gap noted in Progress was already
  resolved by WORK-335 (comparison now builds the table in the transform and
  reads highlighted straight from the AST), so no extra work was needed here.
- The engine's bag-first read + meta-fallback + step-7 strip + kebab set stay —
  their removal (and the engine-fixture migration) is WORK-332.
- Full suite green (3079); contracts unchanged (config-derived; the drop is
  output-only and the metas were already stripped pre-WORK-331).

{% /work %}
