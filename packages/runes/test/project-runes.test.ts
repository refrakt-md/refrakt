import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	fsProjectFiles,
	memoryProjectFiles,
	recordingProjectFiles,
} from '@refrakt-md/types/project-files';
import type { ProjectFilesAccess } from '@refrakt-md/types';
import { checkProjectRunes, loadProjectRunes, PROJECT_RUNES } from '../src/project-runes.js';
import { loadLocalRunes, loadPlugin, mergePlugins, pluginRune } from '../src/plugins.js';
import type { LoadedPlugin } from '../src/plugins.js';
import { runes as coreRunes } from '../src/index.js';

/**
 * WORK-634 — a project's own composed runes in `runes.dir` (SPEC-153 D4, D5,
 * D7, D8; SPEC-145 D25). The definitions are the tested composed-storytelling
 * fixtures.
 */

const here = dirname(fileURLToPath(import.meta.url));
const composed = join(here, '..', '..', 'content', 'test', 'fixtures', 'composed-storytelling');
const definition = (rune: string) => readFileSync(join(composed, 'runes', `${rune}.md`), 'utf-8');
const core = new Set(Object.keys(coreRunes));

const temps: string[] = [];
afterAll(() => {
	for (const t of temps) rmSync(t, { recursive: true, force: true });
});
function temp(): string {
	const d = mkdtempSync(join(tmpdir(), 'refrakt-project-runes-'));
	temps.push(d);
	return d;
}

const files = (entries: Record<string, string>) =>
	memoryProjectFiles(new Map(Object.entries(entries)));

/** A plugin as `loadPlugin` returns it, defining `bond` from the same file. */
function storyPlugin(): LoadedPlugin {
	const pkg = { name: 'story', version: '1', runes: { bond: { template: definition('bond') } } };
	return {
		pkg,
		npmName: '@x/story',
		runes: { bond: pluginRune('bond', pkg.runes.bond, pkg) },
		fixtures: {},
		fileRoots: {},
	};
}

describe('project runes read through ProjectFiles (SPEC-153 D5)', () => {
	it('resolve under memoryProjectFiles, with no filesystem', () => {
		const loaded = loadProjectRunes(files({ 'runes/bond.md': definition('bond') }));
		expect(Object.keys(loaded.runes)).toEqual(['bond']);
		expect(loaded.npmName).toBe(PROJECT_RUNES);
		const merged = mergePlugins([], core, undefined, loaded);
		expect(merged.tags.bond).toBe(loaded.runes.bond.schema);
		expect(merged.themeRunes.Bond).toBeDefined();
		expect(merged.provenance.bond).toMatchObject({ source: 'project' });
		// Its registration reaches the pipeline through the merged plugins.
		expect(merged.plugins.map((p) => p.name)).toContain(PROJECT_RUNES);
	});

	it('read `runes.dir` when declared, and nothing when the directory is absent', () => {
		const f = files({ 'defs/bond.md': definition('bond') });
		expect(Object.keys(loadProjectRunes(f, 'defs').runes)).toEqual(['bond']);
		expect(Object.keys(loadProjectRunes(f).runes)).toEqual([]);
	});

	it('a rune path escaping the project root is refused by the provider, not the loader', () => {
		// The loader hands the declared path to the provider verbatim…
		const accesses: ProjectFilesAccess[] = [];
		const inner = files({ 'runes/bond.md': definition('bond') });
		const loaded = loadProjectRunes(
			recordingProjectFiles(inner, (a) => accesses.push(a)),
			'../outside/runes',
		);
		expect(accesses).toEqual([{ op: 'list', key: '../outside/runes' }]);
		expect(Object.keys(loaded.runes)).toEqual([]);

		// …and on disk, the fs provider refuses the escape though the file is there.
		const root = temp();
		mkdirSync(join(root, 'project'));
		mkdirSync(join(root, 'outside', 'runes'), { recursive: true });
		writeFileSync(join(root, 'outside', 'runes', 'bond.md'), definition('bond'));
		const fs = fsProjectFiles(join(root, 'project'));
		expect(Object.keys(loadProjectRunes(fs, '../outside/runes').runes)).toEqual([]);
		expect(fs.read('../outside/runes/bond.md')).toBeNull();
	});
});

describe('precedence: core < plugin < project (SPEC-153 D8)', () => {
	it('a project rune taking a core rune’s name is rejected, naming both', () => {
		const project = loadProjectRunes(
			files({ 'runes/badge.md': '---\ntag: aside\n---\n\nMine.\n' }),
		);
		expect(() => mergePlugins([], core, undefined, project)).toThrow(
			/Project rune "badge" \(badge\.md\) takes the name of core rune "badge"/,
		);
		// Even a `prefer` entry cannot hand a core name to the project.
		expect(() => mergePlugins([], core, { badge: PROJECT_RUNES }, project)).toThrow(
			/cannot be shadowed/,
		);
	});

	it('so is one whose alias is a core rune’s name or alias', () => {
		const aliased = definition('bond').replace('tag: aside', 'tag: aside\naliases: [callout]');
		const coreWithAlias = Object.entries(coreRunes).find(([, r]) => r.aliases.length > 0)!;
		const coreAlias = coreWithAlias[1].aliases[0];
		const project = loadProjectRunes(
			files({ 'runes/bond.md': aliased.replace('[callout]', `[${coreAlias}]`) }),
		);
		expect(() => mergePlugins([], core, undefined, project)).toThrow(
			new RegExp(
				`Project rune "bond" \\(bond\\.md\\) \\(through its alias "${coreAlias}"\\) takes the name of core rune "${coreWithAlias[0]}"`,
			),
		);
	});

	it('taking a plugin rune’s name needs a `runes.prefer` entry', () => {
		const project = loadProjectRunes(files({ 'runes/bond.md': definition('bond') }));
		expect(() => mergePlugins([storyPlugin()], core, undefined, project)).toThrow(
			/Project rune "bond" \(bond\.md\) and the rune "bond" from @x\/story share a name[\s\S]*"bond": "__project__"/,
		);

		const plugin = storyPlugin();
		const projectWins = mergePlugins([plugin], core, { bond: PROJECT_RUNES }, project);
		expect(projectWins.tags.bond).toBe(project.runes.bond.schema);
		expect(projectWins.provenance.bond.source).toBe('project');

		const pluginWins = mergePlugins([plugin], core, { bond: 'story' }, project);
		expect(pluginWins.tags.bond).toBe(plugin.runes.bond.schema);
	});
});

