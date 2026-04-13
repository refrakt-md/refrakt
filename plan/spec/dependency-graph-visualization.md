{% spec id="SPEC-039" status="draft" version="1.0" tags="plan, cli, site, visualization, graph" %}

# Dependency Graph Visualization

> Render the plan system's relationship data as visual dependency graphs — static SVG on the site, tree and box-drawing output in the CLI, with DOT export for external tools.

-----

## Problem

The plan system already builds a rich bidirectional relationship graph during the aggregate pipeline phase. Nine relationship kinds connect specs, work items, bugs, and decisions. The auto-relationships section on each entity page lists these connections as flat card groups. The `plan next` command uses dependency data to filter actionable items.

But the graph is invisible. You can see that WORK-024 depends on WORK-076 and implements SPEC-008, but you can't see the shape of the graph — which items are bottlenecks with many dependents, which specs have all their work items done, where the critical path runs through a milestone, or whether two independent work streams have an unnoticed shared dependency.

These are spatial questions. They need a spatial answer.

Other project management tools handle this differently. Jira has a dependency view but it's limited to direct links — no transitive chains. Linear has no graph view at all. GitHub Projects has no dependency visualization. Graphical project planning tools (OmniPlan, MS Project) have Gantt charts but not dependency graphs. The plan system already has richer relationship data than most trackers; it just doesn't draw it.

-----

## Design Principles

**The graph is derived, not authored.** Nobody writes graph definitions. The visualization reads the same relationship data that the auto-relationships section already uses. If you add a `{% ref %}` tag in a Dependencies section or set `source="SPEC-008"` on a work item, the graph updates automatically.

**Static output, not an interactive app.** The site rune produces an SVG embedded in the page — no client-side JS, no canvas, no pan/zoom runtime. The CLI produces text. This matches the plan system's philosophy: build-time rendering, static output, works everywhere. For large graphs that benefit from interactivity, the DOT export lets users pipe to external tools.

**Node styling encodes entity state.** Type, status, and priority are visible at a glance through shape, colour, and weight. A blocked work item looks different from a done one. A spec looks different from a bug. The graph is a status dashboard, not just a topology diagram.

**Relationship kinds have visual semantics.** Different edge styles for different relationship kinds: solid arrows for hard dependencies (depends-on, blocks), dashed arrows for implementation links (implements, informs), dotted lines for soft references (related). The visual weight of an edge reflects how much it matters for planning.

-----

## Graph Data

### Source

All data comes from `PlanAggregatedData.relationships` — a `Map<string, EntityRelationship[]>` built by the aggregate hook in `runes/plan/src/pipeline.ts`. Each `EntityRelationship` has:

- `fromId` / `fromType` — source entity
- `toId` / `toType` — target entity
- `kind` — one of 9 relationship kinds

Entity metadata (status, priority, complexity, title, milestone, sourceUrl) is available from the entity arrays in the same aggregated data.

### Relationship kinds and their graph semantics

| Kind | Edge style | Direction meaning | Planning significance |
|------|-----------|-------------------|----------------------|
| `depends-on` | Solid arrow | A depends on B (A → B) | Hard blocker: A can't start until B is done |
| `dependency-of` | (reverse of depends-on) | B is depended on by A | Same edge, opposite direction |
| `blocks` | Solid arrow, red | A blocks B (A → B) | Active blocker: A's current state prevents B |
| `blocked-by` | (reverse of blocks) | B is blocked by A | Same edge, opposite direction |
| `implements` | Dashed arrow | Work/bug implements spec/decision | Traceability: implementation links to design |
| `implemented-by` | (reverse of implements) | Spec/decision is implemented by work/bug | Same edge, opposite direction |
| `informs` | Dashed arrow, lighter | Decision informs spec | Architectural influence |
| `informed-by` | (reverse of informs) | Spec is informed by decision | Same edge, opposite direction |
| `related` | Dotted line, no arrowhead | A and B reference each other | Informational, no planning effect |

