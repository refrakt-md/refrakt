{% spec id="SPEC-002" status="accepted" tags="pipeline, content" %}

# Cross-Page Pipeline — Specification

> Build pipeline phases, entity registry, content aggregation, post-processing hooks
> Community Runes Specification, Storytelling Runes Specification

---

## Problem

Rune transforms operate on a single page's AST. They parse Markdoc, apply the transform, and produce a renderable tree — all within the scope of one file. This works for self-contained runes like `hint`, `figure`, or `budget`.

But many runes need to know about content on other pages:

- `breadcrumb` needs the site's page hierarchy to generate a navigation path
- `nav` needs to resolve page slugs to titles and URLs
- `bond` (storytelling) needs all bonds across the project to build a relationship map
- `glossary` (learning) needs all `concept` definitions to auto-link terms site-wide
- `prerequisite` (learning) needs all lesson dependencies to build a learning path graph
- Storytelling cross-links need to resolve character/realm/faction names to page URLs

Without a shared mechanism, each rune that needs cross-page awareness would reinvent its own solution — scanning files, building indexes, injecting links. These solutions wouldn't interoperate, and community packages would hit the same wall independently.

The cross-page pipeline provides a structured build-time mechanism for runes and packages to register entities, query content across pages, and post-process pages with site-wide knowledge.

---

## Design Principles

**Per-page transforms stay simple.** The rune transform itself never reaches outside its own page. Cross-page intelligence is layered on top through pipeline hooks, not baked into the transform.

**Packages opt in.** Not every package needs cross-page awareness. Packages that do register pipeline hooks alongside their rune transforms. Packages that don't are unaffected — the pipeline runs but has nothing to do for them.

**Shared infrastructure, not shared logic.** The pipeline provides the registry, the aggregation mechanism, and the post-processing hooks. What each package does with them is its own concern. The glossary auto-linker and the storytelling cross-linker use the same pipeline but implement different logic.

**Build-time only.** Cross-page processing happens during the build, not at runtime. The output is static — all references are resolved, all links are injected, all indexes are built before the site is published. There is no client-side cross-page resolution.

**Deterministic ordering.** Pipeline phases run in a defined order. Within each phase, packages run in registration order. The output is reproducible — the same content always produces the same build.

---

## Pipeline Phases

```
Phase 1: Parse
  ↓ All pages parsed, rune transforms applied (per-page, no cross-page awareness)
Phase 2: Register
  ↓ Packages scan transformed pages, register named entities in the site-wide registry
Phase 3: Aggregate
  ↓ Packages build cross-page indexes, graphs, and collections from the registry
Phase 4: Post-process
  ↓ Packages enrich pages with cross-page knowledge (link injection, reference resolution)
Phase 5: Render
  ↓ Identity transform and final rendering (per-page, but with enriched content)
```

### Phase 1: Parse

Standard per-page processing. Each Markdoc file is parsed, rune transforms are applied, and the page produces a transformed AST. This is the existing pipeline — no changes.

At the end of Phase 1, every page has a transformed AST with all runes resolved to their renderable structure. But cross-page references are unresolved — a `breadcrumb` rune knows it needs the page hierarchy but doesn't have it yet. A `bond` rune has its `from` and `to` attributes but doesn't know what pages those entities live on.

### Phase 2: Register

Packages scan the transformed pages and register named entities in a site-wide **entity registry**. Each entity has a type, a name, a source page, and optional metadata.

```typescript
interface EntityRegistration {
  type: string;        // e.g. 'character', 'term', 'page', 'bond', 'lesson'
  name: string;        // e.g. 'Veshra', 'polymorphism', 'Getting Started'
  page: string;        // source page slug: '/cast/veshra/'
  package: string;     // registering package: 'storytelling', 'learning', 'core'
  meta?: Record<string, unknown>;  // additional data: { role: 'antagonist', class: 'Warlock' }
}
```

Packages provide a `register` hook that receives a transformed page and returns entities found on that page:

```typescript
pipeline: {
  register: (page: TransformedPage): EntityRegistration[] => {
    const entities: EntityRegistration[] = [];
    
    // Register the page itself
    entities.push({
      type: 'page',
      name: page.title,
      page: page.slug,
      package: 'core',
      meta: { 
        parent: page.parent,
        order: page.order,
      }
    });
    
    // Register rune-specific entities
    for (const rune of page.runes) {
      if (rune.type === 'character') {
        entities.push({
          type: 'character',
          name: rune.attributes.name,
          page: page.slug,
          package: 'storytelling',
          meta: { role: rune.attributes.role }
        });
      }
    }
    
    return entities;
  }
}
```

**Core registers pages automatically.** Every page is registered as a `page` entity with its title, slug, parent, and order. This is how `breadcrumb`, `nav`, and `toc` get the site hierarchy — they don't need package-specific hooks for basic page awareness.

**Multiple packages can register entities from the same page.** A page containing both storytelling and learning runes will have entities registered by both packages. The registry collects them all.

### Phase 3: Aggregate

