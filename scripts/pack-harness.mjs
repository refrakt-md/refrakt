#!/usr/bin/env node
/**
 * The `npm pack` → install → load harness for plugins (SPEC-153 note 2 / WORK-627).
 *
 * A monorepo test resolves `@refrakt-md/*` through workspace links, so it passes
 * whatever the published tarball contains: a missing `files` entry, an `exports`
 * map that hides `./package.json`, a dependency that is only present because the
 * workspace hoisted it. This script tests the tarball instead. For each plugin it:
 *
 *   1. packs the plugin and every internal package it depends on with `npm pack`;
 *   2. installs those tarballs into a fresh project under the OS temp directory,
 *      outside the workspace, so no workspace `node_modules` is on the resolution
 *      path;
 *   3. in that project, resolves `<pkg>/package.json` by name and loads the plugin
 *      with `loadPlugin()` from the installed `@refrakt-md/runes`.
 *
 * Step 3 checks the manifest separately because `loadPlugin()` does not fail when
 * it cannot resolve: `discoverPluginFixtureManifest` swallows the error and skips
 * file fixtures. The convention path SPEC-153 builds on needs that resolution to
 * succeed, so a tarball where it fails is broken even though `loadPlugin()` returns.
 *
 * Internal dependencies come from local tarballs and not from the registry. The
 * point is to test this tree, and a registry copy would be the last release. Every
 * tarball is a direct dependency of the fixture project, and `overrides` pins the
 * same specs, so a transitive `@refrakt-md/*` cannot fall through to the registry.
 * Third-party dependencies still come from npm, with `--prefer-offline` so a warm
 * cache (as after `npm ci`) serves them.
 *
 * Fixture plugins (`FIXTURE_PLUGINS`) are packed and loaded beside the real ones.
 * They are not workspaces and never publish; each exists to prove a packaging
 * path no shipping plugin exercises yet. For a plugin declaring `runeDir`
 * (SPEC-153 D2), the loader also checks that every `<rune>.md` in the packed
 * directory came back as a composed rune and that each of the plugin's packed
 * fixtures renders through it.
 *
 * Needs a built tree (`npm run build`), because tarballs carry `dist/`.
 *
 *   npm run plugins:pack-check                 # every plugin under plugins/
 *   node scripts/pack-harness.mjs plan docs    # just these (short or full names)
 *   node scripts/pack-harness.mjs --keep       # keep the temp projects for debugging
 */

import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCOPE = '@refrakt-md/';

/**
 * Plugin packages that are not workspaces, packed like plugins. Each is the only
 * consumer of a delivery path, so the tarball proof has to come from it:
 *
 * - `composed-storytelling` ships its runes from a declared `runeDir`
 *   (SPEC-153 D2, WORK-633). No shipping plugin can yet: composing a plan rune
 *   would change the plan site's published output, which WORK-633 records.
 *   Its `runes/` are the definitions the composed-storytelling tests measure.
 */
export const FIXTURE_PLUGINS = ['packages/content/test/fixtures/composed-storytelling'];

/** Workspace packages under `packages/` and `plugins/`, plus the fixture
 *  plugins, keyed by package name. */
export function readWorkspaces(root = ROOT) {
	const workspaces = new Map();
	for (const group of ['packages', 'plugins']) {
		const groupDir = join(root, group);
		if (!existsSync(groupDir)) continue;
		for (const entry of readdirSync(groupDir).sort()) {
			const dir = join(groupDir, entry);
			const manifest = join(dir, 'package.json');
			if (!existsSync(manifest)) continue;
			const pkg = JSON.parse(readFileSync(manifest, 'utf-8'));
			workspaces.set(pkg.name, { dir, pkg, isPlugin: group === 'plugins' });
		}
	}
	for (const rel of FIXTURE_PLUGINS) {
		const dir = join(root, rel);
		const manifest = join(dir, 'package.json');
		if (!existsSync(manifest)) continue;
		const pkg = JSON.parse(readFileSync(manifest, 'utf-8'));
		workspaces.set(pkg.name, { dir, pkg, isPlugin: true, isFixture: true });
	}
	return workspaces;
}

