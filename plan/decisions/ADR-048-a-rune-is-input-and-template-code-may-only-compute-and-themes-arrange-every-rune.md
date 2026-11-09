{% decision id="ADR-048" status="accepted" date="2026-11-05" source="SPEC-194" tags="theme, composition, template, content-model, native, engine, css, classes, architecture" %}

# A rune is input and template; code may only compute, and themes arrange every rune

> **Accepted on 2026-11-09**, together with {% ref "SPEC-194" /%}, {% ref "SPEC-195" /%} and
> {% ref "SPEC-196" /%}, after a review pass that brought the four into line:
>
> 1. **A rune has one name, its tag name** (SPEC-196 D10). It is also its `data-rune` and its
>    block, so moving to a definition changes no class; only eight `data-rune` values change.
> 2. **`block` is no longer kept** in decision 1.5's list.
> 3. **The drawings are one list** (SPEC-194 D8): `chart`, `map`, `diagram`, `audio`,
>    `juxtapose`. `embed` is a domain rune that places a `frame` primitive.
> 4. **Decision 3 and its terms** are explained under Context, and the implementation order
>    lands the role-based classes before the first native domain rune moves.
>
> The amendments this decision makes elsewhere carry back-pointers: ADR-045 decision 7
> (superseded), SPEC-145 D2, SPEC-161 D3, SPEC-168 D9, SPEC-177, SPEC-181 (fifth gate) and
> SPEC-185 D6. ADR-029 and ADR-031 were rejected the same day, as the Consequences say they
> should be, and WORK-584, the spike serving ADR-029, was cancelled.

## Context

Composition gave refrakt two ways to arrange a rune, and the line between them depends on how
each rune happens to be implemented:

- **A composed rune** is one definition file. Its frontmatter is the input (attributes,
  content model, fields, schema row), and its body is a template. A theme or site may replace
  the template ({% ref "ADR-045" /%}, {% ref "SPEC-177" /%}).
- **A native rune** is a TypeScript transform that builds a tree, plus an engine config entry
  that builds more of it (`structure`, `layout`, `contentWrapper`, `autoLabel`, `projection`,
  `postTransform`). A theme may override that config, as legacy only
  ({% ref "ADR-043" /%} decision 6), and cannot rearrange the rune in any other way
  (ADR-045 decision 7).

So a theme author meets two conventions for the same need, and which one applies to `recipe`
or `codegroup` is an implementation detail they should not have to know.

### The engine was doing two jobs

The engine was designed as the theme layer: the place a theme reshapes a rune without running
its code (SPEC-081, ADR-029). That job never ran in practice:

- Lumina's config overrides no rune (`packages/lumina/src/config.ts`, `luminaOverrides`).
- ADR-029 (structural assembly is theme-owned) and ADR-031 (site-level rune config overrides)
  are both still `proposed`. ADR-029 records that the structure contract is correct "by
  accident" because no theme exercises the right.
- ADR-043 retired it for everything new.

The engine's other job, rendering the shared vocabulary, is more central than before. Composed
runes run through it. `composedRuneConfig` (`packages/runes/src/lib/composition.ts`) generates
modifiers, `metaFields`, `blocks`, axis defaults and `sequence` from a definition, and the engine
is what renders a `{% field %}` a template places.

What remains on the native side is therefore a **second template language** inside engine
config. Native runes use it, composed runes do not, and themes may not use it.

### Native runes need code to compute, not to parse

Fourteen runes declare a `custom` content model, the escape hatch that `CustomModel`
(`packages/types/src/content-model.ts`) describes as "genuinely stateful and cannot be expressed
declaratively". Read one by one, each `processChildren` mixes a parse that could be declared with
a computation that needs code. SPEC-194 D6 has the inventory. Examples:

- **Budget:** `Description: $Amount` is an `itemModel` pattern; the subtotal is arithmetic.
- **Comparison:** columns from headings and rows from bold-labelled items are declarable;
  aligning rows across columns is a computation.
