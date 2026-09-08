import { describe, it, expect } from 'vitest';
import { declaredSlots, lintSectionRoles } from '../src/section-roles.js';
import { validateThemeConfig } from '../src/validate.js';
import type { RuneConfig, ThemeConfig } from '../src/types.js';

// SPEC-125 Phase 1 / WORK-532 — the shared "declared slots" helper and the lint
// built on it. The catalogue-wide run lives in `packages/lumina`, which is the
// only package that can see core and all nine plugins at once; these are the
// unit-level rules.

const themeConfig = (runes: Record<string, RuneConfig>): ThemeConfig =>
	({ prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes });

describe('declaredSlots', () => {
	it('collects layout container keys and their children', () => {
		const slots = declaredSlots({
			block: 'card',
			layout: {
				root: ['media', 'content'],
				content: { tag: 'div', children: ['eyebrow', 'body', 'footer'] },
			},
		});
		// `root` is the layout's entry point, not a slot of its own.
		expect(slots.has('root')).toBe(false);
		expect([...slots].sort()).toEqual(['body', 'content', 'eyebrow', 'footer', 'media']);
	});

	it('collects structure keys and nested refs', () => {
		const slots = declaredSlots({
			block: 'hint',
			structure: {
				header: { tag: 'div', ref: 'header', children: [{ tag: 'span', ref: 'title' }] },
			},
		});
		expect([...slots].sort()).toEqual(['header', 'title']);
	});

	it('collects autoLabel values, block keys and the content wrapper ref', () => {
		const slots = declaredSlots({
			block: 'w',
			autoLabel: { span: 'header', p: 'body' },
			blocks: { metadata: { fields: ['a'], layout: 'bar' } },
			contentWrapper: { tag: 'div', ref: 'content' },
		});
		expect([...slots].sort()).toEqual(['body', 'content', 'header', 'metadata']);
	});

	it('is empty for a rune that declares nothing', () => {
		expect(declaredSlots({ block: 'badge' }).size).toBe(0);
	});
});

describe('lintSectionRoles — missing body role', () => {
	it('flags a body slot with no body role', () => {
		const findings = lintSectionRoles({ Widget: { block: 'widget', layout: { root: ['body'] } } });
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({ rune: 'Widget', slot: 'body', kind: 'missing-body-role' });
	});

	it('is quiet once the role is mapped', () => {
		expect(lintSectionRoles({
			Widget: { block: 'widget', layout: { root: ['body'] }, sections: { body: 'body' } },
		})).toEqual([]);
	});

	it('is quiet when another slot already carries the body role', () => {
		// Blog maps `content → body`, DataTable `table → body`. The region is
		// declared, just under a different name.
		expect(lintSectionRoles({
			Blog: { block: 'blog', layout: { root: ['body', 'content'] }, sections: { content: 'body' } },
		})).toEqual([]);
	});

	it('is quiet for a rune with no body slot at all', () => {
		// The ~105 genuinely bodyless runes must produce no noise.
		expect(lintSectionRoles({ Badge: { block: 'badge' } })).toEqual([]);
	});
});

describe('lintSectionRoles — missing header role', () => {
	it.each(['title', 'header', 'headline', 'name'])('flags a `%s` slot with no header-ish role', (slot) => {
		const findings = lintSectionRoles({ Widget: { block: 'widget', layout: { root: [slot] } } });
		expect(findings).toEqual([expect.objectContaining({ slot, kind: 'missing-header-role' })]);
	});

	it.each(['header', 'preamble', 'title', 'description'])('is quiet when the rune declares a `%s` role', (role) => {
		expect(lintSectionRoles({
			Widget: { block: 'widget', layout: { root: ['title'] }, sections: { title: role as never } },
		})).toEqual([]);
	});

	it('reports at most one header finding per rune', () => {
		const findings = lintSectionRoles({
			Widget: { block: 'widget', layout: { root: ['title', 'header', 'name'] } },
		});
		expect(findings.filter((f) => f.kind === 'missing-header-role')).toHaveLength(1);
	});
});

describe('lintSectionRoles — direction only', () => {
	it('never flags a role that is present on a non-prose region', () => {
		// SPEC-125 Direction 2: `body` on a table is an overload of the role's
		// meaning, not a data error. Flagging it here would push someone toward
		// removing a role the theme styles.
		expect(lintSectionRoles({
			DataTable: { block: 'datatable', layout: { root: ['table'] }, sections: { table: 'body' } },
		})).toEqual([]);
	});
});

describe('sectionRoleExceptions', () => {
	it('silences exactly its own slot', () => {
		const base: RuneConfig = { block: 'widget', layout: { root: ['body', 'title'] } };
		expect(lintSectionRoles({ Widget: base }).map((f) => f.slot)).toEqual(['body', 'title']);
		expect(lintSectionRoles({
			Widget: { ...base, sectionRoleExceptions: { body: 'the region is a control, not prose' } },
		}).map((f) => f.slot)).toEqual(['title']);
	});
});

describe('validateThemeConfig integration', () => {
	it('reports drift as an error, not a warning', () => {
		// The failure mode being closed is a silent one, so it has to fail rather
		// than scroll past in a build log.
		const res = validateThemeConfig(themeConfig({
			Widget: { block: 'widget', layout: { root: ['body'] } },
		}));
		expect(res.valid).toBe(false);
		expect(res.errors.some((e) => e.path === 'runes.Widget.sections')).toBe(true);
		expect(res.warnings.some((w) => w.path === 'runes.Widget.sections')).toBe(false);
	});

	it('passes a rune that maps its slots', () => {
		const res = validateThemeConfig(themeConfig({
			Widget: { block: 'widget', layout: { root: ['body', 'title'] }, sections: { body: 'body', title: 'title' } },
		}));
		expect(res.valid).toBe(true);
	});
});
