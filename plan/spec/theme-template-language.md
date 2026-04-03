{% spec id="SPEC-034" status="draft" tags="themes, transform, authoring, exploration" %}

# Theme Structural Template Language (Design Exploration)

> A design exploration of a spatial template syntax for theme developers to express structural overrides — compiled to the declarative `RuneConfig` model defined in SPEC-033. **This is not a committed implementation.** It documents a possible future authoring surface so the idea is preserved and can be revisited if real theme development reveals the need.

---

## Status

This spec is a **design exploration**, not a build proposal. The declarative model in SPEC-033 (slots, projection, value mapping, repeat, density contexts) is the implementation priority. Theme developers can express structural overrides using TypeScript `RuneConfig` objects today — and for most scenarios, that's sufficient.

The template language explored here would become worth building if:

- Theme developers regularly override structure across many runes (10+), making spatial readability matter more than one-off precision
- The `projection` vocabulary (`relocate`, `hide`, `group`) proves unintuitive in practice despite being learnable
- Community theme authors request a more visual way to describe layout overrides

Until those signals emerge, this spec preserves the design so it doesn't need to be re-derived.

---

## Context

SPEC-033 defines a declarative model that gives themes structural control over rune output. The model is the engine's contract — what tooling validates, what `mergeThemeConfig` merges, what `refrakt contracts` checks.

This spec explores an **authoring surface** for that model: a template language that compiles to `RuneConfig` objects. Per the architectural layering in SPEC-033, the model is the constraint boundary — any syntax above it is sugar. If something can't be expressed as a `RuneConfig`, it can't be expressed in the template.

---

## The Override-First Insight

Rune packages define complete `RuneConfig` objects — modifiers, structure, sections, edit hints, styles. These are sensible defaults that work out of the box. A theme almost never needs to redefine all of that. The typical theme interaction is:

- "Recipe is fine, but put the badge below the content"
- "Hint looks good, but group the icon and title into a chrome bar"
- "Event's detail list should be in a sidebar, not a header"

These are **structural patches** — small spatial adjustments to a layout that's already defined. The template language should optimize for expressing these patches, not for rewriting full configs.

This means:

1. **No frontmatter in the common case.** A theme override is pure structural body. The modifier declarations, styles, sections, edit hints — all of that comes from the package default and doesn't need restating.
2. **The structural body is a spatial diff.** Elements that appear in the template are being placed. Elements that don't appear stay where the default put them. Elements prefixed with a hide marker are removed.
3. **Full definitions are for package authors, not theme developers.** When a rune package defines its base config, it uses TypeScript — that's the right tool for declaring modifiers, transforms, and data concerns. The template language serves the spatial override case.

---

## Syntax

The template syntax has only structural body — no frontmatter in the override case. It uses three core sigils:

| Syntax | Meaning |
|--------|---------|
| `[name]` | Slot — a named zone in the output |
| `@name` | Reference — an existing `data-name` element |
| `--- @name` | Hide — suppress an element |

Indentation means containment. That's the entire language for theme overrides.

Additional sigils for structure injection (less common in overrides, mainly used in full definitions):

| Syntax | Meaning |
|--------|---------|
| `tag.ref` | Injected element — e.g. `div.topbar`, `span.title` |
| `tag.ref = $mod` | Injected element with text from modifier value |
| `icon {group}.$mod` | Icon element with group and variant from modifier |
| `(content)` | Content children placeholder |
| `{name}` | Group wrapper — new container for collecting elements |
| `*tag.ref (...)` | Repeated element (Feature 3 from SPEC-033) |
| `?$mod` | Condition — only render if modifier is truthy |

---

## Examples: Surgical Overrides

### Move one element

Recipe's badge normally sits inside the header meta bar. A theme wants it below the content:

```
[header]
  @meta

(content)

[footer]
  @badge
```

Compiles to:
```ts
{
  slots: ['header', 'content', 'footer'],
  projection: {
    relocate: {
      badge: { into: 'footer' },
    },
  },
}
```