describe('`schema` follows where a definition is loaded from (SPEC-145 D25)', () => {
	it('a project definition declaring `schema` is rejected at load, naming the rune and D25', () => {
		const source = definition('character');
		const { findings, loaded } = checkProjectRunes(files({ 'runes/character.md': source }));
		expect(Object.keys(loaded.runes)).toEqual([]);
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({ file: 'runes/character.md', rune: 'character' });
		expect(findings[0].message).toMatch(
			/Rune "character": .*may not declare `schema` \(SPEC-145 D25\)/,
		);
		// Located at the `schema:` key.
		expect(source.split('\n')[findings[0].line - 1]).toMatch(/^schema:/);
		expect(() => loadProjectRunes(files({ 'runes/character.md': source }))).toThrow(
			/^runes\/character\.md:\d+: Rune "character"/,
		);
	});

	it('the same definition shipped in a plugin’s runeDir is accepted', async () => {
		const root = temp();
		mkdirSync(join(root, 'node_modules'));
		writeFileSync(join(root, 'package.json'), '{"name":"p","private":true}');
		const pkg = join(root, 'node_modules', 'schema-pack');
		mkdirSync(join(pkg, 'runes'), { recursive: true });
		writeFileSync(
			join(pkg, 'package.json'),
			JSON.stringify({ name: 'schema-pack', version: '1.0.0', type: 'module', main: 'index.js' }),
		);
		writeFileSync(
			join(pkg, 'index.js'),
			"export default { name: 'schema-pack', version: '1.0.0', runeDir: 'runes', runes: {} };\n",
		);
		writeFileSync(join(pkg, 'runes', 'character.md'), definition('character'));
		const loaded = await loadPlugin('schema-pack', { from: join(root, 'package.json') });
		expect(Object.keys(loaded.runes)).toEqual(['character']);
	});
});

describe('construction errors name the definition’s file and line', () => {
	it('a template error is located at the template node', () => {
		const source = [
			'---',
			'tag: aside',
			'---',
			'',
			'Intro.',
			'',
			'{% slot name="nope" /%}',
			'',
		].join('\n');
		const { findings } = checkProjectRunes(files({ 'runes/broken.md': source }));
		expect(findings).toEqual([
			expect.objectContaining({ file: 'runes/broken.md', line: 7, rune: 'broken' }),
		]);
		expect(findings[0].message).toMatch(/slot `nope` names no field/);
	});

	it('a frontmatter error is located at its key', () => {
		const source = ['---', 'tag: aside', 'attributes:', '  from: { kind: string }', '---', ''].join(
			'\n',
		);
		const { findings } = checkProjectRunes(files({ 'runes/broken.md': source }));
		expect(findings[0]).toMatchObject({ line: 4 });
		expect(findings[0].message).toMatch(/attribute `from`: unknown key `kind`/);
	});

	it('every failing definition is reported, and the good ones still load', () => {
		const { findings, loaded } = checkProjectRunes(
			files({
				'runes/bond.md': definition('bond'),
				'runes/a.md': 'no frontmatter',
				'runes/Bad Name.md': definition('bond'),
			}),
		);
		expect(Object.keys(loaded.runes)).toEqual(['bond']);
		expect(findings.map((f) => f.file).sort()).toEqual(['runes/Bad Name.md', 'runes/a.md']);
	});
});

describe('`runes.local` keeps its scope (SPEC-153 D7)', () => {
	it('a definition file is rejected with a pointer to `runes.dir`', async () => {
		const root = temp();
		writeFileSync(join(root, 'bond.md'), definition('bond'));
		await expect(loadLocalRunes({ bond: './bond.md' }, root)).rejects.toThrow(
			/Local rune "bond" at "\.\/bond\.md" is a composed rune definition, not a module\. `runes\.local` takes a JavaScript module[\s\S]*move it to `runes\/bond\.md`/,
		);
	});

	it('so is a module exporting a composition `template`', async () => {
		const root = temp();
		writeFileSync(
			join(root, 'bond.mjs'),
			`export default { template: ${JSON.stringify(definition('bond'))} };\n`,
		);
		await expect(loadLocalRunes({ bond: './bond.mjs' }, root)).rejects.toThrow(
			/is a module exporting a composition `template`[\s\S]*runes\.dir/,
		);
	});
});
