import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { baseConfig } from '@refrakt-md/runes';
import type { RuneConfig } from '@refrakt-md/transform';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// WORK-538 — `prominence` reaches a rune's title through a variable chain:
//
//   [data-prominence="display"] { --rf-prominence-size: calc(--rf-title-size * 5/3) }
//   [data-section="title"]      { font-size: var(--rf-prominence-size, var(--rf-title-size)) }
//
// A rune stylesheet that sets `font-size` on its own title element *outside*
// that chain wins the cascade (rune CSS is imported after dimensions/, at equal
// specificity) and silently takes the axis away. That is how the axis came to be
// inert on eight runes without anyone noticing — `{% hero prominence="display" %}`
// did nothing at all.
//
// This is the guard. It reads the same declarations the axis does, so it fails
// on the shape of the mistake rather than on a hard-coded list of runes.

const plugins = { marketing, docs, storytelling, places, business, design, learning, media, plan };

const allRunes: Record<string, RuneConfig> = { ...baseConfig.runes };
for (const plugin of Object.values(plugins)) {
	Object.assign(allRunes, plugin.theme?.runes as Record<string, RuneConfig>);
}

/** Every `.rf-{block}__{slot}` whose slot carries the `title` role. */
function titleSelectors(): Array<{ rune: string; selector: string }> {
	const out: Array<{ rune: string; selector: string }> = [];
	for (const [rune, config] of Object.entries(allRunes)) {
		for (const [slot, role] of Object.entries(config.sections ?? {})) {
			if (role === 'title') out.push({ rune, selector: `.rf-${config.block}__${slot}` });
		}
	}
	return out;
}

/** Lumina's rune stylesheets, concatenated. */
function runeCss(): string {
	const dir = join(__dirname, '..', 'styles', 'runes');
	return readdirSync(dir)
		.filter((f) => f.endsWith('.css'))
		.map((f) => readFileSync(join(dir, f), 'utf-8'))
		.join('\n');
}

/** The `font-size` a rule declares for `selector`, if any. Matches the selector
 *  as one of a comma-separated group, so `.rf-hero h1, .rf-hero__headline` is
 *  found for `.rf-hero__headline`. */
function declaredFontSize(css: string, selector: string): string | null {
	const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const rule = new RegExp(`(^|[,{}])([^{}]*${esc}[^{}]*)\\{([^}]*)\\}`, 'gs');
	for (const m of css.matchAll(rule)) {
		// The selector must appear as a whole compound, not as a prefix of a longer
		// class (`.rf-hero__headline-note`) or inside a descendant of it.
		const selectors = m[2].split(',').map((s) => s.trim());
		if (!selectors.some((s) => s === selector || s.endsWith(` ${selector}`))) continue;
		// Lookbehind rather than an anchor: the declaration is often preceded by a
		// comment, so requiring `^` or `;` before it silently found nothing — which
		// is exactly how this guard failed to fire the first time it was written.
		const fs = m[3].match(/(?<![-\w])font-size\s*:\s*([^;]+)/);
		if (fs) return fs[1].trim();
	}
	return null;
}

describe('prominence reaches every title-role rune', () => {
	const css = runeCss();
	const targets = titleSelectors();

	it('finds the title selectors to check', () => {
		// A guard on the guard: if this collapses to nothing the checks below
		// would pass by testing an empty set.
		expect(targets.length).toBeGreaterThan(30);
	});

	it('no rune stylesheet pins a title font-size outside the prominence chain', () => {
		const offenders: string[] = [];
		for (const { rune, selector } of targets) {
			const value = declaredFontSize(css, selector);
			if (value === null) continue; // inherits from [data-section="title"] — fine
			if (/--rf-prominence-size/.test(value)) continue; // reads the override — fine
			offenders.push(`${rune}: ${selector} { font-size: ${value} }`);
		}
		// A rune may absolutely set its own resting size — as `--rf-title-size` on
		// its root, which the ramp then scales around. What it may not do is set
		// `font-size` on the title element directly, which severs the chain.
		expect(offenders).toEqual([]);
	});

	it('a rune stating its own resting size does so on the root', () => {
		// The ramp computes `calc(var(--rf-title-size) * …)` on the rune root, so a
		// resting size declared on the title element instead would be invisible to
		// it — the axis would still be inert, just less obviously.
		for (const block of ['hero', 'cta', 'blog', 'bento-cell', 'palette', 'typography', 'spacing', 'design-context']) {
			const root = new RegExp(`\\.rf-${block}\\s*\\{[^}]*--rf-title-size\\s*:`, 's');
			expect(root.test(css), `.rf-${block} should declare its resting --rf-title-size`).toBe(true);
		}
	});
});
