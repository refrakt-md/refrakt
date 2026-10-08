import { describe, it, expect, afterAll } from 'vitest';
import {
	mkdtempSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import type { Plugin } from '@refrakt-md/types';
import { loadPlugin, mergePlugins, pluginRune } from '../src/plugins.js';
import { readRuneDefinitions, runeEntriesOf, runeNameOfFile } from '../src/rune-dir.js';
import { compositionFor } from '../src/lib/composition.js';
import { collectCompositions } from '../src/composed-rune.js';
import { collectRegistrations } from '../src/registers-pipeline.js';
import { runes as coreRunes, tags as coreTags, serializeTree } from '../src/index.js';
import type { Rune } from '../src/rune.js';

/**
 * SPEC-153 D1/D2/D3/D9 — composed runes delivered from a plugin's declared rune
 * directory. The fixture plugin is the composed-storytelling definitions the
 * content tests measure against the storytelling plugin, made a package.
 */

const here = dirname(fileURLToPath(import.meta.url));
const fixturePlugin = join(
	here,
	'..',
	'..',
	'content',
	'test',
	'fixtures',
	'composed-storytelling',
);
const FIXTURE_NAME = 'refrakt-fixture-composed-storytelling';

/** A throwaway project whose `node_modules` holds the given packages. */
const projects: string[] = [];
function project(): { root: string; from: string; add: (name: string, dir: string) => void } {
	const root = mkdtempSync(join(tmpdir(), 'refrakt-rune-dir-'));
	projects.push(root);
	mkdirSync(join(root, 'node_modules'));
	writeFileSync(join(root, 'package.json'), '{"name":"p","private":true,"type":"module"}');
	return {
		root,
		from: join(root, 'package.json'),
		add: (name, dir) => symlinkSync(dir, join(root, 'node_modules', name), 'dir'),
	};
}
afterAll(() => {
	for (const p of projects) rmSync(p, { recursive: true, force: true });
});

/** A plugin package written to disk: its manifest, its entry, its rune files. */
function writePlugin(
	opts: {
		name?: string;
		exports?: Record<string, string> | null;
		runeDir?: string;
		runes?: string;
		files?: Record<string, string>;
	} = {},
): { name: string; dir: string } {
	const name = opts.name ?? 'fixture-plugin';
	const dir = mkdtempSync(join(tmpdir(), 'refrakt-rune-dir-pkg-'));
	projects.push(dir);
	const manifest: Record<string, unknown> = {
		name,
		version: '0.0.0',
		type: 'module',
		main: 'index.js',
	};
	if (opts.exports !== null) {
		manifest.exports = opts.exports ?? { '.': './index.js', './package.json': './package.json' };
	}
	writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest));
	writeFileSync(
		join(dir, 'index.js'),
		`export default { name: 'fx', version: '0.0.0', runeDir: ${JSON.stringify(opts.runeDir ?? 'runes')}, runes: ${opts.runes ?? '{}'} };\n`,
	);
	for (const [path, text] of Object.entries(opts.files ?? {})) {
		mkdirSync(dirname(join(dir, path)), { recursive: true });
		writeFileSync(join(dir, path), text);
	}
	return { name, dir };
}

const definition = (rune: string) =>
	readFileSync(join(fixturePlugin, 'runes', `${rune}.md`), 'utf-8');
const fixture = (file: string) => readFileSync(join(fixturePlugin, 'fixtures', file), 'utf-8');

async function loadFixturePlugin() {
	const p = project();
	p.add(FIXTURE_NAME, fixturePlugin);
	return loadPlugin(FIXTURE_NAME, { from: p.from });
}

