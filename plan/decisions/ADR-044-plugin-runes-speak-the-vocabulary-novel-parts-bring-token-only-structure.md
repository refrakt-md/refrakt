{% decision id="ADR-044" status="accepted" date="2026-10-12" source="SPEC-145" tags="theme, plugins, composition, vocabulary, css, tokens, architecture" %}

# Plugin runes speak the vocabulary; novel parts bring token-only structure

> **Accepted on 2026-10-28** as written. The two checks it calls for are
> {% ref "WORK-673" /%}, and the plugin-authoring guide's rewrite goes with it.

## Context

{% ref "ADR-043" /%} bounds what a theme does: it renders the shared vocabulary and supplies
tokens, and it configures no rune. That bound holds for compositions, which emit only primitives
and vocabulary. It does not hold for a **native rune from a third-party plugin**. Such a rune
is TypeScript that emits whatever elements and classes it likes, and no theme can know them.

The first-party code shows the same problem, hidden by the fact that we write the theme too:

- **Lumina ships 92 per-rune stylesheets** (`packages/lumina/styles/runes/`). 47 of them style
  runes outside core's block list, nearly all plugin runes: `bond`, `recipe`, `playlist`,
  `map`, the plan runes, the design runes and the marketing runes.
- **The skeleton ships 82 per-rune structure files** (`packages/skeleton/styles/runes/`), many of
  them for plugin runes as well.
- **The plugin-authoring guide** (`site/content/extend/plugin-authoring/authoring.md`) has a
  plugin ship its own `styles/` directory. In practice that CSS is written against Lumina's
  look, because it is the only theme there is.

So today the reference theme knows every first-party rune by name, and a third-party rune is
either unstyled under another theme or styled for Lumina only. A theme's domain is unbounded as
long as runes may emit structure the theme has to learn.

## Options Considered

1. **Themes ship CSS for popular third-party runes.** It does not scale, couples theme releases
   to plugin releases, and leaves every other rune unstyled.
2. **Plugins ship a full skin per known theme.** Plugin authors would need to know every theme,
   which is the same problem from the other side.
3. **Plugin runes speak the vocabulary, and only genuinely novel parts bring their own
   structure, drawn in theme tokens.** The theme's domain stays the vocabulary plus the token
   set. The plugin covers the remainder, using only those two interfaces.

## Decision

**Option 3.** A plugin rune takes the first of these tiers that fits.

1. **A composition, whenever possible.** A domain rune that can be a composition should be one.
   The theme already covers it, because a composition emits only primitives and vocabulary.
   Once {% ref "SPEC-160" /%}, {% ref "SPEC-161" /%} and SPEC-145 D28–D29 land, this covers most
   of what plugins do: entities, cards, lists of metadata, labelled values.
2. **A native rune that emits the vocabulary**, when imperative code is needed (parsing,
   arithmetic, data fetching).
   - **The preferred shape is a primitive plus compositions.** The imperative part is a generic
     primitive, and the domain runes are compositions over it, as {% ref "SPEC-162" /%} does
     with `amount` and `tally` under `ledger` and `budget`, and SPEC-161 D3 states: a primitive may own imperative code; a
     composition may not.
   - **Otherwise, the native rune places core primitives in its output.** It builds child nodes
     of core runes and has them transformed normally, as `cast` already does by emitting
     `cast-member` tags (`plugins/business/src/tags/cast.ts`). Placed primitives pick up
     vocabulary changes, engine processing and contracts for free.
   - **Stamping vocabulary attributes** (`data-zone-layout`, `data-meta-type`, `data-section`)
     on the rune's own elements is allowed but discouraged. The plugin would have to track the
     vocabulary by hand.
   - **Structured data stays in the field bag.** A placed primitive is a name-resolution
     boundary for structured data (SPEC-145 D19, {% ref "SPEC-146" /%}). A native rune that
     publishes JSON-LD writes what it publishes into its field bag, not into the tree it then
     reads back. This is SPEC-145 D28's "the bag is the record".
3. **Genuinely novel visuals bring their own structure CSS, written only in theme tokens.** A
   map, a chart, a waveform or a diagram has parts the vocabulary cannot express, and should not
   be forced into it. For those parts:
   - the plugin ships the structure layer for its own elements, as the skeleton does for core;
   - that CSS uses only theme tokens: colour, spacing, radius, typography, motion. It has no
     literal colours or sizes and assumes no particular theme;
   - a theme may add a skin through `[data-rune]`, but is not required to. The rune already
     looks right in any theme, because it is drawn in that theme's tokens.

**The theme's domain is two interfaces: the vocabulary and the token set.** Everything else
belongs to the plugin, which works through those same two interfaces.

## Rationale

- **It is what makes third-party theming possible at all.** A theme author can cover a closed
  vocabulary and a token set. They cannot cover runes that do not exist yet.
- **It reuses the composition boundary instead of inventing a new one.** Tier 2's preferred
  shape is the same primitive/composition split already decided for budget, so a plugin author
  learns one rule.
- **Tier 3 is honest.** Some visuals are new. Forcing a map into vocabulary terms would produce
  worse output than letting it draw itself. Restricting it to tokens keeps it consistent with
  whatever theme the site uses.
- **First-party code is held to the same rule**, which is the proof that the rule works.

## Consequences

- **Two checks make the tiers checkable rather than advice:**
  - **A vocabulary report per plugin rune.** Built from `refrakt contracts`, it lists the
    elements in a rune's output that carry no vocabulary: the plugin's own elements, which tier
    3 makes the plugin's to style. It is a report, not an error, because tier 3 is legitimate.
  - **A token-only lint for plugin CSS.** It flags literal colours, sizes and font stacks in a
    plugin's stylesheets. This one check is what makes tier-3 CSS portable across themes.

  Together with ADR-043's theme coverage check, they cover the whole page: the theme covers
  the vocabulary, and the plugin covers what it adds.
- **Lumina's per-rune CSS is drained.** As first-party plugin runes become compositions, their
  stylesheets in Lumina shrink to nothing. The structure of novel first-party natives (`map`,
  `chart`, `diagram`, `juxtapose`, …) moves to the owning package (the plugin, or the skeleton
  for core) and is rewritten in tokens only. Lumina ends as vocabulary skin plus presets, with no
  rune named in it. That end state is the evidence that ADR-043 and this decision hold.
- **The plugin-authoring guide is rewritten around the tiers.** It explains which tier to
  choose and why, the primitive-plus-composition shape, placing core primitives from a native
  rune, and token-only structure CSS. Its `styles/` example becomes a tier-3 example, not a
  default.
- **The token set becomes a public contract.** A plugin's tier-3 CSS depends on token names,
  so renaming or removing a token is a breaking change for plugins, not only for themes. The
  token set is documented and versioned as such.
- **Existing third-party plugin CSS keeps working** until the lint is turned on. The lint
  starts as a report; a plugin that passes it can say it is theme-portable.

{% /decision %}
