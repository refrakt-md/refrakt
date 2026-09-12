---
title: Work
description: Work item with acceptance criteria, references, and implementation tracking
category: Plan
plugin: plan
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Work

A discrete piece of implementation work with acceptance criteria, priority, complexity, and status tracking. Not a user story — a clear description of what needs to change. H2 headings create named sections for structured content like acceptance criteria, approach, and references.

Also available as `{% task %}`.

## Ready work item

A work item ready for implementation with acceptance criteria and approach.

{% preview source=true %}

{% work id="RF-142" status="ready" priority="high" complexity="moderate" milestone="v0.5.0" tags="tint,theming" %}
# Implement tint rune dark mode support

The tint rune currently handles single-scheme colour tokens. It needs to support dual light/dark definitions.

## Acceptance Criteria
- [ ] Tint rune accepts light and dark content sections
- [ ] Identity transform emits data-tint-dark when dark values present
- [ ] Theme CSS swaps tokens in prefers-color-scheme: dark
- [ ] Inline tints without dark values fall back to page tokens
- [ ] Inspector audits contrast ratios for both variants

## Approach
The identity transform parses light/dark headings within the tint child rune body. Dark values are emitted as `--tint-dark-*` CSS custom properties alongside the light values.
{% /work %}

{% /preview %}

## Blocked work item

A work item blocked by a dependency.

{% preview source=true %}

{% work id="RF-215" status="blocked" priority="medium" complexity="complex" assignee="alice" %}
# Alignment system migration

Migrate all runes from manual alignment classes to the new alignment system.

## Acceptance Criteria
- [ ] All runes use alignment utilities instead of manual classes
- [ ] No visual regressions in existing content
- [ ] Migration guide published
{% /work %}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:work"} /%}

### Retiring a work item

Not every work item ships. Rather than deleting the file (which loses the reasoning trail) or marking it `done` (which lies to progress rollups), use one of the two terminal-but-non-achieving states:

- **`cancelled`** — the work is deliberately dropped and no longer wanted. Record the reason in the body or a `## Resolution`.
- **`superseded`** — the work is replaced by a different item. Pair it with `supersedes="WORK-xxx"` pointing at the replacement.

Both statuses end the item's lifecycle without counting as completion — they are excluded from `plan next`, from milestone progress, and from `plan-progress` achieved counts. A `## Resolution` explaining the retirement is allowed on either.
| `created` | `string` | `$file.created` | Creation date (ISO 8601). Auto-populated from git history |
| `modified` | `string` | `$file.modified` | Last modified date (ISO 8601). Auto-populated from git history |

