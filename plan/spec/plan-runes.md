{% spec id="SPEC-021" status="draft" version="1.0" tags="plan,runes" %}

# Plan Runes

Runes for spec-driven project management in AI-native development workflows. Package: `@refrakt/plan`.

## Problem

Spec-driven development has emerged as the dominant workflow for AI-assisted coding. Developers write specifications in Markdown, break them into work items, and AI agents implement from them. The tools supporting this workflow — GitHub’s Spec Kit, CCPM, planning-with-files — all converge on the same pattern: Markdown files in a directory with ad hoc conventions for structure.

These conventions are fragile. A task file is just headings and checkboxes. The AI parses it by guessing at the format. There’s no schema validation, no cross-referencing between specs and work items, no dependency tracking, no visual interface. The planning content is raw files that never render into anything browsable.

The plan runes provide structured, schema-validated, cross-referenced, renderable plan management content using the same rune system that powers the rest of refrakt.md.

-----

## Design Principles

**Specs are the primary artefact.** Not user stories, not tickets. The specification describes what the software should do. Work items reference specs. Decisions support specs. AI agents implement from specs. The project is organised around specs and their implementation status.

**Acceptance criteria are the contract.** They are verifiable statements that both humans and AI agents can check against. Every work item must have them. The content model enforces this.

**Decisions are institutional memory.** Architecture decision records capture why the system is the way it is. AI agents read them to make consistent choices. Without decision records, every AI session starts from zero context.

**No agile ceremony baggage.** No sprints, no story points, no velocity, no burndown charts. These concepts were designed around human team coordination constraints that don’t apply when AI agents do most of the implementation. Instead: specs, work items, milestones, and decisions.

**AI-native from the start.** Structured content models that AI agents can read, navigate, and author. The entity registry provides a knowledge graph. Validation ensures completeness. The `claude.md` convention orients agents to the project.

-----

## Rune Inventory

|Rune          |Purpose                                                                    |
|--------------|---------------------------------------------------------------------------|
|`spec`        |Specification document with status tracking and version                    |
|`work`        |Work item with acceptance criteria, references, and implementation tracking|
|`bug`         |Bug report with reproduction steps and severity                            |
|`decision`    |Architecture decision record                                               |
|`milestone`   |Named release target with scope and goals                                  |
|`backlog`     |Filtered, sorted view of work items and bugs                               |
|`decision-log`|Chronological view of all decisions                                        |

-----

## `spec`

Wraps a specification document, giving it status tracking, versioning, and entity registry integration. Specs are the source of truth for what the software should do.

**Attributes:**

|Attribute   |Type  |Required|Values                                                   |Description                         |
|------------|------|--------|---------------------------------------------------------|------------------------------------|
|`id`        |String|Yes     |—                                                        |Unique identifier (e.g., `SPEC-008`)|
|`status`    |String|No      |`draft`, `review`, `accepted`, `superseded`, `deprecated`|Current status                      |
|`version`   |String|No      |—                                                        |Version (e.g., `1.0`, `1.2`)        |
|`supersedes`|String|No      |—                                                        |ID of the spec this replaces        |
|`tags`      |String|No      |—                                                        |Comma-separated labels              |

**Content model:**

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'title', match: 'heading', optional: false,
      template: '# Specification Title',
      description: 'Spec headline' },
    { name: 'summary', match: 'blockquote', optional: true,
      template: '> Brief description of scope and purpose.',
      description: 'Scope summary' },
    { name: 'body', match: 'any', optional: true, greedy: true,
      description: 'Full specification content — prose, diagrams, examples, code' },
  ],
}
```

The spec rune is intentionally minimal in structure. The body is freeform because specs vary wildly in shape — some are narrative, some are tables of attributes, some are code examples. The rune adds metadata and entity registration, not content structure.

**Example:**

```markdoc
{% spec id="SPEC-008" status="accepted" version="1.2" tags="tint,theming" %}

# Tint Rune

> Section-level colour context override via CSS custom properties.

