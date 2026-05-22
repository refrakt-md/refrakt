{% spec id="SPEC-063" status="draft" tags="partials, content, plugins, config" %}

# Configurable partial roots

Extend Markdoc partial resolution to support multiple *named roots* configured in `refrakt.config.json` and registered by plugins. Backwards-compatible: unprefixed partial names continue to resolve from `_partials/` at each site's content root; prefixed names use a `namespace:filename` syntax that resolves from the named root.

The motivating use cases are (a) sharing partials across sites in a multi-site monorepo, and (b) enabling plugins to ship content snippets reachable from user sites — the latter is what unblocks the `expand` rune in {% ref "SPEC-066" /%} (via the plan plugin's registration work in {% ref "SPEC-064" /%}), since plan content lives outside the site content tree.

## Problem

Partials today resolve from a single `_partials/` directory at each site's content root (`packages/content/src/content-tree.ts:124`). That works for site-local reuse but fails three patterns:

**Multi-site shared chrome.** A monorepo with `docs/`, `marketing/`, and `blog/` as separate sites can't share a `footer.md` or `cta.md` partial. Current options: duplicate the file (three copies drift), use a symlink (Windows-hostile, fragile), or use a git submodule (heavyweight for a 10-line partial).

**Plugin-shipped snippets.** A plugin (the plan plugin, design-system docs, etc.) may want to expose content files that user sites embed via partial-style transclusion. With no extension point for "additional partial roots," plugins can't participate in inclusion at all — they'd need a parallel rune.

**Project-wide partials outside the site tree.** Things like legal boilerplate, shared examples, or — for the expand-rune case — the `plan/` directory itself. None of these live under a site's `_partials/`, but they're conceptually the same primitive: "a Markdown file you can pull into another."

The right shape is one inclusion system with a broader resolution domain, not a parallel mechanism that competes with `{% partial %}`.

-----

## Design Principles

**Backwards compatible.** Existing `{% partial file="footer.md" /%}` calls continue to resolve from the site's `_partials/`. No migration needed. The new feature is additive.

**One mechanism, broader reach.** No new include rune. Partials, with namespaces, cover the inclusion need. If we ever ship a different primitive (e.g. structured includes with parameter binding), it should be a clear different concern — not a duplicate of this.

**Explicit namespaces beat ambient resolution.** Prefixing the partial reference (`shared:footer.md`) makes the resolution root part of the source. No "where did this come from?" mystery when reading the file.

**Plugins as registration source.** Plugins should be able to declare partial roots without user configuration. A plugin that ships content snippets brings its own namespace; users get it free by installing the plugin.

**User config wins collisions.** If user config and a plugin both register `shared`, the user's wins. The plugin's registration is silently ignored (with a build-time dev warning naming the conflict).

-----

## Authoring Surface

### User configuration

`refrakt.config.json`:

```json
{
  "sites": { "docs": { ... }, "marketing": { ... } },
  "partialRoots": {
    "shared": "_shared-partials",
    "legal": "../legal-snippets"
  }
}
```

Keys are namespace names. Values are paths relative to the config file (i.e. project root). Paths must point to directories.

### Plugin registration

A plugin exports `partialRoots` on its `Plugin` object:

```ts
import type { Plugin } from "@refrakt-md/types";

export const plugin: Plugin = {
  name: "@refrakt-md/plan",
  // ...
  partialRoots: {
    plan: "../../plan",  // relative to the plugin's package directory
  },
};
```

Paths are relative to the plugin package's directory. The loader resolves to absolute paths before merging into the registered-roots map.

### Usage

```markdoc
{# Unprefixed — current behavior, resolves from site's _partials/ #}
{% partial file="footer.md" /%}

{# Prefixed — user-registered shared root #}
{% partial file="shared:footer.md" /%}

{# Plugin-registered namespace #}
{% partial file="plan:SPEC-001-foo.md" /%}

{# Subdirectories within a root #}
{% partial file="shared:legal/terms.md" /%}
```

-----

## Resolution Rules

| Input | Resolution |
|-------|-----------|
| `footer.md` (no colon) | Site-local `_partials/footer.md` (current behavior unchanged) |
| `shared:footer.md` | Look up `shared` in merged partial-roots map; resolve `footer.md` from that directory |
| `unknown:foo.md` | Build error: namespace not registered; list available namespaces |
| `shared:missing.md` | Build error: file not found in named root |
| `shared:../escape.md` | Build error: path escapes the named root |
| `shared:/abs.md` | Build error: absolute paths not permitted in namespaced references |

### Collision rules

When merging user config and plugin registrations:

- **User config wins** if both register the same namespace. Plugin's registration is ignored with a dev-mode warning naming the plugin and the namespace.
- **Plugin vs. plugin collision** is a build error at plugin load. Error names both plugins and the conflicting namespace. Plugins can rename their roots; users can disambiguate by configuring a wrapper namespace.

### Reserved namespaces

- `site` — reserved for future site-level resolution (e.g. cross-site references in a multi-site project). Build error if user or plugin tries to register it.
- Empty namespace (`":foo.md"`) — build error (invalid syntax).

### Path validation in roots

Each registered root path is validated at load time:

- Must resolve to an existing directory (build error if not)
- Must be readable
- Symlinks resolving outside the apparent root are flagged with a dev warning but not blocked (some users intentionally symlink content from outside)

-----

## Engine Changes

### Plugin interface

`packages/types/src/package.ts`:

```ts
export interface Plugin {
  name: string;
  // ... existing fields ...
  partialRoots?: Record<string, string>;  // namespace → path relative to plugin package
}
```

### Loader

`packages/runes/src/plugins.ts`:

- `loadPlugin` reads the plugin's `partialRoots`, resolves each path against the plugin's directory, returns absolute paths.
- `mergePlugins` collects all plugins' partial roots into a single map, checks for plugin-vs-plugin collisions.

### Content tree

`packages/content/src/content-tree.ts`:

- Extend `readPartials` (or add a sibling `readNamespacedPartials`) that takes the merged partial-roots map and scans each named root.
- Returns a map keyed by `namespace:filename` (e.g. `"shared:footer.md"`), in addition to the existing unprefixed site-local entries.

### Site / Markdoc config

`packages/content/src/site.ts`:

- Build the Markdoc `config.partials` object with both unprefixed (site-local) and prefixed (`namespace:filename`) entries.
- Markdoc's partial-resolution by-name handles the rest — the `{% partial file="x" /%}` tag looks up the literal string in `config.partials`.

### Errors

- Unknown namespace, missing file, escape attempt: thrown at content-load time with source-file context where possible (which `.md` file's partial reference failed).
- Plugin collisions: thrown at plugin load.

-----

## Acceptance Criteria

- [ ] Unprefixed `{% partial file="foo.md" /%}` resolves from the site's `_partials/` (no regression)
- [ ] `refrakt.config.json` accepts a `partialRoots: { namespace: path }` map
- [ ] User-config root paths resolve relative to the config file's directory
- [ ] Prefixed `{% partial file="namespace:foo.md" /%}` resolves from the named root
- [ ] Subdirectory access within a root works (`namespace:subdir/foo.md`)
- [ ] Unknown namespace fails the build, naming the namespace and listing all registered namespaces
- [ ] Missing file in a known namespace fails the build, naming the resolved path
- [ ] Traversal attempts (`namespace:../escape.md`) are rejected with a build error
- [ ] Absolute paths in namespaced references (`namespace:/abs.md`) are rejected
- [ ] `Plugin` interface gains an optional `partialRoots: Record<string, string>` field
- [ ] Plugin `partialRoots` paths are resolved relative to the plugin package directory
- [ ] Plugins' partial roots are merged into the resolved roots map at load time
- [ ] User config wins user-vs-plugin namespace collisions; plugin registration emits a dev warning
- [ ] Plugin-vs-plugin namespace collision fails plugin load with both plugins named
- [ ] Reserved namespace `site` is rejected (registration error)
- [ ] Empty namespace (`":foo.md"`) is rejected as invalid syntax
- [ ] Root path validation: non-existent directory at load time is a clear build error
- [ ] Documentation covers user config syntax, plugin registration, resolution rules, and reserved namespaces
- [ ] Type definitions updated for `Plugin.partialRoots`
- [ ] At least one existing plugin (likely plan) registers a partial root to exercise the path end-to-end

-----

## Out of Scope

- **Runtime / dynamic partial roots** — all roots are resolved at content-load time. No live registration.
- **Per-site partial-root filtering** — partial roots are project-global. If a partial root should only be visible to one site, that's a future feature; design pattern for now is to use a clear namespace name.
- **Glob patterns in root paths** — values in `partialRoots` are directories, not patterns.
- **HTTP / remote partial roots** — file system only. Remote resolution introduces caching and network-failure concerns out of scope here.
- **Re-exporting / aliasing namespaces** — no `partialRoots: { "shared": "@plan" }` alias indirection. Plugins own their namespace names; users add their own; no third layer.
- **Cross-site referencing** (e.g. `docs-site:foo.md` resolving to another site's content) — out of scope. Reserved for future under the `site` namespace.

-----

## Open Questions

**Naming: `partials` vs. `partialRoots` for the config key?** Recommend `partialRoots` — explicit that values are root paths, not partial-file paths. `partials` reads as "the partials themselves" which is misleading.

**Plugin-registered root path: relative to the plugin package or to project root?** Recommend plugin package (plugins own their files, paths should be authored against the plugin's own tree). Resolved to absolute by the loader before merging.

**Should plugin-registered partial roots be visible to `refrakt plugins list` / MCP plugin introspection?** Recommend yes — useful for debugging "where did this namespace come from?" Add to the existing plugin-list output as `partialRoots` field. Low-risk addition.

**What about a `__` (dunder) convention for "private" plugin partials not meant for direct user reference?** Probably overkill. Plugins document their public namespace surface; private files just live elsewhere in the package without being registered.

**How does this interact with partial caching / HMR?** Deferred to {% ref "SPEC-068" /%}. In v1, partials in registered roots are not watched — editing one doesn't trigger a rebuild of pages that include it (the author saves any file inside the content tree, or restarts the dev server, to trigger re-resolution). Production builds are unaffected. Real dependency-tracked watching for registered partial roots is a follow-up spec shared with `code-file` from {% ref "SPEC-062" /%}, intentionally deferred so the contract can be informed by real usage from both consumers.

**Should there be a `dependsOn` field for partials that themselves include other partials?** Markdoc handles transitive includes natively (a partial can `{% partial file="x" /%}` another partial). Make sure cross-namespace transitive includes work (a `plan:foo.md` partial that includes `shared:bar.md`).

-----

## References

- {% ref "SPEC-064" /%} — plan plugin unconditional entity registration (downstream consumer for the `plan:` namespace)
- {% ref "SPEC-066" /%} — expand rune (the rune that consumes plan-registered entities for inline embedding)
- {% ref "SPEC-068" /%} — adapter HMR contract for arbitrary file dependencies (deferred follow-up covering HMR for registered roots)
- `packages/content/src/content-tree.ts:124` — current `_partials/` loading
- `packages/content/src/site.ts:131` — current Markdoc partial registration
- `packages/runes/src/plugins.ts` — `loadPlugin` / `mergePlugins` extension points
- `packages/types/src/package.ts` — `Plugin` interface definition

{% /spec %}
