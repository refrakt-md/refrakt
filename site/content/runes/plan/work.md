---
title: Work
description: Work item with acceptance criteria, references, and implementation tracking
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:work"} /%}

A discrete piece of implementation work with acceptance criteria, priority, complexity, and status tracking. Not a user story — a clear description of what needs to change.

Also available as `{% task %}`.

## Ready work item

A work item ready for implementation with acceptance criteria and approach.

{% preview source=true %}

	{% work id="WORK-9142" status="ready" priority="high" complexity="moderate" milestone="v0.5.0" tags="tint,theming" %}
	# Implement tint rune dark mode support

	The tint rune currently handles single-scheme color tokens. It needs to support dual light/dark definitions.

	## Acceptance Criteria
	- [ ] Tint rune accepts light and dark content sections
	- [ ] Dark values apply when the reader's system is in dark mode
	- [ ] Theme CSS swaps tokens in prefers-color-scheme: dark
	- [ ] Inline tints without dark values fall back to page tokens
	- [ ] Inspector audits contrast ratios for both variants

	## Approach
	Authors write the light and dark values under their own headings in the tint body. Each set applies in its color scheme, and a tint with only light values keeps the page's dark colors.
	{% /work %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading | The item's title |
| The paragraphs right after it | The item's lead |
| Anything else before the first `##`, such as a `> Ref:` blockquote, a list or a table | An intro above the sections |
| A `##` heading | A named section, such as Acceptance Criteria or Approach; the content up to the next `##` is its body |
| A `## Blocked by` or `## Blocks` section listing IDs | The item's dependencies, which `plan next` and `plan validate` read |

## Blocked work item

A work item blocked by a dependency.

{% preview source=true %}

	{% work id="WORK-9215" status="blocked" priority="medium" complexity="complex" assignee="alice" %}
	# Alignment system migration

	Migrate all runes from manual alignment classes to the new alignment system.

	## Acceptance Criteria
	- [ ] All runes use alignment utilities instead of manual classes
	- [ ] No visual regressions in existing content
	- [ ] Migration guide published
	{% /work %}

{% /preview %}

### Retiring a work item

Not every work item ships. Rather than deleting the file (which loses the reasoning trail) or marking it `done` (which lies to progress rollups), use one of the two terminal-but-non-achieving states:

- **`cancelled`** — the work is deliberately dropped and no longer wanted. Record the reason in the body or a `## Resolution`.
- **`superseded`** — the work is replaced by a different item. Pair it with `supersedes="WORK-xxx"` pointing at the replacement.

Both statuses end the item's lifecycle without counting as completion — they are excluded from `plan next`, from milestone progress, and from `plan-progress` achieved counts. A `## Resolution` explaining the retirement is allowed on either.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:work"} /%}