## Problem

A page has a single colour context...

## Solution

`tint` is a core rune that overrides colour tokens within its parent
rune's scope...

{% /spec %}
```

**Entity registration:** The spec registers in the entity registry with its ID, title, status, and version. Work items reference specs by ID. The cross-page pipeline resolves these references to navigable links. The plan dashboard can show implementation coverage — which specs have work items, which are fully implemented, which have no work started.

-----

## `work`

A discrete piece of implementation work. Not a user story — no "as a / I want / so that" ceremony. A work item has a clear description of what needs to change, acceptance criteria that define done, and references to the specs and decisions that inform it.

**Attributes:**

|Attribute   |Type  |Required|Values                                                      |Description                         |
|------------|------|--------|------------------------------------------------------------|------------------------------------|
|`id`        |String|Yes     |—                                                           |Unique identifier (e.g., `RF-142`)  |
|`status`    |String|No      |`draft`, `ready`, `in-progress`, `review`, `done`, `blocked`|Current status                      |
|`priority`  |String|No      |`critical`, `high`, `medium`, `low`                         |Priority level                      |
|`complexity`|String|No      |`trivial`, `simple`, `moderate`, `complex`, `unknown`       |Complexity signal for prioritisation|
|`assignee`  |String|No      |—                                                           |Person or agent working on this     |
|`milestone` |String|No      |—                                                           |Milestone this belongs to           |
|`source`    |String|No      |—                                                           |Comma-separated IDs of specs/decisions this implements|
|`tags`      |String|No      |—                                                           |Comma-separated labels              |

**Content model:**

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'title', match: 'heading', optional: false,
      template: '# Work item title',
      description: 'What needs to be done' },
    { name: 'description', match: 'paragraph', optional: true, greedy: true,
      template: 'Description of what needs to change and why.',
      description: 'Context and motivation' },
    {
      name: 'sections',
      type: 'sections',
      sectionHeading: 'heading:2',
      knownSections: {
        'Acceptance Criteria': {
          alias: ['Criteria', 'AC', 'Done When'],
          type: 'sequence',
          fields: [
            { name: 'criteria', match: 'list', optional: false },
          ],
        },
        'Edge Cases': {
          alias: ['Exceptions', 'Corner Cases'],
          type: 'sequence',
          fields: [
            { name: 'cases', match: 'list', optional: false },
          ],
        },
        'Approach': {
          alias: ['Technical Notes', 'Implementation Notes', 'How'],
          type: 'sequence',
          fields: [
            { name: 'approach', match: 'any', optional: true, greedy: true },
          ],
        },
        'References': {
          alias: ['Refs', 'Related', 'Context'],
          type: 'sequence',
          fields: [
            { name: 'refs', match: 'list', optional: true },
          ],
        },
        'Verification': {
          alias: ['Test Cases', 'Tests'],
          type: 'sequence',
          fields: [
            { name: 'verification', match: 'any', optional: true, greedy: true },
          ],
        },
      },
      sectionModel: {
        type: 'sequence',
        fields: [
          { name: 'body', match: 'any', optional: true, greedy: true },
        ],
      },
    },
  ],
}
```

**`complexity` instead of story points.** Complexity is a qualitative signal, not a numerical estimate. It helps humans prioritise and helps AI agents gauge what they’re getting into:

|Value     |Signal                                                           |
|----------|-----------------------------------------------------------------|
|`trivial` |Single file change, obvious implementation                       |
|`simple`  |One package, clear approach, few edge cases                      |
|`moderate`|Multiple files/packages, some design decisions needed            |
|`complex` |Cross-cutting change, architectural implications, many edge cases|
|`unknown` |Needs investigation before complexity can be assessed            |

**Example:**

````markdoc
{% work id="RF-142" status="ready" priority="high" complexity="moderate" 
       milestone="v0.5.0" tags="tint,theming" %}

# Implement tint rune dark mode support

