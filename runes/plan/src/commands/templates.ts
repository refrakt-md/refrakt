/**
 * Template functions for plan item scaffolding.
 * Each returns a Markdoc string ready to write to a file.
 */

export type PlanItemType = 'work' | 'bug' | 'decision' | 'spec' | 'milestone';

export const VALID_TYPES: PlanItemType[] = ['work', 'bug', 'decision', 'spec', 'milestone'];

interface TemplateOptions {
	id: string;
	title: string;
	/** Extra attributes as key=value pairs */
	attrs?: Record<string, string>;
}

export function renderTemplate(type: PlanItemType, opts: TemplateOptions): string {
	switch (type) {
		case 'work': return workTemplate(opts);
		case 'bug': return bugTemplate(opts);
		case 'decision': return decisionTemplate(opts);
		case 'spec': return specTemplate(opts);
		case 'milestone': return milestoneTemplate(opts);
	}
}

function attrString(base: Record<string, string>, extra?: Record<string, string>): string {
	const merged = { ...base, ...extra };
	return Object.entries(merged).map(([k, v]) => `${k}="${v}"`).join(' ');
}

function workTemplate({ id, title, attrs }: TemplateOptions): string {
	const a = attrString({ id, status: 'draft', priority: 'medium', complexity: 'unknown', source: '', tags: '' }, attrs);
	return `{% work ${a} %}

# ${title}

Description of the change and why it's needed.

## Acceptance Criteria
- [ ] First criterion
- [ ] Second criterion

## Approach
Technical notes on how to implement.

## References

{% /work %}
`;
}

function bugTemplate({ id, title, attrs }: TemplateOptions): string {
	const a = attrString({ id, status: 'reported', severity: 'major', source: '', tags: '' }, attrs);
	return `{% bug ${a} %}

# ${title}

## Steps to Reproduce
1. First step
2. Second step
3. Observe the problem

## Expected
What should happen.

## Actual
What actually happens.

## Environment
- Package versions

{% /bug %}
`;
}

function decisionTemplate({ id, title, attrs }: TemplateOptions): string {
	const today = new Date().toISOString().slice(0, 10);
	const a = attrString({ id, status: 'proposed', date: today, source: '', tags: '' }, attrs);
	return `{% decision ${a} %}

# ${title}

## Context
Why this decision is needed.

## Options Considered
1. **Option A** — description, pros, cons
2. **Option B** — description, pros, cons

## Decision
Which option was chosen.

## Rationale
Why this option was chosen over the alternatives.

## Consequences
What follows from this decision.

{% /decision %}
`;
}

function specTemplate({ id, title, attrs }: TemplateOptions): string {
	const a = attrString({ id, status: 'draft', tags: '' }, attrs);
	return `{% spec ${a} %}

# ${title}

Brief summary of scope and purpose.

## Overview

{% /spec %}
`;
}

function milestoneTemplate({ id, title, attrs }: TemplateOptions): string {
	const a = attrString({ name: id, status: 'planning' }, attrs);
	return `{% milestone ${a} %}

# ${id} — ${title}

- Goal one
- Goal two
- Goal three

{% /milestone %}
`;
}