/**
 * The workspace packages a plugin needs installed: itself, `@refrakt-md/runes`
 * (where `loadPlugin()` lives), and the transitive closure of their workspace
 * `dependencies` and `peerDependencies`. Peers count because npm installs them,
 * and an unpinned one would come from the registry.
 */
export function internalClosure(name, workspaces) {
	const seen = new Set();
	const queue = [name, `${SCOPE}runes`];
	while (queue.length > 0) {
		const next = queue.shift();
		if (seen.has(next)) continue;
		const ws = workspaces.get(next);
		if (!ws) throw new Error(`"${next}" is not a workspace package`);
		seen.add(next);
		for (const dep of Object.keys({ ...ws.pkg.dependencies, ...ws.pkg.peerDependencies })) {
			if (workspaces.has(dep)) queue.push(dep);
		}
	}
	return [...seen].sort();
}

/** Accept `plan`, `@refrakt-md/plan` or a fixture plugin's full name; default
 *  to every plugin, fixtures included. */
export function selectPlugins(args, workspaces) {
	const plugins = [...workspaces].filter(([, ws]) => ws.isPlugin).map(([name]) => name);
	if (args.length === 0) return plugins;
	return args.map((arg) => {
		const name = plugins.includes(arg) || arg.startsWith(SCOPE) ? arg : `${SCOPE}${arg}`;
		if (!plugins.includes(name)) throw new Error(`Unknown plugin "${arg}"`);
		return name;
	});
}

