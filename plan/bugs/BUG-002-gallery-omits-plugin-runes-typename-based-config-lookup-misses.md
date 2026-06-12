{% bug id="BUG-002" status="fixed" severity="major" source="SPEC-094" tags="gallery,cli,plugins" milestone="v0.22.0" %}

# Gallery omits plugin runes (typeName-based config lookup misses)

## Steps to Reproduce
1. `refrakt gallery --site main` with plugins configured (marketing, docs, …).
2. Inspect the output — only ~46 core runes appear.

## Expected
The gallery covers the whole configured catalogue (`inspect --list` sees 126 runes), including plugin runes (`hero`, `api`, `character`, `recipe`, …).

## Actual
Only core runes render. The gallery resolves a rune's engine config via `config.runes[rune.typeName]`, but `loadPlugin` builds plugin runes with **`typeName: undefined`** (it never passes one to `defineRune`). So every plugin rune fails the `if (!runeConfig) continue` gate and is skipped. (The same gap breaks `inspect <plugin-rune> --audit`, which also keys on `typeName` — a related pre-existing issue, fixable the same way or by setting `typeName` in `loadPlugin`.)

## Fix
Resolve config the way the identity transform does — by **kebab-casing the config key** to match the rune's kebab `name` (`data-rune`) — rather than relying on `typeName`. Build a `toKebabCase(configKey) → RuneConfig` map and look up `config.runes[rune.typeName] ?? byKebab.get(rune.name)`.

## Environment
- `@refrakt-md/cli` 0.21.0 · gallery command (WORK-407/416).

## Resolution

Completed: 2026-06-12

Branch: `claude/gallery-plugin-runes`.

### Fix
`packages/cli/src/commands/gallery.ts` — resolve a rune's engine config without relying on `typeName` (which `loadPlugin` never sets for plugin runes). Build a `toKebabCase(configKey) → RuneConfig` map and resolve per rune by trying `typeName`, then the rune `name`, its `aliases`, and a separator-insensitive form of each. This mirrors how the identity transform matches `data-rune` to config keys, and handles the cases where a rune's CLI name differs from its `data-rune`/config key:
- `cta` (name) → `call-to-action` (alias / `data-rune`) → `CallToAction` (config key)
- `howto` (name) → `how-to` (`data-rune`) → `HowTo` (config key)

### Impact
- Gallery coverage jumped **46 → 92 runes** — all 9 configured plugins now render (marketing/docs/storytelling/places/business/design/learning/media/plan). 185 cells. Determinism preserved (byte-identical across runs); 8 gallery tests green.
- The remaining gap to `inspect --list`'s 126 is the child runes (skipped) + component-only runes (no config) + the 9 directive/registry gap-markers — all correct exclusions.

### Note
The same `typeName`-undefined gap also breaks `inspect <plugin-rune> --audit` (a separate, pre-existing path that keys on `typeName`). Not fixed here; could be addressed the same way, or by setting `typeName` in `loadPlugin`.

{% /bug %}