- **Form:** the field groupings are declarable; inferring each field's type from its option
  count and modifier words is a computation.

A `custom` model is also opaque to tooling: `packages/runes/src/reference.ts` can report only its
prose `description`. The language server, editor, reference docs and validation see a grammar for
most runes and a sentence for these fourteen.

### Terms, and the third decision

- **"Native" means written in TypeScript today.** Once a rune moves, it is a definition like any
  composition; one that needs code names a `prepare` stage. "The first native runes to move"
  (SPEC-194 D14) means runes that are TypeScript now.
- **Decision 3 came later.** While settling which runes keep classes ({% ref "SPEC-196" /%}), it
  became clear that converting a rune had been aiming at parity with its current look, and that
  this kept rune-specific CSS alive under another name. ADR-044 already states the end the
  project wants: a theme that names no rune. Decision 3 makes conversions aim at it.

## Options Considered

1. **Keep the two conventions.** Native runes keep config, composed runes get templates, and the
   boundary moves as runes are converted.
   - Every rune that stays native (novel visuals, runes whose input needs code) stays
     unarrangeable for good.
   - Engine config keeps a structure language that only first-party code writes.
   - Rejected.
2. **Give native runes a matching config lever**: per-rune theme overrides of `structure` and
   `layout`, done properly (ADR-029's direction).
   - Keeps two arrangement languages and puts a theme back into per-rune config, which ADR-043
     removed for good reasons.
   - Rejected.
3. **Convert every native rune to a composition.**
   - Impossible where input needs code, which SPEC-161 D3 deliberately keeps out of
     compositions.
   - Rejected as a general rule. Still the first choice per rune (ADR-044 tier 1).
4. **Make every rune input + template, with an optional code stage between them.** The
   definition format is the same for every rune. A native rune is a definition that names a
   `prepare` stage, which computes values from already-parsed content. The template, the theme
   and site override route, and the checks are shared.

## Decision

**Option 4.** It is made of three decisions.

### Decision 1: every rune is input + template; native runes add a `prepare` stage

1. **One definition format for every rune.**
   - Frontmatter declares the input: attributes, content model, fields, `metaFields`, presets,
     schema row and translation keys.
   - The body is the template.
   - A native rune's definition additionally names a `prepare` stage and declares what it
     `computes`.
2. **`prepare` computes; it does not parse or build.**
   - It receives the resolved fields and the attributes, never raw AST.
   - It returns values for the fields declared under `computes`: on the rune, or on each
     item of a repeated slot.
   - It cannot create, remove or reorder slots, and it returns no tree.
3. **Code lives only in a package.**
   - A `prepare` stage is TypeScript, registered by a plugin or by core.
   - A `.md` definition may name a registered stage. It cannot contain one.
   - A site-authored rune therefore stays code-free. This restates SPEC-161 D3 precisely: a
     template never runs code, and a composition never contains it.
4. **The template is arrangeable for every rune.** SPEC-177's lookup (site, then theme, then
   definition), its `defaults`, and its checks apply to a native rune's template unchanged.
   ADR-045 decision 7 ("native runes are unaffected") is superseded.
5. **The engine renders the vocabulary; it assembles no rune.**
   - Kept as vocabulary semantics: `modifiers`, `metaFields`, `blocks` (a named group
     of fields the template places), `sequence`, axis defaults, `rootAttributes`, `interactive`
     and `editHints`. SPEC-194 D5 classifies every field. `block` goes: a rune's name is its tag
     name, and its classes are the theme's (SPEC-196 D10).
   - Deprecated as structure assembly, as each rune moves: `structure`, `layout`,
     `contentWrapper`, `autoLabel`, `projection` and `postTransform`.
   - Engine config becomes compiler output, generated from a definition as
     `composedRuneConfig` already does, and is never a theme surface.
