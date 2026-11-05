/**
 * The intro every rune reference page opens with, as data (SPEC-187 D5).
 *
 * One record per rune that has a page of its own, written to
 * `site/content/_data/rune-intro.json` beside the attribute data and by the
 * same command (`npm run runes:attributes`), so one drift check covers both.
 * `_partials/rune-intro.md` renders it.
 *
 * Nothing in a record is written by hand:
 *
 * - `title`, `description` and `status` are the reference page's frontmatter,
 *   so they exist once.
 * - `package` is the plugin the rune resolves from on the `main` site.
 * - `composed` and `source` come from how it resolves. A plugin cannot define a
 *   rune both in `Plugin.runes` and in its `runeDir` (SPEC-153 D3,
 *   `rune-defined-twice`), so a `<runeDir>/<rune>.md` in the package that owns
 *   the rune *is* its definition, and the rune is composed. Otherwise the
 *   source is the schema module, `src/tags/<rune>.ts`. A record whose source
 *   names no file fails the build rather than linking nowhere.
 * - `schemaType` is the type the rune's resolved schema.org row publishes with
 *   its defaults (D9), the row `refrakt inspect <rune>` prints.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDocPages, PAGELESS } from './check-rune-docs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const INTRO_PATH = join(ROOT, 'site/content/_data/rune-intro.json');
const RUNES_DIR = join(ROOT, 'site/content/runes');

/** A page's frontmatter fields, as plain strings. */
export function frontmatterOf(source) {
	const block = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
	const fields = {};
	for (const line of block.split('\n')) {
		const m = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
		if (!m) continue;
		fields[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2').trim();
	}
	return fields;
}

/** npm name → workspace directory (repo-relative), for every package and plugin. */
export function workspaceDirs(root = ROOT) {
	const dirs = { core: 'packages/runes' };
	for (const parent of ['packages', 'plugins']) {
		for (const entry of readdirSync(join(root, parent))) {
			const manifest = join(root, parent, entry, 'package.json');
			if (!existsSync(manifest)) continue;
			dirs[JSON.parse(readFileSync(manifest, 'utf8')).name] = `${parent}/${entry}`;
		}
	}
	return dirs;
}

/** npm name → the plugin's declared `runeDir`, read from the plugin itself. */
export async function runeDirs(packages) {
	const out = {};
	for (const name of packages) {
		if (name === 'core') continue;
		const mod = await import(name);
		const plugin =
			mod.default ?? Object.values(mod).find((v) => v && typeof v === 'object' && 'runes' in v);
		if (plugin?.runeDir) out[name] = plugin.runeDir;
	}
	return out;
}

/** Core runes whose schema lives outside `src/tags/`. */
const CORE_SOURCES = { link: 'packages/runes/src/nodes.ts' };

/** Where a rune is defined, and whether that is a composition. */
export function sourceOf(rune, { dirs, runeDirOf, exists = (p) => existsSync(join(ROOT, p)) }) {
	if (rune.plugin === 'core' && CORE_SOURCES[rune.name]) {
		return { composed: false, source: CORE_SOURCES[rune.name] };
	}
	const dir = dirs[rune.plugin];
	if (!dir)
		throw new Error(
			`rune-intro: no workspace directory for package "${rune.plugin}" (${rune.name})`,
		);
	const runeDir = runeDirOf[rune.plugin];
	if (runeDir) {
		const definition = `${dir}/${runeDir}/${rune.name}.md`;
		if (exists(definition)) return { composed: true, source: definition };
	}
	const schema = `${dir}/src/tags/${rune.name}.ts`;
	if (exists(schema)) return { composed: false, source: schema };
	throw new Error(
		`rune-intro: no source for "${rune.name}" — neither a definition in ${rune.plugin}'s runeDir nor ${schema}`,
	);
}

/** The package as the eyebrow shows it, and the page it links to. */
export function packageOf(rune, pageRel) {
	if (rune.plugin === 'core') {
		return { packageLabel: 'core', packageUrl: '/runes/rune-catalog', plugin: false, core: true };
	}
	const section = pageRel.split('/')[0];
	return {
		// The eyebrow names the plugin, not its npm scope: `marketing`, not
		// `@refrakt-md/marketing`. The full name is in the Install drawer.
		packageLabel: rune.plugin.split('/').pop(),
		packageUrl: `/runes/${section}`,
		plugin: true,
		// The partial branches on both: `$row` does not reach a function's
		// arguments, so `not($row.plugin)` cannot stand in for this.
		core: false,
	};
}

/**
 * The records, sorted by rune. `pages` is `findDocPages()`; `read` reads a page
 * by its path relative to `site/content/runes/`.
 */
export function introRecords(runes, { pages, read, dirs, runeDirOf, exists, repo }) {
	const records = [];
	for (const rune of [...runes].sort((a, b) => a.name.localeCompare(b.name))) {
		if (PAGELESS.has(rune.name)) continue;
		const page = pages.get(rune.name);
		if (!page?.isRune) continue;
		const fm = frontmatterOf(read(page.rel));
		const status = fm.status || 'stable';
		const schemaType = rune.schemaOrg?.type ?? '';
		records.push({
			rune: rune.name,
			title: fm.title ?? rune.name,
			description: fm.description ?? '',
			status,
			unstable: status !== 'stable',
			package: rune.plugin,
			...packageOf(rune, page.rel),
			...withSourceUrl(sourceOf(rune, { dirs, runeDirOf, exists }), repo),
			// Markdoc's `if` treats `""` as true, so the partial tests this.
			publishes: schemaType !== '',
			staged: false,
			schemaType,
			schemaUrl: schemaType ? `https://schema.org/${schemaType}` : '',
		});
	}
	return records;
}

/** The file on GitHub, for the Source drawer's footer link (SPEC-187 D12). */
export function withSourceUrl(found, repo) {
	if (!repo?.url) return { ...found, sourceUrl: '' };
	const base = repo.url.replace(/\/+$/, '');
	return { ...found, sourceUrl: `${base}/blob/${repo.branch || 'main'}/${found.source}` };
}

/** The `main` site's repository, from `refrakt.config.json`. */
export function repoOf(root = ROOT) {
	const config = JSON.parse(readFileSync(join(root, 'refrakt.config.json'), 'utf8'));
	const site = config.sites?.main ?? config;
	return { url: site.repoUrl ?? '', branch: site.repoBranch ?? 'main' };
}

/**
 * The partial cannot say "composed and not staged" (`$row` does not reach a
 * function's arguments), so the record carries the badge decision itself.
 */
export function withBadges(record) {
	return { ...record, compositionBadge: record.composed && !record.staged };
}

/**
 * A site's records from `main`'s: a rune the site resolves from its project rune
 * directory (`runes.prefer` → `__project__`, SPEC-181 D1) is staged there, and
 * its source is the staged definition. Everything else — the package, the
 * Install drawer, the page — is the rune it stands in for.
 */
export function stagedRecords(records, { runes, runesDir, repo }) {
	const project = new Set(runes.filter((r) => r.plugin === 'project').map((r) => r.name));
	return records.map((record) => {
		if (!project.has(record.rune)) return record;
		const source = `${runesDir}/${record.rune}.md`;
		return { ...record, composed: true, staged: true, ...withSourceUrl({ source }, repo) };
	});
}

/** The artifact: one partition per site, so a page selects its records with
 *  `root=$site.name` (SPEC-187 D7). */
export function renderIntro(bySite) {
	const out = {};
	for (const [site, records] of Object.entries(bySite)) out[site] = records.map(withBadges);
	return JSON.stringify(out, null, '\t') + '\n';
}

/**
 * Every site that renders this content directory, with its runes and its
 * project rune directory, from `refrakt.config.json`. The `main` site comes
 * first: the other sites' records are derived from its.
 */
export function introSites(root = ROOT) {
	const config = JSON.parse(readFileSync(join(root, 'refrakt.config.json'), 'utf8'));
	const sites = config.sites ?? {};
	const contentDir = sites.main?.contentDir;
	return Object.entries(sites)
		.filter(([, site]) => site.contentDir === contentDir)
		.sort(([a], [b]) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b)))
		.map(([name, site]) => ({ name, runesDir: site.runes?.dir?.replace(/^\.\//, '') ?? '' }));
}

/** Read everything from disk and build the records for these runes. */
export async function buildIntro(runes) {
	const dirs = workspaceDirs();
	const runeDirOf = await runeDirs(new Set(runes.map((r) => r.plugin)));
	return introRecords(runes, {
		pages: findDocPages(),
		read: (rel) => readFileSync(join(RUNES_DIR, rel), 'utf8'),
		dirs,
		runeDirOf,
		repo: repoOf(),
	});
}
