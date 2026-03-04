# @refrakt-md/design

## 0.7.2

### Patch Changes

- Add cross-page pipeline infrastructure with `EntityRegistry`, `runPipeline()`,
  and `PackagePipelineHooks`. Includes nav auto mode, pipeline build output, design
  token context propagation, and editor preview/autocomplete support for community
  runes.

  Fix duplicate BEM classes on runes nested inside `data-name` elements. Make
  `autoLabel` recursive in the identity transform engine so eyebrow, headline, and
  blurb children inside `<header>` wrappers receive BEM classes. Add
  `pageSectionAutoLabel` to all marketing and core page-section runes.

  Add pill-badge eyebrow variant: an eyebrow paragraph containing a link renders as
  a rounded pill with a border, muted prose text, and primary-colored link. The
  entire pill is clickable via a CSS `::before` overlay.

  Add `mockup` rune to `@refrakt-md/design` for wrapping content in device frames.

  Fix multiple preview runtime issues: `structuredClone` errors, `DataCloneError`
  when sending `routeRules` via `postMessage`, and cache not invalidating on source
  changes. Remove `ComponentType` and `PropertyNodes` from the schema system.

- Updated dependencies
  - @refrakt-md/types@0.7.2
  - @refrakt-md/runes@0.7.2
  - @refrakt-md/transform@0.7.2

## 0.7.1

### Patch Changes

- @refrakt-md/runes@0.7.1
- @refrakt-md/transform@0.7.1
- @refrakt-md/types@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.7.0
  - @refrakt-md/transform@0.7.0
  - @refrakt-md/types@0.7.0