Since relationships are stored bidirectionally, each edge appears twice in the Map (once per direction). The renderer deduplicates by only drawing the canonical direction: `depends-on` not `dependency-of`, `blocks` not `blocked-by`, `implements` not `implemented-by`, `informs` not `informed-by`, `related` once (arbitrary direction).

### Edge filtering defaults

Not all relationship kinds are equally useful in a graph. The defaults:

- **Always shown:** `depends-on`, `blocks` — these are the planning-critical edges
- **Shown by default, hideable:** `implements`, `informs` — traceability links that give context
- **Hidden by default, showable:** `related` — too many edges, clutters the graph

The `show` attribute on the rune and `--show` flag on the CLI control which kinds are visible.

-----

## Node Styling

### Shape by entity type

| Type | Shape | Rationale |
|------|-------|-----------|
| `spec` | Rounded rectangle, double border | Specs are the source documents — visually heavier |
| `work` | Rounded rectangle | Standard task node |
| `bug` | Rounded rectangle with warning icon | Distinct from work items |
| `decision` | Diamond / rotated square | ADRs are decision points in the graph |
| `milestone` | Hexagon or pill | Milestones are aggregation points, not regular tasks |

### Colour by status

Uses the existing sentiment colour system from the plan package's config:

| Sentiment | Statuses | Colour |
|-----------|----------|--------|
| Positive | `done`, `fixed`, `accepted`, `complete` | Green fill |
| Caution | `review`, `confirmed`, `superseded` | Amber fill |
| Negative | `blocked`, `deprecated` | Red fill |
| Neutral | `draft`, `ready`, `in-progress`, `reported`, `proposed`, `planning` | Grey fill |

Active work (`in-progress`) gets a subtle pulsing border or heavier stroke to draw the eye to what's currently happening.

### Node content

Each node displays:

- Entity ID (e.g., `WORK-024`) — always visible
- Status badge — colour-coded
- Title — truncated to ~30 characters, full title in SVG `<title>` element (tooltip)
- Priority indicator — only for `critical` and `high` (small icon or border weight)

-----

## Layout

### Algorithm

**dagre** (`@dagrejs/dagre`, ~150KB pure JS) computes the layout. It implements the Sugiyama layered layout algorithm, which is purpose-built for directed acyclic graphs:

- Assigns nodes to horizontal layers (ranks) based on edge direction
- Minimises edge crossings within layers
- Routes edges with control points

dagre runs in Node.js at build time with no browser dependency. Layout computation for 50–200 nodes takes <500ms. The output is (x, y) coordinates per node and control points per edge, which the renderer converts to SVG.

### Direction

Default: left-to-right (`rankdir: 'LR'`). Dependencies flow left → right, so the earliest dependencies are on the left and the final deliverables on the right. Top-to-bottom (`rankdir: 'TB'`) is available as an option for tall, narrow graphs.

### Clustering

When the graph is filtered to a milestone, nodes can optionally be clustered by status. dagre supports subgraph clustering, which visually groups done/in-progress/ready items. This turns the graph into both a dependency diagram and a status board.

### Mobile responsive strategy

Left-to-right DAG layouts can easily exceed 1500px wide, making them unusable on a 375px mobile screen. The strategy varies by graph scope:

**Milestone and entity-focused graphs** — generate two SVGs at build time: one LR (desktop), one TB (mobile). Toggle with CSS:

```css
.rf-plan-graph__lr { display: block; }
.rf-plan-graph__tb { display: none; }

@media (max-width: 48rem) {
  .rf-plan-graph__lr { display: none; }
  .rf-plan-graph__tb { display: block; }
}
```

The TB layout is naturally narrower (nodes stack vertically, edges run downward) and fits mobile viewports well. Both SVGs are in the DOM; only one renders. The payload doubles but individual milestone graphs are small.

**Full project graph and dashboard critical-path** — on viewports below 48rem, hide the SVG entirely and show a fallback dependency list. This list uses the same HTML structure as the auto-relationships cards — a compact vertical listing of entities grouped by dependency chain. The graph adds value on desktop where there's spatial room; on mobile, the textual representation is more readable than a squished SVG.

