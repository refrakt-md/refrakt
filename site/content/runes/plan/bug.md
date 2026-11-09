---
title: Bug
description: Bug report with structured reproduction steps and severity tracking
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:bug"} /%}

A defect report, with its reproduction steps, expected and actual behaviour, severity and status. It is separate from a work item because a bug has its own sections and status values.

## Confirmed bug

A bug confirmed with reproduction steps and environment details.

{% preview source=true %}

	{% bug id="BUG-9201" status="confirmed" severity="major" %}
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

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading | The bug's title |
| The paragraphs right after it | The bug's lead |
| Anything else before the first `##`, such as a code block, a list or a table | An intro above the sections |
| A `##` heading | A named section; the content up to the next `##` is its body |
| `## Steps to Reproduce`, `## Expected`, `## Actual`, `## Environment` | The standard bug sections; aliases such as `## Repro` or `## Env` count as the same section |

## Critical bug

A critical severity bug requiring immediate attention.

{% preview source=true %}

	{% bug id="BUG-9305" status="reported" severity="critical" %}
	# Build fails when no rune packages configured

	## Steps to Reproduce
	1. Create a new refrakt project
	2. Remove all entries from packages array
	3. Run `npm run build`

	## Expected
	Build succeeds with only core runes.

	## Actual
	Build crashes with undefined reference error.
	{% /bug %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:bug"} /%}
