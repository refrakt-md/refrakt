{% work id="WORK-250" status="done" priority="high" complexity="moderate" source="SPEC-063" tags="content, plugins, config, resolution" milestone="v0.15.0" %}

# File-roots mechanism

Introduce a generic file-roots registry that lets `refrakt.config.json` and plugins declare named directories. Once registered, file-reading runes resolve paths via a `namespace:filename` syntax that anchors at the named root. The v1 consumer is Markdoc partials (extending `{% partial %}` to honor namespaced references); the next consumer is snippet, and future file-reading runes plug into the same resolver.

Backwards-compatible: unprefixed `{% partial file="footer.md" /%}` continues to resolve from each site's `_partials/` as before. The new feature is additive.

## Acceptance Criteria

- [x] Unprefixed `{% partial file="foo.md" /%}` resolves from the site's `_partials/` (no regression)
- [x] `refrakt.config.json` accepts a `fileRoots: { namespace: path }` map
- [x] User-config root paths resolve relative to the config file's directory
- [x] Prefixed `{% partial file="namespace:foo.md" /%}` resolves from the named root
- [x] Subdirectory access within a root works (`namespace:subdir/foo.md`)
- [x] Unknown namespace fails the build, naming the namespace and listing all registered namespaces
- [x] Missing file in a known namespace fails the build, naming the resolved path
- [x] Traversal attempts (`namespace:../escape.md`) are rejected with a build error
- [x] Absolute paths in namespaced references (`namespace:/abs.md`) are rejected
- [x] `Plugin` interface gains an optional `fileRoots: Record<string, string>` field
- [x] Plugin `fileRoots` paths are resolved relative to the plugin package directory
- [x] Plugins' file roots are merged into the resolved roots map at load time
- [x] User config wins user-vs-plugin namespace collisions; plugin registration emits a dev warning
- [x] Plugin-vs-plugin namespace collision fails plugin load with both plugins named
- [x] Reserved namespace `site` is rejected (registration error)
- [x] Empty namespace (`":foo.md"`) is rejected as invalid syntax
- [x] Root path validation: non-existent directory at load time is a clear build error
- [x] Documentation covers user config syntax, plugin registration, resolution rules, and reserved namespaces
- [x] Type definitions updated for `Plugin.fileRoots`

## Approach

Per the spec's Engine Changes section:

- `packages/types/src/package.ts`: add `Plugin.fileRoots?: Record<string, string>`
- `packages/runes/src/plugins.ts`: `loadPlugin` resolves plugin paths to absolute; `mergePlugins` merges all plugins' file roots and detects plugin-vs-plugin collisions
- `packages/content/src/content-tree.ts`: extend `readPartials` (or a sibling `readNamespacedPartials`) to scan each named root; return a map keyed by `namespace:filename` in addition to unprefixed site-local entries
- `packages/content/src/site.ts`: build Markdoc's `config.partials` with both unprefixed and prefixed entries; Markdoc's partial-resolution by-name handles the rest

Resolution is at content-load time. Errors throw with source-file context where possible.

## Dependencies

- None within v0.15.0. Foundation work item.

## References

