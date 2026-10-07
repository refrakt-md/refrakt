import { describe, it, expect } from 'vitest';
import type { Schema } from '@markdoc/markdoc';
import { schemaEmits } from '@refrakt-md/runes';
import { parse } from './helpers.js';
import { plan } from '../src/index.js';
import { workEmits } from '../src/tags/work.js';
import { bugEmits } from '../src/tags/bug.js';
import { decisionEmits } from '../src/tags/decision.js';

/**
 * SPEC-143 D7 — `work`, `bug` and `decision` move from a hand-written
 * `transform` to the slot declaration, and the gate is byte-identical output.
 *
 * The SEO baseline does not cover these runes (they emit no structured data),
 * and the structure contract is derived from config, so neither would notice a
 * change in what the schema transform builds. This snapshot was recorded
 * against the hand-written transforms, in its own commit, before the migration;
 * the migration commit must leave it untouched. Every input that exercises a
 * branch of the old code is here: blurb present / absent, sections absent,
 * known sections and their aliases, unknown sections, thematic breaks inside a
 * section, repeated headings, nested runes, inline markup in the title, and
 * file-variable fallbacks for `created` / `modified`.
 */

const BODIES = {
	minimal: `# Title only`,
	blurb: `# A *styled* \`title\`

First paragraph of the blurb.

Second paragraph of the blurb.`,
	sections: `# Sectioned

Lead paragraph.

## Acceptance Criteria
- [ ] One
- [x] Two

## Criteria

Alias of a known section.

## Approach

Before the break.

---

After the break.

## Something Unrecognised

{% hint type="warning" %}
Nested rune.
{% /hint %}

## Something Unrecognised

The same heading twice.

## References

- One
- Two`,
	noBlurb: `# No blurb

## Context

Straight into a section.`,
	bugSections: `# Crash on save

It crashes.

## Steps to Reproduce
1. Open
2. Save

## Expected Behaviour
No crash.

## Actual

Crash.

## Env

Linux.`,
	decisionSections: `# Pick a database

## Background

We need one.

## Alternatives

- A
- B

## Decision

A.

## Reasoning

Because.

## Trade-offs

Some.`,
	empty: ``,
};

const OPENERS = {
	work: [
		`{% work id="WORK-1" %}`,
		`{% work id="WORK-2" status="in-progress" priority="critical" complexity="complex" assignee="alice" milestone="v1.0" source="SPEC-1,ADR-2" supersedes="WORK-0" pr="refrakt-md/refrakt#1" tags="a,b" created="2026-01-01" modified="2026-02-02" %}`,
	],
	bug: [
		`{% bug id="BUG-1" %}`,
		`{% bug id="BUG-2" status="fixed" severity="minor" assignee="bob" milestone="v2" source="SPEC-9" pr="refrakt-md/refrakt#2" tags="x" created="2026-03-03" modified="2026-04-04" %}`,
	],
	decision: [
		`{% decision id="ADR-1" %}`,
		`{% decision id="ADR-2" status="accepted" date="2026-05-05" supersedes="ADR-0" source="SPEC-3" tags="y" created="2026-06-06" modified="2026-07-07" %}`,
	],
} as const;

const FILE_VARS = { file: { created: '2025-12-12', modified: '2025-12-13' } };

describe('plan entity runes: output is pinned across the slot-declaration migration', () => {
	for (const [rune, openers] of Object.entries(OPENERS)) {
		openers.forEach((opener, i) => {
			for (const [bodyName, body] of Object.entries(BODIES)) {
				for (const withFile of [false, true]) {
					const label = `${rune} #${i} / ${bodyName}${withFile ? ' / file vars' : ''}`;
					it(label, () => {
						const out = parse(`${opener}\n${body}\n{% /${rune} %}`, withFile ? FILE_VARS : {});
						expect(JSON.stringify(out, null, 1)).toMatchSnapshot();
					});
				}
			}
		});
	}
});

describe('plan entity runes: declared, not transformed (SPEC-143)', () => {
	const declared = { work: workEmits, bug: bugEmits, decision: decisionEmits };
	for (const [name, emits] of Object.entries(declared)) {
		it(`${name}: the declaration round-trips through JSON unchanged`, () => {
			expect(JSON.parse(JSON.stringify(emits))).toEqual(emits);
		});
		it(`${name}: the schema carries the declaration and no hand-written transform`, () => {
			const schema = plan.runes[name].transform as Schema;
			expect(schemaEmits.get(schema)).toBe(emits);
		});
		it(`${name}: the sections join table is the one derived from the slots`, () => {
			expect(plan.theme?.runes?.[name[0].toUpperCase() + name.slice(1)]?.sections).toEqual({
				title: 'title',
				blurb: 'description',
				body: 'body',
			});
		});
	}
});