The tint rune currently handles single-scheme colour tokens. It needs
to support dual light/dark definitions so that tinted sections look
correct regardless of the user's colour scheme preference.

## Acceptance Criteria
- [ ] Tint rune accepts `## Light` and `## Dark` content sections
- [ ] Identity transform emits `data-tint-dark` when dark values present
- [ ] Theme CSS swaps tokens in `prefers-color-scheme: dark` media query
- [ ] Inline tints without dark values fall back to page tokens in dark mode
- [ ] Inspector audits contrast ratios for both light and dark tint variants

## Edge Cases
- Tint with only dark values and `mode="dark"` — should work without light section
- Nested tints — inner tint should override outer tint's dark values
- Sandbox inside tinted section — should inherit dark tint tokens

## Approach
The identity transform parses `## Light` / `## Dark` headings within the
tint child rune body using the sections content model pattern. Dark values
are emitted as `--tint-dark-*` CSS custom properties alongside the light
values. The theme's base CSS swaps them via `@media (prefers-color-scheme: dark)`.

> Depends on {% ref "RF-138" /%}

## References
- {% ref "SPEC-008" /%} (Tint Rune Specification)
- {% ref "ADR-007" /%} (CSS custom properties for token injection)

## Verification
```markdoc
{% recipe name="Test" %}
{% tint %}
## Light
- background: #fdf6e3
## Dark
- background: #2a2118
{% /tint %}
{% /recipe %}
```

Expected: `data-tint-dark` attribute present, both `--tint-background`
and `--tint-dark-background` in inline style.

{% /work %}

````
---

## `bug`

Bug report with structured reproduction steps. Separate from `work` because bugs have different required sections (reproduction steps, expected/actual behaviour) and different status values.

**Attributes:**

| Attribute | Type | Required | Values | Description |
|---|---|---|---|---|
| `id` | String | Yes | — | Unique identifier |
| `status` | String | No | `reported`, `confirmed`, `in-progress`, `fixed`, `wontfix`, `duplicate` | Current status |
| `severity` | String | No | `critical`, `major`, `minor`, `cosmetic` | Impact level |
| `assignee` | String | No | — | Person or agent working on this |
| `milestone` | String | No | — | Milestone for the fix |
| `source` | String | No | — | Comma-separated IDs of specs/decisions this relates to |
| `tags` | String | No | — | Comma-separated labels |

**Content model:**

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'title', match: 'heading', optional: false,
      template: '# Bug title' },
    {
      name: 'sections',
      type: 'sections',
      sectionHeading: 'heading:2',
      knownSections: {
        'Steps to Reproduce': {
          alias: ['Reproduction', 'Steps', 'Repro'],
          type: 'sequence',
          fields: [
            { name: 'steps', match: 'list:ordered', optional: false },
          ],
        },
        'Expected': {
          alias: ['Expected Behaviour'],
          type: 'sequence',
          fields: [
            { name: 'expected', match: 'any', optional: false, greedy: true },
          ],
        },
        'Actual': {
          alias: ['Actual Behaviour'],
          type: 'sequence',
          fields: [
            { name: 'actual', match: 'any', optional: false, greedy: true },
          ],
        },
        'Environment': {
          alias: ['Env'],
          type: 'sequence',
          fields: [
            { name: 'environment', match: 'list', optional: false },
          ],
        },
      },
      sectionModel: {
        type: 'sequence',
        fields: [
          { name: 'body', match: 'any', optional: true, greedy: true },
        ],
      },
    },
  ],
}
```

**Example:**

```markdoc
{% bug id="RF-201" status="confirmed" severity="major" %}

# Showcase bleed breaks with overflow:hidden parent

## Steps to Reproduce
1. Create a feature section with a parent that has `overflow: hidden`
2. Add a showcase with `bleed="top"` inside the feature
3. Observe the rendered output

## Expected
Showcase extends above the section boundary with visible displacement.

## Actual
Showcase is clipped at the section edge.