Everything else — the meta items inside `@meta`, the modifiers, the sections, the edit hints — stays exactly as the learning package defined it. The theme touched one element.

### Group two elements

Hint's icon and title are separate children. A theme wants them in a chrome container:

```
[header]
  {@chrome}
    @icon
    @title

@body
```

The `{name}` syntax creates a new group wrapper. Compiles to:
```ts
{
  slots: ['header', 'content'],
  projection: {
    group: {
      chrome: { tag: 'div', members: ['icon', 'title'] },
    },
    relocate: {
      chrome: { into: 'header' },
    },
  },
}
```

### Hide an element

A minimal theme strips metadata from events:

```
--- @details
```

One line. Compiles to:
```ts
{ projection: { hide: ['details'] } }
```

### Rearrange a complex layout

An event rune has details in a header. A theme wants a two-column layout with details in a sidebar:

```
[main]
  @headline
  @blurb
  (content)

[sidebar]
  @details
```

Compiles to:
```ts
{
  slots: ['main', 'sidebar'],
  projection: {
    relocate: {
      headline: { into: 'main' },
      blurb: { into: 'main' },
      details: { into: 'sidebar' },
    },
  },
}
```

### Star rating — repeat syntax

Testimonial's theme override adds a rating display:

```
[header]
  *span.star ($ratingTotal, filled: $rating) "★"

@content
```

The `*` prefix means repetition. Compiles to:
```ts
{
  slots: ['header', 'content'],
  structure: {
    stars: {
      tag: 'div', slot: 'header',
      repeat: { count: 'ratingTotal', filled: 'rating',
        element: { tag: 'span', ref: 'star' } },
    },
  },
}
```

---

## Comparison: Override Ergonomics

Moving the Recipe badge to a footer — the same operation in three syntaxes:

**TypeScript config override:**
```ts
Recipe: {
  slots: ['header', 'content', 'footer'],
  projection: {
    relocate: {
      badge: { into: 'footer' },
    },
  },
}
```

**`.rune` structural template:**
```
[header]
  @meta
(content)
[footer]
  @badge
```

**Handlebars template:**
```handlebars
{{!-- Must rewrite the ENTIRE recipe structure --}}
<article class="rf-recipe rf-recipe--{{mod "layout" "stacked"}} rf-recipe--{{mod "difficulty" "medium"}}"
  data-density="full" data-layout="{{mod "layout" "stacked"}}" ...>
  <div class="rf-recipe__meta" data-name="meta" data-section="header">
    {{!-- copy-paste all the meta items from the default... --}}
  </div>
  <div class="rf-recipe__content" data-name="content">{{> content}}</div>
  <div class="rf-recipe__footer">
    <span class="rf-recipe__badge" data-name="badge" ...>{{meta "difficulty"}}</span>
  </div>
</article>
```

The TypeScript config is precise but relational — you have to mentally reconstruct the spatial result. The `.rune` template is spatial — you see the layout. Handlebars forces a complete rewrite and makes you responsible for every class and attribute.

For surgical overrides, the `.rune` template is the clear winner. The TypeScript config is reasonable too. Handlebars is the wrong tool entirely.

---

## Why Not a Traditional Template Language?

A general-purpose template language (Handlebars, Jinja2, EJS) gives complete control over the output HTML. That's both the appeal and the problem:

1. **No merge semantics.** Moving one element in Handlebars means rewriting the entire template. Template inheritance (`{% raw %}{% block %}{% endraw %}` in Jinja2, partials in Handlebars) partially addresses this, but it's notoriously fragile across nested structures. The `.rune` syntax is inherently a patch — unmentioned elements stay where they are.

2. **Manual decoration.** In Handlebars, the template author writes every BEM class, every `data-*` attribute, every section annotation. Get one wrong and CSS silently breaks, contracts fail, inspect mismatches. The `.rune` syntax writes `@badge` and the engine handles `rf-recipe__badge`, `data-name="badge"`, `data-section`, etc.

