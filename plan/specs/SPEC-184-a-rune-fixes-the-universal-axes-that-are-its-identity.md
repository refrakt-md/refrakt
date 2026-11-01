{% spec id="SPEC-184" status="draft" tags="runes, composition, universal-attributes, reference, hero, identity" %}

# A rune fixes the universal axes that are its identity

A rune offers every universal attribute its structure can carry. That set is computed, not chosen:
`hero` has a page-section header, so it is offered `prominence`, and it has a surface, so it is
offered `elevation`. Some of those values are not options of the rune; they *are* the rune. A hero is
the loud opening band of a page, which SPEC-183 named `prominence="marquee"`. A `{% hero
prominence="quiet" %}` is not a quieter hero but a `section` written under the wrong name.

This spec lets a rune **fix** an axis: it holds one value, the author cannot write it, and the rune
reference does not offer it. It amends {% ref "SPEC-145" /%} D34.3, which decided that "a template
cannot pin a universal axis against the author", for the axes a definition names, and leaves every
other axis as D34 has it. The reference page also shows each offered axis's default, so a value the
rune implies is visible whether it is fixed or not.

## Why

**The reference page offers options the rune does not have.** The hero page lists ten universal
attributes, `prominence` among them, with the same description every rune gets: "scales a rune's
page-section header". Nothing says a hero is already at the loudest step, or that turning it down
makes it something else. The reader is shown a dial on what is meant to be a constant.

**A default is the wrong tool for an identity.** SPEC-145 D34 gives a composition `defaults`, which
the author overrides. That is right for `width` (a hero inside a narrower column is plausible) and
for `elevation` (a theme may give a hero a surface). It is wrong for a value that defines the rune,
because an override does not adjust the rune, it replaces it with another. D34.3 chose "the author
always wins" so that no template could silently ignore what an author wrote. Fixing keeps that
promise in a stronger form: the author cannot write the attribute at all, so nothing is ignored.

**There is precedent.** D34.6 already accepts `density` as a default only: an author cannot write
it, and the composition sets it. A fixed axis generalises that one case to a decision a definition
makes per axis, and names it.

**Nothing in this repository writes the axes in question.** No page in `site/content` writes
`prominence`, `elevation` or `width` on a `hero` or `cta`. The cost is a change for third-party
content that wrote `{% hero prominence=… %}`, which D6 handles.

## Decisions

### D1 — a definition fixes an axis with `fixed`

A composition definition's frontmatter takes `fixed`, beside `defaults`, naming universal axes and
their values:

```yaml
defaults:
  width: full
  elevation: flush
fixed:
  prominence: marquee
```

1. **Only single-valued axes.** An axis whose author surface is one attribute may be fixed: `width`,
   `spacing`, `inset`, `elevation`, `prominence`, `reading`, `dropcap` and `density`. The
   multi-attribute axes (`bg`, `tint`, `frame`, `substrate`, `cover`, and motion's `reveal` with
   `stagger`) are
   rejected at definition load: fixing one of their attributes leaves the rest offered, and what that
   would mean is not decided here.
2. **The same checks as `defaults`.** A key that is not a universal axis, or a value the axis does
   not accept, is rejected at definition load, naming it (D34.1).
3. **A key is in `defaults` or `fixed`, never both.** Naming one in both is rejected.
4. **It lands where the author's attribute would** (D33, D34.2): `prominence` on the header's owner.
5. **`density` may move from `defaults` to `fixed`** with no change in behaviour, since an author
   could never write it. Both stay accepted; the reference shows a fixed `density` as fixed.

### D2 — a fixed axis is not offered, and writing it is an error

1. **The schema does not declare it.** The composed rune's narrowed schema (SPEC-125 Phase 3) leaves
   the fixed axis's attribute out, as it leaves out an axis no placed rune takes.
2. **Writing it is an error, named for what it is.** `{% hero prominence="display" %}` reports
   `axis-fixed` at error severity: "`prominence` is fixed on `hero` (`marquee`). A hero is the page's
   opening band; for a quieter one, write a `section`." The general unknown-attribute error is not
   also reported. Error rather than warning because the value would be ignored, and an ignored value
   is the outcome D34.3 set out to prevent.
3. **A template literal may not contradict it.** A literal on the placed rune for a fixed axis must
   equal the fixed value, or the definition is rejected at load. The template has no reason to write
   it at all, since `fixed` lands it.
4. **Precedence: a fixed value is the only value.** It sits above D34.3's whole ladder. Neither the
   author nor the site or theme defaults of {% ref "SPEC-177" /%} apply to it.