```css
.rf-plan-graph__svg   { display: block; }
.rf-plan-graph__list  { display: none; }

@media (max-width: 48rem) {
  .rf-plan-graph__svg   { display: none; }
  .rf-plan-graph__list  { display: block; }
}
```

The postProcess resolver generates both the SVG and the fallback list for every `plan-graph` instance. The list is cheap — it's the same data, just rendered as nested `<ul>` elements instead of SVG geometry.

-----

## Site Rune: `plan-graph`

### Modes

**Full graph:**
```markdoc
{% plan-graph /%}
```

Renders the complete dependency graph for all plan entities. For large projects, this may be too dense — the `filter`, `type`, and `milestone` attributes narrow the scope.

**Entity-focused:**
```markdoc
{% plan-graph id="WORK-024" /%}
{% plan-graph id="WORK-024" depth=2 /%}
```

Shows a subgraph centred on one entity: its direct dependencies, its dependents, and optionally their transitive connections up to `depth` levels. This is the "show me the neighbourhood" view.

**Milestone-scoped:**
```markdoc
{% plan-graph milestone="v1.0.0" /%}
```

Shows all entities assigned to a milestone and their inter-dependencies. Entities outside the milestone that are depended on appear as ghost nodes (lighter styling, dashed border) to show external dependencies.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | String | — | Centre the graph on this entity. Omit for full/milestone graph. |
| `depth` | Number | `1` | How many hops from the centre entity to include (entity-focused mode) |
| `milestone` | String | — | Filter to entities in this milestone |
| `filter` | String | `""` | Space-separated `field:value` pairs (same syntax as backlog) |
| `type` | String | `"all"` | Entity type filter: `work`, `bug`, `spec`, `decision`, or comma-separated |
| `show` | String | `"deps,blocks,impl"` | Relationship kinds to display: `deps`, `blocks`, `impl`, `informs`, `related`, or `all` |
| `direction` | String | `"LR"` | Layout direction: `LR` (left-to-right) or `TB` (top-to-bottom) |
| `cluster` | String | — | Cluster nodes by field: `status`, `milestone`, `type` |

### Rendering

The rune produces an inline `<svg>` element with:

- `<rect>` / `<polygon>` elements for nodes, styled with BEM classes
- `<text>` elements for labels
- `<path>` elements for edges with marker arrowheads
- `<title>` elements for tooltips (entity title, status, priority)
- `<a>` wrappers on nodes linking to the entity page (when `sourceUrl` is available)

BEM structure: `.rf-plan-graph`, `.rf-plan-graph__node`, `.rf-plan-graph__node--work`, `.rf-plan-graph__node--done`, `.rf-plan-graph__edge`, `.rf-plan-graph__edge--depends`, `.rf-plan-graph__edge--blocks`, `.rf-plan-graph__label`, `.rf-plan-graph__ghost`.

#### Lumina token integration

dagre is purely a layout engine — it computes (x, y) coordinates and edge control points but produces no visual output. The SVG renderer is ours, which means complete control over styling. Since the SVG is rendered inline in the HTML (not as an external `<img>`), CSS custom properties work directly inside it.

The SVG elements reference Lumina design tokens via CSS custom properties:

```css
.rf-plan-graph__node rect {
  fill: var(--rf-color-surface);
  stroke: var(--rf-color-border);
  rx: var(--rf-radius-md);          /* rounded corners */
}
.rf-plan-graph__node--done rect {
  fill: var(--rf-color-success-subtle);
  stroke: var(--rf-color-success);
}
.rf-plan-graph__label {
  font-family: var(--rf-font-family);
  font-size: var(--rf-font-size-sm);
  fill: var(--rf-color-text);
}
.rf-plan-graph__edge--blocks path {
  stroke: var(--rf-color-danger);
}
```

This means the graph inherits whatever theme variant is active — light, dark, or custom. Node colours, border radii, fonts, and edge colours all come from the same tokens that style the rest of the plan site. No hard-coded values in the SVG.

