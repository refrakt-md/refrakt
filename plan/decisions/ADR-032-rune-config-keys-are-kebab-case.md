{% decision id="ADR-032" status="proposed" date="2026-09-19" source="SPEC-094" tags="config, theme, runes, naming, consistency, dx, migration" %}

# Rune config keys are kebab-case

## Context

`ThemeConfig.runes` is keyed by PascalCase `typeName` — `Card`, `HowTo`,
`BentoCell`. Nothing ever compares those keys as PascalCase. Three code paths
exist solely to undo the casing:

```ts
engine.ts:108   const runeKeyMap = new Map(Object.keys(runes).map((k) => [toKebabCase(k), k]));
engine.ts:318   const requiredRune = toKebabCase(config.requiresParent);
assemble.ts:17  const normalizeRuneKey = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
```

The third documents the problem in its own comment: it exists *"to bridge the
provenance keys (`Plugin.runes` names, e.g. `howto`) to the PascalCase
`theme.runes` / `config.runes` keys (e.g. `HowTo`)"*. A helper whose stated
purpose is reconciling two spellings of one name.

The key is kebab-cased at map construction; `data-rune` — kebab — is what the
engine matches. PascalCase never survives contact with anything.

### One rune, four spellings

`HowTo` is the worst case and shows the cost:

| Surface | Spelling |
|---|---|
| config key (`plugins/learning/src/config.ts:20`) | `HowTo` |
| `block` (`:21`) → CSS | `howto` → `.rf-howto` |
| `rune:` (`howto.ts:129`) → `data-rune` | `how-to` |
| Markdoc tag (`index.ts:12`) | `howto` (alias `how-to`) |

A theme context-matching it writes `contextModifiers: { 'how-to': … }` while
styling `.rf-howto`. Nothing signals which spelling belongs where.

### The config contradicts itself inside one object

```ts
Swatch: { block: 'swatch', contextModifiers: { 'design-context': 'in-design-context' } },
Step:   { block: 'step',   parent: 'Steps', requiresParent: 'Steps' },
```

Same file, same shape, two casings for the same kind of reference.
`contextModifiers` keys are kebab — documented as matching the parent's
`data-rune`. `parent` and `requiresParent` are PascalCase, then kebab-cased at
use. There is no rule an author can hold; it is per-field knowledge.

### Why now

{% ref "ADR-031" /%} exposes rune config to `refrakt.config.json`. An author
would be typing `"HowTo"` in a JSON file where everything else is kebab, for a
rune they invoke as `{% howto %}` and style as `.rf-howto` — and
{% ref "SPEC-126" /%}'s generated configuration reference would have to document
that convention as though it were intended.

The same surface already exists and already leaks: `SiteConfig.overrides` maps
component paths by rune name, and its own validation message
(`packages/sveltekit/src/config.ts:76`) calls them *"typeof names"*.

## Decision

**Rune config keys, and every rune-name reference inside `RuneConfig`, are
kebab-case — matching `data-rune`, the `rune:` declaration, and
`contextModifiers`.**

This is a **spelling convention, not a mechanism change.** PascalCase keys
continue to resolve, indefinitely.

### 1. Kebab already works, unchanged

`toKebabCase` is idempotent on kebab input:

```
HowTo     -> how-to        how-to     -> how-to
BentoCell -> bento-cell    bento-cell -> bento-cell
Card      -> card          card       -> card
```

So `{ 'how-to': { … } }` resolves correctly today with no engine change. The
migration is a rewrite of literals, not a change to resolution.

### 2. `parent` and `requiresParent` become kebab

Both are safe to rewrite. `requiresParent` is kebab-cased at use
(`engine.ts:318`). `parent` is never compared at all — its only consumers are
`contracts.ts:177` and `:405`, which copy it into the contract as data. So
converting them changes literals and contract output, never behaviour.

### 3. PascalCase is not removed

Both spellings resolve, forever. There is no deprecation cliff and no flag day:
once the normalizers are the only consumers, accepting both costs nothing, and a
hard removal would break every third-party plugin for a cosmetic gain.

### 4. `typeof` is out of scope

The RDFa `typeof` attribute carries schema.org type names — `Person`,
`HowToStep`. PascalCase is correct there and stays. This decision covers
`ThemeConfig.runes` keys and rune-name references within `RuneConfig` only.

## Consequences

**The contract churns, and that is the whole bill.** `contracts/structures.json`
keys by the config key (`Accordion`, `AccordionItem`, `Details`, …). Both
committed copies rewrite wholesale. That diff is unreviewable, so the conversion
must land as an isolated commit with no behaviour change beside it — the same
discipline {% ref "WORK-583" /%} needs for its own contract churn.

**Scale:** 132 rune config entries across core and the nine plugins, 50
`parent`/`requiresParent` references, 8 `contextModifiers` entries. Mechanical,
but not small enough to sneak into another change.

**The normalizers stay.** They are what makes PascalCase keep working, and they
keep earning their place bridging plugin rune names to config keys. What changes
is that they stop being the only thing holding two conventions together.

**`SiteConfig.overrides` should follow.** It is already user-facing and already
keyed by rune name. Converting it in the same pass avoids a second, later
migration of the same surface — and its validation message needs rewording away
from "typeof names" regardless, since that phrase describes neither what it
takes nor what `typeof` means elsewhere.

**It should land before {% ref "ADR-031" /%}'s schema work.** The generated
configuration reference will enshrine whichever spelling the schema documents,
and documenting PascalCase for a name users only ever see as kebab would make
the inconsistency permanent and public.

## Alternatives considered

**Leave it; it is only cosmetic.** True while rune config is TypeScript-only,
which it has been. Rejected because {% ref "ADR-031" /%} moves it into JSON that
ordinary authors write, and that is exactly when a convention nobody can predict
becomes a support burden.

**Go the other way: PascalCase everywhere, including `data-rune` and
`contextModifiers`.** Internally consistent, and arguably the original
intention. Rejected because `data-rune` is HTML, CSS selectors are kebab by
convention, and Markdoc tags are lowercase — the kebab side is anchored by three
external conventions and the PascalCase side by none.

**Rename and remove PascalCase support.** Cleaner end state, one spelling in the
codebase. Rejected: every third-party plugin's `theme.runes` breaks for a
cosmetic gain, and the normalizers that make dual support free are needed
anyway.

**Also normalise `block` to match the key.** Tempting — `HowTo`'s `block` is
`howto` while its `data-rune` is `how-to`, which is the sharpest inconsistency
in the whole example. Deliberately excluded: `block` determines the BEM class,
so changing it is a **CSS-breaking change** for every theme, not a config
rewrite. It deserves its own decision with a real migration story.

## Checked while scoping

**`refrakt inspect --list` is unaffected.** `listRunes`
(`packages/cli/src/commands/inspect.ts:434`) maps over `Object.values(runes)`
and prints `rune.name` from the catalog, never the theme-config key. Its output
does not change, and no documentation quoting it needs regenerating.

**Nothing compares `parent` raw** — see decision 2. The only remaining
behavioural risk in the conversion is a third-party plugin doing its own
`Object.keys(config.runes)` comparison, which dual support (decision 3) already
covers.

## References

- {% ref "SPEC-094" /%} — theme system foundations
- {% ref "ADR-031" /%} — site-level rune config overrides; the change that makes this user-facing
- {% ref "SPEC-126" /%} — generated configuration reference
- {% ref "ADR-030" /%} — the `arrange` rename, which touches the same config entries

{% /decision %}
