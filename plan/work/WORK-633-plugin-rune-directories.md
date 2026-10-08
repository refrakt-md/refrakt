{% work id="WORK-633" status="done" priority="high" complexity="complex" source="SPEC-153" milestone="v0.41.0" tags="composition,plugins,packaging,loader" pr="refrakt-md/refrakt#691" %}

# A plugin ships composed runes from a declared rune directory

{% ref "SPEC-153" /%} implementation note 3, the plugin side. In v0.40.0 a composed definition
reached the pipeline only as a string passed to `defineComposedRune`. A plugin now declares
`runeDir` (package-relative, resolved the way `fileRoots` resolves, D2). Every `<rune>.md` in
it is loaded as a composed rune.

Decisions:

- **D1.** One file format and one in-memory shape. Nothing downstream can tell a plugin rune
  from a project rune.
- **D9.** The filename is the rune's name. A frontmatter `rune:` key restating it is rejected.
  Fixtures stay in a sibling `fixtures/` directory.
- **D3.** A read failure throws with the resolved path and the cause. It never degrades to
  zero runes.
- **D6.** `refrakt plugin validate` checks that the directory is covered by `files` and that
  the package resolves. The proof is the `npm pack` → install → load harness from
  {% ref "WORK-627" /%}, not a monorepo test.

## Choosing the consumer

SPEC-153 names `@refrakt-md/plan` as the first consumer. Pick a plan rune whose composed form
reproduces its output, or whose differences can be explained, and record the choice. If no
plan rune fits without changing published output, ship the proof through a fixture plugin
that the harness packs, and record why plan was not used. Do not add a rune only to have
something to ship.

## Acceptance Criteria

- [x] A composed rune file loads identically from a project directory and from a plugin's declared rune directory, asserted by loading the same file both ways and comparing the resulting `Rune` (D1)
- [x] A plugin's composed rune survives `npm pack` → install → load in a fixture project outside the workspace, asserted with the WORK-627 harness; the plugin used, and why, is recorded
- [x] A plugin whose declared rune directory is missing from `files`, or whose package is unresolvable, fails `refrakt plugin validate` with the resolved path and the cause (D6)
- [x] A plugin rune read failure throws rather than yielding an empty set, asserted by a fixture plugin with a blocked `./package.json` export (D3)
- [x] A composed rune is named `<rune>.md`, its name is read from the filename, and a frontmatter key restating it is rejected rather than silently preferred (D9)
- [x] A rune in `runeDir` and a code-defined `PluginRune` with the same name in one plugin is rejected, naming both
- [x] `refrakt inspect`, `refrakt reference` and `refrakt contracts` show a directory-loaded rune exactly as they show a code-defined composed one
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy, unless the chosen plan rune moves them, in which case every difference is reviewed and explained

## Resolution

Completed: 2026-10-08

Branch: `claude/v041-plugin-rune-dir`
PR: refrakt-md/refrakt#691

### What was done
- `packages/types/src/package.ts`: `Plugin.runeDir`, a package-relative directory of composed rune definitions.
- `packages/runes/src/rune-dir.ts` (new): the reader shared with the project side (WORK-634).
  - `readRuneDefinitions(reader, dir, where)` reads a `{ list, read }` reader, which `ProjectFiles` satisfies.
  - `runeNameOfFile` reads the name from the file (D9). A `.md` whose name is not a kebab-case rune name (`README.md`, `bond.rune.md`) is rejected, not skipped.
  - `runeEntriesOf` turns each file into a `{ template }` entry (D1).
  - `withRuneDefinitions` merges them into `Plugin.runes`. It rejects a declared directory with no definitions in it, and a name or alias already taken by a `runes` entry, naming both.
- `packages/runes/src/plugins.ts`:
  - `loadPlugin` reads the `runeDir` before `validatePlugin`. It throws on a blocked `./package.json` export (and names the fix), on a missing or unreadable directory, and on a `runeDir` outside the package. Each error carries the resolved path and the cause (D3).
  - `loadPlugin(name, { from })` resolves the package from another location.
  - `pluginRune` is shared by `loadPlugin` and the language server.
  - `resolvePackageDir` is shared with `fileRoots`.
  - `discoverPluginFixtureManifest` now forgives only the resolution failure.
- `packages/cli/src/commands/plugin-validate.ts` (`refrakt plugins validate`, D6):
  - checks that `files` covers the directory (`filesCover`) and that `<pkg>/package.json` resolves (no `exports` map, or one listing `./package.json`);
  - builds every definition, and reports each failure with the resolved path and the cause;
  - counts a composed definition's `description` as the rune's description.
- `packages/language-server/src/registry/loader.ts`: reads `runeDir` through the shared helpers, and builds each rune with `pluginRune`. It also gains `fileRoots: {}`; without it the loader did not typecheck on main.
- `packages/content/test/fixtures/composed-storytelling/`: now a private fixture plugin (`package.json`, `index.js` with `runeDir: 'runes'`). It ships the `bond` and `character` definitions that #684/#686 measured. Its fixtures are in `fixtures/`.
- `scripts/pack-harness.mjs`: packs `FIXTURE_PLUGINS` beside the real plugins, by default in CI. For a `runeDir` plugin it checks two things: every packed definition is a composed rune, and every packed fixture renders that rune.
- Tests:
  - `packages/runes/test/rune-dir.test.ts` (16): D1 both ways, D3, D9, collisions, registration;
  - `packages/cli/test/rune-dir-tooling.test.ts`: `inspect`, `reference` and `contracts` parity;
  - `packages/cli/test/plugin-validate.test.ts` (+7);
  - `packages/language-server/test/rune-dir.test.ts`.
- Docs: a "Shipping composed runes from a rune directory" section in `plugin-authoring/authoring.md`. Changeset: minor for types, runes and cli.

### Consumer: a fixture plugin, not `@refrakt-md/plan`
No plan rune composes without changing published output:
- The entity runes (`spec`, `work`, `bug`, `decision`, `milestone`) have three things a definition cannot keep:
  - a BEM block styled by Lumina's `spec.css`, `work.css` and the rest; D2 removes it;
  - a `layout`, which D7 rejects;
  - `created`/`modified` defaulted from `file.created`/`file.modified`, where a definition takes only static defaults.
- The aggregate runes build their output from the registry in pipeline hooks, so there is nothing to compose.

So the proof is the composed-storytelling definitions packaged as a fixture plugin. No rune was invented. Revert demonstration: with `runes` dropped from `files`, both the harness and `plugins validate` fail, naming the path and the cause.

### Notes
- The command is `refrakt plugins validate`. The spec says `plugin validate`, and some docs say `package validate`.
- A plugin fixture that fails to parse now throws from `loadPlugin` (WORK-626's deferred finding), because this adds the first plugin that ships `fixtures/`.
- The editor's community-tags bundle already skips `template` entries (D11's deferred editor half), so directory runes match code-defined ones there.
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5560 passed.

{% /work %}
