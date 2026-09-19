{% decision id="ADR-031" status="proposed" date="2026-09-19" source="SPEC-094" tags="config, theme, site, runes, overrides, dx, architecture" %}

# Site-level rune config overrides

## Context

A site cannot tweak a rune's presentation from `refrakt.config.json`. The
override slot exists and carries exactly two keys:

```ts
// packages/content/src/refract-loader.ts:146–149
const siteOverrides: { tints?: any; backgrounds?: any } = {};
if (site.tints) siteOverrides.tints = site.tints;
if (site.backgrounds) siteOverrides.backgrounds = site.backgrounds;
```

That object is the whole of what a site contributes to `themeOverrides` in
`assembleThemeConfig`. `ThemeConfigOverrides` accepts
`{ prefix, tokenPrefix, icons, runes, tints, backgrounds, frames }`; the loader
populates two of them. **`runes` — where `layout`, `structure`, `styles` and
(after {% ref "ADR-030" /%}) `arrange` live — is never projected from site
config.**

What a site *can* express today: `theme.tokens` and `theme.modes`,
`theme.presets`, `tints`, `backgrounds`, `icons`, `overrides` (Svelte component
paths), `strings`, `plugins`, and `runes.{prefer,aliases,local}`. Nothing that
reaches `ThemeConfig.runes`.

### The gap looks incidental, not decided

`siteOverrides` is declared inline with a narrow literal type and a comment
about tint presets. Nothing anywhere states that a site may not override rune
config, which is the opposite of how the equivalent question was handled for
themes: {% ref "ADR-028" /%} reasoned about it explicitly and guarded identity
fields. This is the same shape as three other findings on this branch — a
capability present in the merge layer, unreachable from the surface, with no
recorded reasoning.

### There is a working escape hatch, and it is small

A theme is *"package name or relative path"*, and the loader only looks for a
config export:

```ts
// refract-loader.ts:121–122
const themeModule = await import(themePackage + '/transform');
const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;
```

So extending Lumina is a local module, not a published theme:

```ts
// ./theme/transform.ts   — with "theme": "./theme" in refrakt.config.json
import { luminaConfig } from '@refrakt-md/lumina/transform';
import { mergeThemeConfig } from '@refrakt-md/transform';

export const themeConfig = mergeThemeConfig(luminaConfig, {
  runes: { Track: { layout: { /* … */ } } },
});
```

This is not onerous, and {% ref "ADR-028" /%}'s identity guard still applies to
it. The question is whether the JSON surface should offer the same thing.

### Why it matters beyond convenience

{% ref "ADR-029" /%} and {% ref "ADR-030" /%} both reason about "a theme"
reshaping structure, and use the word loosely to mean *whoever styles the site*.
If the JSON route does not exist, the audience for presentational groups, the
`arrange` vocabulary and the playlist-as-cards case is people willing to add a
TypeScript module to their project. That is a much smaller population than
people who edit `refrakt.config.json`, and it bears directly on how much those
two decisions are worth.

## Decision

**A site may override rune config from `refrakt.config.json`, through a
declarative subset, under the existing `runes` namespace.**

### 1. Placement

`SiteConfig.runes` already exists as `{ prefer, aliases, local }` — rune
*resolution* config. Rune *presentation* config joins it as a sibling key rather
than a new top-level field:

```jsonc
{
  "sites": {
    "main": {
      "runes": {
        "config": {
          "Track": { "layout": { "root": ["track-name", "byline"] } }
        }
      }
    }
  }
}
```

### 2. Precedence

The merge order gains a fourth rung, applied last:

```
core → plugin runes → theme overrides → SITE overrides → plugin extensions
```

Site-last is the only coherent order: the site is the most specific context and
the one a person is editing when they want a change. Plugin extensions stay
after, because they are additive rather than overriding
(`applyRuneExtensions`, `assemble.ts`).

### 3. A declarative subset, named as such

`RuneConfig` has function-valued fields — `postTransform` at
`packages/transform/src/types.ts:527` is the escape hatch, and `LayoutConfig`
carries another at `:801`. These are **not expressible in JSON and are
excluded**, along with anything else that resolves to a function.

