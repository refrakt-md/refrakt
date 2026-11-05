---
title: Plan Activity
description: Recent activity feed sorted by file modification time
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:plan-activity"} /%}

Renders a recent activity feed showing the most recently modified plan entities. Each entry displays the modification date, entity type, ID, status, and title. Status badges are color-coded using the plan status palette.
## Default (last 10 items)

{% preview source=true %}

	{% plan-activity /%}

{% /preview %}

## Custom limit

Show fewer or more recent items.

{% preview source=true %}

	{% plan-activity limit=5 /%}

{% /preview %}

### What it shows

An ordered list, most recently modified first. Each entry shows the date it was last modified, the entity's type (work, bug, spec, decision), its ID, a status badge and its title. Dates come from git history, or the file's modification time when there is none; entities with neither are left out.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:plan-activity"} /%}