The one constraint is text measurement. dagre needs node dimensions upfront to compute layout. Since there's no browser at build time, a character-count heuristic sizes node width: `width = max(charCount * 7.5 + padding, minWidth)`. This is imprecise but consistent — the same approach most static SVG graph tools use. The `<text>` element is centred within the node rect, so minor width overestimates just add padding.

### Implementation pattern

Follows the self-closing aggregation rune pattern:

1. **Tag definition** (`tags/plan-graph.ts`): `selfClosing: true`, stores parameters as meta tags, emits sentinel and placeholder
2. **Aggregate hook**: Relationship data is already available in `PlanAggregatedData.relationships` — no additional extraction needed
3. **PostProcess resolution**: Builds the dagre graph from entity and relationship data, runs layout, generates SVG string, replaces placeholder

The dagre dependency is only imported in the plan package, not in core. It's a build-time dependency used during postProcess.

### Auto-injection

Unlike plan-history, the graph is NOT auto-injected into entity pages. The auto-relationships section already provides a textual listing of connections, and a one-hop entity-focused graph is just a star topology that adds little over the card layout. The graph is a dashboard-level view that answers structural questions about the project, not per-entity detail.

-----

## Site Placement

The plan site auto-generates pages for the dashboard, entity detail, status filters, and view pages (by tag, assignee, milestone). Dependency graphs fit at three scopes within this architecture:

### Dedicated view page

The render pipeline auto-generates a `/view/dependencies.html` page when the project has dependency or blocking relationships. This page appears in the sidebar's Views section alongside tag/assignee/milestone views. It renders a full `{% plan-graph /%}` with default filters.

This is the "understand the project structure" view — where you go to see how specs, work items, and decisions connect, identify bottlenecks, and spot isolated subgraphs.

### Milestone pages

Each milestone page already receives an auto-generated backlog grouped by status. When the milestone has 2+ entities with inter-dependencies, the render pipeline injects a milestone-scoped graph above the backlog:

```markdoc
{% plan-graph milestone="v1.0.0" cluster="status" /%}
```

This answers "what's the critical path for this release?" — which items must finish before others can start, and where the blocked chains are. The `cluster="status"` grouping turns it into both a dependency diagram and a visual status board for the milestone.

### Dashboard critical-path section

The dashboard (`index.html`) does not get a full graph — it would be too dense for an overview page. Instead, the render pipeline injects a focused subgraph showing only the **active blocking chains**: entities with status `blocked` or `in-progress` and their immediate dependencies/dependents. This is a small, purpose-built subgraph that highlights what's currently stuck or being worked on.

If no blocking chains exist (all items are independent or done), this section is omitted.

### Entity pages

Entity pages do NOT get a graph. The auto-relationships card listing already shows direct connections. Users who want to see an entity's graph neighbourhood can navigate to the dedicated view page and use the `id` parameter, or the entity page could link to a pre-filtered view (`/view/dependencies.html?focus=WORK-024`) if client-side filtering is ever added.

-----

## CLI: `plan graph`

### Tree-with-annotations mode (default)

```bash
npx refrakt plan graph WORK-024
```

Output:

```
WORK-024 [done] Add knownSections to content model framework
├── depends-on:
│   ├── SPEC-037 [accepted] Plan Package Hardening
│   └── SPEC-003 [accepted] Declarative Content Model
├── implements:
│   ├── SPEC-003 [accepted] Declarative Content Model
│   ├── SPEC-021 [draft] Plan Runes
│   └── SPEC-037 [accepted] Plan Package Hardening
└── dependency-of:
    ├── WORK-129 [done] knownSections scanner integration
    └── WORK-131 [done] Update site docs for plan hardening
```

This is a tree view rooted at the target entity, grouped by relationship kind. Status is colour-coded in terminal output (green for done, red for blocked, etc.). Entity IDs are the compact representation — no full graph layout needed.

For the global view:

```bash
npx refrakt plan graph
```

Output shows all entities with unresolved dependencies as a forest of trees, highlighting the critical path (longest chain of unfinished dependencies).

