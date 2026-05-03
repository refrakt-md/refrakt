# @refrakt-md/editor

## 0.11.2

### Patch Changes

- @refrakt-md/content@0.11.2
- @refrakt-md/highlight@0.11.2
- @refrakt-md/runes@0.11.2
- @refrakt-md/transform@0.11.2
- @refrakt-md/types@0.11.2

## 0.11.1

### Patch Changes

- @refrakt-md/content@0.11.1
- @refrakt-md/highlight@0.11.1
- @refrakt-md/runes@0.11.1
- @refrakt-md/transform@0.11.1
- @refrakt-md/types@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [6a89ebe]
  - @refrakt-md/transform@0.11.0
  - @refrakt-md/content@0.11.0
  - @refrakt-md/highlight@0.11.0
  - @refrakt-md/runes@0.11.0
  - @refrakt-md/types@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [b04d001]
  - @refrakt-md/runes@0.10.1
  - @refrakt-md/content@0.10.1
  - @refrakt-md/highlight@0.10.1
  - @refrakt-md/transform@0.10.1
  - @refrakt-md/types@0.10.1

## 0.10.0

### Patch Changes

- Version bump for coordinated release

## 0.9.9

### Patch Changes

- @refrakt-md/content@0.9.9
- @refrakt-md/highlight@0.9.9
- @refrakt-md/runes@0.9.9
- @refrakt-md/transform@0.9.9
- @refrakt-md/types@0.9.9

## 0.9.8

### Patch Changes

- @refrakt-md/content@0.9.8
- @refrakt-md/highlight@0.9.8
- @refrakt-md/runes@0.9.8
- @refrakt-md/transform@0.9.8
- @refrakt-md/types@0.9.8

## 0.9.7

### Patch Changes

- @refrakt-md/content@0.9.7
- @refrakt-md/highlight@0.9.7
- @refrakt-md/runes@0.9.7
- @refrakt-md/transform@0.9.7
- @refrakt-md/types@0.9.7

## 0.9.6

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.6
  - @refrakt-md/content@0.9.6
  - @refrakt-md/highlight@0.9.6
  - @refrakt-md/runes@0.9.6
  - @refrakt-md/transform@0.9.6

## 0.9.5

### Patch Changes

- - Fix annotate rune: margin notes invisible, inline notes not inline
  - Fix sidenote rune rendering empty due to minimal density hiding body
  - Fix juxtapose label rendering and restyle toggle buttons
  - Unwrap runes from paragraph wrappers in juxtapose panels
  - Fix diagram surface and style mermaid diagrams with Lumina tokens
  - Fix mediatext wrap mode ignoring ratio attribute
  - Fix budget estimate indicator and improve examples
  - Fix sandbox dark mode on mobile browsers
  - Improve SEO and AI discoverability
- Updated dependencies
  - @refrakt-md/runes@0.9.5
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/content@0.9.5
  - @refrakt-md/types@0.9.5
  - @refrakt-md/highlight@0.9.5

## 0.9.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/content@0.9.4
  - @refrakt-md/runes@0.9.4
  - @refrakt-md/highlight@0.9.4
  - @refrakt-md/transform@0.9.4
  - @refrakt-md/types@0.9.4

## 0.9.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.3
  - @refrakt-md/content@0.9.3
  - @refrakt-md/highlight@0.9.3
  - @refrakt-md/runes@0.9.3
  - @refrakt-md/transform@0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.
- Updated dependencies
  - @refrakt-md/types@0.9.2
  - @refrakt-md/transform@0.9.2
  - @refrakt-md/runes@0.9.2
  - @refrakt-md/content@0.9.2
  - @refrakt-md/highlight@0.9.2

## 0.9.1

### Patch Changes

- ### Transform engine enhancements (SPEC-033)

  - Named slots with ordering for structured element placement
  - Repeated element generation for multi-instance structures
  - Element projection (hide, group, relocate) for layout control
  - Value mapping and configurable density contexts
  - Migrate postTransform uses to declarative config

  ### Rune schema modernization

  - Replace legacy Model class with `createContentModelSchema` across all runes (WORK-099–102)
  - Replace `useSchema`/`Type` system with inline rune identifiers (ADR-005)
  - Remove legacy Model class, decorators, `createSchema`, and `NodeStream`

  ### Other improvements

  - File-derived timestamps for runes (SPEC-029)
  - Move extract command from CLI to `@refrakt-md/docs` package
  - Fix accordion item schema metadata duplication
  - Fix paragraph-wrapped images in juxtapose panels
  - Auto-assign IDs and detect duplicates in plan CLI
  - Inspect and contracts updated for structure slots