The subset is enumerated in the schema rather than filtered silently. A site
that writes an excluded key gets an error naming it and pointing at the local
theme-module route, never a quiet drop — the failure mode
{% ref "BUG-017" /%} and {% ref "BUG-023" /%} both exhibit and that this project
has repeatedly paid for.

### 4. Identity stays guarded

{% ref "ADR-028" /%}'s `IDENTITY_FIELDS` (`block`, `modifiers`, `sections`,
`variants`) are non-overridable on **every** merge path into a `RuneConfig`. The
site path is a merge path. `mergeThemeConfig` must be called with
`guardIdentity: true` here — it defaults to off (`merge.ts:27`), and the site
path is precisely a place where config diagnostics belong.

### 5. The contract records it

{% ref "ADR-029" /%} splits the structure contract into a rune-identity contract
(from `baseConfig`) and a theme contract (from merged theme config). Site
overrides make the rendered structure site-dependent as well, so the theme
contract becomes a **rendered-structure contract** generated from the fully
assembled config — theme *and* site. The base contract is unaffected.

## Consequences

**The schema is the real work.** `refrakt.config.schema.json` is committed in
two places (`packages/transform/` and the repo root) and, per
{% ref "SPEC-126" /%}, the configuration reference is generated from it. The
declarative `RuneConfig` subset has to be expressed there — which is also the
forcing function that makes decision 3 honest, since an enumerated schema cannot
silently accept a key it does not support.

**`RunesConfig` grows a second purpose.** It currently describes rune
*resolution*; it gains rune *presentation*. The two are related enough to share
a namespace and different enough that the description needs rewriting, or the
key will read as more of the same.

**Errors, not drops.** Decision 3's failure mode is the load-bearing part. A
config surface that accepts JSON and silently ignores half of it is worse than
no surface, because the author believes it worked.

**It does not replace the theme module.** Anything programmatic still needs
`./theme/transform.ts`, and that route stays documented. This lowers the floor;
it does not remove the ceiling.

**It raises the value of {% ref "ADR-029" /%} and {% ref "ADR-030" /%}** by
widening who can use what they enable — which is the main reason to do it at
all.

## Alternatives considered

**Leave it; document the local theme module.** Cheapest, and the escape hatch
genuinely works. Rejected as the primary answer because the asymmetry is
arbitrary: a site can already override tints, backgrounds, icons, tokens and
component paths from JSON, and rune presentation is the same kind of decision by
the same person. Documenting the module route is still worth doing either way.

**Allow the full `RuneConfig`, accepting that function fields are unusable.**
Simpler to specify — one type, no subset. Rejected: it guarantees a silent-drop
failure for `postTransform`, and silent drops are the defect class this branch
keeps finding.

**A separate top-level `runeConfig` key.** Avoids overloading `runes`. Rejected:
two top-level keys both configuring runes is worse than one namespace with two
purposes, and `runes.local` already sets the precedent that this namespace
carries more than resolution.

**Make the site override themes entirely, replacing rather than merging.**
Rejected without much thought — it discards the theme's work for a one-key
change and has no constituency.

## Open questions

**Does per-site granularity work as stated for multi-site projects?** Overrides
sit on `SiteConfig`, so two sites sharing a theme can diverge. That is the
intent, but it means the rendered-structure contract of decision 5 is per-site,
not per-project — and nothing has yet said how many such artifacts a project
should carry.

**Should `refrakt inspect` take the site overrides into account?** It resolves
config through `loadMergedConfig(…, site)` already, so probably yes by
construction — worth confirming rather than assuming, since an inspector that
disagrees with the build is its own kind of drift.

## References

- {% ref "SPEC-094" /%} — theme system foundations
- {% ref "ADR-028" /%} — attribute applicability is rune identity; the identity guard this path must honour
- {% ref "ADR-029" /%} — structural assembly is theme-owned; the contract split this extends
- {% ref "ADR-030" /%} — the arrangement vocabulary whose audience this widens
- {% ref "SPEC-126" /%} — generated configuration reference; where the subset must be expressed

{% /decision %}