## Environment
- Browser: Chrome 122, Firefox 124
- Theme: default
- refrakt.md: v0.4.2

{% /bug %}
```

-----

## `decision`

Architecture decision record. Captures the context, options considered, the decision made, the rationale, and the consequences. The most important rune in the package for AI-native workflows — without decision records, every AI session lacks the "why" behind the system’s architecture.

**Attributes:**

|Attribute   |Type  |Required|Values                                            |Description                     |
|------------|------|--------|--------------------------------------------------|--------------------------------|
|`id`        |String|Yes     |—                                                 |Identifier (e.g., `ADR-007`)    |
|`status`    |String|No      |`proposed`, `accepted`, `superseded`, `deprecated`|Decision status                 |
|`date`      |String|No      |—                                                 |Date decided (ISO 8601)         |
|`supersedes`|String|No      |—                                                 |ID of the decision this replaces|
|`source`    |String|No      |—                                                 |Comma-separated IDs of specs/entities this decision informs|
|`tags`      |String|No      |—                                                 |Comma-separated labels          |

**Content model:**

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'title', match: 'heading', optional: false,
      template: '# Decision title' },
    {
      name: 'sections',
      type: 'sections',
      sectionHeading: 'heading:2',
      knownSections: {
        'Context': {
          type: 'sequence',
          fields: [
            { name: 'context', match: 'any', optional: false, greedy: true },
          ],
        },
        'Options Considered': {
          alias: ['Options', 'Alternatives'],
          type: 'sequence',
          fields: [
            { name: 'options', match: 'any', optional: false, greedy: true },
          ],
        },
        'Decision': {
          type: 'sequence',
          fields: [
            { name: 'decision', match: 'any', optional: false, greedy: true },
          ],
        },
        'Rationale': {
          alias: ['Reasoning', 'Why'],
          type: 'sequence',
          fields: [
            { name: 'rationale', match: 'any', optional: false, greedy: true },
          ],
        },
        'Consequences': {
          alias: ['Impact', 'Trade-offs'],
          type: 'sequence',
          fields: [
            { name: 'consequences', match: 'any', optional: false, greedy: true },
          ],
        },
      },
      sectionModel: {
        type: 'sequence',
        fields: [
          { name: 'body', match: 'any', optional: true, greedy: true },
        ],
      },
    },
  ],
}
```

**Example:**

```markdoc
{% decision id="ADR-007" status="accepted" date="2026-03-11" source="SPEC-024" tags="tint,css" %}

# Use CSS custom properties for tint token injection

## Context
Tint runes need to override colour tokens within a section scope.
The solution must work without JavaScript and cascade through nested elements.

## Options Considered
1. **CSS custom properties on the container** — inline styles setting `--tint-*`
   tokens, theme bridges via `var()` fallbacks.
2. **Generated CSS classes per tint combination** — build step creates
   per-tint classes. Avoids inline styles but combinatorial explosion.
3. **JavaScript runtime token injection** — behaviour script reads data
   attributes and sets styles. Most flexible but requires JS.

## Decision
CSS custom properties via inline styles on the container element.

## Rationale
Custom properties cascade naturally through the DOM subtree without
JavaScript. Themes opt into tint support by including bridge CSS.
The `--tint-*` namespace avoids collisions with theme-internal tokens.

## Consequences
- Themes must include the tint bridge CSS
- Inline styles cannot use media queries — dark mode handled separately
- Inspector must audit tint token contrast ratios

{% /decision %}
```

-----

## `milestone`

A named release target or goal. Not a sprint — no timebox, no velocity, no ceremonies. A milestone is a coherent set of capabilities that together deliver value. When all work items assigned to it are done, the milestone is complete. If it takes three days or three weeks, that’s fine.

**Attributes:**

|Attribute|Type  |Required|Values                          |Description                                 |
|---------|------|--------|--------------------------------|--------------------------------------------|
|`name`   |String|Yes     |—                               |Milestone name (e.g., `v0.5.0`)             |
|`target` |String|No      |—                               |Target date (aspirational, not a commitment)|
|`status` |String|No      |`planning`, `active`, `complete`|Current status                              |

