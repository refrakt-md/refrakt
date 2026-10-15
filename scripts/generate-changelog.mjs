#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'site', 'content', 'releases');

function main() {
	// Collect CHANGELOG.md files from all workspace packages
	const dirs = [...glob('packages'), ...glob('plugins'), ...glob('themes')];

	const versions = new Map(); // version → Set<change>

	for (const dir of dirs) {
		const file = join(root, dir, 'CHANGELOG.md');
		if (!existsSync(file)) continue;
		parseChangelog(readFileSync(file, 'utf8'), versions);
	}

	// Sort versions by semver descending
	const sorted = [...versions.keys()].sort((a, b) => compareSemver(b, a));

	// SPEC-176: each release opens with a summary — a handwritten note, or the
	// milestone's opening when there is none.
	const notes = readNotes(join(root, 'releases', 'notes'));
	const milestones = readMilestones(join(root, readPlanDir(), 'milestones'));
	for (const version of notes.keys()) {
		if (!versions.has(version)) console.log(`Skipped note for unreleased v${version}`);
	}

	// One page per release, holding the drawers and the full change list (D8),
	// and an index that only summarises.
	mkdirSync(outDir, { recursive: true });
	const written = new Set(['index.md']);
	const entries = [];
	for (const version of sorted) {
		const release = {
			version,
			date: getTagDate(version),
			summary: summaryFor(version, notes, milestones),
			changes: [...versions.get(version)],
		};
		entries.push(renderIndexEntry(release));
		if (hasPage(release)) {
			writeFileSync(join(outDir, `v${version}.md`), renderReleasePage(release));
			written.add(`v${version}.md`);
		}
	}

	writeFileSync(join(outDir, 'index.md'), renderIndex(entries));

	// A page whose version no longer has a changelog entry would otherwise linger.
	for (const name of readdirSync(outDir)) {
		if (/^v\d.*\.md$/.test(name) && !written.has(name)) rmSync(join(outDir, name));
	}
	console.log(`Wrote ${written.size - 1} release pages and the index to ${outDir}`);
}

// Run only when invoked directly (e.g. `node scripts/generate-changelog.mjs`
// from `npm run version-packages`). Importing the module for tests does not
// regenerate the release pages.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}

// --- release summaries (SPEC-176) ---

/** A release gets a page when there is something to put on it. */
export function hasPage(release) {
	return Boolean(release.summary) || release.changes.length > 0;
}

/**
 * The index: one short entry per release, with no drawers (D8). Each drawer
 * embeds its entity's whole body, so drawers for every release on one page grew
 * it from 2 MB to 6.8 MB; they live on the release pages instead.
 */
export function renderIndex(entries) {
	return `---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
${entries.join('\n\n') || '_No releases yet._'}
{% /changelog %}
`;
}

export function renderIndexEntry({ version, date, summary, changes }) {
	const parts = [date ? `## v${version} - ${date}` : `## v${version}`];
	if (summary) parts.push(plainRefs(summary));
	if (changes.length) {
		const count = changes.length === 1 ? '1 change' : `${changes.length} changes`;
		parts.push(`[All ${count} in v${version} →](/releases/v${version})`);
	} else if (summary) {
		parts.push(`[More about v${version} →](/releases/v${version})`);
	}
	return parts.join('\n\n');
}

export function renderReleasePage({ version, date, summary, changes }) {
	const parts = [
		`---\ntitle: v${version}\ndescription: What changed in refrakt.md v${version}\n---`,
		`# v${version}`,
		`${date ? `Released ${date} · ` : ''}[All releases](/releases)`,
	];
	if (summary) parts.push(summary);
	if (changes.length) parts.push(`## Changes\n\n${changes.join('\n')}`);
	return `${parts.join('\n\n')}\n`;
}

/** A handwritten note wins; otherwise the milestone named after the version;
 *  otherwise no summary (D3). */