6. **An opaque visual is one slot.** A rune whose inside is a drawing (`chart`, `map`,
   `diagram`, `audio`, `juxtapose`; the list is SPEC-194 D8's) places its drawing as a single slot. Its title, legend, caption and
   controls are fields and slots around that slot, which a theme may arrange. The drawing's own
   CSS stays the plugin's, written in tokens only (ADR-044 tier 3).
7. **A template never names an HTML element.** It places slots, fields, groups and runes.
   Elements come from what the definition declares: a group's arrangement, a value's
   `metaType`, a primitive. This is what lets the deprecated `structure`, `layout` and
   `contentWrapper` fields go without moving their free `tag` into templates, where it would
   reopen the theme boundary, let a template assert meaning the definition never declared, and
   need an allowlist to keep templates code-free. SPEC-194 D11 maps each need such a tag would
   serve to the vocabulary.

### Decision 2: content models are declarative everywhere

1. **A rune's content model is always declared in frontmatter.** `CustomModel` is deprecated,
   and removed once no first-party rune uses it.
2. **The grammar grows where the inventory shows a gap.** SPEC-194 D7 names four extensions:
   - node-started groups;
   - a field taken from anywhere in the body;
   - inline extraction from headings;
   - repeated choice.

   Each is specified once and is available to every definition, site-authored ones included.
3. **What cannot be declared is a named gap, not an escape hatch.** A rune whose input truly
   cannot be described by the grammar is recorded as a gap against the grammar and closed
   there. It does not get its own parser.

### Decision 3: converting a rune aims at a simpler design language, not parity

*Added 2026-11-09.*

1. **A converted rune ships no rune CSS.** Whether it becomes a composition or a native
   definition, a domain rune is styled through the primitives it places and the universal
   dimensions. Parity with how it looks today is not the bar.
2. **Its stylesheet is triaged at conversion.** Each rule is dropped as an accepted
   simplification, promoted into a primitive, a dimension or the shared vocabulary, or kept as
   a recorded exception (a drawing, or a reviewed special case on `[data-rune]`). A Lumina lint
   with an allowlist that may only shrink holds the line ({% ref "SPEC-196" /%} D11), and the
   triage is a go-live gate ({% ref "SPEC-181" /%}).
3. **Only the vocabulary gets classes.** The theme's default `"bem"` setting classes primitives
   and drawings, declared by a definition's `role`, and never domain runes (SPEC-196 D8).

## Rationale

- **It gives a theme author one convention.** CSS on the vocabulary for everything, plus a
  template where the theme has an opinion about arrangement, for any rune. Whether `codegroup`
  runs code is invisible to them.
- **It removes the engine's second template language.** Arrangement is expressed once, in the
  template language, which is readable, checkable and overridable.
- **It keeps code where code is needed, and nowhere else.** `prepare` is small and pure:
  provider tables, diffing, field-type inference. Arithmetic and label chains are
  {% ref "SPEC-195" /%}'s functions. Everything around it is declared, so
  tooling sees every rune's grammar and every rune's output shape.
- **It completes ADR-043 and ADR-045 rather than reversing them.** ADR-043's line (a theme does
  not change meaning) and ADR-045's (a theme may change arrangement) hold unchanged. This
  decision removes the exception that kept native runes out of ADR-045.
- **It is incremental.** A native rune without a template is today's native rune. Each rune
  moves on its own, and the deprecated config fields go when the last user goes.

## Consequences

- **ADR-045 decision 7 is superseded** by decision 1.4. ADR-045's other decisions apply to
  every rune.
- **ADR-043 decision 6 gets an end.** A theme's `runes:` section is removed from
  `ThemeConfigOverrides` once no first-party rune needs a config-only lever. SPEC-194 D9 sets
  the condition.
