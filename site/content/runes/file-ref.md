---
title: File-ref
description: Path-based inline references to project files — third member of the Registry family beside xref (one entity) and expand (one entity inlined), with optional drawer preview
---

# File-ref

`{% file-ref %}` is the path-based sibling of [`xref`](/runes/xref) and [`expand`](/runes/expand): where those resolve a registered entity by id, `file-ref` points at an arbitrary project file by path. The inline form renders an `<a>` to the file's canonical GitHub URL; the `preview="drawer"` form hoists a drawer containing the file's snippet plus a "View source on GitHub →" footer link, leaving an inline link in prose that opens it (SPEC-078).

{% hint type="note" %}
File-ref requires a `repoUrl` (and optional `repoBranch`) on the site config so the canonical GitHub URL can be built. See [Site configuration → `repoUrl`](/docs/configuration/sites#seo-and-branding).
{% /hint %}

## Linking to a file

The minimal call points at a file by path (project-root-relative, same sandbox `snippet` uses). The link text defaults to the filename:

{% preview source=true %}

See {% file-ref path="package.json" /%} for the project metadata.

{% /preview %}

Pass an explicit `label` when you're referring to a symbol inside the file rather than the file itself — that's the usual case:

```markdoc
See {% file-ref path="packages/types/src/theme.ts" label="SiteThemeConfig" /%}
for the shape.
```

## Anchoring to a line range

`lines` accepts a single line (`"42"`) or a range (`"42-58"`). Drives both the GitHub `#L42-L58` anchor and the snippet slice when previewing.

```markdoc
{% file-ref path="packages/types/src/theme.ts" lines="42-58" label="SiteThemeConfig" /%}
```

The href becomes `https://github.com/{owner}/{repo}/blob/{repoBranch}/packages/types/src/theme.ts#L42-L58` — clicking jumps straight to the highlighted range on GitHub.

## Preview drawer

`preview="drawer"` is where file-ref earns its keep for docs. The inline link stays in prose, and clicking opens a hoisted drawer containing the file's snippet:

{% preview source=true %}

See {% file-ref path="packages/types/src/theme.ts" lines="74-125" label="SiteConfig" preview="drawer" /%} for the full shape.

{% /preview %}

- The inline `<a>` gets `href="#drawer-{slug}"`, `aria-controls`, `aria-expanded` — the drawer behavior layer flips `aria-expanded` on open.
- The drawer body is a `{% snippet path=… lines=… /%}` of the file. Syntax-highlighted via the standard highlight pass.
- The drawer chrome footer holds a `View source on GitHub →` link with the line-range anchor.
- Per-page **dedup**: N mentions of the same `path` + `lines` collapse to one hoisted drawer.

### Without JS

The inline `href="#drawer-{slug}"` is a real in-page anchor that scrolls to the hoisted drawer's visible block fallback (the same SSR shape any `{% drawer %}` produces). Readers without JS get the snippet inline instead of behind chrome — graceful degradation.

**Nested-preview caveat.** A `{% file-ref … preview="drawer" /%}` placed inside another drawer's body or footer still hoists, producing a drawer-from-within-a-drawer shape. Supported but discouraged; the build emits an info-level note when detected. Same rule as the [xref preview drawer](/runes/xref#preview-drawer).

## Label conventions

The filename default (e.g. `theme.ts`) is conservative — when the file-ref refers to a symbol inside the file, pass an explicit `label`. Until a future `symbol="…"` attribute lands ({% ref "SPEC-078" preview="drawer" /%} future extensions), `label` is the only knob:

```markdoc
{# Refers to the file: filename is fine #}
{% file-ref path="package.json" /%}

{# Refers to a symbol in the file: pass a label #}
{% file-ref path="packages/types/src/theme.ts" lines="74-125" label="SiteConfig" /%}
```

## Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | yes | Project-root-relative file path. Same sandbox as `snippet` — absolute paths, traversal escapes (`..`), and out-of-root symlinks are rejected; missing files error at build time. |
| `lines` | string | no | Line range: `"42-58"` or `"42"`. Drives the GitHub `#L42-L58` anchor and (with `preview="drawer"`) the snippet slice. |
| `label` | string | no | Display text for the inline link. Defaults to the filename. Pass an explicit label when referring to a symbol within the file. |
| `preview` | `drawer` | no | Hoist a preview drawer with the file's snippet + a GitHub footer link; the inline link opens it. |

## Site configuration

The GitHub URL is built from `SiteConfig.repoUrl` + `SiteConfig.repoBranch`. Both live in `refrakt.config.json`:

```json
{
  "site": {
    "contentDir": "./content",
    "theme": { "package": "@refrakt-md/lumina" },
    "repoUrl": "https://github.com/owner/repo",
    "repoBranch": "main"
  }
}
```

| Field | Default | Notes |
|-------|---------|-------|
| `repoUrl` | — | Canonical repo URL. When absent, the inline link has no `href` (or falls back to an in-page snippet anchor when one exists on the page) and a one-time per-page build warning fires. |
| `repoBranch` | `"main"` | Accepts any git ref — branch / tag / commit SHA. Use a SHA for archival URLs that won't drift when the file is edited. |

## Output contract

Without preview, the inline form:

```html
<span class="rf-file-ref" data-rune="file-ref">
  <a href="https://github.com/.../blob/main/path/to/file.ts#L42-L58">label</a>
</span>
```

With `preview="drawer"`:

```html
<span class="rf-file-ref" data-rune="file-ref">
  <a href="#drawer-path-to-file-ts-L42-L58"
     aria-controls="drawer-path-to-file-ts-L42-L58"
     aria-expanded="false"
     data-target-type="drawer">label</a>
</span>
<!-- ... and at the page root: -->
<section class="rf-drawer" id="drawer-path-to-file-ts-L42-L58" data-rune="drawer">
  <header class="rf-drawer__header">…</header>
  <div class="rf-drawer__body">
    <figure class="rf-snippet" data-source-path="path/to/file.ts" data-lines="42-58">
      <pre data-language="typescript"><code>…</code></pre>
    </figure>
  </div>
  <footer class="rf-drawer__footer">
    <a href="https://github.com/.../#L42-L58">View source on GitHub →</a>
  </footer>
</section>
```

## See also

- [xref](/runes/xref) — id-based sibling. Same `preview="drawer"` attribute, different body shape (entity expand vs file snippet).
- [expand](/runes/expand) — id-based content-inlining counterpart. `xref preview="drawer"` is the on-demand reveal; `expand` is the in-flow substitution.
- [snippet](/runes/snippet) — the block-level file embedding rune. `file-ref` uses snippet's sandbox + rendering for its drawer body.
- [drawer](/runes/drawer) — the chrome the preview hoists into. The same `<section class="rf-drawer">` shape author-declared drawers use.