### Filters

```bash
# Milestone-scoped
npx refrakt plan graph --milestone v1.0.0

# Type filter
npx refrakt plan graph --type work,bug

# Show only blocking relationships
npx refrakt plan graph --show deps,blocks

# Depth control for entity-focused view
npx refrakt plan graph WORK-024 --depth 2

# Combine
npx refrakt plan graph --milestone v1.0.0 --type work --show deps
```

### DOT export

```bash
npx refrakt plan graph --dot
npx refrakt plan graph --dot --milestone v1.0.0
npx refrakt plan graph --dot WORK-024 --depth 3
```

Outputs a Graphviz DOT definition that can be piped to external tools:

```bash
npx refrakt plan graph --dot | dot -Tsvg -o deps.svg
npx refrakt plan graph --dot | dot -Tpng -o deps.png
```

The DOT output includes node attributes for styling (shape, colour, label) so it renders well with default Graphviz settings.

### JSON export and graph insights

```bash
npx refrakt plan graph --format json WORK-024
npx refrakt plan graph --format json --milestone v1.0.0
```

The JSON output includes the raw graph structure (`nodes` and `edges` arrays) plus a computed `insights` object with graph-analytic results. These insights are what make `plan graph` useful for AI agents — an AI doesn't need to *see* the graph, it needs to understand the structural implications for planning decisions.

```json
{
  "nodes": [
    {
      "id": "WORK-024", "type": "work", "status": "ready",
      "title": "Add knownSections to content model framework",
      "priority": "medium", "milestone": "v1.0.0",
      "inDegree": 2, "outDegree": 3,
      "onCriticalPath": true
    }
  ],
  "edges": [
    {
      "from": "WORK-024", "to": "SPEC-037",
      "kind": "implements"
    }
  ],
  "insights": {
    "criticalPath": ["SPEC-037", "WORK-024", "WORK-129", "WORK-131"],
    "bottlenecks": [
      { "id": "WORK-024", "unblocksCount": 3,
        "unblocks": ["WORK-129", "WORK-131", "WORK-130"] }
    ],
    "parallelStreams": [
      ["WORK-025", "WORK-026"],
      ["WORK-033", "WORK-034", "WORK-035"]
    ],
    "orphans": ["WORK-042", "BUG-003"],
    "completionImpact": {
      "WORK-024": {
        "directlyUnblocks": ["WORK-129", "WORK-131"],
        "transitivelyUnblocks": ["WORK-130"]
      }
    }
  }
}
```

**Insight definitions:**

| Insight | Algorithm | What it answers |
|---------|-----------|-----------------|
| `criticalPath` | Longest chain of unfinished entities (topological sort, longest path in DAG) | "What's the sequence of work that determines when the milestone can ship?" |
| `bottlenecks` | Unfinished nodes with highest out-degree (most dependents that are also unfinished) | "Which item should I finish first to unblock the most work?" |
| `parallelStreams` | Connected components after removing finished nodes, split by independent subgraphs | "Which items can be worked on concurrently without conflicts?" |
| `orphans` | Unfinished nodes with zero in-degree and zero out-degree (no dependency connections) | "Which items are floating free — possibly missing dependency declarations?" |
| `completionImpact` | Forward reachability from a given node through unfinished edges | "If I finish WORK-024, what gets unblocked — directly and transitively?" |

The `completionImpact` insight is included when a specific entity ID is queried (`plan graph --format json WORK-024`). For global/milestone queries, it's omitted to keep output size manageable.

All insights filter out finished entities (done/fixed/accepted/complete) — they represent the *remaining* graph, not the historical one. This is the forward-looking view that planning decisions need.

**Terminal output with insights:**

In non-JSON mode, insights are printed as a summary below the tree view:

```bash
npx refrakt plan graph --milestone v1.0.0
```

```
… (tree output) …

Critical path (4 items):
  SPEC-037 → WORK-024 → WORK-129 → WORK-131

Bottlenecks:
  WORK-024 — unblocks 3 items (WORK-129, WORK-131, WORK-130)

Parallel streams: 2 independent work streams identified
Orphans: WORK-042, BUG-003 (no dependency connections)
```