- **ADR-029 and ADR-031 should be rejected.**
  - ADR-029: a theme reshapes structure through a template, not through config.
  - ADR-031: a site does so through `templates/`, SPEC-177 D4's site level.
  - Neither is accepted today, so rejecting them breaks nothing.
- **SPEC-161 D3 is restated** as decision 1.3 and gets a pointer here.
- **SPEC-177 widens** from composed runes to every rune with a template. Its checks read slots
  and fields from the content model and `computes`, so they still run without content.
- **Structure contracts are per theme for every rune**, as ADR-045 already made them for
  composed runes.
- **Each native rune needs a pass** to separate its parse, its computation and its arrangement.
  Some transforms make arrangement decisions while parsing (`codegroup`'s single-fence case).
  Under this decision, the fact is computed in the input half and selects a template variant
  ({% ref "SPEC-168" /%} D9), so the arrangement stays the template's.
- **Tooling gains a full grammar** for the fourteen runes that today report only a prose
  `description` in `refrakt reference`, the language server and the editor.
- **The vocabulary must grow ahead of the conversions.** Every rule a triage promotes needs a
  primitive, a dimension or a vocabulary value to land in. Gaps found during conversions are
  the expected input to that work, not a reason to keep rune CSS.

## Implementation order

*Recorded 2026-11-09.* Neither "after every composition" nor "all first": what changes the
cost or shape of conversions comes first, and the native-rune work follows the compositions,
which prove the definition format on many runes first.

0. **Accept this decision** and review {% ref "SPEC-194" /%}, {% ref "SPEC-195" /%} and
   {% ref "SPEC-196" /%} together before any work items.
1. **Independent fixes, now:** {% ref "BUG-048" /%}; SPEC-196 D6 (behaviour scripts select by
   attribute, which also fixes the prefix bug) and D5 (the additive attributes).
2. **Vocabulary first:**
   - the primitive and dimension work the triage will need: {% ref "SPEC-160" /%}'s `section`
     and `card`, {% ref "SPEC-156" /%}'s arrangements, and the draft sentiment and glyph specs
     ({% ref "SPEC-163" /%}, {% ref "SPEC-164" /%});
   - SPEC-195's basics, which unblock conversions such as `recipe`'s `totalTime` and `budget`'s
     sum: the function registry with signatures, `computes` expressions, `matches`, `first`,
     `item`, `split` and the fan-out rule. Values may stay strings until
     {% ref "SPEC-166" /%} lands;
   - the Lumina lint (SPEC-196 D11), with an allowlist that starts as today's rune stylesheets.
3. **Template-language extensions**, each just before its first user: two-level iteration
   (SPEC-194 D12) and `fragment` ({% ref "SPEC-168" /%} D8).
4. **SPEC-196's role-based classes**: the `classes` setting with `"bem"` classing primitives and
   drawings, and `role` on definitions. It changes no output on the day it lands, and it must
   precede the first native domain rune that becomes a definition (`embed`), so that rune loses
   its classes the way compositions do.
5. **The composition migration continues** (the plugin audits SPEC-147 to SPEC-157), each
   conversion with its stylesheet triaged and its rune removed from the allowlist. Alongside it
   run the first native definitions, in SPEC-194 D14's order (`pull-quote` with the
   `attribution` primitive, then `codegroup`, then `embed` with the `frame` primitive), and the
   loader split for `$page` and `$site` (SPEC-194 D12).
6. **The remaining native runes move to definitions**, in SPEC-194 D10's order. Each is triaged
   like a conversion.
7. **Removals, last**, once nothing first-party uses them (SPEC-194 D9): the structure-assembly
   config fields, the `runes:` section of theme config, `CustomModel`, and the old `data-rune`
   names SPEC-196 D10 replaces. `featured-tier` goes with the `pricing` composition.

One rule holds throughout: **no conversion is merged that would need its CSS triaged twice.**
If a conversion is ready before the vocabulary it needs, the vocabulary is extended first.

{% /decision %}
