import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runValidation } from '../src/commands/validate-core.js';

/**
 * WORK-634 — `refrakt validate` (and the `refrakt.validate` MCP tool, which
 * shares `runValidation`) reports a project rune definition's construction
 * errors as structured findings with the definition's file and line.
 */
const bond = readFileSync(
	resolve(__dirname, '../../content/test/fixtures/composed-storytelling/runes/bond.md'),
	'utf-8',
);

const temps: string[] = [];
afterAll(() => {
	for (const t of temps) rmSync(t, { recursive: true, force: true });
});

function project(runes: Record<string, string>, page = '# Home\n'): string {
	const root = mkdtempSync(join(tmpdir(), 'refrakt-validate-runes-'));
	temps.push(root);
	mkdirSync(join(root, 'content'));
	mkdirSync(join(root, 'runes'));
	// The theme resolves from the project, as `validate`'s config layer checks.
	mkdirSync(join(root, 'node_modules', '@refrakt-md'), { recursive: true });
	symlinkSync(
		resolve(__dirname, '../../lumina'),
		join(root, 'node_modules', '@refrakt-md', 'lumina'),
		'dir',
	);
	writeFileSync(
		join(root, 'refrakt.config.json'),
		JSON.stringify({ sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina' } } }),
	);
	writeFileSync(join(root, 'content', 'index.md'), page);
	for (const [file, text] of Object.entries(runes)) writeFileSync(join(root, 'runes', file), text);
	return root;
}

describe('refrakt validate: project rune definitions', () => {
	it('reports a construction error with the definition’s file and line', async () => {
		const broken = [
			'---',
			'tag: aside',
			'---',
			'',
			'Intro.',
			'',
			'{% slot name="nope" /%}',
			'',
		].join('\n');
		const root = project({ 'bond.md': bond, 'broken.md': broken });
		const result = await runValidation({ cwd: root });
		const [site] = result.sites;
		expect(site.content).toEqual([
			expect.objectContaining({
				file: 'runes/broken.md',
				line: 7,
				severity: 'error',
				id: 'rune-definition-invalid',
				message: expect.stringMatching(/Rune "broken": .*slot `nope` names no field/),
			}),
		]);
		expect(site.contentSuppressed).toMatch(/1 rune definition does not build/);
	});

	it('reports a project `schema` at its line, naming the rune and SPEC-145 D25', async () => {
		const withSchema = bond.replace(
			'provides: [prose]',
			'provides: [prose]\nschema:\n  type: Thing',
		);
		const root = project({ 'bond.md': withSchema });
		const [site] = (await runValidation({ cwd: root })).sites;
		const [finding] = site.content;
		expect(finding).toMatchObject({ file: 'runes/bond.md', id: 'rune-definition-invalid' });
		expect(finding.message).toMatch(/Rune "bond".*SPEC-145 D25/);
		expect(withSchema.split('\n')[finding.line! - 1]).toBe('schema:');
	});

	it('a valid definition validates the content that uses it', async () => {
		const root = project(
			{ 'bond.md': bond },
			'{% bond from="Aria" to="Veshra" %}\nRivals.\n{% /bond %}\n',
		);
		const [site] = (await runValidation({ cwd: root })).sites;
		expect(site.content.filter((f) => f.severity === 'error')).toEqual([]);
		expect(site.contentSuppressed).toBeUndefined();
	});

	it('a name collision with a core rune is a finding, not a crash', async () => {
		const root = project({ 'badge.md': '---\ntag: aside\n---\n\nMine.\n' });
		const [site] = (await runValidation({ cwd: root })).sites;
		expect(site.content).toEqual([
			expect.objectContaining({
				severity: 'error',
				id: 'site-assembly-failed',
				message: expect.stringMatching(/takes the name of core rune "badge"/),
			}),
		]);
	});
});