- {% ref "SPEC-063" /%} — file-roots spec (full)
- {% ref "SPEC-064" /%} — plan plugin opts in via `fileRoots` (downstream consumer, WORK-251)
- `packages/content/src/content-tree.ts:124` — current `_partials/` loading
- `packages/content/src/site.ts:131` — current Markdoc partial registration
- `packages/runes/src/plugins.ts` — `loadPlugin` / `mergePlugins` extension points

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0-phase-1`

### What was done

- **`packages/types/src/theme.ts`** — added `RefraktConfig.fileRoots?: Record<string, string>` (top-level user config; paths relative to the config-file directory).
- **`packages/types/src/package.ts`** — added `Plugin.fileRoots?: Record<string, string>` (paths relative to the plugin package's own directory).
- **`packages/runes/src/plugins.ts`**:
  - `LoadedPlugin.fileRoots: Record<string, string>` carries plugin-declared file roots resolved to absolute paths.
  - `loadPlugin` calls a new `resolvePluginFileRoots` helper that locates the plugin's package directory via `require.resolve(<pkg>/package.json)`, then resolves each declared path against it. Throws if the package dir can't be located (workspace-link edge case) — fileRoots is a meaningful misconfig if it can't be reached.
  - `mergePlugins` aggregates plugin file roots into `MergedPluginResult.fileRoots`, throwing on plugin-vs-plugin namespace collision with both providing plugins named.
  - New exported `assertFileRootNamespaceAllowed(namespace, source)` helper enforces the reserved-namespace list (currently `site`) and rejects empty names.
  - `loadLocalRunes` updated to return `fileRoots: {}` so the LoadedPlugin shape is satisfied.
- **`packages/content/src/file-roots.ts`** (new): generic file-roots utilities. `resolveUserFileRoots(rawConfig, configDir)` resolves user-config paths and rejects reserved / empty / non-string entries; `mergeFileRoots(userRoots, pluginRoots)` produces the final namespace → absolute-path map with user winning collisions (and a soft warning naming each shadowed plugin namespace); `readFileRoots(roots)` scans every registered directory recursively for `.md` files and returns a `Map<"<ns>:filename", PartialFile>` ready to feed Markdoc's partials config; `validateNamespacedReference(ref, roots)` validates a `<ns>:<path>` reference at runtime — exported so runes consuming the same machinery (snippet v2) can plug in without re-implementing the rules.
- **`packages/content/src/site.ts`**:
  - `ProcessContentTreeOptions` and `LoadContentFromTreeOptions` gain `fileRoots?: FileRoots`.
  - `loadContent` accepts a new 11th positional `fileRoots` argument.
  - `processContentTree` scans registered roots in addition to the site-local `_partials/` directory and merges both into Markdoc's `config.partials` (unprefixed keys for site-local, `<ns>:filename` keys for namespaced).
- **`packages/content/src/loader.ts`** — `SiteLoaderOptions` and `VirtualSiteLoaderOptions` gain `fileRoots?: FileRoots`; threaded through to `loadContent` / `loadContentFromTree`.
- **`packages/content/src/refract-loader.ts`**:
  - `createRefraktLoader` reads `rawConfig.fileRoots`, resolves against `configDir` via `resolveUserFileRoots`, then merges with plugin-contributed roots (from the `assembleSiteContext` result) via `mergeFileRoots`. Warnings stream to stderr.
  - `assembleSiteContext` returns the merged plugin file roots so the same merge path serves both the FS loader and the virtual loader.
  - `VirtualRefraktLoaderOptions` gains `fileRoots?: FileRoots` for hosted environments to pass user-equivalent roots directly.
- **`packages/content/src/index.ts`** — re-exports `readFileRoots`, `resolveUserFileRoots`, `mergeFileRoots`, `validateNamespacedReference`, and the `FileRoots` / `MergedFileRoots` types.
- **`packages/content/test/file-roots.test.ts`** (new): 23 unit tests covering resolveUserFileRoots, mergeFileRoots, readFileRoots (real-filesystem temp dirs), and validateNamespacedReference (reserved namespaces, empty names, unknown namespaces, traversal escapes, absolute paths, missing dirs / files).
- **`packages/content/test/partials.test.ts`** — added 2 end-to-end tests via `loadContent`: a namespaced partial resolves from a registered root; namespaced and unprefixed partials coexist on the same page.
- **`packages/runes/test/plugins.test.ts`** — `makeLoadedPlugin` helper updated to include `fileRoots: {}`; new `mergePlugins → fileRoots merging` describe block with three tests (merge non-colliding, throw on plugin-vs-plugin collision, no-roots case).
- **`site/content/extend/rune-authoring/partials.md`** — added a "Namespaced partials via file roots" section covering user config, plugin registration, resolution table, and collision rules.
- **`.changeset/file-roots-mechanism.md`** — minor-version changeset documenting the new config field, plugin field, exports, and behavioural rules.

### Notes

- **Plan plugin opt-in lives in WORK-251.** This work item only ships the mechanism; the plan plugin's `fileRoots: { plan: '../../plan' }` declaration belongs to the next item alongside its unconditional-registration changes.
- **Plugin package resolution** uses `require.resolve(<pkg>/package.json)` to find the plugin's directory — same approach as `discoverPluginFixtures`. Unlike fixtures (which silently no-op on failure), fileRoots throws on failure: the developer needs to know if the plugin can't be located because their declared roots will silently disappear otherwise.
- **POSIX-normalized keys.** The `<ns>:filename` keys in the partials map use forward slashes regardless of host OS, so authoring stays consistent.
- **stderr diagnostics**: shadowed-namespace warnings flow to stderr from the loader bootstrap, matching the xref-pattern compilation diagnostics introduced in WORK-252. Adapters can intercept once the SPEC-058 unified-warnings work is fully wired.
- **Test fixture-rune collision avoided**: the new `mergePlugins → fileRoots merging` tests use distinct rune names per plugin (`stub-a` vs `stub-b`) so the rune-collision check doesn't trip before the fileRoots merge logic gets a chance to run.
- 2711 tests pass across the full workspace; only the pre-existing plan-pipeline timeout occasionally flakes under heavy parallel load and is unrelated.

{% /work %}
