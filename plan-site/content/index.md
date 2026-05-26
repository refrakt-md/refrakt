---
title: Plan
description: refrakt.md plan dashboard — progress, recent activity, ready work, and architecture decisions.
---

# refrakt plan

A live dashboard built from the same `plan/` tree the project commits to git. Every entity below resolves through the standard refrakt pipeline — `entityRoutes` generates a detail page per spec/work/bug/decision/milestone, and `collection` lists them here.

## Progress

{% plan-progress /%}

## Recent activity

{% plan-activity limit=15 /%}

## Ready work

{% collection type="work" filter="status:ready" sort="priority" group="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

## Recent decisions

{% decision-log sort="date" /%}
