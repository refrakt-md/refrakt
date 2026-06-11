{% spec id="SPEC-097" status="draft" tags="editor,config,theme,tints,route-rules,entity-routes,multi-site" %}

# Editor config studio

`refrakt.config.json` has grown from a content pointer into the project's
control panel — multi-site `sites`, a structured `theme` object (package,
presets, per-mode token overrides, code colour scheme), named `tints` and
`backgrounds`, inline-SVG `icons`, `plugins`, `routeRules`, `entityRoutes`,
plus root-level `plan`, `xrefs`, and `fileRoots`. The editor reads and writes
exactly one of these fields (`routeRules`), and even that has no UI. This
spec gives the editor a Site Settings area with proper UX knobs for the
config surface, with a raw-JSON escape hatch so the UI never blocks access
to new fields.

Target: editor-focused minors; panels are independently shippable.

## Motivation

- The only config endpoint is `GET`/`PUT /api/route-rules`
  (`packages/editor/src/server.ts`); everything else in
  `packages/types/src/theme.ts` (`SiteConfig`, ~20 fields) is invisible to
  the editor.
- Theme tokens, tints, backgrounds, and icons are exactly the kind of
  visual knobs an editor should own — they're CSS-variable-backed, so live
  preview is nearly free, and tint/bg preset names already feed attribute
  autocomplete (`server.ts` injects them into `/api/runes`).
- Route rules determine layouts per URL pattern and order matters, but
  authors edit them blind in JSON with no view of which pages match.
- `entityRoutes` generate pages from the registry with `{field}`
  interpolation and render templates — config that authors iterate on
  constantly when building registry-driven sites, currently hand-written.
- A machine-readable schema already exists (`refrakt.config.schema.json`),
  which the UI should lean on rather than hardcoding field knowledge.

## Design

A "Site Settings" area in the editor (per site — see
{% ref "WORK-392" /%} for site selection), organised into panels. Every
panel writes back to `refrakt.config.json` through a new
`GET`/`PUT /api/config/site` endpoint that patches only the keys the panel
owns (no full-file rewrites of unrelated sections). A raw JSON editor with
schema validation against `refrakt.config.schema.json` is always available
for fields the UI doesn't model yet.

### Theme panel

- Token editor for `theme.tokens` — colour pickers for `color.*` with light
  and dark (`theme.modes.dark`) side by side; text inputs for non-colour
  tokens. Changes apply live to the preview iframe (tokens are CSS
  variables).
- Preset selector for `theme.presets` (discovered from the theme package's
  exports) and a `code.colorScheme` toggle.

### Tints & backgrounds panels

- Named-preset lists with rendered swatch previews; add via `extends`
  picker over theme presets; edit token overrides inline.
- Saving refreshes the attribute-completion preset names so the authoring
  side picks up new tints immediately.

### Route rules panel

- Visual ordered list: pattern input → layout picker (named layouts from
  `packages/transform/src/layouts.ts` plus plugin-contributed ones).
- Live matched-pages preview per rule, evaluated against the content tree;
  flags pages shadowed by an earlier rule when patterns overlap.
- Drag-to-reorder (first match wins).

### Entity routes panel

- Per-route form: entity `type` (dropdown from registry types — shared
  infrastructure from {% ref "SPEC-096" /%}), URL pattern with `{field}`
  placeholders validated against actual entity fields, title template,
  `render` / `render-template` picker (file browser over the templates
  dir), `frontmatter` map.
- Preview: a live sample of the pages the route would generate.

### Icons & plugins panels

- Icons: list of named icons with rendered previews; paste-SVG to add or
  edit.
- Plugins: read-only inventory first — installed plugins with the runes,
  layouts, and hooks each contributes (data already available via the
  plugin loader). Enable/disable writes the `plugins` array; installing
  new packages is out of scope.

## Acceptance Criteria

- [ ] A Site Settings area exists with panels for theme tokens, tints,
  backgrounds, route rules, entity routes, icons, and plugins, plus a
  schema-validated raw JSON fallback.
- [ ] `GET`/`PUT /api/config/site` reads and patches `refrakt.config.json`
  per-section without clobbering unrelated keys; external edits to the
  config surface through the existing change-detection flow.
- [ ] Theme token edits (including dark-mode overrides) apply live to the
  preview without a server restart.
- [ ] Tint/background preset changes refresh attribute completion in the
  same session.
- [ ] Route rules render as an ordered visual list with per-rule
  matched-pages preview and drag-to-reorder.
- [ ] Entity routes are editable as forms with field-validated `{field}`
  placeholders and a generated-pages preview.
- [ ] Icons and plugins have at minimum inventory panels; icons support
  add/edit via pasted SVG.
- [ ] Unknown/unmodelled config keys are preserved through any panel save.

## Non-goals

- Creating or deleting sites, or editing root-level `plan` / `xrefs` /
  `fileRoots` (raw JSON covers them; UI can come later).
- npm-installing new plugins or themes from the editor.
- Theme *authoring* (editing a theme package's own files) — this is
  project-level config only.

## References

- {% ref "SPEC-096" /%} — registry plumbing reused by the entity-routes
  panel. {% ref "WORK-392" /%} — multi-site selection prerequisite.
- SPEC-069 — `entityRoutes`. ADR-014 / ADR-015 — frame presets and scale
  ramps in the token contract (future theme-panel knobs).
- `packages/types/src/theme.ts` (`SiteConfig`), `refrakt.config.schema.json`,
  `packages/editor/src/server.ts` (route-rules endpoint to generalise),
  `packages/transform/src/layouts.ts`.

{% /spec %}
