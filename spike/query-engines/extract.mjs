// Extract this repo's own plan entities into the shape the entity registry
// holds them in — { id, type, sourceUrl, sourceFile, data } — so the query
// engines under test run against real content rather than a fixture.
//
//   node extract.mjs        # writes entities.json (gitignored)
//
// `modified` comes from git (most recent commit touching the file), matching
// how the plan runes default that attribute. In a shallow clone the dates
// cluster; that degrades the date-window query's *data*, not its result.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'entities.json');

const SOURCES = [
	['plan/work', '/plan/work'],
	['plan/bugs', '/plan/bugs'],
	['plan/specs', '/plan/specs'],
];

/** Most recent commit date per plan file, as an ISO date. */
function gitModifiedDates() {
	const out = execFileSync(
		'git',
		[
			'log',
			'--diff-filter=AM',
			'--name-only',
			'--format=COMMIT %cI',
			'--',
			...SOURCES.map(([d]) => d),
		],
		{ cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
	);
	const dates = new Map();
	let commit = null;
	for (const line of out.split('\n')) {
		if (line.startsWith('COMMIT ')) {
			commit = line.slice(7).trim();
			continue;
		}
		const file = line.trim();
		if (file && commit && !dates.has(file)) dates.set(file, commit.slice(0, 10));
	}
	return dates;
}

/** Read the opening rune tag's attributes plus the H1 title. */
function parseEntity(src) {
	const tag = /^\{%\s*(work|bug|spec|decision|milestone)\s+([\s\S]*?)%\}/.exec(src);
	if (!tag) return null;
	const attrs = {};
	const attr = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
	let m;
	while ((m = attr.exec(tag[2]))) attrs[m[1]] = m[2];
	const title = /^#\s+(.+)$/m.exec(src);
	if (title) attrs.title = title[1].trim();
	return { type: tag[1], attrs };
}

const modified = gitModifiedDates();
const entities = [];

for (const [dir, urlBase] of SOURCES) {
	let files;
	try {
		files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.md'));
	} catch {
		continue;
	}
	for (const file of files) {
		const rel = `${dir}/${file}`;
		const parsed = parseEntity(readFileSync(join(ROOT, rel), 'utf8'));
		if (!parsed?.attrs.id) continue;
		const { type, attrs } = parsed;
		const { id, ...data } = attrs;
		const when = modified.get(rel);
		if (when) data.modified = when;
		entities.push({
			id,
			type,
			sourceUrl: `${urlBase}/${file.replace(/\.md$/, '')}`,
			sourceFile: rel,
			data,
		});
	}
}

writeFileSync(OUT, JSON.stringify(entities, null, '\t'));

const byType = {};
for (const e of entities) byType[e.type] = (byType[e.type] ?? 0) + 1;
console.log(`wrote ${entities.length} entities to entities.json`, byType);
console.log(`with a git modified date: ${entities.filter((e) => e.data.modified).length}`);
