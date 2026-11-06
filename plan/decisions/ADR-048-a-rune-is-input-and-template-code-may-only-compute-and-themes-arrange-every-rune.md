{% decision id="ADR-048" status="proposed" date="2026-11-05" source="SPEC-194" tags="theme, composition, template, content-model, native, engine, architecture" %}

# A rune is input and template; code may only compute, and themes arrange every rune

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
- **Codegroup:** its model is declarative already; the tab label's fallback chain is a
  computation.

A `custom` model is also opaque to tooling: `packages/runes/src/reference.ts` can report only its
prose `description`. The language server, editor, reference docs and validation see a grammar for
most runes and a sentence for these fourteen.

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

**Option 4.** It is made of two decisions.

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
   - Kept as vocabulary semantics: `block`, `modifiers`, `metaFields`, `blocks` (a named group
     of fields the template places), `sequence`, axis defaults, `rootAttributes`, `interactive`
     and `editHints`. SPEC-194 D5 classifies every field.
   - Deprecated as structure assembly, as each rune moves: `structure`, `layout`,
     `contentWrapper`, `autoLabel`, `projection` and `postTransform`.
   - Engine config becomes compiler output, generated from a definition as
     `composedRuneConfig` already does, and is never a theme surface.
6. **An opaque visual is one slot.** A rune whose inside is a drawing (`map`, `chart`,
   `diagram`, `juxtapose`) places its drawing as a single slot. Its title, legend, caption and
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

## Rationale

- **It gives a theme author one convention.** CSS on the vocabulary for everything, plus a
  template where the theme has an opinion about arrangement, for any rune. Whether `codegroup`
  runs code is invisible to them.
- **It removes the engine's second template language.** Arrangement is expressed once, in the
  template language, which is readable, checkable and overridable.
- **It keeps code where code is needed, and nowhere else.** `prepare` is small and pure:
  arithmetic, alignment, inference, label derivation. Everything around it is declared, so
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
  Under this decision, `prepare` reports the fact and the template decides.
- **Tooling gains a full grammar** for the fourteen runes that today report only a prose
  `description` in `refrakt reference`, the language server and the editor.

{% /decision %}
