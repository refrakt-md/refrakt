import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EntityRegistryImpl, loadContent } from '@refrakt-md/content';
import { coreConfig, defineRune, mergePlugins, runes as coreRunes } from '@refrakt-md/runes';
import { createTransform } from '@refrakt-md/transform';
import type { EntityRegistration } from '@refrakt-md/types';
import { design } from '../src/index.js';

/**
 * SPEC-144 D4 — the gate for migrating design's registration onto `registers`
 * (WORK-613).
 *
 * Captured from the hand-written `register` / `aggregate` hooks *before* the
 * migration, over the fixture site beside this file, and committed. The
 * migrated code must reproduce it exactly — every `design-context`
 * registration in order, and the tokens `postProcess` injects into each
 * `sandbox` from it.
 *
 * Never regenerate the snapshot to make this pass. Set
 * `REFRAKT_WRITE_REGISTRY_SNAPSHOT=1` only when the registry is *meant* to
 * change, and review the diff.
 */

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = join(here, 'fixtures', 'registry-site');
const snapshotPath = join(here, 'fixtures', 'registry-snapshot.json');

/** The plugin as the loader would merge it, built from *source* — `loadPlugin`
 *  imports the package's `dist/`, which would test the last build. */
function mergedPlugin() {
	const runes = Object.fromEntries(
		Object.entries(design.runes).map(([name, entry]) => [
			name,
			defineRune({ name, schema: entry.transform as never, aliases: entry.aliases }),
		]),
	);
	return mergePlugins(
		[{ pkg: design, npmName: '@refrakt-md/design', runes, fixtures: {}, fileRoots: {} }],
		new Set(Object.keys(coreRunes)),
	);
}

async function capture(): Promise<Record<string, unknown>> {
	const spy = vi.spyOn(EntityRegistryImpl.prototype, 'register');
	const merged = mergedPlugin();
	const site = await loadContent(siteDir, {
		plugins: merged.plugins,
		additionalTags: merged.tags,
		reporter: () => {},
	});

	const registrations = spy.mock.calls
		.map(([entry]) => entry as EntityRegistration)
		.filter((e) => e.type === 'design-context');

	// What `postProcess` injected into each sandbox, page by page.
	const injected: Record<string, string[]> = {};
	for (const page of site.pages) {
		const found: string[] = [];
		collectInjected(page.renderable, found);
		if (found.length > 0) injected[page.route.url] = found;
	}

	const warnings = site.pipelineWarnings
		.filter((w) => w.pluginName === 'design')
		.map((w) => `${w.phase} ${w.severity} ${w.url ?? ''}: ${w.message}`);

	return {
		// JSON round-trip: what is compared is exactly what serialises, key
		// order included.
		registrations: JSON.parse(JSON.stringify(registrations)),
		injected,
		warnings,
	};
}

function collectInjected(node: unknown, out: string[]): void {
	if (Array.isArray(node)) {
		for (const c of node) collectInjected(c, out);
		return;
	}
	if (!node || typeof node !== 'object') return;
	const n = node as { attributes?: Record<string, unknown>; children?: unknown[] };
	if (n.attributes?.['data-design-tokens'] !== undefined)
		out.push(String(n.attributes['data-design-tokens']));
	for (const c of n.children ?? []) collectInjected(c, out);
}

/** The committed file, re-serialised compactly: Biome owns its layout, and
 *  parsing keeps key order, so formatting cannot pass or fail the gate. */
function committed(path: string): string {
	return JSON.stringify(JSON.parse(readFileSync(path, 'utf-8')));
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('design registry snapshot (SPEC-144 D4)', () => {
	it('matches the registry captured before the migration', async () => {
		const snapshot = await capture();
		const serialised = `${JSON.stringify(snapshot, null, 2)}\n`;
		if (process.env.REFRAKT_WRITE_REGISTRY_SNAPSHOT === '1')
			writeFileSync(snapshotPath, serialised);
		expect(existsSync(snapshotPath), 'the committed snapshot is missing').toBe(true);
		// Compared as compact text, so key order inside every data bag counts.
		expect(JSON.stringify(snapshot)).toBe(committed(snapshotPath));
	});
});

/** Every `rf-sandbox` element in a rendered tree. */
function sandboxes(
	node: unknown,
	out: Array<{ attributes: Record<string, unknown>; children: unknown[] }> = [],
) {
	if (Array.isArray(node)) {
		for (const c of node) sandboxes(c, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	const n = node as { name?: string; attributes?: Record<string, unknown>; children?: unknown[] };
	if (n.name === 'rf-sandbox')
		out.push({ attributes: n.attributes ?? {}, children: n.children ?? [] });
	for (const c of n.children ?? []) sandboxes(c, out);
	return out;
}

describe('design tokens reach the sandbox host (BUG-034)', () => {
	it("the rendered `rf-sandbox` carries its context's tokens as `data-design-tokens`", async () => {
		const merged = mergedPlugin();
		const site = await loadContent(siteDir, {
			plugins: merged.plugins,
			additionalTags: merged.tags,
			reporter: () => {},
		});
		const page = site.pages.find((p) => p.route.url === '/usage')!;
		const rendered = createTransform(coreConfig)(JSON.parse(JSON.stringify(page.renderable)));
		const [byDefault, dark, missing] = sandboxes(rendered);

		// The attribute the `rf-sandbox` behaviour reads (`dataset.designTokens`).
		const tokens = JSON.parse(String(byDefault.attributes['data-design-tokens']));
		expect(tokens.colors.map((c: { name: string }) => c.name)).toEqual(['Primary', 'Accent']);
		expect(JSON.parse(String(dark.attributes['data-design-tokens']))).not.toEqual(tokens);
		expect(missing.attributes['data-design-tokens']).toBeUndefined();

		// And no stray child carrying them, as there was before.
		expect(JSON.stringify(rendered)).not.toContain('"data-field":"design-tokens"');
	});
});