The insights summary is always shown in CLI output. It can be suppressed with `--no-insights` if only the tree view is wanted.

-----

## Phased Implementation

### Phase 1: CLI tree view + DOT export + insights

- Tree-with-annotations renderer (~30 lines, no dependency)
- DOT export (~50 lines, no dependency — just string concatenation)
- Graph insights computation (critical path, bottlenecks, parallel streams, orphans)
- JSON output with `nodes`, `edges`, and `insights`
- Entity-focused and global modes
- `--milestone`, `--type`, `--show`, `--depth` filters

This is immediately useful with zero new dependencies. The insights algorithms (topological sort, reachability, component detection) are standard graph operations that work directly on the relationship Map.

### Phase 2: Site SVG renderer

- Add `@dagrejs/dagre` as a dependency of `@refrakt-md/plan`
- Build the graph → dagre layout → SVG generation pipeline
- `plan-graph` rune with all attributes
- Node styling with shapes, colours, and links via Lumina tokens
- Dual-layout generation (LR + TB) for mobile responsive toggle
- Fallback dependency list for large graphs on narrow viewports

### Phase 3: CLI box-drawing renderer

- Map dagre coordinates to terminal character grid
- Box-drawing Unicode characters for nodes and edges
- Only if the tree view from Phase 1 proves insufficient for users who want spatial layout in the terminal

-----

## Decisions

### 1. dagre vs Graphviz

dagre (`@dagrejs/dagre`, ~150KB pure JS) over Graphviz (`@hpcc-js/wasm-graphviz`, ~8MB WASM). dagre's layout quality is good enough for the expected scale (10–200 nodes) and it avoids a heavy WASM dependency in the plan package. If layout quality proves insufficient for large complex graphs, swapping dagre for Graphviz is straightforward — both take a graph definition and return coordinates.

### 2. Static SVG vs interactive canvas

Static inline SVG. No pan/zoom, no drag-to-rearrange, no client-side JS. This matches the plan system's static rendering philosophy and keeps the output portable (works in any browser, in print, in RSS readers). For graphs large enough to need interactivity, the DOT export provides an escape hatch to dedicated tools.

Clickable nodes (via `<a>` wrappers in SVG) provide the one interaction that matters most: navigating to the entity page.

### 3. Edge filtering defaults

Show `depends-on`, `blocks`, and `implements`/`informs` by default. Hide `related`. The dependency and blocking edges are the ones with planning significance. Implementation edges provide traceability context. Related edges are numerous and noisy — they're the "mentioned in passing" references that don't represent meaningful graph structure.

### 4. Ghost nodes for external dependencies

When a milestone-scoped or filtered graph has edges pointing to entities outside the filter, those external entities appear as ghost nodes (lighter fill, dashed border, no link). This shows that a dependency exists without cluttering the graph with the full external subgraph. Ghost nodes are not laid out by dagre — they're appended at fixed positions relative to the edge endpoint.

### 5. Mobile responsive: dual layout + list fallback

On viewports below 48rem, milestone and entity-focused graphs switch from LR to TB layout via CSS toggle (both SVGs are in the DOM, only one renders). Full project graphs and dashboard critical-path sections fall back to a dependency list on mobile — the textual representation is more readable than a scaled-down SVG for dense graphs. Both the alternate-direction SVG and the fallback list are generated at build time alongside the primary SVG.

### 6. Graph insights as first-class output

The JSON export always includes computed graph insights (critical path, bottlenecks, parallel streams, orphans, completion impact). These are not optional — they're the primary value of `plan graph` for AI agents and automation. The CLI tree view also prints an insights summary by default. The insights filter out finished entities to show the remaining graph, which is what planning decisions operate on.

This makes `plan graph` a decision-support tool, not just a visualization command. An AI agent can ask "what should I work on to maximise unblocking?" and get a direct answer without parsing visual output.

{% /spec %}
