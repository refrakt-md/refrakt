import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server.js';
import { detect } from '../src/detect.js';
import { CORE_TOOLS } from '../src/tools/core.js';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

describe('createServer', () => {
	it('builds without throwing', () => {
		const server = createServer({ cwd: REPO_ROOT });
		expect(server).toBeDefined();
	});
});

describe('detect', () => {
	it('finds the plan dir + main site + plan plugin in this repo', async () => {
		const result = await detect(REPO_ROOT);
		expect(result.cwd).toBe(REPO_ROOT);
		expect(result.configSource).toBe('config-file');
		expect(result.plan).not.toBeNull();
		expect(result.plan!.fileCount).toBeGreaterThan(0);
		expect(result.site).not.toBeNull();
		expect(result.site!.sites).toContain('main');
		// `result.site!.plugins` reflects the config's explicit `plugins` list
		// (empty when the field is omitted and discovery handles it). The
		// auto-discovered set is on the top-level `plugins` field below.
		const namespaces = result.plugins.map((p) => p.namespace);
		expect(namespaces).toContain('plan');
	});
});

describe('CORE_TOOLS', () => {
	it('declares the expected core tools', () => {
		const names = CORE_TOOLS.map((t) => t.name);
		expect(names).toEqual([
			'refrakt.detect',
			'refrakt.plugins_list',
			'refrakt.reference',
			'refrakt.contracts',
			'refrakt.inspect',
			'refrakt.inspect_list',
		]);
	});

	it('every tool has a JSON Schema input', () => {
		for (const tool of CORE_TOOLS) {
			expect(tool.inputSchema.type).toBe('object');
		}
	});
});
