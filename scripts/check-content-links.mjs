/**
 * Intra-site link check (BUG-005).
 *
 * Reports internal links whose target page or `#fragment` does not exist.
 *
 * A fragment that matches no element is not an error in any browser — the
 * reader simply lands at the top of the page and hunts. That silence is how
 * twelve broken deep links accumulated in `site/content` before anyone noticed,
 * and it is why heading ids are worth checking mechanically rather than by
 * intuition: refrakt's slug rules are not the ones an author guesses.
 *
 * Heading ids come from `extractHeadings` — the same function the renderer's
 * `heading` transform slugs with — so this checks the ids that actually ship
 * rather than a reimplementation of the rules.
 *
 * Usage:
 *   node scripts/check-content-links.mjs        # exit 1 on any broken link
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import { extractHeadings } from '@refrakt-md/runes';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Content roots to check, from `refrakt.config.json`'s sites. */
export function siteRoots(root = ROOT) {
	const config = JSON.parse(readFileSync(join(root, 'refrakt.config.json'), 'utf8'));
	return Object.entries(config.sites ?? {}).map(([name, site]) => ({
		name,
		dir: join(root, site.contentDir.replace(/^\.\//, '')),
	}));
}

function walk(dir, out = []) {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (entry.endsWith('.md')) out.push(p);
	}
	return out;
}

/** Map a content file to the URL it is served at. */
export function urlForFile(file, contentDir) {
	let rel = relative(contentDir, file).replace(/\.md$/, '');
	if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
	if (rel === 'index') return '/';
	return '/' + rel;
}

/**
 * True when a page builds headings from data rather than writing them.
 *
 * `{% data %}` with a body renders it once per row, binding `$row` at
 * preprocess — so `### {% $row.name %}` becomes one heading per row. This check
 * reads the *parsed* source, before that substitution, so it cannot know those
 * ids. Rather than report every link into such a page as broken, treat its
 * heading set as unknown.
 */
export function hasGeneratedHeadings(source) {
	return /\{%\s*data\b[^%]*%\}[\s\S]*?\{%\s*\/data\s*%\}/.test(source);
}

/** Heading ids for one page's source, frontmatter stripped. */
export function headingIdsFor(source) {
	const body = source.replace(/^---\n[\s\S]*?\n---\n/, '');
	try {
		return new Set(extractHeadings(Markdoc.parse(body)).map(h => h.id));
	} catch {
		// An unparseable page is another check's problem, not this one's.
		return null;
	}
}

/**
 * Find internal links whose fragment matches no heading on the target page.
 *
 * Only fragments are checked, and only against pages this site actually holds:
 * a link to a page outside the content tree (a generated `entityRoutes` page,
 * say) has no source file to read headings from, so it is skipped rather than
 * guessed at.
 */
export function findBrokenFragments(pages) {
	const idsByUrl = new Map();
	for (const page of pages) {
		if (hasGeneratedHeadings(page.source)) continue;
		const ids = headingIdsFor(page.source);
		if (ids) idsByUrl.set(page.url, ids);
	}

	const broken = [];
	for (const page of pages) {
		for (const match of page.source.matchAll(/\]\((\/[^)\s#]*)#([^)\s]+)\)/g)) {
			const [, url, fragment] = match;
			const ids = idsByUrl.get(url === '' ? '/' : url);
			if (!ids) continue;
			if (!ids.has(fragment)) {
				broken.push({ from: page.file, url, fragment });
			}
		}
	}
	return broken;
}

export function collectPages(root = ROOT) {
	const pages = [];
	for (const site of siteRoots(root)) {
		for (const file of walk(site.dir)) {
			pages.push({
				site: site.name,
				file: relative(root, file),
				url: urlForFile(file, site.dir),
				source: readFileSync(file, 'utf8'),
			});
		}
	}
	return pages;
}

function main() {
	const broken = findBrokenFragments(collectPages());
	if (broken.length === 0) {
		console.log('✓ every internal #fragment resolves to a heading');
		return 0;
	}
	console.error(`${broken.length} internal link(s) point at a heading that does not exist:\n`);
	for (const b of broken) {
		console.error(`  ${b.from}`);
		console.error(`    → ${b.url}#${b.fragment}`);
	}
	console.error('\nHeading ids are lowercase, punctuation-stripped, separator-collapsed.');
	console.error('Check the target page\'s headings rather than guessing the slug.');
	return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main());
}
