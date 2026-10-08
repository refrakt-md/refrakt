---
'@refrakt-md/types': minor
'@refrakt-md/runes': minor
'@refrakt-md/cli': minor
---

A plugin can ship composed runes as files (SPEC-153 D2). Declare `runeDir: 'runes'` on the `Plugin` export, and every `<rune>.md` in that package-relative directory loads as a composed rune named after the file. It behaves exactly like a `runes` entry carrying the file as its `template`, so `inspect`, `reference`, `contracts` and the pipeline show it the same way.

- A frontmatter key restating the rune's name is rejected, and so is a file name that is not a kebab-case rune name.
- A directory rune and a code-defined rune with the same name are rejected, naming both.
- A missing, unreadable or empty rune directory throws with the resolved path and the cause, instead of loading no runes. So does a package whose `exports` map blocks `./package.json`.
- `refrakt plugins validate` checks that `files` publishes the directory and that `<pkg>/package.json` resolves, and builds every definition in it. A composed rune's `description` frontmatter now counts as its description there.
- `loadPlugin(name, { from })` resolves the package from another location, for tools and tests.
- A plugin's `fixtures/` files that fail to parse now throw from `loadPlugin`, as `discoverPluginFixtureManifest` documented. Before, the error was swallowed along with an unresolvable package.
