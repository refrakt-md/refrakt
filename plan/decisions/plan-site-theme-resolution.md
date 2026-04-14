{% decision id="ADR-004" status="proposed" tags="plan, themes, developer-experience" %}

# Plan Site Theme Resolution

## Context

The plan site (`refrakt plan serve`) currently has its own self-contained theme system: a `--theme` flag that resolves to one of two built-in CSS files (`default` or `minimal`) or a custom file path. This is entirely disconnected from the main refrakt theme system, where sites declare `"theme": "@refrakt-md/lumina"` in `refrakt.config.json` and themes are installed as npm packages with manifests, layout configs, design tokens, and framework-specific adapters.

This means a user who has carefully configured their refrakt site with a custom theme gets a completely different visual experience when they run `refrakt plan serve`. The plan site feels like a separate tool rather than part of the same project.

We want users to be able to install themes for their plan sites the same way they would for a refrakt site — via npm packages that follow the standard theme contract.

## Decision: Layered Theme Resolution

The plan site should resolve themes through a three-tier cascade:

```
1. --theme flag            (explicit override, highest priority)
2. refrakt.config.json     (project theme, if the file exists)
3. Built-in default        (self-contained plan theme, always works)
```

### Resolution rules

| `--theme` value | Resolution |
|-----------------|------------|
| `default` | Built-in plan theme (`runes/plan/styles/default.css`) |
| `minimal` | Built-in print-friendly theme (`runes/plan/styles/minimal.css`) |
| `lumina` | Shorthand for `@refrakt-md/lumina` — resolve package |
| `@some/theme` | npm package name — resolve `package/html` export |
| `./path/to/theme` | Local theme directory or CSS file |
| *(omitted)* | Read `theme` from `refrakt.config.json`, fall back to `default` |

When the flag is omitted and `refrakt.config.json` exists with a `theme` field, the plan site uses that theme. This means `refrakt plan serve` in a Lumina project automatically picks up Lumina — no flag needed.

### CSS layering

Theme CSS and plan rune CSS are separate concerns layered together:

```
Layer 1: Theme CSS (design tokens + global styles + layout chrome)
Layer 2: Plan rune CSS (entity cards, status badges, dashboard grid)
Layer 3: Highlight CSS (syntax highlighting, if needed)
```

Plan rune styles always come from `@refrakt-md/plan` regardless of the active theme. The theme provides the foundational layer — typography, colors, spacing, layout — while plan rune styles use the theme's design tokens via CSS custom properties.

When a theme package is resolved, the plan site imports:
- The theme's `base.css` (design tokens)
- The plan package's own rune styles (which reference those tokens)

This separation means plan rune styles work with any theme that provides the standard `--rf-*` token set.

### Layout fallback

Theme packages define layouts (`default`, `docs`, `blog-article`) but typically won't include a `plan` layout. The resolution strategy:

1. If the resolved theme provides a `plan` layout → use it
2. Otherwise → inject the built-in `planLayout` from `@refrakt-md/plan` into the theme's layout map

This ensures any theme works with the plan site automatically. Theme authors can optionally provide a dedicated `plan` layout for a more tailored experience.

### Token bridging

The built-in plan themes currently use `--plan-*` token names. To work with external themes, plan rune CSS should reference `--rf-*` tokens (the standard refrakt token namespace) with `--plan-*` as fallbacks:

```css
.rf-work__status-badge {
  background: var(--rf-color-success, var(--plan-status-done));
}
```

This lets plan styles adapt to any theme's token palette while remaining functional with the built-in themes.

## Consequences

### Positive

- **Unified experience**: Users see consistent styling across their docs site and plan site
- **Theme reuse**: Installing a theme once serves both content and planning
- **Familiar pattern**: Same `--theme` flag semantics as a regular site, same package resolution
- **Zero-config in projects**: If `refrakt.config.json` exists, theming just works
- **Standalone still works**: No config needed for standalone plan usage — built-in themes remain the default

### Negative

- **Config discovery complexity**: `resolveThemeCss()` grows from simple name lookup to config file reading + package resolution
- **Token bridging**: Plan rune CSS needs updating to reference `--rf-*` tokens alongside `--plan-*` fallbacks
- **Theme compatibility**: Not all themes will look great with plan runes out of the box — entity cards, status badges, and progress bars may need per-theme tuning

### Risks

- **Dependency on theme package availability**: If a theme package is misconfigured or missing the `html` export, the plan site needs a clean fallback path with a helpful error message
- **Token gaps**: A third-party theme might not define all `--rf-*` tokens that plan rune CSS depends on; fallback values must be robust

## Implementation Approach

### Phase 1: Config-aware resolution

Update `resolveThemeCss()` in `render-pipeline.ts` to:
1. Check for `refrakt.config.json` when no `--theme` flag is provided
2. If config exists and has `theme`, attempt to resolve it as a package
3. Fall back to built-in `default` theme if resolution fails

### Phase 2: Package resolution

Add theme package resolution to the plan render pipeline:
1. Resolve npm package → find `html` export or `base.css` export
2. Load the theme's `ThemeConfig` from `package/transform` export
3. Merge with plan rune configs via `mergeThemeConfig()`
4. Concatenate theme base CSS + plan rune CSS for the final stylesheet

### Phase 3: Token bridging

Update plan rune CSS (`runes/plan/styles/`) to:
1. Reference `--rf-*` tokens as primary values
2. Keep `--plan-*` as fallbacks for standalone usage
3. Ensure the built-in `tokens.css` also defines the `--rf-*` tokens it uses (so standalone mode still works)

{% /decision %}
