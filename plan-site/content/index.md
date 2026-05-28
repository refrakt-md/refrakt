---
title: Plan
description: refrakt.md plan dashboard — progress, recent activity, ready work, and architecture decisions.
---

# refrakt plan

A live dashboard built from the same `plan/` tree the project commits to git. Every entity below resolves through the standard refrakt pipeline — `entityRoutes` generates a detail page per spec/work/bug/decision/milestone, and `collection` lists them here.

## Progress

{% aggregate type="work" value="status:done" group="status" %}
{% progress value=$item.value max=$item.count %}Work — {% $item.value %} of {% $item.count %} done{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No work items yet.
{% /aggregate %}

{% aggregate type="bug" value="status:fixed" group="status" %}
{% progress value=$item.value max=$item.count %}Bugs — {% $item.value %} of {% $item.count %} fixed{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No bugs reported.
{% /aggregate %}

{% aggregate type="spec" value="status:accepted" group="status" %}
{% progress value=$item.value max=$item.count %}Specs — {% $item.value %} of {% $item.count %} accepted{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No specs yet.
{% /aggregate %}

{% aggregate type="decision" value="status:accepted" group="status" %}
{% progress value=$item.value max=$item.count %}Decisions — {% $item.value %} of {% $item.count %} accepted{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No decisions yet.
{% /aggregate %}

{% aggregate type="milestone" value="status:complete" group="status" %}
{% progress value=$item.value max=$item.count %}Milestones — {% $item.value %} of {% $item.count %} complete{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No milestones yet.
{% /aggregate %}

## Recent activity

{% plan-activity limit=15 /%}

## Ready work

{% collection type="work" filter="status:ready" sort="priority" group="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

## Recent decisions

{% decision-log sort="date" /%}