- Updated dependencies
  - @refrakt-md/content@0.9.1
  - @refrakt-md/highlight@0.9.1
  - @refrakt-md/runes@0.9.1
  - @refrakt-md/transform@0.9.1
  - @refrakt-md/types@0.9.1

## 0.9.0

## 0.8.5

### Patch Changes

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.
- Updated dependencies
  - @refrakt-md/content@0.8.5
  - @refrakt-md/highlight@0.8.5
  - @refrakt-md/runes@0.8.5
  - @refrakt-md/transform@0.8.5
  - @refrakt-md/types@0.8.5

## 0.8.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.4
  - @refrakt-md/content@0.8.4
  - @refrakt-md/highlight@0.8.4
  - @refrakt-md/transform@0.8.4
  - @refrakt-md/types@0.8.4

## 0.8.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.3
  - @refrakt-md/content@0.8.3
  - @refrakt-md/highlight@0.8.3
  - @refrakt-md/transform@0.8.3
  - @refrakt-md/types@0.8.3

## 0.8.2

### Patch Changes

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.
- Updated dependencies
  - @refrakt-md/types@0.8.2
  - @refrakt-md/transform@0.8.2
  - @refrakt-md/runes@0.8.2
  - @refrakt-md/content@0.8.2
  - @refrakt-md/highlight@0.8.2

## 0.8.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.1
  - @refrakt-md/content@0.8.1
  - @refrakt-md/highlight@0.8.1
  - @refrakt-md/transform@0.8.1
  - @refrakt-md/types@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.8.0
  - @refrakt-md/content@0.8.0
  - @refrakt-md/highlight@0.8.0
  - @refrakt-md/runes@0.8.0
  - @refrakt-md/transform@0.8.0

## 0.7.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.7.2
  - @refrakt-md/content@0.7.2
  - @refrakt-md/runes@0.7.2
  - @refrakt-md/transform@0.7.2
  - @refrakt-md/highlight@0.7.2

## 0.7.1

### Patch Changes

- @refrakt-md/content@0.7.1
- @refrakt-md/highlight@0.7.1
- @refrakt-md/runes@0.7.1
- @refrakt-md/transform@0.7.1
- @refrakt-md/types@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.7.0
  - @refrakt-md/content@0.7.0
  - @refrakt-md/highlight@0.7.0
  - @refrakt-md/transform@0.7.0
  - @refrakt-md/types@0.7.0

## 0.6.0

### Minor Changes

- ### Editor

  - WYSIWYG block editor with stacked previews, Shadow DOM isolation, and rail navigation
  - Three-mode editor toggle: Visual, Code, and Preview with unified header bar
  - Category-based sidenav that groups content by route rules from refrakt.config.json
  - Positioned popovers for page/folder/category creation near trigger buttons
  - Rune palette with attribute autocomplete and Markdoc tag highlighting
  - Layout editor with visual navigation editing
  - Frontmatter editor with raw YAML mode
  - Live Svelte preview runtime with full-fidelity layout rendering
  - File watching via SSE for external editor coexistence
  - Responsive viewport selector (desktop/tablet/mobile)
  - Preview link navigation — clicking links in preview navigates the editor
  - Client-side syntax highlighting via Shiki
  - File operations: create, rename, duplicate, delete, toggle draft

  ### Framework neutrality

  - Migrated Diagram, Sandbox, Map, and Comparison runes from Svelte components to framework-neutral web components
  - Added postTransform hooks to identity transform engine for component-free interactive runes

  ### Tooling

  - Python symbol extraction pipeline (`refrakt extract`)
  - Theme distribution: complete export package with CLI install command
  - Icon rune system with Lucide icon set and per-project custom icons via refrakt.config.json

  ### Theme Studio

  - AI-powered theme generation with design expression prompts
  - Per-rune CSS override editor with CodeMirror
  - Undo/redo history with keyboard shortcuts
  - Fixture picker with configurable rune previews and coverage indicator
  - Visual design token editors
  - Export panel with CSS preview, copy, and ZIP download
  - localStorage persistence

  ### Content & site

  - Layout transform engine for computed content in layouts
  - Semantic rune usage throughout documentation
  - Dedicated CLI documentation section

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.6.0
  - @refrakt-md/theme-base@0.6.0
  - @refrakt-md/runes@0.6.0
  - @refrakt-md/types@0.6.0
  - @refrakt-md/content@0.6.0
  - @refrakt-md/highlight@0.6.0

## 0.5.1

### Patch Changes

- @refrakt-md/content@0.5.1
- @refrakt-md/runes@0.5.1
- @refrakt-md/transform@0.5.1
- @refrakt-md/types@0.5.1
