{% spec id="SPEC-015" status="review" tags="plan, ux, behaviors, architecture" %}

# Plan Site UX at Scale

> Future UX improvements for the plan site to handle large projects with many work items, specs, bugs, and decisions.

## Problem

The current plan site works well for small projects but will hit usability pain points as the number of entities grows. Specific issues:

- **Sidebar overload**: Every entity is listed flat within its type group, sorted alphabetically by ID. At 50+ work items, this becomes an unusable wall of links with no way to find what you need without scrolling.
- **No filtering from the sidebar**: The `{% backlog %}` rune supports `field:value` filtering, but only inside page content. There's no way to narrow the sidebar itself.
- **Dashboard is static**: The auto-generated dashboard shows four fixed sections (active milestone, ready, in-progress, recent decisions). It doesn't surface blocked items, overall progress, or let users scope to a specific milestone.
- **Tags are invisible in navigation**: Every entity carries tags, but they're only visible on the entity page itself. There's no cross-cutting view by tag, assignee, or milestone.
- **No keyboard-driven navigation**: For a developer-facing tool, mouse-only interaction feels slow.

This spec captures a set of improvements to address these, ordered by impact. All features described here build on the infrastructure established by SPEC-014 (HTML adapter + client behaviors).

## Prerequisite

SPEC-014 — Plan Site via HTML Adapter. That work provides `@refrakt-md/behaviors` integration and `renderFullPage()`, which the features below depend on for client-side interactivity.

## Features

### 1. Collapsible Status Groups in Sidebar

**Priority: High**

Replace the flat entity list with status-grouped, collapsible sections within each entity type:

```
Work Items
  ▸ In Progress (3)
  ▸ Ready (7)
  ▾ Review (2)
      WORK-031 Migrate renderer
      WORK-028 Add highlight support
  ▸ Done (24)
  ▸ Draft (5)
```

**Behavior:**
- Items are grouped by status within each entity type
- Groups are collapsible (toggle on click)
- Terminal statuses (`done`, `fixed`, `accepted`, `complete`, `superseded`, `deprecated`, `wontfix`, `duplicate`) are collapsed by default
- Active statuses (`in-progress`, `ready`, `review`, `confirmed`) are expanded by default
- The count badge shows how many items are in each group
- Collapse state is persisted in `localStorage` so it survives page navigation

**Status ordering within each type** (mirrors workflow progression):
- Work: `in-progress` → `review` → `ready` → `blocked` → `draft` → `pending` → `done`
- Bug: `in-progress` → `confirmed` → `reported` → `fixed` → `wontfix` → `duplicate`
- Spec: `review` → `draft` → `accepted` → `superseded` → `deprecated`
- Decision: `proposed` → `accepted` → `superseded` → `deprecated`
- Milestone: `active` → `planning` → `complete`

Active/in-progress statuses appear first so the most actionable items are always visible at the top.

**Implementation:** A new `sidebar-collapse` behavior in `@refrakt-md/behaviors` or as a plan-specific behavior. The server renders the full grouped structure; the behavior adds toggle controls and manages collapse state.

### 2. Sidebar Search / Filter Bar

**Priority: High**

A text input at the top of the sidebar that filters the visible items in real-time:

```
[🔍 status:ready priority:high    ]
```

**Behavior:**
- Typing filters items by matching against ID, title, tags, assignee, and milestone
- Plain text matches fuzzily across all fields (e.g., typing "auth" shows `WORK-012 Implement authentication`)
- Supports the existing `field:value` filter syntax for precise filtering (e.g., `status:ready`, `priority:high`, `tags:css`)
- Multiple filters combine with AND logic (same as the `{% backlog %}` rune)
- Multiple values for the same field combine with OR logic
- Filter clears on `Escape`
- `/` keyboard shortcut focuses the filter input from anywhere on the page

**Data requirements:** Navigation items need additional `data-*` attributes beyond the current `id`, `status`, and `label`:
- `data-tags` — comma-separated tag list
- `data-priority` — priority value (work items)
- `data-severity` — severity value (bugs)
- `data-assignee` — assignee value
- `data-milestone` — milestone value
- `data-complexity` — complexity value (work items)

These are added during `buildNavRegion()` (from SPEC-014) so no pipeline changes are needed.

**Implementation:** A small client-side behavior (~2KB). All data is already present in the DOM — no server round-trip needed. Works in conjunction with collapsible groups (filtering expands matching groups automatically).

