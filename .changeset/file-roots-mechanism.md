---
"@refrakt-md/types": minor
"@refrakt-md/runes": minor
"@refrakt-md/content": minor
---

File roots: configurable named directories that file-reading runes can reach via `namespace:filename` syntax (SPEC-063).

A new top-level `fileRoots` field in `refrakt.config.json` registers named directories that Markdoc partials (and, when SPEC-062's v2 lands, the snippet rune) can resolve from:

```jsonc
{
  "fileRoots": {
    "shared": "_shared-partials",
    "legal": "../legal-snippets"
  }
}
```

```markdoc
{% partial file="shared:footer.md" /%}
{% partial file="legal:terms.md" /%}
```

Plugins can declare their own file roots via a new `Plugin.fileRoots` field on the plugin shape (paths relative to the plugin package's own directory). User-config and plugin-registered roots merge at load time: user config wins any collision (with a dev warning); plugin-vs-plugin namespace collisions throw at plugin load.

The namespace `site` is reserved for future site-level resolution. Empty namespace, absolute paths, and traversal escapes are all rejected with clear errors.

Backwards-compatible: existing unprefixed `{% partial file="footer.md" /%}` references continue to resolve from each site's `_partials/` directory.

New exports:

- `@refrakt-md/types`: `RefraktConfig.fileRoots`, `Plugin.fileRoots`.
- `@refrakt-md/runes`: `assertFileRootNamespaceAllowed`, plus `LoadedPlugin.fileRoots` / `MergedPluginResult.fileRoots` so adapters can introspect plugin-contributed roots.
- `@refrakt-md/content`: `readFileRoots`, `resolveUserFileRoots`, `mergeFileRoots`, `validateNamespacedReference`, plus the new `fileRoots` option on `SiteLoaderOptions`, `VirtualSiteLoaderOptions`, `LoadContentFromTreeOptions`, and `VirtualRefraktLoaderOptions`.

`createRefraktLoader` automatically reads `refrakt.config.json#/fileRoots`, merges with plugin roots, and threads the result through the loader. Diagnostics (e.g. shadowed plugin namespaces) print to stderr.
