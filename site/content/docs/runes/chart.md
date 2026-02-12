---
title: Chart
description: Chart visualization from a Markdown table
---

# Chart

Turns a Markdown table into a chart. The first column becomes axis labels, the header row becomes series names, and data cells become values.

```markdoc
{% chart type="bar" title="Monthly Revenue" %}
| Month | Revenue | Expenses |
|-------|---------|----------|
| Jan   | 4200    | 3100     |
| Feb   | 5100    | 3400     |
| Mar   | 4800    | 3200     |
{% /chart %}
```

### Example

{% chart type="bar" title="Monthly Revenue" %}
| Month | Revenue | Expenses |
|-------|---------|----------|
| Jan   | 4200    | 3100     |
| Feb   | 5100    | 3400     |
| Mar   | 4800    | 3200     |
| Apr   | 6200    | 3800     |
{% /chart %}

### Line chart

{% chart type="line" title="User Growth" %}
| Quarter | Users |
|---------|-------|
| Q1 2024 | 1000  |
| Q2 2024 | 2500  |
| Q3 2024 | 5000  |
| Q4 2024 | 8500  |
{% /chart %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `bar` | Chart type: `bar`, `line`, `pie`, or `area` |
| `title` | `string` | — | Chart title |
| `stacked` | `boolean` | `false` | Stack series values |
