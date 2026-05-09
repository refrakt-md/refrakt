---
"@refrakt-md/types": minor
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/content": minor
"@refrakt-md/sveltekit": minor
"@refrakt-md/svelte": minor
"@refrakt-md/cli": minor
"@refrakt-md/editor": minor
"@refrakt-md/eleventy": minor
"@refrakt-md/astro": minor
"@refrakt-md/nuxt": minor
"@refrakt-md/next": minor
"@refrakt-md/react": minor
"@refrakt-md/vue": minor
"@refrakt-md/html": minor
"@refrakt-md/lumina": minor
"@refrakt-md/highlight": minor
"@refrakt-md/behaviors": minor
"@refrakt-md/ai": minor
"@refrakt-md/mcp": minor
"@refrakt-md/language-server": minor
"@refrakt-md/marketing": minor
"@refrakt-md/docs": minor
"@refrakt-md/storytelling": minor
"@refrakt-md/places": minor
"@refrakt-md/business": minor
"@refrakt-md/design": minor
"@refrakt-md/learning": minor
"@refrakt-md/media": minor
"@refrakt-md/plan": minor
"create-refrakt": minor
---

Rename "rune packages" to "plugins" and unify with CLI plugins. Plugins now contribute runes, layouts, theme config, pipeline hooks, behaviors, **and** CLI commands through a single npm package.

**Breaking changes:**

- `RunePackage` interface → `Plugin`
- `RunePackageEntry` → `PluginRune`
- `RunePackageAttribute` → `PluginAttribute`
- `RunePackageThemeConfig` → `PluginThemeConfig`
- `PackagePipelineHooks` → `PluginPipelineHooks`
- `loadRunePackage()` → `loadPlugin()`
- `mergePackages()` → `mergePlugins()`
- `discoverPackageFixtures()` → `discoverPluginFixtures()`
- `LoadedPackage` → `LoadedPlugin`, `MergedPackageResult` → `MergedPluginResult`
- `RuneProvenance.packageName` → `pluginName`; `source: 'package'` → `source: 'plugin'`
- `RuneInfo.package` → `RuneInfo.plugin`; `SerializedRune.package` → `plugin`
- Config field `site.packages[]` → `site.plugins[]`. The deprecated top-level shorthand `config.packages[]` is removed; use the existing `config.plugins[]` (which now covers both rune contributions and CLI commands).
- `assembleThemeConfig` inputs renamed: `packageRunes` → `pluginRunes`, `packageIcons` → `pluginIcons`, `packageBackgrounds` → `pluginBackgrounds`.
- `MergedPluginResult.packages` → `MergedPluginResult.plugins`
- CLI: `refrakt package validate` removed; use `refrakt plugins validate` instead.
- CLI: `refrakt reference list --package` flag is now `--plugin` (the old name still works as an alias).
- Repo layout: `runes/{marketing,docs,…,plan}/` workspace globs moved to `plugins/{…}/`. npm package names (`@refrakt-md/marketing` etc.) are unchanged.

**Migration:**

- Rename `RunePackage` to `Plugin` and `loadRunePackage`/`mergePackages` to `loadPlugin`/`mergePlugins` in your code.
- In `refrakt.config.json`, rename per-site `"packages": [...]` to `"plugins": [...]`. If you had a top-level `"packages"` shorthand under flat shape, move it to `"plugins"`.
- Replace any calls to `refrakt package validate` with `refrakt plugins validate`.
