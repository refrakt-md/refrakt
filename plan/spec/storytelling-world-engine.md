{% spec id="SPEC-023" status="draft" version="1.0" tags="storytelling, pipeline, cli" %}

# Storytelling World Engine

> Cross-page pipeline hooks, entity graph, auto-linking, validation, and CLI tooling for the `@refrakt-md/storytelling` package — turning isolated rune pages into a navigable, interconnected world bible.

## Problem

The storytelling runes (character, realm, faction, lore, plot, bond, storyboard) currently operate in complete isolation. Each rune renders its own page but has no awareness of other pages. A bond references characters by name but never validates those names exist. A realm declares a parent but nothing checks the parent is real. An author mentions "Veshra" in prose across dozens of pages, but there's no auto-linking, no "mentioned in" index, no way to see the web of relationships at a glance.

Worldbuilding content is inherently relational. Characters belong to factions, inhabit realms, form bonds, drive plots. The storytelling package has all the raw data in its rune attributes — `bond.from`, `bond.to`, `realm.parent`, `faction.type`, `character.role` — but none of it is wired together. The runes are isolated islands when they should be a connected graph.

The plan runes package (`@refrakt-md/plan`) solved an analogous problem for project management: pipeline hooks that register entities, aggregate cross-page indexes, and post-process pages to resolve references. The storytelling package should follow the same pattern, adapted for narrative content.

-----

## Design Principles

**The world graph is the core abstraction.** Characters, realms, factions, lore entries, and plots are nodes. Bonds, realm parentage, faction membership, and prose mentions are edges. Everything else — the CLI, the layout, the visualisations — is a view over this graph.

**Names are the primary key.** Unlike plan entities which use synthetic IDs (`SPEC-008`, `WORK-042`), storytelling entities are identified by name — `character.name`, `realm.name`, `faction.name`. Aliases (`character.aliases`) are alternate keys. The registry must handle name collisions and case-insensitive matching.

**Auto-linking is opt-in but zero-config.** When enabled, entity names in prose become links to their pages. No manual `{% ref %}` tags needed. The author writes naturally and the engine connects things. This must be conservative — short or ambiguous names should not trigger false matches.

**Validation catches broken references, not style.** The validator checks that `bond.from` references an existing character, that `realm.parent` references an existing realm, that plot beats reference valid entities. It does not enforce naming conventions or narrative structure.

**Progressive enhancement.** Each capability layer works independently. Pipeline hooks without CLI. CLI without the layout. Layout without visualisations. An author can adopt one piece at a time.

-----

## Layer 1: Pipeline Hooks

The storytelling package gains `PackagePipelineHooks` with three phases:

### Register

Scan all transformed pages and index named entities into the `EntityRegistry`:

| Rune | Entity type | Key field | Indexed fields |
|------|------------|-----------|----------------|
| `character` | `character` | `name` | name, role, status, aliases, tags, pageUrl |
| `realm` | `realm` | `name` | name, type, scale, parent, tags, pageUrl |
| `faction` | `faction` | `name` | name, type, alignment, size, tags, pageUrl |
| `lore` | `lore` | `title` | title, category, spoiler, tags, pageUrl |
| `plot` | `plot` | `title` | title, type, structure, tags, pageUrl, beats (summary) |
| `bond` | `bond` | (composite) | from, to, type, status, bidirectional, pageUrl |

Characters also register each alias as an alternate lookup key so auto-linking can match "The Bone Witch" as well as "Veshra".

### Aggregate

Build derived indexes from the full registry:

- **World graph**: Adjacency structure with typed edges:
  - `bond` edges between characters (from bond runes)
  - `parent` edges between realms (from `realm.parent`)
  - `inhabits` edges from characters to realms (future: when realm references are added)
  - `member-of` edges from characters to factions (future: when faction membership is added)
- **Realm tree**: Hierarchical structure from `realm.parent` chains, with cycle detection
- **Character index**: All characters grouped by role, status, or faction
- **Lore compendium**: Lore entries grouped by category
- **Plot tracker**: All plots with beat completion percentages
- **Name registry**: Merged index of all entity names + aliases for auto-linking, with disambiguation metadata (entity type, page URL)

### Post-process

Per-page transformations using aggregated data:

- **Auto-linking**: Scan prose nodes for entity name matches. Replace with links to entity pages. Rules:
  - Only match whole words (not substrings)
  - Case-insensitive matching
  - Only link first occurrence per entity per page (avoid link spam)
  - Skip matches inside headings, code blocks, and existing links
  - Skip names shorter than 3 characters (too ambiguous)
  - Configurable: `autoLink: true | false` in package config (default: true)
