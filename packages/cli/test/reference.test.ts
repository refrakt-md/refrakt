import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	runes as coreRunes,
	type ReferenceContext,
} from '@refrakt-md/runes';
import {
	referenceNameCommand,
	referenceListCommand,
	referenceDumpCommand,
} from '../src/commands/reference.js';

/** A minimal ReferenceContext using only core runes, so tests don't need the refrakt config file. */
function buildTestContext(): ReferenceContext {
	const source: Record<string, string> = {};
	for (const name of Object.keys(coreRunes)) {
		source[name] = 'core';
	}
	return { runes: coreRunes, fixtures: {}, source };
}

describe('referenceNameCommand', () => {
	const ctx = buildTestContext();

	it('returns markdown for a known rune', () => {
		const result = referenceNameCommand(ctx, { name: 'hint', format: 'markdown', noExample: false });
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain('### hint');
		expect(result.output).toContain('Attributes:');
		expect(result.output).toContain('Example:');
	});

	it('resolves rune by alias', () => {
		const result = referenceNameCommand(ctx, { name: 'callout', format: 'markdown', noExample: false });
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain('### hint');
	});

	it('returns exit code 1 for unknown rune', () => {
		const result = referenceNameCommand(ctx, { name: 'nonexistent', format: 'markdown', noExample: false });
		expect(result.exitCode).toBe(1);
		expect(result.output).toContain('Unknown rune');
	});

	it('outputs valid JSON with --format json', () => {
		const result = referenceNameCommand(ctx, { name: 'hint', format: 'json', noExample: false });
		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.output);
		expect(parsed.name).toBe('hint');
		expect(parsed.package).toBe('core');
		expect(parsed.aliases).toContain('callout');
		expect(parsed.attributes).toBeDefined();
		expect(parsed.attributes.own).toBeDefined();
		expect(parsed.attributes.universal).toBeInstanceOf(Array);
	});

	it('suppresses example block with --no-example (markdown)', () => {
		const result = referenceNameCommand(ctx, { name: 'hint', format: 'markdown', noExample: true });
		expect(result.exitCode).toBe(0);
		expect(result.output).not.toContain('Example:');
	});

	it('suppresses example field with --no-example (json)', () => {
		const result = referenceNameCommand(ctx, { name: 'hint', format: 'json', noExample: true });
		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.output);
		expect(parsed.example).toBeUndefined();
	});

	it('categorizes universal attributes separately in JSON', () => {
		const result = referenceNameCommand(ctx, { name: 'hint', format: 'json', noExample: true });
		const parsed = JSON.parse(result.output);
		const universal = parsed.attributes.universal as string[];
		expect(universal.length).toBeGreaterThan(0);
		// Universal attributes should not appear in own
		for (const name of universal) {
			expect(parsed.attributes.own[name]).toBeUndefined();
		}
	});
});

describe('referenceListCommand', () => {
	const ctx = buildTestContext();

	it('lists core runes in markdown', () => {
		const result = referenceListCommand(ctx, { format: 'markdown' });
		expect(result.exitCode).toBe(0);
		expect(result.output).toContain('## @refrakt-md/runes (core)');
		expect(result.output).toContain('- hint');
	});

	it('excludes child-only runes from output', () => {
		const result = referenceListCommand(ctx, { format: 'markdown' });
		// accordion-item, budget-category, etc. should not appear
		expect(result.output).not.toMatch(/^- accordion-item/m);
		expect(result.output).not.toMatch(/^- budget-category/m);
		expect(result.output).not.toMatch(/^- note /m);
	});

	it('outputs valid JSON with --format json', () => {
		const result = referenceListCommand(ctx, { format: 'json' });
		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.output);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed[0].package).toBe('core');
		expect(parsed[0].runes).toBeInstanceOf(Array);
		const names = parsed[0].runes.map((r: { name: string }) => r.name);
		expect(names).toContain('hint');
	});

	it('returns exit code 1 when --package has no matches', () => {
		const result = referenceListCommand(ctx, { format: 'markdown', packageFilter: 'nonexistent' });
		expect(result.exitCode).toBe(1);
		expect(result.output).toContain('No runes found');
	});

	it('filters by package', () => {
		const result = referenceListCommand(ctx, { format: 'json', packageFilter: 'core' });
		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.output);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].package).toBe('core');
	});
});

