---
"@refrakt-md/types": major
"@refrakt-md/runes": major
"@refrakt-md/transform": major
"@refrakt-md/content": major
"@refrakt-md/sveltekit": major
"@refrakt-md/svelte": major
"@refrakt-md/cli": major
"@refrakt-md/editor": major
"@refrakt-md/eleventy": major
"@refrakt-md/astro": major
"@refrakt-md/nuxt": major
"@refrakt-md/next": major
"@refrakt-md/react": major
"@refrakt-md/vue": major
"@refrakt-md/html": major
"@refrakt-md/lumina": major
"@refrakt-md/highlight": major
"@refrakt-md/behaviors": major
"@refrakt-md/ai": major
"@refrakt-md/mcp": major
"@refrakt-md/language-server": major
"@refrakt-md/marketing": major
"@refrakt-md/docs": major
"@refrakt-md/storytelling": major
"@refrakt-md/places": major
"@refrakt-md/business": major
"@refrakt-md/design": major
"@refrakt-md/learning": major
"@refrakt-md/media": major
"@refrakt-md/plan": major
"create-refrakt": major
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