/** Render one page with the core tags plus the given runes. */
function render(runes: Record<string, Rune>, source: string): string {
	const merged = mergePlugins(
		[
			{
				pkg: { name: 'x', version: '0', runes: {} },
				npmName: 'x',
				runes,
				fixtures: {},
				fileRoots: {},
			},
		],
		new Set(Object.keys(coreRunes)),
	);
	const tree = Markdoc.transform(Markdoc.parse(source), {
		tags: { ...coreTags, ...merged.tags },
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never);
	return JSON.stringify(serializeTree(tree as never));
}

describe('a plugin rune directory (SPEC-153 D2)', () => {
	it('loads every `<rune>.md` in the declared directory as a composed rune', async () => {
		const loaded = await loadFixturePlugin();
		expect(Object.keys(loaded.runes).sort()).toEqual(['bond', 'character']);
		for (const name of ['bond', 'character']) {
			expect(loaded.pkg.runes[name]).toEqual({ template: definition(name) });
			expect(compositionFor(loaded.runes[name].schema)?.rune).toBe(name);
		}
		// The definition's own frontmatter supplies what a code entry would.
		expect(loaded.runes.character.aliases).toEqual(['npc', 'pc']);
		expect(loaded.runes.bond.description).toMatch(/composed over `hint`/);
	});

	it('finds the plugin’s fixtures in the sibling `fixtures/` directory (D9)', async () => {
		const loaded = await loadFixturePlugin();
		expect(loaded.fixtures.bond).toBe(fixture('bond.canonical.md').trim());
		expect(loaded.fixtures.character).toBe(fixture('character.canonical.md').trim());
	});

	it('generates the block-less config and passes the catalog checks at merge', async () => {
		const loaded = await loadFixturePlugin();
		const merged = mergePlugins([loaded], new Set(Object.keys(coreRunes)));
		expect(Object.keys(merged.themeRunes).sort()).toEqual(['Bond', 'Character']);
		expect(merged.themeRunes.Bond.block).toBeUndefined();
		expect(merged.tags.npc).toBe(merged.tags.character);
	});

	it('their `registers` declarations reach the registration pipeline', async () => {
		const loaded = await loadFixturePlugin();
		const found = collectRegistrations(loaded.pkg.runes).map((r) => [
			r.rune,
			Object.keys(r.registers),
		]);
		expect(found).toEqual([
			['bond', ['edge']],
			['character', ['entity']],
		]);
	});
});

describe('one file format, two read paths, one in-memory shape (SPEC-153 D1)', () => {
	it('a definition loads identically from a plugin’s runeDir and from a project directory', async () => {
		const fromPlugin = await loadFixturePlugin();

		// The project read path: the same files, as `ProjectFiles` keys under
		// `runes/`, through the reader a project's `runes.dir` uses (D5).
		const files = new Map<string, string>();
		for (const f of readdirSync(join(fixturePlugin, 'runes'))) {
			files.set(`runes/${f}`, definition(f.replace(/\.md$/, '')));
		}
		const defs = readRuneDefinitions(memoryProjectFiles(files), 'runes', 'runes.dir "runes"');
		const entries = runeEntriesOf(defs);
		expect(entries).toEqual(
			Object.fromEntries(Object.entries(fromPlugin.pkg.runes).map(([k, v]) => [k, v])),
		);
		const project = Object.fromEntries(
			Object.entries(entries).map(([name, entry]) => [
				name,
				pluginRune(name, entry, { name: '__project__' }),
			]),
		);

		for (const name of ['bond', 'character']) {
			const a = fromPlugin.runes[name];
			const b = project[name];
			// Everything the Rune carries, bar the schema object's identity.
			const shape = (r: Rune) => ({
				name: r.name,
				aliases: r.aliases,
				description: r.description,
				typeName: r.typeName,
				seoType: r.seoType,
				attributes: Object.fromEntries(
					Object.entries(r.schema.attributes ?? {}).map(([k, v]) => [
						k,
						{ ...v, type: (v.type as { name?: string })?.name ?? v.type },
					]),
				),
				composition: {
					...compositionFor(r.schema),
				},
			});
			expect(shape(b)).toEqual(shape(a));
		}

		// …and the contract and the rendered output agree.
		expect(collectCompositions(project)).toEqual(collectCompositions(fromPlugin.runes));
		for (const file of readdirSync(join(fixturePlugin, 'fixtures'))) {
			expect(render(project, fixture(file))).toEqual(render(fromPlugin.runes, fixture(file)));
		}
	});

	it('a directory rune and a code `template` entry with the same text are the same rune', async () => {
		const fromDir = await loadFixturePlugin();
		const code: Plugin = {
			name: 'code',
			version: '0',
			runes: { bond: { template: definition('bond') } },
		};
		const fromCode = pluginRune('bond', code.runes.bond, code);
		expect(collectCompositions({ bond: fromCode })).toEqual(
			collectCompositions({ bond: fromDir.runes.bond }),
		);
		expect(render({ bond: fromCode }, fixture('bond.canonical.md'))).toEqual(
			render({ bond: fromDir.runes.bond }, fixture('bond.canonical.md')),
		);
	});
});

describe('a rune directory read failure throws (SPEC-153 D3)', () => {
	it('a blocked `./package.json` export throws with the cause and the fix, never zero runes', async () => {
		const { name, dir } = writePlugin({
			exports: { '.': './index.js' },
			files: { 'runes/bond.md': definition('bond') },
		});
		const p = project();
		p.add(name, dir);
		const err = await loadPlugin(name, { from: p.from }).catch((e: Error) => e);
		expect(err).toBeInstanceOf(Error);
		const msg = (err as Error).message;
		expect(msg).toContain(`Plugin "${name}" declares runeDir "runes"`);
		expect(msg).toMatch(/ERR_PACKAGE_PATH_NOT_EXPORTED|not defined by "exports"/);
		expect(msg).toContain('"./package.json": "./package.json"');
	});

	it('a declared directory missing from the package throws with the resolved path and the cause', async () => {
		const { name, dir } = writePlugin({});
		const p = project();
		p.add(name, dir);
		const err = (await loadPlugin(name, { from: p.from }).catch((e: Error) => e)) as Error;
		expect(err.message).toContain(`runeDir ${join(dir, 'runes')} could not be read`);
		expect(err.message).toContain('ENOENT');
	});

	it('a declared directory that ships empty throws', async () => {
		const { name, dir } = writePlugin({ files: { 'runes/README.txt': 'not a rune' } });
		const p = project();
		p.add(name, dir);
		await expect(loadPlugin(name, { from: p.from })).rejects.toThrow(
			/holds no `<rune>\.md` definition/,
		);
	});

	it('a runeDir outside the package is refused', async () => {
		const { name, dir } = writePlugin({ runeDir: '../elsewhere' });
		const p = project();
		p.add(name, dir);
		await expect(loadPlugin(name, { from: p.from })).rejects.toThrow(
			/outside its package directory/,
		);
	});

	it('a definition that fails construction throws naming the rune', async () => {
		const { name, dir } = writePlugin({
			files: { 'runes/broken.md': '---\ntag: aside\n---\n\n{% slot name="body" /%}\n' },
		});
		const p = project();
		p.add(name, dir);
		await expect(loadPlugin(name, { from: p.from })).rejects.toThrow(
			/Rune "broken": .*slot `body` names no field/,
		);
	});
});

describe('the filename is the rune’s name (SPEC-153 D9)', () => {
	it('a frontmatter key restating the name is rejected, not preferred', async () => {
		const restated = definition('bond').replace('---\n', '---\nrune: bond\n');
		const { name, dir } = writePlugin({ files: { 'runes/bond.md': restated } });
		const p = project();
		p.add(name, dir);
		await expect(loadPlugin(name, { from: p.from })).rejects.toThrow(
			/Rune "bond": .*frontmatter key `rune` restates the rune's name, which is the file's name/,
		);
	});

	it('a suffixed or non-kebab file name is rejected, not skipped', () => {
		expect(() => runeNameOfFile('playlist.rune.md', 'here')).toThrow(/takes no suffix/);
		expect(() => runeNameOfFile('README.md', 'here')).toThrow(/is not a rune definition file/);
		expect(runeNameOfFile('cooking-post.md', 'here')).toBe('cooking-post');
	});

	it('files that are not `.md` are not definitions', () => {
		const files = new Map([
			['runes/bond.md', definition('bond')],
			['runes/notes.txt', 'x'],
			['runes/nested/deep.md', 'x'],
		]);
		const defs = readRuneDefinitions(memoryProjectFiles(files), 'runes', 'here');
		expect(defs.map((d) => [d.name, d.path])).toEqual([['bond', 'runes/bond.md']]);
	});
});

describe('one definition per rune name', () => {
	it('a runeDir rune and a code-defined rune of the same name are rejected, naming both', async () => {
		const { name, dir } = writePlugin({
			runes: '{ bond: { template: "---\\n---\\nx" } }',
			files: { 'runes/bond.md': definition('bond') },
		});
		const p = project();
		p.add(name, dir);
		const err = (await loadPlugin(name, { from: p.from }).catch((e: Error) => e)) as Error;
		expect(err.message).toContain(`runeDir ${join(dir, 'runes')} defines rune "bond" twice`);
		expect(err.message).toContain(join(dir, 'runes', 'bond.md'));
		expect(err.message).toContain('`Plugin.runes.bond`');
	});

	it('a runeDir rune taking a code rune’s alias is rejected too', async () => {
		const { name, dir } = writePlugin({
			runes: '{ person: { transform: {}, aliases: ["bond"] } }',
			files: { 'runes/bond.md': definition('bond') },
		});
		const p = project();
		p.add(name, dir);
		await expect(loadPlugin(name, { from: p.from })).rejects.toThrow(
			/as an alias of `Plugin\.runes\.person`/,
		);
	});
});