### 3. Enhanced Dashboard

**Priority: Medium**

Improve the auto-generated dashboard to give better at-a-glance project health:

**Progress summary** (top of dashboard):
```
35 work items: 12 done · 3 in progress · 7 ready · 2 blocked · 11 draft
8 bugs: 2 fixed · 1 in progress · 3 confirmed · 2 reported
```

A simple text-based summary — no charts or visualizations. Counts per status, color-coded with the existing status palette.

**Blocked items callout:**
A dedicated section with red/warning styling that surfaces all items with `status: blocked`. These need attention first and shouldn't be buried in the general backlog. Each blocked item shows its title, ID, and — if detectable from content — what it's blocked on.

**Per-milestone scoping:**
The dashboard groups work items and bugs by milestone when multiple milestones exist:

```
v0.5.0 (active) — 6 of 14 done
  ▸ In Progress (2)
  ▸ Ready (4)
  ▸ Done (6)

v0.6.0 (planning) — 0 of 8 done
  ▸ Ready (3)
  ▸ Draft (5)

Unassigned — 13 items
  ▸ ...
```

When only one milestone exists (or none), the current flat layout is used.

**Recent activity:**
A section showing items whose status changed recently, detected via file modification time (`mtime`). Shows the last 10 changes with their old → new status transition if detectable.

### 4. Tag-Based Cross-Cutting Views

**Priority: Medium**

Auto-generated pages that group entities by tag, assignee, or milestone — accessible from a "Views" section in the sidebar:

```
Views
  By tag: runes (8) · css (5) · pipeline (3)
  By assignee: unassigned (12) · claude (8)
  By milestone: v0.5 (9) · v0.6 (4)
```

Each view page uses the existing `{% backlog %}` rune with appropriate filters. Pages are generated during the aggregate pipeline phase (same as the dashboard), so they require no manual authoring.

**View pages are generated only when useful:**
- "By tag" appears when there are 3+ distinct tags
- "By assignee" appears when there are 2+ distinct assignees
- "By milestone" appears when there are 2+ milestones

### 5. Keyboard Navigation

**Priority: Low**

Keyboard shortcuts for fast navigation in the plan site:

| Key | Action |
|-----|--------|
| `/` | Focus the search/filter bar |
| `Escape` | Clear filter / unfocus search bar |
| `j` / `k` | Move to next / previous item in sidebar |
| `Enter` | Navigate to the focused item |
| `[` / `]` | Jump to previous / next entity type group |
| `o` | Toggle collapse of the focused group |

**Implementation:** A `keyboard-nav` behavior. The sidebar items get `tabindex` attributes and the behavior manages a virtual focus cursor. Visual focus indicator matches the existing active link style.

### 6. Dependency Visualization

**Priority: Low**

Work items and bugs reference each other by ID in their content. Surface these relationships explicitly:

**On each entity page**, a "Relationships" section (auto-injected, not authored):
```
Blocked by: WORK-003 (in-progress), WORK-007 (done)
Blocks: WORK-012, WORK-015
Related: SPEC-005, ADR-003
```

Each reference is a live link. Status badges are shown inline so you can see at a glance whether blockers are resolved.

**Detection:** During the `register` pipeline phase, scan entity content for ID references matching `(WORK|SPEC|BUG|ADR)-\d+` patterns. Build a bidirectional relationship index in the `EntityRegistry`. During `postProcess`, inject the relationships section into each entity page.

**In the sidebar** (optional, low priority): Blocked items could show a small indicator (e.g., a red dot) when their blockers are unresolved.

## Implementation Phases

These features are independent and can be implemented in any order, but the suggested sequencing maximizes value:

**Phase 1** (immediate post-SPEC-014):
- Collapsible status groups
- Sidebar search/filter
- These two features address the primary scalability pain point

**Phase 2**:
- Enhanced dashboard
- Tag-based views
- These improve project-level visibility

**Phase 3**:
- Keyboard navigation
- Dependency visualization
- These are power-user and planning features

## Scope Boundaries

**In scope:** UX design and behavior for the plan site rendered by `plan serve` and `plan build`.

**Out of scope:**
- Embedding plan content in a regular refrakt site (separate concern)
- Real-time collaboration or multi-user features
- Charting, Gantt diagrams, or complex visualizations
- Plan content editing from the browser (the plan site is read-only; editing happens in files)
- Mobile-specific UI (responsive is sufficient)

{% /spec %}
