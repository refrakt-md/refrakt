import type { RunePackage } from '@refrakt-md/types';
import { tabsBehavior } from '@refrakt-md/behaviors';
import { entityTabsBehavior } from './entity-tabs-behavior.js';
import { spec } from './tags/spec.js';
import { work } from './tags/work.js';
import { bug } from './tags/bug.js';
import { decision } from './tags/decision.js';
import { milestone } from './tags/milestone.js';
import { backlog } from './tags/backlog.js';
import { decisionLog } from './tags/decision-log.js';
import { planProgress } from './tags/plan-progress.js';
import { planActivity } from './tags/plan-activity.js';
import { planHistory } from './tags/plan-history.js';
import { config } from './config.js';
import { planPipelineHooks } from './pipeline.js';

export const plan: RunePackage = {
	name: 'plan',
	displayName: 'Plan',
	version: '0.9.8',
	runes: {
		'spec': {
			transform: spec,
			description: 'Specification document with status tracking, versioning, and entity registry integration',
			fixture: `{% spec id="SPEC-001" status="accepted" version="1.0" %}
# Authentication System

> Token-based authentication for the API layer.

Users authenticate via JWT tokens issued by the auth endpoint.
Tokens expire after 24 hours and can be refreshed.
{% /spec %}`,
		},
		'work': {
			transform: work,
			aliases: ['task'],
			description: 'Work item with acceptance criteria, references, and implementation tracking',
			fixture: `{% work id="RF-142" status="ready" priority="high" complexity="moderate" milestone="v0.5.0" %}
# Implement dark mode support

The theme needs dual light/dark token definitions.

## Acceptance Criteria
- [ ] Accepts light and dark content sections
- [ ] Theme CSS swaps tokens in dark mode
- [ ] Falls back to page tokens when dark values absent

## Approach
Use CSS custom properties with media query swapping.
{% /work %}`,
		},
		'bug': {
			transform: bug,
			description: 'Bug report with structured reproduction steps and severity tracking',
			fixture: `{% bug id="RF-201" status="confirmed" severity="major" %}
# Showcase bleed breaks with overflow:hidden parent

## Steps to Reproduce
1. Create a section with overflow: hidden
2. Add a showcase with bleed="top" inside
3. Observe the rendered output

## Expected
Showcase extends above the section boundary.

## Actual
Showcase is clipped at the section edge.
{% /bug %}`,
		},
		'decision': {
			transform: decision,
			aliases: ['adr'],
			description: 'Architecture decision record capturing context, options, decision, rationale, and consequences',
			fixture: `{% decision id="ADR-007" status="accepted" date="2026-03-11" %}
# Use CSS custom properties for token injection

## Context
Tint runes need to override colour tokens within a section scope.

## Options Considered
1. **CSS custom properties** — inline styles setting tokens
2. **Generated CSS classes** — build step creates per-tint classes
3. **JavaScript runtime** — behaviour script reads data attributes

## Decision
CSS custom properties via inline styles on the container element.

## Rationale
Custom properties cascade naturally without JavaScript.

## Consequences
- Themes must include bridge CSS
- Inline styles cannot use media queries
{% /decision %}`,
		},
		'milestone': {
			transform: milestone,
			description: 'Named release target with scope, goals, and status tracking',
			fixture: `{% milestone name="v0.5.0" target="2026-03-29" status="active" %}
# v0.5.0 — Layout & Tint

- Complete alignment system migration
- Ship tint rune with dark mode support
- Publish layout spec as documentation
{% /milestone %}`,
		},
		'backlog': {
			transform: backlog,
			description: 'Aggregation view of work items and bugs with filtering, sorting, and grouping',
			fixture: `{% backlog filter="status:ready" sort="priority" group="status" /%}`,
		},
		'decision-log': {
			transform: decisionLog,
			description: 'Chronological view of architecture decision records',
			fixture: `{% decision-log sort="date" /%}`,
		},
		'plan-progress': {
			transform: planProgress,
			description: 'Progress summary showing status counts per entity type',
			fixture: `{% plan-progress /%}`,
		},
		'plan-activity': {
			transform: planActivity,
			description: 'Recent activity feed sorted by file modification time',
			fixture: `{% plan-activity limit="10" /%}`,
		},
		'plan-history': {
			transform: planHistory,
			description: 'Git-native entity history timeline showing attribute transitions, criteria progress, and lifecycle events',
			fixture: `{% plan-history limit="20" /%}`,
		},
	},
	theme: {
		runes: config as unknown as Record<string, Record<string, unknown>>,
	},
	behaviors: {
		'milestone-backlog': tabsBehavior,
		'plan-entity-tabs': entityTabsBehavior,
	},
	pipeline: planPipelineHooks,
};

export default plan;

export { planPipelineHooks } from './pipeline.js';
export { parseFileContent, scanPlanSources } from './scanner.js';
export type { PlanEntity, PlanRuneType, Criterion, FileSource, ScanCache, ScanCacheEntry, ScanOptions } from './types.js';
