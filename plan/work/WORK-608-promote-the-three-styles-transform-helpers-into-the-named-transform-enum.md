{% work id="WORK-608" status="in-progress" priority="medium" complexity="simple" source="SPEC-143" milestone="v0.38.0" tags="config,serialisation,engine" %}

# Promote the three styles transform helpers into the named-transform enum

`RuneConfig.styles[…].transform` is one of only two function-typed fields in the
whole of `RuneConfig` (`packages/transform/src/types.ts:301`; the other is
`postTransform`, which stays imperative by design). Unlike `postTransform`, it
does not need to be a function: a declarative sibling already ships, and the
function form is used by a closed set of three helpers.

```
transform?: 'duration' | 'uppercase' | 'capitalize'
```

That enum exists at `packages/transform/src/types.ts:120` and `:574`, is
implemented at `packages/transform/src/engine.ts:1130`, and is already used in
config — `plugins/learning/src/config.ts:35` writes `transform: 'duration'`.

Eleven call sites use the function form, and they resolve to exactly three
helpers:

| Helper | Sites |
|---|---|
| `resolveValign` | 9 — `packages/runes/src/config.ts:293`, plus learning, marketing (×3), media, storytelling (×2) |
| `ratioToFr` | 1 — `packages/runes/src/config.ts:152` |
| `resolveGap` | 1 — `packages/runes/src/config.ts:154` |

Naming those three retires the function form entirely, at which point
`postTransform` is the only function left in `RuneConfig`.

## Why

Two payoffs, either of which would justify it alone:

**It makes `RuneConfig` serialisable.** A `RuneConfig` with no function values can
cross a JSON boundary, which is what a user-authored or hosted rune definition
requires — see SPEC-143's analysis of the engine config as the second half of a
rune's payload. The plugin boundary is already typed as opaque data
(`PluginThemeConfig.runes?: Record<string, Record<string, unknown>>`,
`packages/types/src/package.ts:48`), so this closes the gap between how that
boundary is typed and what actually passes through it.

**It removes a cross-package import for a string.** Today a plugin config must
import `resolveValign` from a shared module to set one CSS custom property. Nine
of the eleven sites are that single helper, imported into six different config
files.

## Acceptance Criteria

- [ ] `'valign'`, `'ratio-fr'` and `'gap'` (or better names) join the named-transform enum, with the existing three
- [ ] All 11 function-form sites are converted to the string form
- [ ] The function form is removed from the `styles` type in `packages/transform/src/types.ts`, so it cannot come back
- [ ] `postTransform` is the only remaining function-typed field in `RuneConfig`, asserted by a test rather than by inspection
- [ ] `npx refrakt contracts --check` reports no drift on either contract copy
- [ ] `npm run seo:baseline:check` reports no drift
- [ ] `npx vitest run packages/lumina/test/css-coverage.test.ts` passes unchanged
- [ ] A `RuneConfig` round-trips through `JSON.parse(JSON.stringify(…))` unchanged for every core and plugin rune

## Approach

The enum lives in two places in `types.ts` (`:120` and `:574`) and is resolved in
one (`engine.ts:1130`) — extend all three together. The existing three entries are
value formatters taking a string and returning a string, which is exactly the
shape the three helpers have, so no new dispatch mechanism is needed.

Name the entries after what they produce rather than after the helper, since the
helper names are internal: `resolveValign` maps an alignment keyword to a flexbox
value, `ratioToFr` turns `"1 2"` into `"1fr 2fr"`, `resolveGap` maps a gap keyword
to a token reference. Read each helper before naming it — the names above are
provisional.

Deleting the function form from the type is what makes this stick; leaving it in
place means the next config to need a transform reaches for a closure again.

## References

- {% ref "SPEC-143" /%} — where the requirement surfaced: the engine config has to travel with a serialised rune
- {% ref "SPEC-140" /%} — transform boilerplate consolidation; shares the serialisability goal
- {% ref "SPEC-081" /%} — declarative structure assembly; why `postTransform` stays a function

{% /work %}