- **Bond resolution**: Enrich bond runes with resolved entity data — add page URLs, roles, and status for the `from` and `to` characters so the rendered bond can link to both
- **Backlink injection**: Optionally inject a "Mentioned in" or "Appears in" section into entity pages listing all other pages that reference this entity

-----

## Layer 2: Validation

A validation pass (runnable via CLI or CI) that checks referential integrity:

| Check | Severity | Description |
|-------|----------|-------------|
| Dangling bond `from` | Error | `bond.from` doesn't match any registered character name or alias |
| Dangling bond `to` | Error | `bond.to` doesn't match any registered character name or alias |
| Dangling realm parent | Error | `realm.parent` doesn't match any registered realm name |
| Orphan realm | Warning | Realm has no parent and is not referenced as a parent by any other realm (isolated node) |
| Orphan character | Warning | Character has no bonds and is not referenced by any bond, plot, or prose mention |
| Duplicate entity name | Warning | Two entities of the same type share a name (possible copy-paste error) |
| Cross-type name collision | Info | A character and a realm share a name (ambiguous for auto-linking) |
| Realm parent cycle | Error | Realm parent chain forms a cycle |
| Plot with no beats | Warning | Plot rune has no list items / beats |
| Bond self-reference | Warning | `bond.from` equals `bond.to` |

-----

## Layer 3: Codex Layout

A `codexLayout` for storytelling sites, analogous to `docsLayout` for documentation:

### Sidebar

Entity-type navigation with collapsible groups:

```
Characters (12)
  ├─ Protagonists
  │   ├─ Kael
  │   └─ Lyra
  ├─ Antagonists
  │   └─ Veshra
  └─ Supporting (9)

Realms (8)
  ├─ Eldergrove
  │   ├─ The Whispering Glade
  │   └─ Thornhold
  └─ The Ashen Wastes (3)

Factions (4)
  ├─ The Silver Circle
  └─ The Bone Court

Lore (15)
  ├─ History (6)
  ├─ Magic (4)
  └─ Prophecy (5)

Plots (3)
  ├─ The Crown Quest ████░░ 4/7
  └─ The War of Shadows ██░░░░ 2/8
```

Characters grouped by role. Realms displayed as a tree (using `parent` hierarchy). Lore grouped by category. Plots show beat progress inline.

### Entity Page Panels

When viewing an entity page, contextual panels show related data pulled from the world graph:

- **Character page**: Bonds (with links to the other character), faction membership, realm, plot appearances, "mentioned in" backlinks
- **Realm page**: Child realms, characters who inhabit it, events/plots set here
- **Faction page**: Members, allied/rival factions (via bonds between factions), associated realms
- **Plot page**: Characters involved (extracted from beat text or explicit references), related locations

### Spoiler Mode

A page-level or site-level toggle that controls visibility of content marked with `spoiler=true` on lore runes. Default: spoilers hidden. The toggle persists in `localStorage`. Spoilered content shows a blurred placeholder with a "reveal" button.

-----

## Layer 4: CLI — `refrakt world`

CLI subcommands registered by the storytelling package, following the same plugin pattern as `refrakt plan`:

### `refrakt world cast`

List all characters with summary metadata.

```
$ refrakt world cast

  Name          Role         Status   Bonds  Appears In
  ─────────────────────────────────────────────────────
  Kael          protagonist  alive    3      5 pages
  Lyra          protagonist  alive    2      4 pages
  Veshra        antagonist   alive    4      7 pages
  Old Mirren    supporting   dead     1      2 pages
  ...

  12 characters · 8 alive · 2 dead · 2 unknown
```

Options: `--role <role>`, `--status <status>`, `--sort <field>`, `--format json`

### `refrakt world map`

Display realm hierarchy as an ASCII tree.

```
$ refrakt world map

  Eldergrove (forest, region)
  ├── The Whispering Glade (grove, district)
  ├── Thornhold (fortress, district)
  └── The Sunken Library (ruin, room)
  The Ashen Wastes (desert, region)
  ├── Bone Spire (tower, district)
  └── The Glass Flats (wasteland, district)
  The Driftless Sea (ocean, region)

  8 realms · max depth 2
```

Options: `--root <realm>` (subtree from a specific realm), `--format json`

### `refrakt world graph`

Visualise the relationship network.

```
$ refrakt world graph

  Kael ──fellowship── Lyra
  Kael ──mentor────── Old Mirren
  Veshra ──antagonistic── Kael
  Veshra ~~romantic~~ Lyra          (status: broken)
  Kael ──member────── The Silver Circle

  4 characters · 1 faction · 5 bonds
```

