import { describe, it, expect } from 'vitest';
import type { RuneConfig } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// WORK-608 — a RuneConfig is plain data, so a rune definition can cross a JSON
// boundary (SPEC-143). `postTransform` is the one deliberate exception: it is
// the imperative escape hatch (SPEC-081) and stays a function.

const sources: [string, Record<string, RuneConfig>][] = [
	['core', baseConfig.runes as Record<string, RuneConfig>],
	...(
		[
			['marketing', marketing],
			['docs', docs],
			['storytelling', storytelling],
			['places', places],
			['business', business],
			['design', design],
			['learning', learning],
			['media', media],
			['plan', plan],
		] as const
	).map(([name, p]) => [name, (p.theme?.runes ?? {}) as Record<string, RuneConfig>] as const),
];

const configs = sources.flatMap(([source, runes]) =>
	Object.entries(runes).map(([name, config]) => [`${source}:${name}`, config] as const),
);

/** Paths to every function value inside a config. */
function functionPaths(value: unknown, path: string[] = [], out: string[][] = []): string[][] {
	if (typeof value === 'function') out.push(path);
	else if (value && typeof value === 'object') {
		for (const [k, v] of Object.entries(value)) functionPaths(v, [...path, k], out);
	}
	return out;
}

const withoutPostTransform = (config: RuneConfig) => {
	const { postTransform: _escapeHatch, ...data } = config;
	return data;
};

describe('RuneConfig is serialisable data (WORK-608)', () => {
	it('covers every core and plugin rune', () => {
		expect(configs.length).toBeGreaterThan(100);
	});

	it('has postTransform as its only function-typed field', () => {
		const offenders = configs.flatMap(([rune, config]) =>
			functionPaths(config)
				.filter((path) => path.join('.') !== 'postTransform')
				.map((path) => `${rune} → ${path.join('.')}`),
		);
		expect(offenders).toEqual([]);
	});

	it.each(configs)('%s round-trips through JSON unchanged', (_rune, config) => {
		const data = withoutPostTransform(config);
		expect(JSON.parse(JSON.stringify(data))).toEqual(data);
	});
});