Packages build cross-page data structures from the full entity registry. This is where indexes, graphs, and collections are constructed.

```typescript
pipeline: {
  aggregate: (registry: EntityRegistry): AggregatedData => {
    return {
      // Build a glossary index from all term entities
      'glossary-index': registry
        .filter(e => e.type === 'term')
        .reduce((index, entity) => {
          index[entity.name.toLowerCase()] = {
            definition: entity.meta.definition,
            page: entity.page,
          };
          return index;
        }, {}),
      
      // Build a prerequisite dependency graph
      'prerequisite-graph': buildDependencyGraph(
        registry.filter(e => e.type === 'lesson')
      ),
    };
  }
}
```

Aggregated data is keyed by name and scoped to the package. Each package's aggregated data is available to that package's post-processing hooks and to the rendering phase.

**Core aggregates page hierarchy.** The core pipeline automatically builds the page tree, breadcrumb paths, and sibling/parent/child relationships from the registered page entities. This is available to all packages and runes during post-processing and rendering.

**Aggregation can detect problems.** A prerequisite graph with cycles is an error. An orphaned bond (referencing a character that doesn't exist) is a warning. Aggregation is the right place to run these cross-page validations because it has the full picture.

```typescript
aggregate: (registry: EntityRegistry): AggregatedData => {
  const graph = buildDependencyGraph(registry.filter(e => e.type === 'lesson'));
  
  // Detect cycles
  const cycles = findCycles(graph);
  if (cycles.length > 0) {
    warn(`Prerequisite cycles detected: ${cycles.map(c => c.join(' → ')).join(', ')}`);
  }
  
  return { 'prerequisite-graph': graph };
}
```

### Phase 4: Post-process

Packages modify transformed pages using cross-page knowledge. This is where link injection, reference resolution, and content enrichment happen.

```typescript
pipeline: {
  postProcess: (
    page: TransformedPage,
    aggregated: AggregatedData,
    registry: EntityRegistry
  ): TransformedPage => {
    // Auto-link glossary terms in page content
    return autoLinkTerms(page, aggregated['glossary-index']);
  }
}
```

Post-processing receives the transformed page, the package's aggregated data, and read-only access to the full entity registry. It returns a modified page.

**Post-processing is ordered.** Packages run in registration order. If the storytelling package's cross-linker and the learning package's term auto-linker both want to process the same text, the order is deterministic. A term that's also a character name gets linked by whichever package runs first.

**Post-processing can inject content.** A `breadcrumb` rune produces a placeholder during Phase 1 (it knows it's a breadcrumb but can't resolve the path yet). During Phase 4, the core post-processor replaces the placeholder with the resolved breadcrumb path from the page hierarchy.

**Post-processing can add warnings.** If a storytelling cross-link references a character that doesn't exist in the registry, the post-processor can emit a build warning rather than silently failing.

### Phase 5: Render

Standard per-page rendering. The identity transform runs on the enriched AST, producing final HTML with BEM classes. This is the existing rendering pipeline — no changes, but operating on pages that now have all cross-page references resolved.

---

## Entity Registry

The entity registry is the central data structure that enables cross-page awareness. It's a flat collection of entities with query methods.

```typescript
interface EntityRegistry {
  // All registered entities
  all(): EntityRegistration[];
  
  // Filter by type
  ofType(type: string): EntityRegistration[];
  
  // Filter by package
  fromPackage(pkg: string): EntityRegistration[];
  
  // Find specific entity
  find(type: string, name: string): EntityRegistration | null;
  
  // Check existence
  exists(type: string, name: string): boolean;
  
  // Get all entities on a specific page
  onPage(slug: string): EntityRegistration[];
  
  // Get all entity types registered
  types(): string[];
}
```

### Core Entity Types

The core pipeline registers these entity types automatically for every project:

| Type | Source | Purpose |
|---|---|---|
| `page` | Every page in the project | Page hierarchy, breadcrumbs, navigation, toc |
| `heading` | Every heading on every page | Site-wide toc, deep linking, search indexing |
| `anchor` | Every named anchor on every page | Cross-page deep link resolution |

These are always available in the registry regardless of which packages are installed.

### Package Entity Types

Each package registers its own entity types. Examples:

| Package | Entity types | Purpose |
|---|---|---|
| `@refrakt/storytelling` | `character`, `realm`, `faction`, `lore`, `bond` | Cross-links, relationship maps |
| `@refrakt/learning` | `term`, `lesson`, `prerequisite` | Glossary auto-linking, dependency graphs |
| `@refrakt/business` | `person`, `organization` | Team cross-references |
| `@refrakt/places` | `event`, `location` | Map aggregation, event calendars |
| `@refrakt-community/dnd-5e` | `item`, `spell`, `creature` | Inline reference cards, compendium indexes |

Community packages register their own entity types using the same mechanism. A D&D 5e package registers items and spells so that `{% item name="Resonance Staff" /%}` on one page can link to the full item card on another page.

---

## Cross-Page Patterns

### Pattern 1: Reference Resolution

**Need:** A rune on page A references an entity on page B by name. At build time, resolve the name to a URL.

**Examples:** Storytelling cross-links (`**Veshra**` → `/cast/veshra/`), inline rune references (`{% spell name="Fireball" /%}` → link to spell page), prerequisite links.

**Implementation:**

```typescript
// Phase 2: Register all characters
register: (page) => {
  return page.runes
    .filter(r => r.type === 'character')
    .map(r => ({
      type: 'character',
      name: r.attributes.name,
      page: page.slug,
      package: 'storytelling',
    }));
}

// Phase 4: Resolve bold text to character links
postProcess: (page, aggregated, registry) => {
  return walkAST(page.ast, (node) => {
    if (node.type === 'strong') {
      const name = textContent(node);
      const entity = registry.find('character', name);
      if (entity && entity.page !== page.slug) {
        return wrapInLink(node, entity.page);
      }
    }
    return node;
  });
}
```

### Pattern 2: Content Aggregation

**Need:** A rune on page A displays a collection of entities from pages B, C, and D.

**Examples:** Glossary (all term definitions), relationship map (all bonds), site-wide toc (all pages), event calendar (all events).

**Implementation:**

```typescript
// Phase 3: Build glossary index from all terms
aggregate: (registry) => {
  const terms = registry.ofType('term');
  return {
    'glossary-index': terms.map(t => ({
      term: t.name,
      definition: t.meta.definition,
      page: t.page,
    })).sort((a, b) => a.term.localeCompare(b.term)),
  };
}

// Phase 4: Inject glossary content into glossary pages
postProcess: (page, aggregated) => {
  return walkAST(page.ast, (node) => {
    if (node.type === 'rune' && node.runeType === 'glossary') {
      return buildGlossaryContent(node, aggregated['glossary-index']);
    }
    return node;
  });
}
```

### Pattern 3: Content Injection

**Need:** Content is injected into a page without explicit authoring. The author doesn't add a link or reference — the build system recognises a term and adds the link automatically.

**Examples:** Glossary term auto-linking, legal clause cross-reference validation.

**Implementation:**

```typescript
// Phase 4: Auto-link terms in all text content
postProcess: (page, aggregated) => {
  const glossary = aggregated['glossary-index'];
  
  return walkAST(page.ast, (node) => {
    if (node.type === 'text') {
      return autoLinkTermsInText(node, glossary, {
        // Don't auto-link on the term's own definition page
        excludePage: page.slug,
        // Only link first occurrence per page
        firstOccurrenceOnly: true,
        // Don't link inside headings or code
        excludeParents: ['heading', 'code', 'codegroup'],
      });
    }
    return node;
  });
}
```

### Pattern 4: Placeholder Resolution

**Need:** A rune produces a placeholder during Phase 1 because it doesn't have enough information yet. The placeholder is resolved in Phase 4 when cross-page data is available.

**Examples:** Breadcrumb (needs page hierarchy), nav (needs page titles), prerequisite (needs dependency graph for visualisation).

**Implementation:**

```typescript
// Phase 1 (rune transform): Produce placeholder
transform: (node) => {
  return {
    type: 'breadcrumb-placeholder',
    runeType: 'breadcrumb',
    attributes: node.attributes,
    // Marked for resolution in Phase 4
    needsCrossPage: true,
  };
}

// Phase 4 (core post-processor): Resolve placeholder
postProcess: (page, aggregated) => {
  const pageTree = aggregated['page-tree'];
  
  return walkAST(page.ast, (node) => {
    if (node.type === 'breadcrumb-placeholder') {
      const path = getAncestorPath(pageTree, page.slug);
      return buildBreadcrumbAST(path, node.attributes);
    }
    return node;
  });
}
```

### Pattern 5: Context Propagation

**Need:** Runes on one page establish a context that other runes consume — on the same page or across the project.

**Primary example:** Design runes (`palette`, `typography`, `spacing` from `@refrakt/design`) define design tokens. `sandbox` runes (core) need those tokens injected as CSS custom properties inside their iframe so that previewed components reflect the actual design system. When the author changes a colour in a `palette` rune, every sandbox on the site should update.

**How it works:** Design runes are both visible content (a rendered palette swatch, a typography specimen) and context providers (they establish token values that other runes can consume). The sandbox rune is a context consumer — it renders an isolated iframe but needs the design context injected into it.

This is distinct from reference resolution (no link to follow), content aggregation (no collection to build), and content injection (no text to annotate). It's data flowing from one rune type to another through the registry.

**Implementation:**

```typescript
// Phase 2: Design package registers tokens as entities
register: (page) => {
  const tokens: EntityRegistration[] = [];
  
  for (const rune of page.runes) {
    if (rune.type === 'palette') {
      // Extract colour tokens from palette rune
      for (const colour of rune.children) {
        tokens.push({
          type: 'design-token',
          name: `--color-${colour.name}`,
          page: page.slug,
          package: 'design',
          meta: { value: colour.hex, category: 'color' }
        });
      }
    }
    if (rune.type === 'typography') {
      for (const font of rune.children) {
        tokens.push({
          type: 'design-token',
          name: `--font-${font.role}`,
          page: page.slug,
          package: 'design',
          meta: { value: font.family, category: 'typography', weights: font.weights }
        });
      }
    }
    if (rune.type === 'spacing') {
      for (const token of rune.children) {
        tokens.push({
          type: 'design-token',
          name: `--spacing-${token.name}`,
          page: page.slug,
          package: 'design',
          meta: { value: token.value, category: 'spacing' }
        });
      }
    }
  }
  
  return tokens;
}

// Phase 3: Aggregate all tokens into a design context
aggregate: (registry) => {
  const tokens = registry.ofType('design-token');
  
  // Detect conflicts: same token name, different values, different pages
  const byName = groupBy(tokens, t => t.name);
  for (const [name, definitions] of Object.entries(byName)) {
    if (definitions.length > 1) {
      const values = new Set(definitions.map(d => d.meta.value));
      if (values.size > 1) {
        warn(`Design token "${name}" defined with conflicting values on ${
          definitions.map(d => d.page).join(', ')
        }`);
      }
    }
  }
  
  // Build the token stylesheet
  return {
    'design-context': tokens.reduce((map, t) => {
      map[t.name] = t.meta.value;
      return map;
    }, {}),
    'design-context-css': generateTokenStylesheet(tokens),
  };
}

// Phase 4: Core post-processor injects design context into sandbox runes
corePostProcess: (page, aggregated, registry) => {
  const designCSS = aggregated['design']?.['design-context-css'];
  if (!designCSS) return page;
  
  return walkAST(page.ast, (node) => {
    if (node.runeType === 'sandbox') {
      // Inject design tokens as a <style> block prepended to the sandbox content
      return injectSandboxStylesheet(node, designCSS);
    }
    return node;
  });
}
```

**Generated stylesheet injected into sandbox iframes:**

```css
/* Auto-generated from design runes — injected into sandbox iframe */
:root {
  /* From palette rune on /design/colours/ */
  --color-primary: #2563eb;
  --color-secondary: #7c3aed;
  --color-neutral-100: #f5f5f5;
  --color-neutral-900: #171717;
  
  /* From typography rune on /design/typography/ */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Source Serif Pro', serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* From spacing rune on /design/tokens/ */
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --spacing-radius-md: 0.375rem;
}
```

**Why this matters:** Without context propagation, the sandbox is disconnected from the design system it's supposed to demonstrate. The author defines `--color-primary: #2563eb` in a palette rune, then writes a sandbox component that uses `var(--color-primary)` — but the iframe has no knowledge of that variable. The component renders with fallback values or broken styles.

With context propagation, the design runes are the single source of truth. Change the palette, and every sandbox across the site updates automatically. The design system documentation is live — not a static screenshot but an actual rendering with the actual tokens.

**Scoped design contexts:** A project may contain multiple design systems — a multi-brand agency site, a design tool showcase, a white-label platform documenting client themes. Design tokens must not leak across contexts.

Design runes accept a `scope` attribute that names the context they contribute to. Consumer runes (`sandbox`, `preview`) accept a `context` attribute that names the context they consume.

````markdoc
{% palette scope="brand-a" %}
- primary: #2563eb
- secondary: #7c3aed
{% /palette %}

{% palette scope="brand-b" %}
- primary: #dc2626
- secondary: #ea580c
{% /palette %}

{% sandbox context="brand-a" %}
<button style="background: var(--color-primary)">Acme Corp</button>
{% /sandbox %}

{% sandbox context="brand-b" %}
<button style="background: var(--color-primary)">FireBrand</button>
{% /sandbox %}
````

When `scope` is omitted, tokens go into the **default context** — the project-wide design system. When `context` is omitted on a consumer, it consumes the default. The simple case (one design system per project) requires zero new attributes.

**Context inheritance:** A scoped context can extend another, inheriting its tokens and overriding selectively:

````markdoc
{% palette scope="brand-b" extends="brand-a" %}
- primary: #dc2626
{% /palette %}
````

Brand B inherits Brand A's full token set (typography, spacing, secondary colours), overriding only `--color-primary`. The pipeline merges parent → child, child wins on conflict.

**Registry representation:** Scoped tokens include their scope in the entity registration:

```typescript
register: (page) => {
  for (const rune of page.runes) {
    if (rune.type === 'palette') {
      const scope = rune.attributes.scope || 'default';
      const extends_ = rune.attributes.extends || null;
      
      for (const colour of rune.children) {
        tokens.push({
          type: 'design-token',
          name: `--color-${colour.name}`,
          page: page.slug,
          package: 'design',
          meta: { 
            value: colour.hex, 
            category: 'color',
            scope,
            extends: extends_,
          }
        });
      }
    }
  }
}
```

**Aggregation builds per-scope stylesheets:**

```typescript
aggregate: (registry) => {
  const tokens = registry.ofType('design-token');
  const scopes = groupBy(tokens, t => t.meta.scope);
  
  // Resolve inheritance chains
  const resolved: Record<string, Record<string, string>> = {};
  for (const [scope, scopeTokens] of Object.entries(scopes)) {
    const extends_ = scopeTokens[0]?.meta.extends;
    const parentTokens = extends_ ? resolved[extends_] || {} : {};
    
    // Parent tokens as base, scope tokens override
    resolved[scope] = {
      ...parentTokens,
      ...scopeTokens.reduce((map, t) => {
        map[t.name] = t.meta.value;
        return map;
      }, {}),
    };
  }
  
  // Detect conflicts within a scope
  for (const [scope, scopeTokens] of Object.entries(scopes)) {
    const byName = groupBy(scopeTokens, t => t.name);
    for (const [name, definitions] of Object.entries(byName)) {
      if (definitions.length > 1) {
        const values = new Set(definitions.map(d => d.meta.value));
        if (values.size > 1) {
          warn(`Design token "${name}" in scope "${scope}" defined with conflicting values on ${
            definitions.map(d => d.page).join(', ')
          }`);
        }
      }
    }
  }
  
  return {
    'design-contexts': Object.fromEntries(
      Object.entries(resolved).map(([scope, tokens]) => [
        scope,
        { tokens, css: generateTokenStylesheet(tokens) }
      ])
    ),
  };
}
```

**Post-processing matches sandbox to scope:**

```typescript
corePostProcess: (page, aggregated, registry) => {
  const contexts = aggregated['design']?.['design-contexts'];
  if (!contexts) return page;
  
  return walkAST(page.ast, (node) => {
    if (node.runeType === 'sandbox' || node.runeType === 'preview') {
      const scope = node.attributes.context || 'default';
      const ctx = contexts[scope];
      if (ctx) {
        return injectSandboxStylesheet(node, ctx.css);
      } else {
        warn(`Sandbox on ${page.slug} references unknown design context "${scope}"`);
      }
    }
    return node;
  });
}
```

**Generated stylesheet for Brand A sandbox:**

```css
:root {
  --color-primary: #2563eb;
  --color-secondary: #7c3aed;
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Source Serif Pro', serif;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
}
```

**Generated stylesheet for Brand B sandbox (inherits Brand A, overrides primary):**

```css
:root {
  --color-primary: #dc2626;        /* overridden */
  --color-secondary: #7c3aed;      /* inherited from brand-a */
  --font-heading: 'Inter', sans-serif;  /* inherited */
  --font-body: 'Source Serif Pro', serif; /* inherited */
  --spacing-sm: 0.5rem;            /* inherited */
  --spacing-md: 1rem;              /* inherited */
}
```

**Beyond sandbox:** Context propagation could serve other consumers in the future. A `chart` rune could consume colour tokens for its series colours. Any rune that renders visual output benefits from knowing the project's design tokens — the pipeline makes that context available without each rune solving the problem independently.

---

## Validation & Warnings

The pipeline provides structured build-time validation that packages can participate in.

### Warning Levels

| Level | Meaning | Build behaviour |
|---|---|---|
| `info` | Non-actionable observation | Build succeeds, logged in verbose mode |
| `warn` | Potential problem, might be intentional | Build succeeds, shown in build output |
| `error` | Definite problem that needs fixing | Build fails |

### Core Validations

The core pipeline validates:

- **Broken page references:** A `nav` or `breadcrumb` references a page slug that doesn't exist → `error`
- **Orphaned anchors:** A cross-page deep link targets an anchor that doesn't exist → `warn`
- **Shadowed entities:** Two entities with the same type and name registered from different pages → `warn`

### Package Validations

Packages add their own validations during the aggregate phase:

```typescript
aggregate: (registry) => {
  // Storytelling: Check for orphaned bonds
  const bonds = registry.ofType('bond');
  const characters = registry.ofType('character');
  const factions = registry.ofType('faction');
  const entityNames = new Set([
    ...characters.map(c => c.name),
    ...factions.map(f => f.name),
  ]);
  
  for (const bond of bonds) {
    if (!entityNames.has(bond.meta.from)) {
      warn(`Bond references unknown entity "${bond.meta.from}" on ${bond.page}`);
    }
    if (!entityNames.has(bond.meta.to)) {
      warn(`Bond references unknown entity "${bond.meta.to}" on ${bond.page}`);
    }
  }
  
  // Learning: Check for prerequisite cycles
  const graph = buildDependencyGraph(registry.ofType('lesson'));
  const cycles = findCycles(graph);
  for (const cycle of cycles) {
    error(`Prerequisite cycle: ${cycle.join(' → ')}`);
  }
  
  return { 'bond-graph': bonds, 'prerequisite-graph': graph };
}
```

### CLI Output

```bash
$ refrakt build

  Phase 1: Parse .................. 47 pages
  Phase 2: Register .............. 156 entities
  Phase 3: Aggregate ............. 4 packages
  Phase 4: Post-process .......... 47 pages
  Phase 5: Render ................ 47 pages

  ⚠ warn  Bond references unknown entity "The Anchored" on /story/bonds/
  ⚠ warn  Glossary term "middleware" defined on two pages: /glossary/, /concepts/api/

  ✓ Build complete (0 errors, 2 warnings)
```

---

## Performance Considerations

### Incremental Builds

The full five-phase pipeline runs on every build. For large sites, this can be slow. Incremental builds optimise by tracking which pages have changed and which entities are affected.

**Phase 1 (Parse):** Only re-parse changed files. Cache transformed ASTs for unchanged pages.

**Phase 2 (Register):** Only re-register entities from changed pages. Merge with cached entities from unchanged pages.

**Phase 3 (Aggregate):** Must re-run fully if any entity changed — aggregated data depends on the complete registry. But aggregation is typically fast (it's operating on the registry, not on page content).

**Phase 4 (Post-process):** Only re-process pages whose content changed OR whose cross-page dependencies changed. If a character was renamed, all pages that reference that character need re-processing, even if they themselves didn't change.

**Phase 5 (Render):** Only re-render pages whose enriched AST changed.

Dependency tracking between phases is the key optimisation. The pipeline needs to know: "if entity X changes, which pages need re-processing?" This is derivable from the post-processing hooks — each hook declares what entity types it reads, so the pipeline can build a dependency graph.

### Registry Size

For most projects, the registry is small — hundreds to low thousands of entities. A 200-page storytelling wiki with characters, realms, factions, lore entries, and bonds might have 500 entities. This fits comfortably in memory and queries are fast.

For very large projects (10,000+ pages), the registry may need indexing by type and name. The query interface (`ofType`, `find`, `exists`) should be backed by indexed lookups rather than linear scans.

---

## Package Integration

### Hook Registration

Packages register pipeline hooks alongside their rune transforms:

```typescript
export const storytelling: RunePackage = {
  name: 'storytelling',
  runes: { /* ... rune transforms ... */ },
  theme: themeConfig,
  behaviors,
  
  pipeline: {
    register: (page: TransformedPage): EntityRegistration[] => {
      // Scan for storytelling runes, return named entities
    },
    aggregate: (registry: EntityRegistry): AggregatedData => {
      // Build relationship graph, cross-link index
    },
    postProcess: (
      page: TransformedPage,
      aggregated: AggregatedData,
      registry: EntityRegistry
    ): TransformedPage => {
      // Resolve bold-text cross-links, inject relationship data
    },
  }
};
```

All three hooks are optional. A package can register entities without aggregating, or post-process without registering. The pipeline calls whatever hooks are provided.

### Hook Execution Order

1. **Register:** All packages' `register` hooks run across all pages. Order: core first, then official packages in declaration order, then community packages in declaration order.
2. **Aggregate:** All packages' `aggregate` hooks run once with the complete registry. Same ordering.
3. **Post-process:** All packages' `postProcess` hooks run across all pages. Same ordering. For each page, all packages run in order before moving to the next page.

This means core's post-processing (breadcrumb resolution, nav resolution) runs before any package's post-processing. A package can rely on core references being resolved by the time its hook runs.

### Interoperability

Packages can read (but not write) each other's registered entities. The registry is shared and read-only during aggregation and post-processing. A community D&D package can see the storytelling package's registered characters — this is how a `{% stat-block %}` on one page can reference a `{% character %}` on another page.

Aggregated data is package-scoped. A package's `aggregate` output is only available to that package's `postProcess` hook. If two packages need to share aggregated data, they share it through the registry — one package registers derived entities that the other can read.

---

## Core Pipeline Hooks

The core provides pipeline hooks that run before any package hooks:

### Core Register

Registers every page with its metadata:

```typescript
coreRegister: (page: TransformedPage): EntityRegistration[] => [
  {
    type: 'page',
    name: page.title,
    page: page.slug,
    package: 'core',
    meta: {
      parent: page.parent,
      order: page.order,
      headings: page.headings,  // for site-wide toc
      description: page.description,
    }
  },
  // Register all headings as anchors for deep linking
  ...page.headings.map(h => ({
    type: 'heading',
    name: h.text,
    page: page.slug,
    package: 'core',
    meta: { level: h.level, id: h.id }
  })),
]
```

### Core Aggregate

Builds the page tree and breadcrumb paths:

```typescript
coreAggregate: (registry: EntityRegistry): AggregatedData => {
  const pages = registry.ofType('page');
  return {
    'page-tree': buildPageTree(pages),
    'breadcrumb-paths': buildBreadcrumbPaths(pages),
    'heading-index': buildHeadingIndex(registry.ofType('heading')),
  };
}
```

### Core Post-process

Resolves breadcrumb and nav placeholders:

```typescript
corePostProcess: (page, aggregated, registry) => {
  return walkAST(page.ast, (node) => {
    if (node.type === 'breadcrumb-placeholder') {
      return resolveBreadcrumb(node, aggregated['breadcrumb-paths'], page.slug);
    }
    if (node.type === 'nav-placeholder') {
      return resolveNav(node, aggregated['page-tree'], registry);
    }
    if (node.type === 'toc-placeholder' && node.attributes.scope === 'site') {
      return resolveSiteToc(node, aggregated['heading-index']);
    }
    return node;
  });
}
```

---

## Relationship to Community Rune Spec

This pipeline spec extends the community rune package definition. The `pipeline` field in `RunePackage` is optional — packages without cross-page needs don't provide it. The pipeline phases are a build-system concern, not a rendering concern — they run during `refrakt build`, not during theme development or inspector auditing.

The inspector operates on individual pages and does not invoke the cross-page pipeline. Fixtures are self-contained. Theme developers don't need to think about cross-page resolution — they style the final rendered output, which has all cross-page references already resolved.

Community packages that register pipeline hooks should document their entity types and post-processing behaviour in their README. Theme developers styling a storytelling project should know that bold character names become links after the pipeline runs — the theme needs to style those links, even though they don't appear in the fixture.

---

## Editor Integration

The refrakt.md site editor uses a split view per page — Markdoc source on the left, rendered preview on the right. The entire transform pipeline runs client-side: parse → rune transform → identity transform → render. Changes are reflected immediately as the author types.

The cross-page pipeline introduces a tension: the preview needs data from other pages to render cross-page runes correctly, but the editor only has the current page loaded. The solution is a background entity registry that the client-side transform queries during an additional post-processing step.

### Editor Transform Pipeline

```
Current:  parse → rune transform → identity transform → render
New:      parse → rune transform → post-process(registry) → identity transform → render
```

The one additional step — `post-process(registry)` — is where cross-page references resolve. If the registry isn't ready yet, post-processing returns the page unchanged and cross-page runes render as interactive placeholders. If the registry is available, references resolve and the preview shows the final result.

### Background Registry

On project open, a web worker scans all project files and builds the entity registry in the background. The worker doesn't run the full transform pipeline — it performs a lightweight pass that finds rune tags, reads their name/type attributes, and extracts entity registrations. This is fast: a 200-page project with 500 entities scans in under a second and produces a few KB of JSON.

**Lifecycle:**

1. **Project open:** Editor loads, current page renders immediately with placeholders for cross-page runes. Web worker starts scanning project files in the background.
2. **Registry ready:** Worker completes initial scan, sends the registry to the main thread. Current page re-renders with resolved cross-page references. Placeholders are replaced with breadcrumbs, links, glossary terms, design tokens.
3. **Page edit:** Current page re-parses and re-renders immediately (client-side, per-page). If the edit changes registered entities (renamed a character, added a term definition), the registry is updated and other visible tabs are notified.
4. **File save:** Registry update for this page is committed. Other pages that depend on changed entities are flagged as needing re-render, but only re-render if currently visible in a tab.
5. **File created/deleted:** Worker registers or deregisters all entities from that file. Registry updates cascade to dependent pages.

**What the worker scans for:**

| Entity source | What the worker extracts |
|---|---|
| Page metadata | Title, slug, parent, order (from frontmatter and file path) |
| `character`, `realm`, `faction`, `lore` runes | Entity name, type, page slug |
| `bond` runes | From/to entity names, bond type |
| `concept` runes | Term name, definition text |
| `prerequisite` runes | Source and target lesson slugs |
| `palette`, `typography`, `spacing` runes | Design token names and values, scope |
| Heading elements | Heading text, level, generated ID (for deep linking) |

The worker produces `EntityRegistration[]` — the same data structure the build-time pipeline uses. The editor's post-processing hooks are identical to the build-time hooks, operating on the same registry interface. The editor and the build produce the same output.

### Placeholder Rendering

Before the registry is available (or when a reference can't be resolved), cross-page runes render as visually distinct placeholders:

| Rune | Placeholder rendering |
|---|---|
| `breadcrumb` | Path segments with "..." for unresolved parents |
| `nav` | Page slugs shown as-is without resolved titles |
| Bold entity names | Bold text without link, subtle dashed underline |
| `glossary` | Term list without cross-page entries, "loading..." indicator |
| `prerequisite` | Dependency arrow with unresolved target shown as slug |
| `sandbox` (cross-page design context) | Renders without injected design tokens, uses fallback values |

Placeholders are styled with a subtle visual indicator — a dashed border or muted colour — so the author knows these elements will resolve at build time. The indicator disappears once the registry resolves the reference.

### Registry-Powered Autocomplete

The entity registry enables intelligent autocomplete throughout the editor. Since the registry contains every named entity across the project — characters, realms, terms, pages, design tokens — the editor can suggest completions as the author types.

**Entity name autocomplete in bold text:**

The author types `**Ves` and the editor suggests `Veshra` because a character entity with that name exists in the registry. Accepting the suggestion completes the bold text to `**Veshra**`, which the cross-page pipeline will resolve to a link at build time.

The autocomplete popup shows entity metadata alongside the name:

```
Veshra          character   /cast/veshra/
Vestibule       realm       /atlas/vestibule/
```

The author can see the entity type and source page, distinguishing between a character named "Veshra" and a realm named "Veshra" if both exist.

**Rune attribute autocomplete:**

When the author types `{% bond from="` the editor queries the registry for all entity names that could be bond endpoints (characters, factions) and suggests them:

```
Veshra          character
Kael            character
The Waking Choir  faction
The Anchored    faction
```

Similarly for `{% prerequisite target="` — the editor suggests lesson slugs from the registry.

**Page reference autocomplete:**

In `nav`, `prerequisite`, and any rune that accepts page slugs, the editor suggests from registered pages:

```
/cast/veshra/           Veshra — Character Profile
/atlas/somnara/         Somnara — The Sleeping City
/courses/basics/        Getting Started — Course Overview
```

**Tint preset autocomplete:**

When the author types `tint="` on a rune, the editor suggests named tints from the theme configuration:

```
warm            Earthy parchment tones
cool            Steel blue and slate
dark            Deep navy with bright accents
brand           Company brand colours
```

**Term definition awareness:**

When the author types a word that matches a registered `concept` term, the editor can show a subtle indicator (like a dotted underline in the source view) letting the author know this term will be auto-linked by the glossary pipeline. This isn't autocomplete — it's awareness. The author sees which words in their prose are "live" terms without having to remember the full glossary.

**Design token autocomplete in sandbox:**

Inside a `sandbox` rune's CSS content, when the author types `var(--`, the editor suggests design tokens from the registry:

```
--color-primary         #2563eb      (from palette on /design/tokens/)
--color-secondary       #7c3aed      (from palette on /design/tokens/)
--font-heading          Inter        (from typography on /design/tokens/)
--spacing-md            1rem         (from spacing on /design/tokens/)
```

The token value and source page are shown, so the author knows exactly what value they're referencing.

**Cross-package awareness:**

If the project has the `@refrakt/storytelling` and `@refrakt-community/dnd-5e` packages installed, autocomplete for character attributes includes both core attributes (`name`, `role`) and extended attributes (`class`, `level`, `race`, `hp`, `ac`). The popup indicates which package provides each attribute:

```
name            core            Required — character's display name
role            core            protagonist, antagonist, supporting, minor
class           dnd-5e          D&D class (Warlock, Fighter, etc.)
level           dnd-5e          Character level (1–20)
```

### Incremental Registry Updates

The registry must stay current as the author edits. Full rescans are wasteful — most edits don't change registered entities. The editor tracks which entities came from which page and only re-registers a page's entities when relevant content changes.

**What triggers re-registration:**

- A rune tag is added, removed, or renamed (the author adds a new `{% character %}`)
- A rune's `name` attribute changes (the author renames a character)
- Frontmatter title or slug changes
- A heading is added, removed, or changed (affects the heading index)

**What does NOT trigger re-registration:**

- Prose changes inside a rune (the author edits a character's backstory)
- Attribute changes other than `name` (the author changes `role="antagonist"` to `role="supporting"`)
- Changes inside a `sandbox` or `code` block
- Formatting changes (bold, italic, links within prose)

The editor can detect this efficiently by comparing the current page's rune tag list against the previously registered list. If the tags and their name attributes are unchanged, no registry update is needed.

**Aggregation re-runs:**

When the registry changes, aggregation (Phase 3) must re-run to update derived data — glossary indexes, prerequisite graphs, breadcrumb paths. Aggregation is fast since it operates on the registry (a small in-memory dataset), not on page content. Re-running aggregation after every registry change is acceptable for projects under 1,000 pages.

For very large projects, aggregation can be debounced — batch registry changes over a short window (200ms) and re-aggregate once.

### Multi-Tab Awareness

If the editor supports multiple pages open in tabs, the registry is shared across all tabs. A character renamed in Tab A updates the registry, and Tab B (which references that character) re-renders with the updated name/link.

The communication flow:

```
Tab A (editing)
  → author renames character "Veshra" to "Veshra the Elder"
  → local re-render (immediate)
  → registry update: character entity name changed
  → broadcast to other tabs

Tab B (viewing)
  → receives registry update notification
  → checks if any cross-page references on this page are affected
  → if yes: re-runs post-processing and re-renders
  → if no: does nothing
```

The dependency check is fast — each page tracks which registry entity types and names it references during post-processing. A page that references `character:Veshra` knows it needs to re-render when that entity changes. A page with no storytelling cross-links is unaffected by character renames.

---

## Future Considerations

### Streaming Builds

For very large sites, Phase 2 could stream entity registrations rather than collecting them all in memory. The registry becomes an append-only log that aggregation reads sequentially. This is an optimisation for scale, not a design change.

### Cross-Project References

Multiple refrakt.md projects might want to reference each other's entities — a documentation project linking to entities in a storytelling project. This is out of scope for now but the entity registry's type+name+page structure could extend to include a project identifier.

{% /spec %}
