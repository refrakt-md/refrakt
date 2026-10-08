{% work id="WORK-634" status="done" priority="high" complexity="complex" source="SPEC-153" milestone="v0.41.0" tags="composition,project,loader,hosted,dx" pr="refrakt-md/refrakt#695" %}

# A project defines its own composed runes in `runes.dir`

{% ref "SPEC-153" /%} implementation note 4, the project side, and the step that opens composition
to users. A project declares `runes.dir` in `refrakt.config.json`, following `contentDir`'s
shape, with a recommended default of `runes` (D4). The loader discovers every `<rune>.md` in it.

Decisions:

- **D5.** Project runes are read through `ProjectFiles`. They must work under
  `memoryProjectFiles` with no filesystem, and a path escaping the project root is refused by
  the provider.
- **D8.** Precedence is core < plugin < project. A project rune may not take a core rune's
  name. Shadowing a plugin rune requires a `runes.prefer` entry.
- **D7.** `runes.local` keeps its scope: it takes a JS module, and a definition passed to it
  is rejected with a pointer to `runes.dir`.
- **D10.** Editing a definition in dev invalidates every page that uses the rune, not only the
  edited file.
- **SPEC-145 D25 item 2.** A project definition that declares `schema` is rejected at load,
  naming the rune and D25. This loader is where that ban is enforced.

## Blocked by

- {% ref "WORK-633" /%}

## Acceptance Criteria

- [x] Project runes resolve under `memoryProjectFiles` with no filesystem, and a rune path escaping the project root is refused by the provider rather than by the loader (D5)
- [x] A project rune taking a core rune's name is rejected at load with both names reported; taking a plugin rune's name requires a `runes.prefer` entry (D8)
- [x] Editing a file in the project's rune directory in dev invalidates every page using that rune, asserted on a two-page fixture where only one page uses it (D10)
- [x] A project definition declaring `schema` is rejected at load, naming the rune and SPEC-145 D25; the same definition shipped in a plugin's `runeDir` is accepted
- [x] A composed definition passed through `runes.local` is rejected with a message pointing at `runes.dir` (D7)
- [x] `create-refrakt` scaffolds the `runes.dir` key, and a scaffolded project with one definition in `runes/` builds and renders it
- [x] `refrakt validate` reports a project definition's construction errors with the definition's file and line, as structured findings

## Resolution

Completed: 2026-10-08

Branch: `claude/v041-project-rune-dir` (stacked on `claude/v041-plugin-rune-dir`, #691)
PR: refrakt-md/refrakt#695

### What was done
- `packages/runes/src/project-runes.ts` (new): `loadProjectRunes` / `checkProjectRunes`. They read `runes.dir` through `ProjectFiles` with WORK-633's reader, and build each file with `pluginRune` into a `__project__` pseudo-plugin. They reject a `schema` key (SPEC-145 D25), naming the rune, at its line.
- `packages/runes/src/plugins.ts`:
  - `mergePlugins(…, project)` applies D8: a core name or alias is never allowed; a plugin name is allowed only with `runes.prefer` `"__project__"` or the plugin's name. Provenance records `source: 'project'`.
  - `loadLocalRunes` rejects a `.md` path, or a module exporting `template`, with a pointer to `runes.dir` (D7).
- `packages/runes/src/lib/composition.ts`, `composed-rune.ts`: `CompositionError` carries a 1-based line. A template error is located at its node, and a frontmatter error at its key (`frontmatterKeyLine`).
- `packages/content/src/refract-loader.ts`:
  - both loaders read project runes;
  - `createVirtualRefraktLoader` gains `projectFiles`;
  - a changed definition drops the whole assembly on `invalidateSite()`, or on each load in dev (D10).
- `packages/transform/src/content-hmr.ts`: `setupContentHmr(…, { runesDir })`. SvelteKit, Astro and Nuxt pass it.
- Other places that load runes now read the directory too: `packages/cli/src/bin.ts` (inspect/reference/contracts), the SvelteKit build merge, `create-refrakt/template-html/build.ts` and the language server. The language server now declares its `@refrakt-md/types` dependency.
- `packages/cli/src/commands/validate-core.ts`: `rune-definition-invalid` findings at file and line, which suppress content validation. An assembly failure becomes a `site-assembly-failed` finding instead of a crash.
- `create-refrakt`: `runes: { dir: 'runes' }` in both config generators.
- Config: `runes.dir` in `SiteConfig` and in the JSON Schema; `prefer` documents `"__project__"`; the reference data is regenerated.
- Docs: `docs/configuration/plugins.md` gains a `runes.dir` section, and `runes.local` is rescoped (D7).
- Tests:
  - `packages/runes/test/project-runes.test.ts` (13);
  - `packages/content/test/project-runes.test.ts` (hosted map; D10 two-page);
  - `packages/cli/test/validate-project-runes.test.ts` (4);
  - `packages/create-refrakt/test/scaffold-project-runes.test.ts`.

### Notes
- D4, D5, D7, D8, D10 and SPEC-145 D25 item 2 held as written.
- D8's alias check was needed: the scaffold test's first rune name, `pull-quote`, is a core alias of `pullquote`, and the build rejected it.
- "Builds" in the scaffold criterion is `createRefraktLoader`, the loader every Vite adapter's SSR and build path runs. The scaffold's `npm install` is not exercised.
- Pre-existing problems found and not fixed:
  - the SvelteKit starter's `_layout.md` nav item `getting-started` resolves to no page, so a fresh scaffold has an error on every page;
  - the HTML starter's `build.ts` does not pass `plugins` to `loadContent`, so `registers` do not run there;
  - the `runes.prefer` docs example uses an npm name where `mergePlugins` matches the plugin's short name.
- `refrakt edit` does not see project runes, as with any composed rune (D11's editor half is deferred).
- WORK-631 had not merged at branch time, so this is not rebased onto it.
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5582 passed.

{% /work %}
