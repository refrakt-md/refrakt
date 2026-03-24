{% work id="WORK-005" status="pending" priority="medium" tags="runes, core" milestone="v1.0.0" %}

# Build `stat` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes)

## Summary

Key metric display — a prominent number with label and optional trend indicator. Used for dashboards, KPI sections, and data highlights. Alias: `metric`. This is a core rune.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `value` | String | — | Yes | The metric value (e.g., `"99.9%"`, `"$4.2M"`) |
| `label` | String | — | Yes | What the metric measures |
| `trend` | String | — | No | Trend direction: `up`, `down`, `flat` |
| `change` | String | — | No | Change amount (e.g., `"+12%"`) |
| `icon` | String | — | No | Icon name from theme icon registry |

## Content Model

- Self-closing or minimal content
- Optional paragraph child becomes a description/context line

## Transform Output

- typeof: `Stat`
- Tag: `<div>`
- Properties: `value` (span), `label` (span), `trend`, `change` (span), `icon`
- Refs: `description` (p, if content provided)

## Implementation Tasks

1. Create schema in `packages/runes/src/tags/stat.ts`
2. Add RuneConfig entry in `packages/runes/src/config.ts` — mostly declarative (modifiers for `trend`, structure injection for value/label/change)
3. Write CSS in `packages/lumina/styles/runes/stat.css`
4. Import CSS in `packages/lumina/index.css`
5. Write tests in `packages/runes/test/tags/stat.test.ts`
6. Create inspector fixture
7. Run CSS coverage tests

## Dependencies

None — fully declarative, no JS needed.

{% /work %}