export function summaryFor(version, notes, milestones) {
	if (notes.has(version)) return notes.get(version);
	const milestone = milestones.get(`v${version}`);
	return milestone ? milestoneSummary(milestone) : null;
}

/**
 * Read `releases/notes/v<version>.md` into version → content (D2).
 *
 * A note is placed verbatim inside the release's section of `{% changelog %}`,
 * where a `#` or `##` heading would end the release and start a bogus one, so
 * either is rejected with the file named.
 */
export function readNotes(dir) {
	const notes = new Map();
	if (!existsSync(dir)) return notes;
	for (const name of readdirSync(dir)) {
		const match = name.match(/^v(\d+\.\d+\.\d+(?:-[\w.]+)?)\.md$/);
		if (!match) continue;
		const content = readFileSync(join(dir, name), 'utf8').trim();
		if (/^#{1,2}\s/m.test(stripCodeFences(content.split('\n')).join('\n'))) {
			throw new Error(
				`${name}: a release note may not contain a # or ## heading; it would split the changelog entry`,
			);
		}
		if (content) notes.set(match[1], content);
	}
	return notes;
}

/** Map milestone name → source, read from the `name` attribute rather than the
 *  filename, so a misnamed file still counts. */
export function readMilestones(dir) {
	const milestones = new Map();
	if (!existsSync(dir)) return milestones;
	for (const name of readdirSync(dir)) {
		if (!name.endsWith('.md')) continue;
		const source = readFileSync(join(dir, name), 'utf8');
		const match = source.match(/\{%\s*milestone\b[^%]*?\bname="([^"]+)"/);
		if (match) milestones.set(match[1], source);
	}
	return milestones;
}

/**
 * The milestone's title in bold, then its first paragraph (D3).
 *
 * The title is the heading's text after the dash (`# v0.41.0 — Composed runes
 * you can ship`). The first paragraph is the first block after the heading
 * that is prose — a list, table, quote, fence or a line holding only a tag is
 * skipped, so a milestone that opens with one falls through to the next
 * paragraph.
 */