describe('referenceDumpCommand', () => {
	const ctx = buildTestContext();
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'refrakt-ref-'));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it('writes a markdown file with the expected structure', () => {
		const outputPath = join(tempDir, 'AGENTS.md');
		const result = referenceDumpCommand(ctx, {
			output: outputPath,
			format: 'markdown',
			section: '# Available Runes',
			check: false,
		});
		expect(result.exitCode).toBe(0);
		expect(result.wrote).toBe(true);
		expect(existsSync(outputPath)).toBe(true);
		const content = readFileSync(outputPath, 'utf-8');
		expect(content).toContain('# Available Runes');
		expect(content).toContain('## Universal Attributes');
		expect(content).toContain('## Attribute Presets');
		expect(content).toContain('## @refrakt-md/runes (core)');
		expect(content).toContain('### hint');
	});

	it('is deterministic (byte-identical across runs)', () => {
		const pathA = join(tempDir, 'A.md');
		const pathB = join(tempDir, 'B.md');
		referenceDumpCommand(ctx, { output: pathA, format: 'markdown', section: '# Available Runes', check: false });
		referenceDumpCommand(ctx, { output: pathB, format: 'markdown', section: '# Available Runes', check: false });
		expect(readFileSync(pathA, 'utf-8')).toBe(readFileSync(pathB, 'utf-8'));
	});

	it('--check exits 0 when file is up to date', () => {
		const outputPath = join(tempDir, 'AGENTS.md');
		referenceDumpCommand(ctx, { output: outputPath, format: 'markdown', section: '# Available Runes', check: false });
		const result = referenceDumpCommand(ctx, { output: outputPath, format: 'markdown', section: '# Available Runes', check: true });
		expect(result.exitCode).toBe(0);
		expect(result.wrote).toBe(false);
	});

	it('--check exits 1 when file is stale', () => {
		const outputPath = join(tempDir, 'AGENTS.md');
		writeFileSync(outputPath, '# Available Runes\n\nOut of date content.\n');
		const result = referenceDumpCommand(ctx, { output: outputPath, format: 'markdown', section: '# Available Runes', check: true });
		expect(result.exitCode).toBe(1);
		expect(result.message).toContain('out of date');
	});

	it('--check exits 1 when file does not exist', () => {
		const outputPath = join(tempDir, 'missing.md');
		const result = referenceDumpCommand(ctx, { output: outputPath, format: 'markdown', section: '# Available Runes', check: true });
		expect(result.exitCode).toBe(1);
		expect(result.message).toContain('does not exist');
	});

	it('preserves surrounding content when replacing named section', () => {
		const outputPath = join(tempDir, 'AGENTS.md');
		const initial = '# Project Overview\n\nSome intro text here.\n\n# Available Runes\n\nOld runes content.\n\n# Other Section\n\nMore text.\n';
		writeFileSync(outputPath, initial);
		referenceDumpCommand(ctx, { output: outputPath, format: 'markdown', section: '# Available Runes', check: false });
		const updated = readFileSync(outputPath, 'utf-8');
		expect(updated).toContain('# Project Overview');
		expect(updated).toContain('Some intro text here.');
		expect(updated).toContain('# Other Section');
		expect(updated).toContain('More text.');
		expect(updated).toContain('### hint');
		expect(updated).not.toContain('Old runes content');
	});

	it('outputs JSON format when requested', () => {
		const outputPath = join(tempDir, 'runes.json');
		const result = referenceDumpCommand(ctx, {
			output: outputPath,
			format: 'json',
			section: '',
			check: false,
		});
		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(readFileSync(outputPath, 'utf-8'));
		expect(Array.isArray(parsed)).toBe(true);
		const hint = parsed.find((r: { name: string }) => r.name === 'hint');
		expect(hint).toBeDefined();
		expect(hint.package).toBe('core');
	});

	it('applies a custom preamble when provided', () => {
		const outputPath = join(tempDir, 'AGENTS.md');
		referenceDumpCommand(ctx, {
			output: outputPath,
			format: 'markdown',
			section: '# Available Runes',
			check: false,
			preamble: 'Custom intro paragraph for the agent.',
		});
		const content = readFileSync(outputPath, 'utf-8');
		expect(content).toContain('Custom intro paragraph for the agent.');
	});
});