**Content model:**

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'title', match: 'heading', optional: true },
    { name: 'goals', match: 'list', optional: true,
      template: '- Goal one\n- Goal two\n- Goal three',
      description: 'What this milestone delivers' },
    { name: 'notes', match: 'paragraph', optional: true, greedy: true,
      description: 'Context, retrospective notes, lessons learned' },
  ],
}
```

The milestone automatically includes a backlog view of all work items and bugs with `milestone` matching its `name`.

**Example:**

```markdoc
{% milestone name="v0.5.0" target="2026-03-29" status="active" %}

# v0.5.0 — Layout & Tint

- Complete alignment system migration
- Ship tint rune with dark mode support
- Publish layout spec as site documentation
- Resolve showcase bleed overflow bug

{% /milestone %}
```

Renders the goals followed by all work items and bugs assigned to `milestone:v0.5.0`, grouped by status, with aggregate progress (checked acceptance criteria across all items).

-----

## `backlog`

Aggregation rune that queries the entity registry and renders a filtered view of work items and bugs.

**Attributes:**

|Attribute|Type  |Required|Values                                                           |Description                           |
|---------|------|--------|-----------------------------------------------------------------|--------------------------------------|
|`filter` |String|No      |—                                                                |Filter expression: `field:value` pairs|
|`sort`   |String|No      |`priority`, `status`, `id`, `assignee`, `complexity`, `milestone`|Sort order                            |
|`group`  |String|No      |`status`, `priority`, `assignee`, `milestone`, `type`, `tags`    |Group items by field                  |
|`show`   |String|No      |`all`, `work`, `bug`                                             |Which entity types to include         |

**Filter syntax:**

```markdoc
{% backlog filter="status:ready priority:high" %}
{% backlog filter="milestone:v0.5.0" sort="priority" group="status" %}
{% backlog filter="assignee:bjorn status:in-progress" %}
{% backlog filter="tags:tint" show="work" %}
```

**Requires cross-page pipeline** (Level 2). Queries the entity registry for matching entities, applies filters, and renders results.

-----

## `decision-log`

Aggregation rune that renders a chronological view of all decisions.

**Attributes:**

|Attribute|Type  |Required|Values      |Description                                |
|---------|------|--------|------------|-------------------------------------------|
|`filter` |String|No      |—           |Filter by status or tags                   |
|`sort`   |String|No      |`date`, `id`|Sort order (default: reverse chronological)|

```markdoc
{% decision-log sort="date" %}
```

-----

## Entity Registry Integration

### Registered Entity Types

|Rune      |Entity type|Registered fields                                                 |
|----------|-----------|------------------------------------------------------------------|
|`spec`    |`spec`     |id, title, status, version, tags                                  |
|`work`    |`work`     |id, title, status, priority, complexity, assignee, milestone, tags|
|`bug`     |`bug`      |id, title, status, severity, assignee, milestone, tags            |
|`decision`|`decision` |id, title, status, date, tags                                     |

### Cross-References with `ref`

The `ref` inline rune resolves any entity by ID, regardless of type:

```markdoc
> Depends on {% ref "RF-138" /%}
See {% ref "SPEC-008" /%} for the full specification.
This implements {% ref "ADR-007" /%}.
```

The entity registry finds the entity, resolves its page URL, and renders a link with the entity’s title. The link includes the entity type as a visual indicator — a small badge or icon distinguishing specs from work items from decisions.

### Dependency Tracking

Work items declare dependencies through `ref` tags. The entity registry tracks these as directed edges. The backlog view can show blocked items and the milestone view can highlight dependency chains.

### Spec Coverage

The entity registry knows which specs exist and which work items reference each spec. The dashboard can show coverage:

```
Specs: 12 total
  8 fully implemented (all referencing work items done)
  2 partially implemented (some work items in progress)
  1 with no work items (SPEC-012 — needs breakdown)
  1 deprecated (SPEC-003, superseded by SPEC-008)