export function milestoneSummary(source) {
	const lines = source.split('\n');
	const headingAt = lines.findIndex((l) => /^#\s/.test(l));
	if (headingAt === -1) return null;
	const headingText = lines[headingAt].replace(/^#\s+/, '').trim();
	const dash = headingText.match(/\s[—–-]\s(.+)$/);
	const title = (dash ? dash[1] : headingText).trim();

	const lead = /[.!?]$/.test(title) ? `**${title}**` : `**${title}.**`;
	const paragraph = firstParagraph(lines.slice(headingAt + 1));
	return paragraph ? `${lead} ${drawerRefs(paragraph)}` : lead;
}

/** The first block of prose lines, skipping fenced code and every block that
 *  opens as a heading, list, quote, table, rule, HTML or Markdoc tag line. */
function firstParagraph(lines) {
	const isFence = (l) => /^\s*(```|~~~)/.test(l);
	const isProse = (l) =>
		!/^(#|[-*+]\s|\d+[.)]\s|>|\||<|---)/.test(l.trim()) && !/^\{%.*%\}$/.test(l.trim());
	let block = [];
	let inFence = false;
	for (const line of [...lines, '']) {
		if (isFence(line)) {
			inFence = !inFence;
			block = [];
		} else if (inFence) {
			// skip code
		} else if (line.trim() === '') {
			if (block.length && isProse(block[0])) return block.join('\n');
			block = [];
		} else {
			block.push(line);
		}
	}
	return null;
}

/** Give every `{% ref %}` / `{% xref %}` without a `preview` attribute
 *  `preview="drawer"`: plan entities have no page on the main site, so a plain
 *  ref there renders as unlinked text (D3, D7). */
export function drawerRefs(text) {
	return text.replace(/\{%\s*(x?ref)\b([^%]*?)\s*\/%\}/g, (whole, tag, inner) =>
		/\bpreview=/.test(inner) ? whole : `{% ${tag}${inner} preview="drawer" /%}`,
	);
}

/**
 * Flatten references for the index, which carries no drawers: a ref becomes its
 * label, or its target, as plain text; a file-ref keeps its GitHub link but
 * loses its drawer preview.
 */
export function plainRefs(text) {
	return text
		.replace(/\{%\s*x?ref\s+"([^"]+)"([^%]*?)\s*\/%\}/g, (_, target, attrs) => {
			const label = attrs.match(/\blabel="([^"]*)"/);
			return label ? label[1] : target;
		})
		.replace(/(\{%\s*file-ref\b[^%]*?)\s+preview="[^"]*"/g, '$1');
}

// --- ref check (SPEC-176 D6) ---

/**
 * Every ID and milestone name the plan declares: the `id` of a spec, work,
 * bug or decision tag and the `name` of a milestone tag. A declaration inside
 * a code fence is an example, not an entity, so it does not count.
 */
export function declaredPlanIds(planDir) {
	const declared = new Set();
	const walk = (dir) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith('.')) continue;
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (entry.name.endsWith('.md')) {
				const live = stripCodeFences(readFileSync(path, 'utf8').split('\n')).join('\n');
				for (const m of live.matchAll(
					/\{%\s*(spec|work|bug|decision|milestone)\b[^%]*?\b(id|name)="([^"]+)"/g,
				)) {
					if ((m[1] === 'milestone') === (m[2] === 'name')) declared.add(m[3]);
				}
			}
		}
	};
	if (existsSync(planDir)) walk(planDir);
	return declared;
}

/** The `ref` and `xref` targets in `text` that `declared` does not hold, with
 *  their 1-based line numbers. Fenced examples are skipped. */
export function unresolvedRefs(text, declared) {
	const found = [];
	let inFence = false;
	text.split('\n').forEach((line, i) => {
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		if (inFence) return;
		for (const m of line.matchAll(/\{%\s*x?ref\s+"([^"]+)"/g)) {
			if (!declared.has(m[1])) found.push({ line: i + 1, target: m[1] });
		}
	});
	return found;
}

/**
 * Check every summary the changelog can show: each note in `releases/notes/`,
 * and each milestone opening the generator falls back to. A finding names the
 * file, the line and the target. Returns an empty list when every ref resolves.
 */
export function releaseRefFindings(rootDir, planDirName = 'plan') {
	const planDir = join(rootDir, planDirName);
	const declared = declaredPlanIds(planDir);
	const findings = [];
	const notesDir = join(rootDir, 'releases', 'notes');
	if (existsSync(notesDir)) {
		for (const name of readdirSync(notesDir).filter((n) => n.endsWith('.md'))) {
			const text = readFileSync(join(notesDir, name), 'utf8');
			for (const f of unresolvedRefs(text, declared)) {
				findings.push(
					`releases/notes/${name}:${f.line}: ${f.target} is not declared in ${planDirName}/`,
				);
			}
		}
	}
	for (const [milestone, source] of readMilestones(join(planDir, 'milestones'))) {
		const summary = milestoneSummary(source);
		if (!summary) continue;
		for (const f of unresolvedRefs(summary, declared)) {
			findings.push(
				`${milestone} milestone opening: ${f.target} is not declared in ${planDirName}/`,
			);
		}
	}
	return findings;
}

function readPlanDir() {
	try {
		const config = JSON.parse(readFileSync(join(root, 'refrakt.config.json'), 'utf8'));
		return config.plan?.dir ?? 'plan';
	} catch {
		return 'plan';
	}
}

// --- helpers ---

function glob(subdir) {
	const base = join(root, subdir);
	if (!existsSync(base)) return [];
	return readdirSync(base, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => join(subdir, d.name));
}

export function parseChangelog(text, versions) {
	const lines = text.split('\n');
	let currentVersion = null;
	let bulletLines = null;

	function flushBullet() {
		if (bulletLines && currentVersion) {
			// Strip trailing blank lines
			while (bulletLines.length && bulletLines[bulletLines.length - 1].trim() === '') {
				bulletLines.pop();
			}
			processBulletBlock(bulletLines, versions.get(currentVersion));
		}
		bulletLines = null;
	}

	for (const line of lines) {
		// Version heading: ## 0.2.0
		const versionMatch = line.match(/^## (\d+\.\d+\.\d+(?:-[\w.]+)?)/);
		if (versionMatch) {
			flushBullet();
			currentVersion = versionMatch[1];
			if (!versions.has(currentVersion)) versions.set(currentVersion, new Set());
			continue;
		}

		// Category heading at column 0: ### Patch Changes, ### Minor Changes
		if (/^###\s/.test(line)) {
			flushBullet();
			continue;
		}

		if (!currentVersion) continue;

		// Top-level bullet start: "- something"
		if (/^- .+/.test(line)) {
			flushBullet();
			bulletLines = [line];
			continue;
		}

		// Inside a bullet: accumulate blank or indented continuation lines
		if (bulletLines !== null) {
			if (line.trim() === '' || /^\s/.test(line)) {
				bulletLines.push(line);
			} else {
				flushBullet();
			}
			continue;
		}
	}

	flushBullet();
}

function processBulletBlock(lines, versionSet) {
	if (!lines.length || !versionSet) return;

	// Drop fenced code blocks before flattening. The changelog is a prose
	// summary; embedded code examples collapse into broken inline markdown when
	// paragraphs are unwrapped (the ``` markers end up mid-line), and any Markdoc
	// rune syntax inside them (e.g. `{% snippet %}`) would then parse as a LIVE
	// rune in the rendered releases.md instead of as an example — snippet in
	// particular throws at transform time by design. Stripping fences keeps the
	// changelog inert. Inline `` `{% x %}` `` code spans are untouched (Markdoc
	// doesn't parse tags inside inline code), so prose examples still render.
	lines = stripTables(stripCodeFences(lines));
	if (!lines.length) return;

	const firstContent = lines[0].replace(/^- /, '');

	// Heading-label bullets (- ### Editor): extract sub-bullets only
	if (/^#{1,6}\s/.test(firstContent)) {
		for (const line of lines) {
			const subMatch = line.match(/^\s+- (.+)/);
			if (!subMatch) continue;
			if (/^#{1,6}\s/.test(subMatch[1])) continue;
			const cleaned = cleanEntry(`- ${subMatch[1]}`);
			if (cleaned) versionSet.add(cleaned);
		}
		return;
	}

	// Split into paragraphs (separated by blank lines)
	const paragraphs = [];
	let current = [];
	for (const line of lines) {
		if (line.trim() === '') {
			if (current.length) {
				paragraphs.push(current);
				current = [];
			}
		} else {
			current.push(line);
		}
	}
	if (current.length) paragraphs.push(current);

	for (const para of paragraphs) {
		// Separate sub-bullets from prose lines.
		//
		// A wrapped sub-bullet continues on indented lines that are not themselves
		// bullets, and those belong to the bullet above them. Treating them as
		// prose truncated every sub-bullet at its first line and then joined all
		// the orphaned tails into one sentence — three unrelated half-thoughts run
		// together, which is what v0.34.0's entry for BUG-014 reads like.
		const subBullets = [];
		const proseLines = [];
		for (const l of para) {
			if (/^\s+- .+/.test(l)) subBullets.push([l]);
			else if (subBullets.length > 0 && /^\s+\S/.test(l)) subBullets[subBullets.length - 1].push(l);
			else proseLines.push(l);
		}

		// Process sub-bullets individually, each unwrapped across its own lines
		for (const sb of subBullets) {
			const content = sb
				.map((l, i) => (i === 0 ? l.replace(/^\s+- /, '') : l.trim()))
				.join(' ')
				.trim();
			if (/^#{1,6}\s/.test(content)) continue;
			if (/^@[\w-]+\/[\w-]+@\d/.test(content)) continue;
			const cleaned = cleanEntry(`- ${content}`);
			if (cleaned) versionSet.add(cleaned);
		}

		if (!proseLines.length) continue;

		// Skip inline heading labels (  ### Section Name)
		if (proseLines.length === 1 && /^\s+#{1,6}\s/.test(proseLines[0])) continue;

		// Skip category labels (single short line ending with ":")
		if (
			proseLines.length === 1 &&
			/^\s+\S.*:\s*$/.test(proseLines[0]) &&
			proseLines[0].trim().length < 80
		)
			continue;

		// Prose paragraph: unwrap into a single line
		const unwrapped = proseLines
			.map((l) => l.replace(/^- /, '').replace(/^\s+/, ''))
			.join(' ')
			.trim();

		if (!unwrapped) continue;
		const cleaned = cleanEntry(`- ${unwrapped}`);
		if (cleaned) versionSet.add(cleaned);
	}
}

/** Remove fenced code blocks (``` … ```) from a block of changelog lines,
 *  including the fence markers and everything between them. Toggles on any
 *  line whose first non-whitespace characters are three backticks, so it
 *  handles the indented fences that changesets nest under a bullet. */
/**
 * Drop markdown tables, for the same reason fences go.
 *
 * The changelog is a flat prose summary — every entry becomes one bullet — and a
 * table has no flat form. Unwrapped it becomes a single line of pipes and
 * dashes, which is less readable than the sentence beside it and tells a reader
 * nothing. A changeset that wants its table read should say the same thing in a
 * sentence; the full table is still in the package CHANGELOG.
 */
export function stripTables(lines) {
	const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
	return lines.filter((l) => !isRow(l));
}

export function stripCodeFences(lines) {
	const out = [];
	let inFence = false;
	for (const line of lines) {
		if (/^\s*```/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (!inFence) out.push(line);
	}
	return out;
}

function cleanEntry(line) {
	let text = line;

	// Skip dependency-only entries: "- @refrakt-md/types@0.2.0"
	if (text.match(/^- @[\w-]+\/[\w-]+@\d/)) return null;

	// Skip "Updated dependencies [hash]" entries
	if (text.match(/^- Updated dependencies/)) return null;

	// Remove leading PR/commit link patterns
	text = text.replace(/^- (?:\[.*?\]\(.*?\)\s*)*/, '- ');

	// Remove "Thanks @user! - " prefix
	text = text.replace(/^(- )Thanks @[\w-]+!\s*[-–—]\s*/, '$1');

	// Remove "hash: " prefix (changesets format): "- abc1234: text" → "- text"
	text = text.replace(/^(- )[a-f0-9]{7,}:\s*/, '$1');

	// Remove "hash - " prefix: "- abc1234 - text" → "- text"
	text = text.replace(/^(- )[a-f0-9]{7,}\s*[-–—]\s*/, '$1');

	return text.trim() || null;
}

function getTagDate(version) {
	// Changesets creates tags like "@refrakt-md/types@0.2.0" and "create-refrakt@0.2.0"
	// Try well-known tags first, then fall back to any tag matching this version
	const candidates = [`@refrakt-md/types@${version}`, `v${version}`, version];

	// Find any tag ending with @{version} as fallback
	try {
		const tags = execSync(`git tag -l "*@${version}"`, {
			cwd: root,
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim();
		if (tags) candidates.push(...tags.split('\n'));
	} catch {}

	for (const tag of candidates) {
		try {
			const iso = execSync(`git log -1 --format=%aI "${tag}"`, {
				cwd: root,
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'pipe'],
			}).trim();
			if (iso) {
				const d = new Date(iso);
				return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
			}
		} catch {
			/* tag doesn't exist */
		}
	}
	return '';
}

function compareSemver(a, b) {
	const pa = a.split('.').map(Number);
	const pb = b.split('.').map(Number);
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) return pa[i] - pb[i];
	}
	return 0;
}
