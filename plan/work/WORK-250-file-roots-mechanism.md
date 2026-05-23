{% work id="WORK-250" status="ready" priority="high" complexity="moderate" source="SPEC-063" tags="content, plugins, config, resolution" milestone="v0.15.0" %}

# File-roots mechanism

Introduce a generic file-roots registry that lets `refrakt.config.json` and plugins declare named directories. Once registered, file-reading runes resolve paths via a `namespace:filename` syntax that anchors at the named root. The v1 consumer is Markdoc partials (extending `{% partial %}` to honor namespaced references); the next consumer is snippet, and future file-reading runes plug into the same resolver.

Backwards-compatible: unprefixed `{% partial file="footer.md" /%}` continues to resolve from each site's `_partials/` as before. The new feature is additive.

## Acceptance Criteria

- [ ] Unprefixed `{% partial file="foo.md" /%}` resolves from the site's `_partials/` (no regression)
- [ ] `refrakt.config.json` accepts a `fileRoots: { namespace: path }` map
- [ ] User-config root paths resolve relative to the config file's directory
- [ ] Prefixed `{% partial file="namespace:foo.md" /%}` resolves from the named root
- [ ] Subdirectory access within a root works (`namespace:subdir/foo.md`)
- [ ] Unknown namespace fails the build, naming the namespace and listing all registered namespaces
- [ ] Missing file in a known namespace fails the build, naming the resolved path
- [ ] Traversal attempts (`namespace:../escape.md`) are rejected with a build error
- [ ] Absolute paths in namespaced references (`namespace:/abs.md`) are rejected
- [ ] `Plugin` interface gains an optional `fileRoots: Record<string, string>` field
- [ ] Plugin `fileRoots` paths are resolved relative to the plugin package directory
- [ ] Plugins' file roots are merged into the resolved roots map at load time
- [ ] User config wins user-vs-plugin namespace collisions; plugin registration emits a dev warning
- [ ] Plugin-vs-plugin namespace collision fails plugin load with both plugins named
- [ ] Reserved namespace `site` is rejected (registration error)
- [ ] Empty namespace (`":foo.md"`) is rejected as invalid syntax
- [ ] Root path validation: non-existent directory at load time is a clear build error
- [ ] Documentation covers user config syntax, plugin registration, resolution rules, and reserved namespaces
- [ ] Type definitions updated for `Plugin.fileRoots`

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

{% /work %}
