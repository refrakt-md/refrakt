{% decision id="ADR-035" status="rejected" date="2026-09-28" source="SPEC-143" tags="theme, css, config, serialisation, hosted, dx" %}

# The skin format is for leaf themes; Lumina stays a package

> **Rejected.** The premise below — that a user-authored rune must be able to ship its own
> CSS — was removed by {% ref "ADR-037" /%}. The reasoning is kept rather than deleted; see
> **Why this was declined** at the end, which is the operative section.

## Context

{% ref "SPEC-143" /%} establishes that a serialised rune carries three payloads —
schema, `RuneConfig` and CSS — and that the config splits along `IDENTITY_FIELDS`
into a half the rune owns and a half a theme may override. That implies a
`<rune>.skin.md` file holding the presentation config together with the CSS in one
fence, co-located because the config is what generates the selectors the CSS
targets.

Once that format exists, the obvious question is whether the reference theme
should adopt it. The argument for is strong on its face: one format for everyone,
proven by its own reference implementation, and the config/CSS seam collapsed. The
argument against has to be better than "good enough for users, not for us", which
is normally a smell.

The decisive evidence is already in the repo, in the allowlist that polices that
seam today. `packages/lumina/test/css-coverage.test.ts` maintains a **116-entry**
`KNOWN_MISSING_SELECTORS` set, and the entries do not read as neglect — they read
as routing:

```
'.rf-event__header',   // styled via [data-section="header"] dimension
'.rf-event__meta-item',// styled via metadata dimension
'.rf-recipe__meta',    // meta bar styled via [data-section="header"] in shared split.css
// Badge/meta-item selectors — now styled by shared metadata dimension rules ([data-meta-type])
```

Lumina styles by cross-cutting dimension selectors on purpose, one rule serving
many runes. That is the opposite of one-rune-one-file.

## Decision

**The skin format targets leaf themes. Lumina stays a package of CSS files and a
`RuneConfig` object.** The two are one data model with two encodings: a
`.skin.md` deserialises to exactly the presentation `RuneConfig` fields plus a CSS
string, which is what Lumina's config-plus-CSS pair already is, spelled
differently. That relationship is the same one `refrakt.config.json` has to
`SiteConfig`, and needs no apology.

The benefit of co-location is proportional to **isolation**, and the threshold is
a property of the theme rather than of the format:

| Theme shape | Encoding | Why |
|---|---|---|
| Styles a few runes, each self-contained | `.skin.md` | Co-location is exact; its coverage check needs no allowlist because a leaf can only style its own block |
| Has cross-cutting mechanisms (shared dimensions, layout systems, token layers) | package | A per-rune file has nowhere to put a rule that serves thirty runes |

**A theme may graduate.** One that starts as `.skin.md` files and develops shared
mechanisms converts to a package. The follow-on spec states that path, so a theme
author does not discover at file forty that the format has run out.

**The format's expressiveness is proven by round-trip test, not by adoption.**
Take one Lumina rune's presentation config and its CSS, express it as a
`.skin.md`, and assert the deserialised result matches what the package ships.
That is a requirement of the follow-on spec, not a nice-to-have — see
Consequences.

## Consequences

- One data model, two encodings, with a conversion function that has to exist
  anyway for the round-trip test. No second code path through the engine: a
  deserialised skin reaches `mergeRuneConfig` as the presentation-half override it
  already is.
- Lumina keeps sourcemaps, PostCSS, stylelint, editor CSS tooling and — the load-
  bearing one — its per-block file granularity. `packages/sveltekit/src/virtual-modules.ts:119`
  emits `import '${theme}/styles/runes/${block}.css'` per used block, which
  requires a real file at a known path. Fences would mean build-time extraction
  regenerating exactly those files: a build step for no runtime gain.
- Adoption could only ever have been partial. Lumina is also `tokens/base.css`,
  `styles/layouts/*`, `styles/dimensions/*`, `styles/elements/*` and `global.css`;
  a per-rune skin covers one slice, and two formats inside one theme is worse
  than either alone.
- **A format the reference theme does not use is a format that rots.** This is the
  real cost of this decision, and the round-trip test is what pays it down: an
  expressiveness gap surfaces in CI rather than in the first user's bug report.
  Without that test, this decision is a liability rather than a trade.
- The threshold is a judgement, so some theme will sit on the line. The
  graduation path is what keeps that from being a trap.

## Alternatives considered

**Lumina adopts `.skin.md` wholesale.** Rejected on the evidence above: 114 skin
files plus a shared remainder is the current arrangement in a worse container, it
breaks the per-block tree-shaking import, and it trades CSS tooling for
co-location that a systemic theme cannot use.

**Neither uses it — user runes reference existing BEM blocks instead of shipping
CSS.** Rejected in SPEC-143: a rune that cannot style itself is not a rune an
author can define for a new domain, which is the point of the exercise.

