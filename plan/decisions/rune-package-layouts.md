{% decision id="ADR-007" status="accepted" date="2026-04-03" tags="transform, packages, architecture, layout" %}

# Rune packages provide their own layouts

## Context

Layouts are currently defined in `packages/transform/src/layouts.ts` and exported from `@refrakt-md/transform`. There are four: `defaultLayout`, `docsLayout`, `planLayout`, and `blogArticleLayout`.

Two of these — `docsLayout` and `planLayout` — are domain-specific. The docs layout references computed slots like `breadcrumb` and `version-switcher` that only make sense in a documentation context. The plan layout is tightly coupled to the plan package's pipeline hooks and rune set. Yet both live in `transform`, a low-level package with no dependency on `runes` or any community package.

This creates an inverted dependency: `transform` contains domain knowledge that logically belongs to `runes/docs/` and `runes/plan/`. The plan package already has to `import { planLayout } from '@refrakt-md/transform'` to use its own layout — reaching across packages for something it should own.

Meanwhile, `RunePackage` already supports contributing `theme.runes` (engine config), `behaviors`, and `pipeline` hooks. Layouts are the same kind of contribution — a declarative config that a package provides to the system — but there is no field for them.

## Options Considered

### 1. Keep all layouts in `@refrakt-md/transform` (status quo)

All layout definitions remain centralized in the transform package.

**Pros:**
- No changes needed
- Single place to look up all layouts

**Cons:**
- `transform` contains domain-specific knowledge (docs breadcrumbs, plan toolbar titles)
- Dependency arrow is backwards — low-level package knows about high-level concerns
- Community packages cannot ship layouts for their own domains
- Plan package must import its own layout from an unrelated package

### 2. Packages provide layouts via `RunePackage`

Add an optional `layouts` field to `RunePackage` (or `RunePackageThemeConfig`). Domain-specific layouts move into the packages that own them. Generic layouts (`defaultLayout`, `blogArticleLayout`) remain in `transform`.

**Pros:**
- Cohesion — each package owns its full vertical slice (schemas, config, pipeline hooks, layouts)
- Follows established pattern (`theme.runes`, `behaviors`, `pipeline` are already on `RunePackage`)
- Enables community packages to ship layouts without modifying core
- Correct dependency direction — `transform` stays domain-agnostic

**Cons:**
- Shared chrome elements (menu button, close button SVGs) need to be exported as composable pieces
- Layout discovery becomes distributed across packages

### 3. Separate layout package

Create a dedicated `@refrakt-md/layouts` package that imports from both `transform` (for types and chrome) and specific rune packages.

**Pros:**
- Clear separation of concerns

**Cons:**
- Extra package to maintain
- Still doesn't let community packages ship their own layouts
- Doesn't follow the established `RunePackage` extension pattern

## Decision

**Option 2: Packages provide layouts via `RunePackage`.**

- `docsLayout` moves to `runes/docs/` — it is owned by `@refrakt-md/docs`
- `planLayout` moves to `runes/plan/` — it is owned by `@refrakt-md/plan`
- `defaultLayout` and `blogArticleLayout` remain in `@refrakt-md/transform` — they are generic and have no domain-specific semantics (blog article layout uses standard frontmatter fields, not blog-package-specific concepts)
- Shared chrome building blocks (menu button, close button, search button, hamburger SVGs) are exported from `@refrakt-md/transform` so packages can compose them without duplication

## Rationale

`RunePackage` is already the unit of distribution for everything a rune domain needs: schemas, engine config, behaviors, and pipeline hooks. Layouts complete the picture. A docs package that provides doc-specific runes, doc-specific computed slots (breadcrumb, version-switcher), and doc-specific pipeline hooks should also provide the doc-specific layout that ties them all together.

Option 1 keeps the status quo but the dependency direction is wrong — `transform` shouldn't encode docs or plan domain knowledge. Option 3 adds an unnecessary package and still doesn't solve the community package story.

The blog article layout stays in `transform` because it uses only generic frontmatter fields (`title`, `date`, `author`, `tags`) and doesn't depend on any rune package concepts. There is no need for a separate blog rune package.

## Consequences

1. **`RunePackage` gains a `layouts` field.** Either directly on `RunePackage` or nested under `theme`, it maps layout names to `LayoutConfig` objects. The exact placement should follow the existing pattern — `theme.layouts` is a natural fit alongside `theme.runes`.

2. **`@refrakt-md/transform` exports chrome building blocks.** The shared SVG icons and chrome structure entries (`menuButton`, `closeButton`, `searchButton`, `hamburger`) become public exports that packages can import and compose into their layouts.

3. **`mergePackages()` collects layouts.** The existing package merging logic in `packages/runes/src/packages.ts` extends to aggregate layouts from all loaded packages, detecting name collisions the same way it does for rune names.

4. **Lumina's theme entry points change.** Instead of importing `docsLayout` and `planLayout` from `@refrakt-md/transform`, the theme gets them from the merged package config. `defaultLayout` and `blogArticleLayout` continue to be imported from `transform`.

5. **Plan package simplifies.** `runes/plan/src/commands/render-pipeline.ts` currently imports `planLayout` from `@refrakt-md/transform`. After the move, it imports from its own package — the correct dependency direction.

6. **Community packages can ship layouts.** A future package (e.g., a wiki package, a knowledge-base package) can provide its own layout alongside its runes without needing changes to core.

{% /decision %}