```

-----

## AI Agent Integration

### claude.md Convention

```markdown
# Project: refrakt.md

## Structure
- `/specs/` — Specifications (the source of truth for what to build)
- `/plan/work/` — Work items and bugs (what to implement)
- `/plan/decisions/` — Architecture decision records (why it's built this way)
- `/plan/milestones/` — Release targets and goals

## Workflow
1. Read the current milestone at `/plan/milestones/current.md`
2. Pick a work item with `status="ready"` — prefer higher priority
3. Before implementing, read:
   - The work item's referenced specs (follow ref links)
   - Related decision records (check the tags)
   - Any dependency work items (ensure they're done)
4. Change the work item's status to `status="in-progress"`
5. Implement, checking off acceptance criteria as you go
6. When all criteria are met, change status to `status="done"`

## Conventions
- Identity transform uses BEM: `rune-{name}__{element}--{modifier}`
- CSS custom properties for dynamic values
- All new runes must have a `contentModel` declaration
- Run tests before marking work as done

## Decision Records
Always check `/plan/decisions/` before making architectural choices.
If a decision record covers your area, follow it. If you need to make
a new architectural choice, create a decision record explaining your
reasoning before implementing.
```

### What AI Agents Get

**Navigable knowledge graph.** Specs link to decisions. Work items link to specs. Dependencies link work items to each other. The agent follows references to build context without human guidance.

**Structured, validated content.** The content model ensures acceptance criteria are present, required sections are filled, status values are valid. The agent can’t produce an incomplete work item because the schema catches it.

**Architectural context.** Decision records explain why the system is the way it is. The agent reads them before making choices, maintaining consistency across sessions. Without decision records, every session risks contradicting earlier architectural commitments.

**Verifiable completion.** Acceptance criteria are checkboxes. The agent checks them off as it completes each one. The milestone view shows aggregate progress. The human can see at a glance what’s done and what isn’t.

### AI Authoring Workflow

AI agents don’t just consume plan runes — they author them:

**Breaking down specs.** "Read {% ref "SPEC-008" /%} and create work items for each unimplemented section." The AI reads the spec, identifies discrete pieces of work, and creates `.md` files with the work item template filled in.

**Triaging bugs.** The AI reads a bug report, searches existing bugs in the registry for duplicates, suggests severity, and links to relevant specs or work items.

**Writing decisions.** When the AI encounters an architectural choice during implementation, it creates a decision record before proceeding. The human reviews the decision. This captures rationale that would otherwise be lost.

**Updating status.** As the AI completes acceptance criteria, it checks them off and updates the work item’s status attribute. The plan dashboard reflects progress in real time.

-----

## Project Structure

```
my-project/
├── claude.md
├── refrakt.config.js
├── specs/
│   ├── SPEC-001-rune-pipeline.md
│   ├── SPEC-008-tint-rune.md
│   ├── SPEC-009-layout-system.md
│   └── SPEC-010-alignment.md
├── plan/
│   ├── work/
│   │   ├── RF-138-tint-base.md
│   │   ├── RF-142-tint-dark-mode.md
│   │   └── RF-215-alignment-migration.md
│   ├── bugs/
│   │   └── RF-201-showcase-bleed.md
│   ├── decisions/
│   │   ├── ADR-001-markdoc-over-mdx.md
│   │   ├── ADR-007-css-custom-props.md
│   │   └── index.md              ← decision-log rune
│   ├── milestones/
│   │   ├── v0.4.0.md
│   │   ├── v0.5.0.md             ← current milestone
│   │   └── index.md              ← milestone overview
│   └── index.md                   ← plan dashboard
├── docs/
├── packages/
└── src/
    └── theme/
```

### Dashboard Page

```markdoc
# refrakt.md — Plan Dashboard

## Current Milestone
{% milestone name="v0.5.0" target="2026-03-29" status="active" %}
- Complete alignment system migration
- Ship tint rune with dark mode support
{% /milestone %}

## Ready for Work
{% backlog filter="status:ready" sort="priority" %}

## Spec Coverage
{% backlog filter="status:done" group="tags" show="work" %}

## Recent Decisions
{% decision-log filter="status:accepted" sort="date" %}
```

-----

## Rendering

### Status Badges

|Status                                               |Colour|Rune types         |
|-----------------------------------------------------|------|-------------------|
|`draft` / `reported` / `proposed` / `planning`       |Grey  |All                |
|`ready` / `confirmed`                                |Blue  |work, bug          |
|`in-progress` / `active` / `review`                  |Yellow|All                |
|`done` / `fixed` / `complete` / `accepted`           |Green |All                |
|`blocked`                                            |Red   |work               |
|`wontfix` / `duplicate` / `superseded` / `deprecated`|Muted |bug, spec, decision|

### Complexity Badges

|Complexity|Visual       |
|----------|-------------|
|`trivial` |Single dot   |
|`simple`  |Two dots     |
|`moderate`|Three dots   |
|`complex` |Four dots    |
|`unknown` |Question mark|

### Checklist Progress

Work items with checkbox lists show a progress bar derived from content:

```
RF-142 Tint dark mode support    ████░░░░░░ 2/5  high  moderate
```

### Card Layout in Backlog

Inside backlog and milestone views, entities render as summary cards:

```html
<article class="rune-work rune-work--ready rune-work--high"
         data-id="RF-142" data-status="ready" data-priority="high"
         data-complexity="moderate" data-milestone="v0.5.0">
  <div class="rune-work__header">
    <span class="rune-work__id">RF-142</span>
    <span class="rune-work__status">ready</span>
    <span class="rune-work__priority">high</span>
    <span class="rune-work__complexity" title="moderate">●●●○</span>
  </div>
  <h3 class="rune-work__title">Implement tint rune dark mode support</h3>
  <div class="rune-work__meta">
    <span class="rune-work__milestone">v0.5.0</span>
    <span class="rune-work__progress">2/5</span>
  </div>
</article>
```

-----

## Comparison with Existing Tools

|Capability              |Spec Kit        |CCPM                |Planning-with-files|ROADMAP.md     |Plan Runes                         |
|------------------------|----------------|--------------------|-------------------|---------------|-----------------------------------|
|Structured content model|Convention only |Convention only     |Convention only    |Convention only|Schema-validated                   |
|Cross-references        |Manual links    |GitHub issue links  |None               |None           |Entity registry with typed refs    |
|Dependency tracking     |None            |GitHub sub-issues   |None               |None           |Ref-based directed edges           |
|Spec ↔ work item linking|Manual          |PRD → issues        |None               |None           |Automatic via entity registry      |
|Visual interface        |None (raw files)|GitHub Issues UI    |None               |None           |Themed, browsable site             |
|AI validation           |None            |None                |None               |None           |Content model enforces completeness|
|Decision records        |Not included    |Not included        |Not included       |Not included   |First-class rune                   |
|Spec coverage tracking  |None            |None                |None               |None           |Registry-derived metrics           |
|Rendered dashboard      |None            |GitHub project board|None               |None           |Rune-powered dashboard page        |
|Editor autocomplete     |None            |None                |None               |None           |Schema-driven suggestions          |

-----

## Progressive Enhancement Path

**Phase 1: Static files.** Spec, work, bug, and decision runes render as pages. Browse on localhost via dev server. Edit in any text editor or IDE. No cross-page features. AI agents read and write the files directly.

**Phase 2: Cross-page pipeline.** Entity registry enables backlog and milestone views. References resolve as links. Dependency tracking works. Dashboard shows spec coverage and progress metrics.

**Phase 3: Advanced features.** Dependency graph visualisation (sandbox rune rendering entity relationships). Changelog generation from completed work items. Spec diff tracking (what changed between versions).

{% /spec %}