Options: `--focus <entity>` (show only connections to a specific entity), `--depth <n>` (traversal depth from focus), `--format mermaid` (output as Mermaid diagram), `--format dot` (output as Graphviz DOT), `--format json`

### `refrakt world timeline`

Show plot progression across all arcs.

```
$ refrakt world timeline

  The Crown Quest (quest, linear)
  [x] Discovery ── [x] The Map ── [>] The Wastes ── [ ] The Guardian
  Progress: 2/4 beats

  The War of Shadows (campaign, branching)
  [x] First Contact ── [>] Siege ── [ ] Betrayal
                                 └── [ ] Alliance
  Progress: 1/4 beats

  2 plots · 3/8 beats complete
```

Options: `--plot <title>` (single plot detail), `--format json`

### `refrakt world validate`

Run all referential integrity checks.

```
$ refrakt world validate

  ✓ 12 characters registered
  ✓ 8 realms registered (max depth 2, no cycles)
  ✓ 4 factions registered
  ✓ 15 lore entries registered
  ✓ 9 bonds checked

  ⚠ 2 warnings:
    bond "Kael → ???" in bonds.md:12 — "Theron" does not match any character
    character "Old Mirren" has no bonds and no prose mentions (orphan)

  ✗ 1 error:
    realm "The Sunken Library" parent "The Deep" does not exist

  Exit code: 1 (errors found)
```

Options: `--severity <level>` (filter output), `--format json`, `--fix` (future: auto-fix suggestions)

### `refrakt world create`

Scaffold new entity pages from templates.

```bash
refrakt world create character --name "Theron" --role supporting
refrakt world create realm --name "The Deep" --type cavern --parent "Eldergrove"
refrakt world create faction --name "The Ember Pact" --type alliance
refrakt world create lore --title "The Sundering" --category history
refrakt world create plot --title "The Descent" --type quest
refrakt world create bond --from "Kael" --to "Theron" --type mentor
```

### `refrakt world serve`

Serve the codex layout as a local site (reuses the same static site infrastructure as `refrakt plan serve`).

-----

## Layer 5: Aggregation Runes

Query runes that pull from the world graph, analogous to `backlog` and `decision-log` in the plan package:

### `cast`

Renders a character directory from the registry.

````markdoc
{% cast group="role" sort="name" %}
{% cast filter="status:alive" group="faction" %}
````

### `atlas`

Renders a realm hierarchy or map from the registry.

````markdoc
{% atlas root="Eldergrove" %}
{% atlas style="tree" %}
````

### `compendium`

Renders a lore index grouped by category.

````markdoc
{% compendium filter="category:history" sort="title" %}
{% compendium group="category" %}
````

### `saga`

Renders a multi-plot timeline view.

````markdoc
{% saga filter="type:quest" %}
{% saga sort="progress" %}
````

### `web`

Renders a relationship graph as an inline visualisation (SVG).

````markdoc
{% web focus="Kael" depth=2 %}
{% web filter="type:fellowship" %}
````

-----

## Future Extensions (Out of Scope)

These are natural follow-ons but not part of this spec:

- **Character ↔ Realm binding**: A `realm` attribute on `character` runes, creating `inhabits` edges in the world graph
- **Faction membership**: A `faction` attribute on `character` runes, creating `member-of` edges
- **Timeline rune**: Chronological event sequencing across plots (the `@refrakt-md/business` package already has a `timeline` rune — possible integration)
- **Session log rune**: TTRPG campaign journal that references characters, locations, and plots per session
- **Map visualisation**: Interactive SVG map with realm markers (significant scope — probably a separate package)
- **Export formats**: World bible export as PDF, wiki format, or Obsidian vault
- **AI world-building assistant**: `refrakt world generate` — AI-assisted entity creation that maintains consistency with the existing world graph

-----

## Implementation Phases

### Phase 1: Pipeline Foundation

Pipeline hooks (register, aggregate) + validation + basic CLI (`world validate`, `world cast`, `world map`). This is the minimum viable layer — it makes the world graph exist and catches broken references.

### Phase 2: Auto-linking & CLI

Post-process auto-linking + `world graph`, `world timeline`, `world create`. The world starts to feel connected in rendered output and the CLI becomes a useful authoring tool.

### Phase 3: Codex Layout & Aggregation Runes

The codex layout + sidebar + entity panels + the cast/atlas/compendium/saga/web query runes. This is the visual payoff — the world becomes browsable.

### Phase 4: Serve & Polish

`world serve` for the standalone codex site + spoiler mode + Mermaid/DOT export from the graph CLI. The storytelling package becomes a self-contained worldbuilding tool.

{% /spec %}
