---
title: Plan
description: refrakt.md plan dashboard — progress, recent activity, ready work, and architecture decisions.
---

# refrakt plan

A live dashboard built from the same `plan/` tree the project commits to git. Every entity below resolves through the standard refrakt pipeline — `entityRoutes` generates a detail page per spec/work/bug/decision/milestone, and `collection` lists them here.

## Progress

{% card %}
### Work

{% aggregate type="work" value="status:done" group="status" %}
{% progress value=$item.value max=$item.count %}Done{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No work items yet.
{% /aggregate %}
{% /card %}

{% card %}
### Bugs

{% aggregate type="bug" value="status:fixed" group="status" %}
{% progress value=$item.value max=$item.count %}Fixed{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No bugs reported.
{% /aggregate %}
{% /card %}

{% card %}
### Specs

{% aggregate type="spec" value="status:accepted" group="status" %}
{% progress value=$item.value max=$item.count %}Accepted{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No specs yet.
{% /aggregate %}
{% /card %}

{% card %}
### Decisions

{% aggregate type="decision" value="status:accepted" group="status" %}
{% progress value=$item.value max=$item.count %}Accepted{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No decisions yet.
{% /aggregate %}
{% /card %}

{% card %}
### Milestones

{% aggregate type="milestone" value="status:complete" group="status" %}
{% progress value=$item.value max=$item.count %}Complete{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No milestones yet.
{% /aggregate %}
{% /card %}

## Recent activity

{% plan-activity limit=15 /%}

## Ready work

{% collection type="work" filter="status:ready" sort="priority" group="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

## Recent decisions

{% decision-log sort="date" /%}
