#!/usr/bin/env node
// Draft a release note for the site changelog (SPEC-176 D5, WORK-643).
//
//   npm run release-notes:draft -- 0.42.0
//
// Writes releases/notes/v<version>.md with everything but the opening
// sentences: the milestone's opening to rewrite, an action-needed block to keep
// or delete, and drawer refs to the milestone, its specs and its bugs. Lines
// starting with `TODO:` are instructions; a test fails while any remains.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { milestoneSummary, readMilestones } from './generate-changelog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The work and bug items whose `milestone` attribute names `milestone`. Read
 * from the milestone link rather than `released-in`, which is only set after
 * the release ships, while the note is written before it.
 */
export function milestoneItems(planDir, milestone) {
	const items = [];
	for (const sub of ['work', 'bugs']) {
		const dir = join(planDir, sub);
		if (!existsSync(dir)) continue;
		for (const name of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
			const tag = readFileSync(join(dir, name), 'utf8').match(/\{%\s*(work|bug)\b([^%]*)%\}/);
			if (!tag) continue;
			const attr = (key) => tag[2].match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];
			if (attr('milestone') !== milestone) continue;
			items.push({
				type: tag[1],
				id: attr('id'),
				sources: (attr('source') ?? '')
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean),
			});
		}
	}
	return items;
}

const byNumber = (a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]);

/** The background refs, milestone first, then specs, then bugs, each group in
 *  ID order. Only `SPEC-` sources count as specs. */
export function backgroundRefs(milestone, items, hasMilestone) {
	const specs = [
		...new Set(items.flatMap((i) => i.sources).filter((s) => s.startsWith('SPEC-'))),
	].sort(byNumber);
	const bugs = items
		.filter((i) => i.type === 'bug')
		.map((i) => i.id)
		.sort(byNumber);
	const refs = [];
	if (hasMilestone) refs.push(`{% ref "${milestone}" preview="drawer" label="the milestone" /%}`);
	for (const id of [...specs, ...bugs]) refs.push(`{% ref "${id}" preview="drawer" /%}`);
	return refs;
}

export function draftReleaseNote(version, planDir) {
	const milestone = `v${version}`;
	const source = readMilestones(join(planDir, 'milestones')).get(milestone);
	const items = milestoneItems(planDir, milestone);
	const refs = backgroundRefs(milestone, items, Boolean(source));
	const summary = source ? milestoneSummary(source) : null;
	const opening = summary?.body || `What ${milestone} is for.`;
	// The title goes in the release heading ("v0.42.0 · Title"). Left empty, the
	// milestone's title is used; with no milestone there is none until one is set.
	const front = `---\ntitle: ${summary?.title ? JSON.stringify(summary.title) : ''}\n---`;

	const parts = [
		front,
		`TODO: rewrite the opening below for users, in two or three sentences on what ${milestone} is for.${source ? " It starts as the milestone's opening, which is written for maintainers." : ' Set a title in the frontmatter, too.'}`,
		opening,
		'TODO: keep this block only if upgrading needs a change from the reader; otherwise delete it.',
		'{% hint type="warning" %}\n**Action needed:** what to change, and how.\n{% /hint %}',
	];
	if (refs.length) parts.push(`Background: ${refs.join(' ·\n')}`);
	return `${parts.join('\n\n')}\n`;
}

/** `TODO:` lines left in a note, as findings naming the file and line. */
export function draftMarkerFindings(notesDir) {
	const findings = [];
	if (!existsSync(notesDir)) return findings;
	for (const name of readdirSync(notesDir).filter((n) => n.endsWith('.md'))) {
		readFileSync(join(notesDir, name), 'utf8')
			.split('\n')
			.forEach((line, i) => {
				if (/^TODO:/.test(line)) {
					findings.push(`releases/notes/${name}:${i + 1}: unfinished draft (${line.slice(0, 60)})`);
				}
			});
	}
	return findings;
}

function main(args) {
	const version = (args[0] ?? '').replace(/^v/, '');
	if (!/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(version)) {
		console.error('Usage: npm run release-notes:draft -- <version>   (for example 0.42.0)');
		process.exit(1);
	}
	const config = JSON.parse(readFileSync(join(root, 'refrakt.config.json'), 'utf8'));
	const planDir = join(root, config.plan?.dir ?? 'plan');
	const out = join(root, 'releases', 'notes', `v${version}.md`);
	if (existsSync(out)) {
		console.error(`${out} already exists; edit it, or delete it to draft again.`);
		process.exit(1);
	}
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, draftReleaseNote(version, planDir));
	console.log(`Wrote ${out}. Finish the TODO lines before merging the release PR.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main(process.argv.slice(2));
}