/** True when `dir` is `root` or inside it. */
export function isInside(dir, root) {
	const rel = relative(root, dir);
	return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Runs inside the fixture project. Prints one JSON line and exits 0 or 1. Kept as
 * source text because it must be resolved from the fixture, not from this repo.
 */
const LOADER = `
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const name = process.argv[2];
const here = realpathSync(fileURLToPath(new URL('.', import.meta.url)));
let stage = 'manifest';
try {
	const require = createRequire(import.meta.url);
	const manifest = realpathSync(require.resolve(name + '/package.json'));
	// By entry point, not manifest: runes' own exports map leaves out ./package.json.
	const entries = [name, '@refrakt-md/runes'].map((n) => realpathSync(fileURLToPath(import.meta.resolve(n))));
	for (const path of [manifest, ...entries]) {
		if (!path.startsWith(here)) throw new Error('resolved outside the fixture project: ' + path);
	}
	stage = 'load';
	const runesModule = await import('@refrakt-md/runes');
	const loaded = await runesModule.loadPlugin(name);
	const count = Object.keys(loaded.runes).length;
	if (count === 0) throw new Error('loadPlugin() returned no runes');
	const composed = [];
	if (loaded.pkg.runeDir !== undefined) {
		// SPEC-153 D2 — every packed definition is a composed rune, and every
		// packed fixture renders through it.
		stage = 'runeDir';
		const { readdirSync, readFileSync, existsSync } = await import('node:fs');
		const { dirname, join } = await import('node:path');
		const pkgDir = dirname(manifest);
		const dir = join(pkgDir, loaded.pkg.runeDir);
		for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
			const rune = file.slice(0, -3);
			if (!runesModule.compositionFor(loaded.runes[rune]?.schema)) {
				throw new Error('runeDir file ' + file + ' did not load as a composed rune');
			}
			composed.push(rune);
		}
		const merged = runesModule.mergePlugins([loaded], new Set(Object.keys(runesModule.runes)));
		const Markdoc = (await import('@markdoc/markdoc')).default;
		const fixtures = join(pkgDir, 'fixtures');
		const rendered = existsSync(fixtures) ? readdirSync(fixtures).filter((f) => f.endsWith('.md')) : [];
		for (const file of rendered) {
			const rune = file.split('.')[0];
			if (!composed.includes(rune)) continue;
			const tree = Markdoc.transform(Markdoc.parse(readFileSync(join(fixtures, file), 'utf-8')), {
				tags: { ...runesModule.tags, ...merged.tags },
				variables: { generatedIds: new Set(), path: '/p', headings: [] },
			});
			const json = JSON.stringify(runesModule.serializeTree(tree));
			if (!json.includes('"data-rune":"' + rune + '"')) {
				throw new Error('fixture ' + file + ' did not render a ' + rune + ' rune');
			}
		}
		if (composed.length === 0) throw new Error('runeDir held no definitions');
	}
	console.log(JSON.stringify({ ok: true, plugin: loaded.pkg.name, runes: count, composed }));
} catch (err) {
	console.log(JSON.stringify({ ok: false, stage, message: err.message }));
	process.exit(1);
}
`;

function run(cmd, args, cwd) {
	return execFileSync(cmd, args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Message from a failed `execFileSync`, without npm's noise. */
function causeOf(err) {
	const text = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
	return text || err.message;
}

/** `npm pack` one workspace package into `dest`; returns the tarball path. */
function pack(ws, dest) {
	const out = run('npm', ['pack', '--json', '--pack-destination', dest], ws.dir);
	const [{ filename }] = JSON.parse(out);
	return join(dest, filename);
}

function harness(plugin, workspaces, tarballs, base) {
	const fixture = mkdtempSync(join(base, `${plugin.replace(SCOPE, '')}-`));
	if (isInside(realpathSync(fixture), realpathSync(ROOT))) {
		throw new Error(`fixture project ${fixture} is inside the workspace`);
	}

	const deps = {};
	for (const name of internalClosure(plugin, workspaces)) {
		deps[name] = `file:${tarballs.get(name)}`;
	}
	const manifest = {
		name: 'refrakt-pack-harness-fixture',
		private: true,
		type: 'module',
		dependencies: deps,
		overrides: deps,
	};
	writeFileSync(join(fixture, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
	writeFileSync(join(fixture, 'load.mjs'), LOADER);

	let stage = 'install';
	try {
		run(
			'npm',
			[
				'install',
				'--prefer-offline',
				'--no-audit',
				'--no-fund',
				'--no-package-lock',
				'--loglevel=error',
			],
			fixture,
		);
		stage = 'load';
		const result = JSON.parse(run('node', ['load.mjs', plugin], fixture).trim().split('\n').pop());
		return { ok: true, fixture, ...result };
	} catch (err) {
		if (stage === 'load' && err.stdout) {
			try {
				const result = JSON.parse(err.stdout.trim().split('\n').pop());
				return { ok: false, fixture, stage: result.stage, message: result.message };
			} catch {}
		}
		return { ok: false, fixture, stage, message: causeOf(err) };
	}
}

function main(argv) {
	const keep = argv.includes('--keep');
	const workspaces = readWorkspaces();
	const plugins = selectPlugins(
		argv.filter((a) => !a.startsWith('--')),
		workspaces,
	);

	const base = mkdtempSync(join(tmpdir(), 'refrakt-pack-harness-'));
	const tarDir = join(base, 'tarballs');
	mkdirSync(tarDir);

	const started = Date.now();
	const failures = [];
	try {
		const needed = new Set(plugins.flatMap((p) => internalClosure(p, workspaces)));
		const tarballs = new Map();
		for (const name of [...needed].sort()) {
			try {
				tarballs.set(name, pack(workspaces.get(name), tarDir));
			} catch (err) {
				throw new Error(`${name}: npm pack failed: ${causeOf(err)}`);
			}
		}

		for (const plugin of plugins) {
			const t = Date.now();
			const result = harness(plugin, workspaces, tarballs, base);
			const secs = ((Date.now() - t) / 1000).toFixed(1);
			if (result.ok) {
				const fromDir =
					result.composed?.length > 0
						? `, composed from runeDir: ${result.composed.join(', ')}`
						: '';
				console.log(
					`✓ ${plugin}: loaded ${result.runes} runes from the tarball${fromDir} (${secs}s)`,
				);
			} else {
				failures.push(plugin);
				console.error(`✗ ${plugin}: ${result.stage} failed: ${result.message}`);
				if (keep) console.error(`  fixture kept at ${result.fixture}`);
			}
		}
	} finally {
		if (!keep) rmSync(base, { recursive: true, force: true });
	}

	const total = ((Date.now() - started) / 1000).toFixed(1);
	if (failures.length > 0) {
		console.error(`\n${failures.length} of ${plugins.length} plugin(s) failed (${total}s)`);
		process.exit(1);
	}
	console.log(`\n${plugins.length} plugin(s) loaded from their tarballs (${total}s)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main(process.argv.slice(2));
	} catch (err) {
		console.error(`pack-harness: ${err.message}`);
		process.exit(1);
	}
}
