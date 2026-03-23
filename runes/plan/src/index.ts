import type { RunePackage } from '@refrakt-md/types';
import { spec } from './tags/spec.js';
import { work } from './tags/work.js';
import { bug } from './tags/bug.js';
import { decision } from './tags/decision.js';
import { milestone } from './tags/milestone.js';
import { config } from './config.js';

export const plan: RunePackage = {
	name: 'plan',
	displayName: 'Plan',
	version: '0.8.4',
	runes: {
		'spec': {
			transform: spec,
			description: 'Specification document with status tracking, versioning, and entity registry integration',
			reinterprets: { heading: 'spec title', blockquote: 'scope summary', paragraph: 'specification content' },
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
			reinterprets: { heading: 'work item title or section heading', paragraph: 'description', list: 'acceptance criteria or references' },
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
			reinterprets: { heading: 'bug title or section heading', list: 'reproduction steps or environment details', paragraph: 'expected/actual behaviour' },
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
			reinterprets: { heading: 'decision title or section heading', paragraph: 'context, rationale, or consequences', list: 'options considered' },
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
			reinterprets: { heading: 'milestone title', list: 'goals' },
			fixture: `{% milestone name="v0.5.0" target="2026-03-29" status="active" %}
# v0.5.0 — Layout & Tint

- Complete alignment system migration
- Ship tint rune with dark mode support
- Publish layout spec as documentation
{% /milestone %}`,
		},
	},
	theme: {
		runes: config as unknown as Record<string, Record<string, unknown>>,
	},
};

export default plan;

export { scanPlanFiles, parseFile } from './scanner.js';
export type { PlanEntity, PlanRuneType, Criterion, ScanCache, ScanCacheEntry, ScanOptions } from './types.js';