**Two formats with no conversion between them.** Rejected: that is what makes a
format rot. The conversion function is cheap and it is the test.

## Checked while scoping

- `packages/transform/src/identity-fields.ts` — the identity/presentation split the
  skin half depends on; `IDENTITY_FIELDS` is eight fields and `merge.ts` drops and
  reports an override that touches them
- `packages/lumina/test/css-coverage.test.ts` — the 116-entry allowlist, and that
  its entries record shared-selector routing rather than gaps
- `packages/sveltekit/src/virtual-modules.ts:110-128` — per-block CSS imports under
  `usedCssBlocks`, and the `virtual:refrakt/site-tokens.css` precedent for
  composed-string CSS
- `packages/skeleton/index.css:18` — `@layer skeleton, skin`, where the word
  `skin` comes from

## Why this was declined

Four reasons, three of them drawn from this decision's own text.

**1. The alternative this ADR rejected became the architecture.** Under *Alternatives
considered*: *"Neither uses it — user runes reference existing BEM blocks instead of shipping
CSS. Rejected in SPEC-143: a rune that cannot style itself is not a rune an author can define
for a new domain."* {% ref "ADR-037" /%} decided exactly that — users author composed runes
only, and a composed rune has no block and ships no CSS ({% ref "SPEC-145" /%} D2). The
premise the Context rests on is gone.

**2. Its own stated cost was never paid.** Consequences: *"A format the reference theme does
not use is a format that rots… Without that test, this decision is a liability rather than a
trade."* The round-trip test is owed to "the follow-on spec", cited twice above. **That spec
was never written**, so the decision has been sitting on the liability side of its own trade
since the day it was made.

**3. The audience is empty on both sides of its own threshold table.** That table splits on
isolation — *"styles a few runes, each self-contained"* → skin, *"cross-cutting
mechanisms"* → package. After composition:

- A **theme** styles tokens, primitives and dimensions. One rule on `card` serves every
  composition built from it, so the work is cross-cutting by construction — the *package* row.
- A **capability package** ({% ref "ADR-039" /%} rule 4) shipping CSS for a rune it owns is a
  package, and ships `styles/<block>.css` exactly as Lumina ships `styles/runes/card.css` —
  also the package row. Measured: **no plugin ships any CSS today**, and `@refrakt-md/plan`'s
  `files` field even declares a `styles` directory that does not exist.

**4. Nothing depends on the format.** Of the eleven references to this ADR in the corpus,
three say it does not apply, two cite its *rot principle* rather than its mechanism, and the
rest are cross-links. {% ref "SPEC-147" /%} Finding 5 — the one place a real CSS migration was
costed, at 413 lines — resolves it with {% ref "SPEC-145" /%} D16's `contextModifiers`, not
with a skin file.

**A wrinkle that would have to be solved if it were kept**, recorded in case the question is
reopened: `skin` is a cascade layer. {% ref "SPEC-094" /%}'s `@layer skeleton, skin` separates
geometry from decoration, and a package shipping a rune's CSS ships both halves. A
`.skin.md` holding skeleton rules is misnamed, and a `.skeleton.md` / `.skin.md` pair is two
files for one block — which is the co-location this format existed to provide.

### What survives

**"Lumina stays a package" stops being a decision.** With no alternative encoding, it is the
status quo rather than a choice.

**The evidence is worth keeping visible**, because this ADR is the only place it is written
down: `packages/lumina/test/css-coverage.test.ts` maintains a 116-entry
`KNOWN_MISSING_SELECTORS` set whose entries record **shared-selector routing, not gaps** —
`.rf-event__header` is *"styled via `[data-section="header"]` dimension"*, and so on. That is
a real fact about how the reference theme is built, and it is the reason a per-rune file was
never going to fit it.

**The rot principle survives independently** and is cited as such by
{% ref "SPEC-147" /%} and {% ref "ADR-036" /%}: a format the reference implementation does not
use is a format that rots. This ADR is now its own best example.

## References

- {% ref "SPEC-143" /%} — the identity/presentation split, and why CSS travels with the presentation half
- {% ref "ADR-037" /%} — users author composed runes only; the decision that removed this one's premise
- {% ref "ADR-039" /%} — where a rune lives; the capability-package category that is the nearest thing to a residual audience, and is still a package
- {% ref "SPEC-153" /%} — delivery; where the one-file-per-rune naming decision lives now
- {% ref "ADR-028" /%} — a theme restructures a rune, never redefines it; the rule `IDENTITY_FIELDS` expresses
- {% ref "ADR-031" /%} — site-level rune config overrides; the other consumer of the same merge path
- {% ref "SPEC-094" /%} — the cascade-layer contract that gives `skin` its meaning

{% /decision %}
