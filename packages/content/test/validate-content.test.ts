import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import type { PipelineWarning } from '@refrakt-md/types';
import { loadContent } from '../src/site.js';
import { validateContent, type ContentFinding } from '../src/validate-content.js';

const fixtureDir = path.resolve(import.meta.dirname, 'fixtures/validate-content');

/** A build's validation findings, in the shape a comparison can use.
 *  `loadContent` mixes validation findings in with every other pipeline
 *  diagnostic, so filter to `phase: 'validate'` — the rest are register /
 *  aggregate / postProcess findings the fast tier does not claim to produce. */
function buildFindings(warnings: PipelineWarning[]): { severity: string; message: string }[] {
	return warnings
		.filter((w) => w.phase === 'validate')
		.map((w) => ({ severity: w.severity, message: w.message }))
		.sort((a, b) => a.message.localeCompare(b.message));
}

function cliFindings(findings: ContentFinding[]): { severity: string; message: string }[] {
	return findings
		.map((f) => ({ severity: f.severity, message: f.message }))
		.sort((a, b) => a.message.localeCompare(b.message));
}

describe('validateContent (SPEC-135 D14 / WORK-577)', () => {
	describe('the D5a agreement — the CLI and the build cannot disagree', () => {
		it('produces the same findings as a full load, by default', async () => {
			const site = await loadContent(fixtureDir, {});
			const findings = await validateContent(fixtureDir);

			expect(cliFindings(findings)).toEqual(buildFindings(site.pipelineWarnings));
			// Guard against the test passing because both sides are empty.
			expect(findings.length).toBeGreaterThan(0);
		});

		it('agrees on a config with disableIds set — the demote disposition', async () => {
			const siteConfig = { validation: { enabled: true, disableIds: ['attribute-undefined'] } };

			const site = await loadContent(fixtureDir, { siteConfig });
			const findings = await validateContent(fixtureDir, { siteConfig });

			expect(cliFindings(findings)).toEqual(buildFindings(site.pipelineWarnings));
			// `disableIds` demotes rather than drops (WORK-559), so the finding
			// must still be present at `info` on both sides. If either side had
			// reimplemented the dispositions, this is where it would show.
			const demoted = findings.filter((f) => f.id === 'attribute-undefined');
			expect(demoted.length).toBeGreaterThan(0);
			expect(demoted.every((f) => f.severity === 'info')).toBe(true);
		});

		it('agrees when validation is disabled entirely', async () => {
			const siteConfig = { validation: { enabled: false } };

			const site = await loadContent(fixtureDir, { siteConfig });
			const findings = await validateContent(fixtureDir, { siteConfig });

			expect(cliFindings(findings)).toEqual(buildFindings(site.pipelineWarnings));
		});

		// The D14 invariant itself. A `validateContent` that assembled its own
		// tag set would report `tag-undefined` for every plugin rune the build
		// knows about — content that is perfectly correct, flagged by the gate
		// but not the build. This is the disagreement the extraction prevents,
		// so it is the one the test has to be able to see.
		it('agrees on plugin-supplied tags, because both build the config the same way', async () => {
			const additionalTags = {
				pluginsuppliedrune: {
					render: 'div',
					attributes: { flavour: { type: String } },
				},
			};
			const dir = path.resolve(import.meta.dirname, 'fixtures/validate-content-plugin-tag');

			const site = await loadContent(dir, { additionalTags });
			const findings = await validateContent(dir, { additionalTags });

			expect(cliFindings(findings)).toEqual(buildFindings(site.pipelineWarnings));
			// The plugin rune is known to both sides, so it is NOT a finding …
			expect(findings.some((f) => f.message.includes('pluginsuppliedrune'))).toBe(false);
			// … while a genuinely undefined tag in the same file still is, which
			// is what stops this passing because validation simply did nothing.
			expect(findings.some((f) => f.id === 'tag-undefined')).toBe(true);
		});

		it('agrees on a narrowed id allow-list', async () => {
			const siteConfig = { validation: { enabled: true, ids: ['tag-undefined'] } };

			const site = await loadContent(fixtureDir, { siteConfig });
			const findings = await validateContent(fixtureDir, { siteConfig });

			expect(cliFindings(findings)).toEqual(buildFindings(site.pipelineWarnings));
			// An id outside the allow-list is dropped, not demoted — the other
			// half of the three-way refinement.
			expect(findings.some((f) => f.id === 'attribute-undefined')).toBe(false);
			expect(findings.some((f) => f.id === 'tag-undefined')).toBe(true);
		});
	});

	describe('what it returns', () => {
		it('returns findings, never a Site', async () => {
			const findings = await validateContent(fixtureDir);
			expect(Array.isArray(findings)).toBe(true);
			expect(findings).not.toHaveProperty('pages');
			expect(findings).not.toHaveProperty('aggregated');
		});

		it('carries file, url, line, severity, id and message', async () => {
			const findings = await validateContent(fixtureDir);
			const undefinedTag = findings.find((f) => f.id === 'tag-undefined');

			expect(undefinedTag).toBeDefined();
			expect(undefinedTag!.file).toMatch(/\.md$/);
			expect(undefinedTag!.url).toMatch(/^\//);
			expect(typeof undefinedTag!.line).toBe('number');
			expect(undefinedTag!.severity).toBe('error');
			expect(undefinedTag!.message).toContain('tag-undefined');
		});

		it('reports the same line the message renders', async () => {
			const findings = await validateContent(fixtureDir);
			for (const f of findings) {
				if (f.line === undefined) continue;
				expect(f.message).toContain(`(line ${f.line})`);
			}
		});

		it('resolves urls that match the build, not file paths', async () => {
			const site = await loadContent(fixtureDir, {});
			const findings = await validateContent(fixtureDir);
			const buildUrls = new Set(
				site.pipelineWarnings.filter((w) => w.phase === 'validate').map((w) => w.url),
			);

			for (const f of findings) {
				expect(buildUrls.has(f.url)).toBe(true);
			}
		});

		it('accepts a pre-built ContentTree as well as a directory path', async () => {
			const { ContentTree } = await import('../src/content-tree.js');
			const tree = await ContentTree.fromDirectory(fixtureDir);

			const fromTree = await validateContent(tree);
			const fromPath = await validateContent(fixtureDir);

			expect(cliFindings(fromTree)).toEqual(cliFindings(fromPath));
		});
	});

	// The fixture agreement above is necessary but not sufficient: a two-page
	// fixture exercises no snippet, no include, no partials and no real routing.
	// Both divergences found while building this were invisible at fixture scale
	// and obvious here — `loadContent`'s `projectRoot` / sandbox defaults, and
	// the `$file.path` variable surface preprocess needs. This is the test that
	// would have caught them.
	//
	// Heavy real-file integration run (~4s): reads the whole site/ tree twice.
	// Generous timeout for the same reason plan-site-dogfood-real.test.ts has
	// one — under vitest's parallel pool, CPU contention tips it past the
	// default. A genuine hang still fails well inside this bound.
	describe("agreement on refrakt's own site corpus", () => {
		const siteContent = path.resolve(import.meta.dirname, '../../../site/content');

		it('agrees finding-for-finding over the real content tree', { timeout: 60_000 }, async () => {
			const site = await loadContent(siteContent, {});
			const findings = await validateContent(siteContent);

			const build = buildFindings(site.pipelineWarnings);
			const cli = cliFindings(findings);

			// A real corpus, so the counts are large — assert on the sets, and
			// report the difference rather than just a boolean if it breaks.
			const onlyBuild = build.filter((b) => !cli.some((c) => c.message === b.message));
			const onlyCli = cli.filter((c) => !build.some((b) => b.message === c.message));
			expect({ onlyBuild, onlyCli }).toEqual({ onlyBuild: [], onlyCli: [] });
			expect(cli.length).toBe(build.length);
			expect(cli.length).toBeGreaterThan(100);
		});
	});

	describe('what it skips', () => {
		// D3's whole point: the default tier must not pay for the cross-page
		// pipeline, or the command costs a build and nobody runs it on save.
		it('is materially cheaper than a full load of the same tree', async () => {
			// Warm both paths first so neither pays module-init or fs-cache cost
			// in the measured run.
			await loadContent(fixtureDir, {});
			await validateContent(fixtureDir);

			const t0 = performance.now();
			await validateContent(fixtureDir);
			const fast = performance.now() - t0;

			const t1 = performance.now();
			await loadContent(fixtureDir, {});
			const full = performance.now() - t1;

			// Deliberately a loose bound. The point is to catch a regression that
			// makes the fast tier call the pipeline after all — not to pin a
			// ratio that turns CI red on a noisy runner.
			expect(fast).toBeLessThan(full);
		});
	});
});