### D3 — a native rune fixes an axis in its config

A composition's `fixed` is carried on its generated config as `fixedAxes: { prominence: 'marquee' }`,
the field the engine and the schema narrowing read. A hand-written `RuneConfig` may set it too, so a
plugin rune can fix an axis the same way.

- **Identity (ADR-028)**: like `sections` and `provides`, `fixedAxes` decides what an author may write
  on the rune, so it is not theme-overridable. A theme restyles the step (SPEC-183 lets it); it does
  not change which step the rune is.
- `inspect` and `contracts` report a fixed axis under `unavailable` with the reason "fixed by the
  rune: `marquee`", so the contract and the schema agree as they do today.

### D4 — the reference shows each offered axis's default, and each fixed axis

The rune reference (`site/content/_partials/rune-attributes.md`, fed by
`scripts/generate-rune-attributes.mjs`) and `refrakt reference` gain two things:

- **An offered axis shows its default for this rune, and where it comes from.** For example
  "`width`, default `full` (definition)" or "`elevation`, default `flush` (definition)". An axis with
  no default says nothing. The default is the definition's `defaults`, else the config's `default*`
  field.
- **A fixed axis is listed separately**, once, with its value: "Fixed: `prominence` is `marquee`".
  It is not in the accordion of offered attributes.

This applies to every rune, native and composed: a native rune's `defaultWidth`, `defaultElevation`
and `defaultProminence` are as invisible today as a composition's `defaults`.

### D5 — `hero` fixes `prominence`, and nothing else is fixed yet

- **`hero`: `fixed: { prominence: marquee }`.** `width: full` and `elevation: flush` stay defaults.
  A hero in a docs column, or on a theme's raised surface, is still a hero.
- **`cta`: nothing fixed.** A `display` cta and a `prominent` one are both calls to action.
- **`testimonial`: nothing fixed.** Its `elevation: flat` is a default.
- Every later conversion decides per axis, in its own review, with the rule above: fix an axis only
  when another value would make the rune a different rune.

### D6 — the plugin `hero` warns before the composition fixes it

SPEC-181's rollout gates ask that the plugin accept the composition's authoring form for a release
before it goes live. Fixing an axis takes something away rather than adding a form, so the plugin
gets the matching step: from the release this lands in, the plugin `hero` reports a warning when
`prominence` is written ("`prominence` will be fixed on `hero` at `marquee`…"), and still honours it.
When the composition goes live the warning becomes D2's error. The go-live changeset names the
change.

## Not in scope

- **Fixing a multi-attribute axis** (`bg`, `tint`, `frame`, `substrate`, `cover`, motion). No rune needs it.
- **Hiding attributes the rune's own `attributes` declare.** A definition already decides those.
- **A theme narrowing the set further.** Identity is not theme-overridable (ADR-028).

## Open questions

- **Whether the reference should also collapse the universal attributes** behind a "Surface and
  layout" heading linking to `/runes/surfaces`, now that each shows its default. A presentation
  choice for the page, not a decision of the mechanism.

## Acceptance Criteria

- [ ] A composition definition accepts `fixed` for single-valued universal axes, rejects multi-attribute axes, unknown keys, bad values and keys also in `defaults`, naming each
- [ ] A fixed axis lands where the author's attribute would, and a template literal that contradicts it rejects the definition
- [ ] A fixed axis is left out of the narrowed schema, and writing it reports `axis-fixed` at error severity, with no second unknown-attribute error
- [ ] `RuneConfig.fixedAxes` carries it for composed and native runes; `inspect` and `contracts` report the axis as unavailable, "fixed by the rune"
- [ ] The rune reference and `refrakt reference` show each offered axis's default and its source, and list fixed axes separately, for native and composed runes
- [ ] The staged `hero` fixes `prominence: marquee`; `cta` and `testimonial` fix nothing
- [ ] The plugin `hero` warns when `prominence` is written, and still honours it
- [ ] The composed-runes guide documents `fixed`, with its error in the Errors table

## References

- {% ref "SPEC-145" /%}: D33 (placement), D34 (defaults; D34.3 amended here, D34.6 the precedent).
- {% ref "SPEC-125" /%}: Phase 3, the narrowed schema and the `unavailable` contract.
- {% ref "SPEC-183" /%}: `marquee`, the value `hero` fixes.
- {% ref "SPEC-177" /%}: D3, the site and theme defaults a fixed axis is above.
- {% ref "SPEC-181" /%}: the rollout gates D6 follows.
- {% ref "ADR-028" /%}: identity is not theme-overridable.

{% /spec %}
