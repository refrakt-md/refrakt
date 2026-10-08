---
'@refrakt-md/types': minor
'@refrakt-md/transform': minor
'@refrakt-md/runes': minor
'@refrakt-md/content': minor
'@refrakt-md/cli': minor
'@refrakt-md/sveltekit': minor
'@refrakt-md/astro': minor
'@refrakt-md/nuxt': minor
'@refrakt-md/language-server': minor
'create-refrakt': minor
---

A project can define its own composed runes (SPEC-153 D4). Every `<rune>.md` in `runes.dir` is a composed rune named after its file. `runes.dir` is relative to the project root and defaults to `runes`.

- **Read through `ProjectFiles` (D5).** A hosted build passes `projectFiles: memoryProjectFiles(map)` to `createVirtualRefraktLoader` and gets the project's runes with no filesystem. A path that escapes the project root is refused by the provider.
- **Precedence is core < plugin < project (D8).** A project rune taking a core rune's name or alias is rejected, naming both. Taking a plugin rune's name needs `runes.prefer`: `"__project__"` lets the project's definition win, and the plugin's name keeps the plugin's rune.
- **A project definition may not declare `schema` (SPEC-145 D25).** It is rejected at load, naming the rune. The same definition in a plugin's `runeDir` is accepted.
- **`runes.local` keeps its scope (D7).** A `.md` path, or a module exporting a composition `template`, is rejected with a pointer to `runes.dir`.
- **In dev, editing a definition rebuilds every page that uses it (D10).** `setupContentHmr` takes `{ runesDir }`, and the SvelteKit, Astro and Nuxt integrations pass it. `createRefraktLoader` rebuilds its rune set when a definition changed.
- **`refrakt validate` reports each definition that does not build** as a finding with its file and line (`rune-definition-invalid`). A site-assembly failure, such as a rune name collision, is reported as a finding rather than a crash. Construction errors now carry a `line` (`CompositionError`).
- **Everything else that loads runes reads the directory too:** `inspect`, `reference` and `contracts`, the SvelteKit build, the HTML starter's build script and the language server.
- **`create-refrakt` writes `runes: { dir: "runes" }`** into the configs it scaffolds.