3. **No static validation.** A Handlebars template must be rendered (with all modifier variants) to know what it produces. The `.rune` syntax compiles to a `RuneConfig` that `refrakt contracts` validates statically — invalid `data-name` references are caught at build time without rendering.

4. **Wrong grain for overrides.** The `.rune` syntax operates at the level of named elements and slots — the grain of theme decisions. Handlebars operates at the level of HTML tags and attributes — the grain of rendering implementation. A theme developer thinking "move the badge to the footer" should write at the badge level, not the `<span class="...">` level.

A traditional template language could theoretically compile to `RuneConfig` — but it would need so many restrictions (no arbitrary HTML, must use `@ref` for existing elements, can't add new attributes) that it would cease to be a "traditional" template language. The `.rune` syntax starts from the constrained end and adds expressiveness only where the model supports it.

---

## Full Definition Syntax (Package Authors)

While theme overrides are pure structural body, package authors defining a new rune may want the full template. This adds optional frontmatter for data declarations:

```
---
block: recipe
density: full
sequence: numbered

mod layout: meta = "stacked"
mod prepTime: meta !silent
mod cookTime: meta !silent
mod servings: meta !silent
mod difficulty: meta = "medium"
mod ratio: meta = "1 1" !silent
mod valign: meta = "top" !silent
mod gap: meta = "default" !silent
mod collapse: meta !silent

style ratio → --split-ratio (ratioToFr)
style valign → --split-valign (resolveValign)
style gap → --split-gap (resolveGap)

section meta: header
section headline: title
section blurb: description
section media: media
media media: cover

attr data-media-position: top

edit headline: inline
edit blurb: inline
edit ingredient: inline
edit step: inline
edit media: image
---

[header]
  div.meta ?($prepTime | $cookTime | $servings | $difficulty)
    span.meta-item = $prepTime:duration "Prep:" ?$prepTime {temporal, primary}
    span.meta-item = $cookTime:duration "Cook:" ?$cookTime {temporal, primary}
    span.meta-item = $servings "Serves:" ?$servings {quantity, primary}
    span.badge = $difficulty ?$difficulty {category, primary, sentiment: easy→positive medium→neutral hard→caution}

(content)
```

### Structural annotation breakdown

`span.meta-item = $prepTime:duration "Prep:" ?$prepTime {temporal, primary}`

| Part | Meaning |
|------|---------|
| `span` | HTML tag |
| `.meta-item` | `ref` → sets `data-name="meta-item"` |
| `= $prepTime` | `metaText: 'prepTime'` (text content from modifier) |
| `:duration` | `transform: 'duration'` |
| `"Prep:"` | `label: 'Prep:'` |
| `?$prepTime` | `condition: 'prepTime'` (only render if truthy) |
| `{temporal, primary}` | `metaType: 'temporal', metaRank: 'primary'` |
| `sentiment: easy→positive ...` | `sentimentMap` entries |

### Frontmatter declarations

```yaml
block: hint                              # → block: 'hint'
density: compact                         # → defaultDensity: 'compact'
width: full                              # → defaultWidth: 'full'

# Modifiers
mod hintType: meta = "note"              # → modifiers: { hintType: { source: 'meta', default: 'note' } }
mod ratio: meta = "1 1" !silent          # → { source: 'meta', default: '1 1', noBemClass: true }

# Value mapping (SPEC-033 Feature 2)
mod status: meta = "planned"
  map → data-checked:                    # → mapTarget: 'data-checked'
    complete: checked                    # → valueMap entries
    active: active

# Context modifiers
context hero → in-hero                   # → contextModifiers: { 'hero': 'in-hero' }

# Density context (SPEC-033 Feature 4)
childDensity: compact                    # → childDensity: 'compact'

# Styles
style ratio → --split-ratio (ratioToFr)  # → styles: { ratio: { prop: '...', transform: ratioToFr } }

# Section anatomy and media slots
section headline: title                  # → sections: { headline: 'title' }
media media: cover                       # → mediaSlots: { media: 'cover' }

# Edit hints
edit headline: inline                    # → editHints: { headline: 'inline' }

# Sequence
sequence: numbered                       # → sequence: 'numbered'

# Root attributes
attr data-media-position: top            # → rootAttributes: { ... }
```

### Recommendation

**Full-definition templates should remain optional.** Package authors can use TypeScript configs (the current approach) or `.rune` files — whichever they prefer. The template language earns its place through overrides, not through redefining what TypeScript already does well.

The frontmatter is a mechanical transliteration of `RuneConfig` fields. Whether that's better or worse than TypeScript is a matter of taste. The structural body is where the template genuinely shines — the tree is visible. A hybrid approach (TypeScript for data declarations, `.rune` for structural body only) may be the best of both worlds.

---

## Compilation Model

```
.rune file
    │
    ├─ frontmatter (if present) ──→ parse declarations ──→ RuneConfig fields
    │                                                       (modifiers, styles, sections, etc.)
    │
    └─ structural body ──→ parse indented tree ──→ RuneConfig fields
                                                    (slots, structure, projection, contentWrapper)
    │
    └─ merge both ──→ complete RuneConfig object ──→ engine
```

For theme overrides (no frontmatter), only the structural body compiles — producing a partial `RuneConfig` that `mergeThemeConfig` applies on top of the package default.

The compiler is stateless — each `.rune` file compiles independently. The compiler needs access to the base `RuneConfig` for the target rune so it can resolve implicit semantics (patch: unmentioned elements stay in their default positions).

---

## Open Questions

1. **Transform functions.** The frontmatter references functions like `ratioToFr` by name. These are TypeScript functions that can't live in a template. Options: (a) a standard library of named transforms the compiler resolves, (b) keep transforms in a companion TypeScript file, (c) limit template styles to simple `prop: value` mappings. Since full-definition templates are the minority case, option (b) is pragmatic — the `.ts` file handles data concerns, the `.rune` file handles spatial concerns.

2. **`postTransform` coexistence.** A rune needing both a template and an escape hatch would keep `postTransform` in its TypeScript config. The template handles declarative structure; the `.ts` file handles imperative logic. No mixing.

3. **File format vs. API.** Both — `.rune` files for theme developers, `compileTemplate(string)` for programmatic use.

4. **Implicit vs. explicit content.** When a theme override mentions only some elements, what happens to the rest? Current design: unmentioned elements stay in their default positions. This is the "patch" semantic — you specify what moves, not what stays. The compiler diffs against the base config's structure to determine what changed.

5. **Hybrid authoring.** Should a TypeScript config be able to embed a structural template string instead of declaring `slots` + `projection` + `structure` separately? E.g.:

   ```ts
   Recipe: {
     ...baseRecipeConfig,
     template: `
       [header]
         @meta
       (content)
       [footer]
         @badge
     `,
   }
   ```

   This would let TypeScript-native package authors use spatial syntax for structure while keeping data declarations in code.

---

## Decision Criteria

This exploration should be revisited and promoted to an implementation spec when **two or more** of the following are true:

1. **Volume signal.** A real theme (not a test fixture) overrides structure on 10+ runes and the author reports the TypeScript config as painful
2. **Error signal.** Theme developers consistently produce invalid `projection` configs (wrong `data-name` references, incorrect `into` targets) that a spatial syntax would prevent
3. **Onboarding signal.** New theme contributors take significantly longer to understand `projection.relocate` + `slots` than the spatial concept those features represent
4. **Ecosystem signal.** Multiple community themes emerge and structural override patterns stabilize enough to validate the syntax design

Until then, the TypeScript config override path is the supported approach. This spec is preserved as a ready-to-build design if the need arises.

---

## References

- SPEC-033 — Structure Slots and Declarative Flexibility (the model this syntax compiles to)

{% /spec %}
