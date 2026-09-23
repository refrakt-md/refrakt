// Does $unwind earn a place? Measured against this repo's own plan entities.
//
//   node extract.mjs && node unwind.mjs
//
// `backlog` documents group="tags" as supported (plugins/plan/src/tags/backlog.ts:91),
// but groupEntities keys on fieldValue() — String(v) for a comma-string
// (packages/runes/src/collection-helpers.ts:121,235) — so the group key is the
// WHOLE tag list. This measures the gap, which is filed as BUG-025.

import { readFileSync } from 'node:fs';
import { Aggregator } from 'mingo';

const raw = JSON.parse(readFileSync(new URL('./entities.json', import.meta.url), 'utf8'));
const docs = raw.map((e) => ({ id: e.id, type: e.type, ...e.data }));
const split = (s) =>
	s
		? String(s)
				.split(',')
				.map((x) => x.trim())
				.filter(Boolean)
		: [];
const norm = docs.map((d) => ({
	...d,
	tags: split(d.tags),
	source: split(d.source),
	pr: split(d.pr),
}));

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

function report(field) {
	// Today: one group per distinct combination, keyed by the joined string.
	const today = new Map();
	for (const d of docs) {
		const key = split(d[field]).join(', ') || '(none)';
		today.set(key, (today.get(key) ?? 0) + 1);
	}
	// With $unwind: one group per member.
	const unwound = new Aggregator([{ $unwind: `$${field}` }, { $sortByCount: `$${field}` }]).run(
		norm,
	);
	const singletons = [...today.values()].filter((n) => n === 1).length;

	console.log(`\n── group by "${field}" ──`);
	console.log(`  today   : ${today.size} groups, ${singletons} of them with exactly 1 member`);
	console.log(`  $unwind : ${unwound.length} groups`);
	console.log(
		'  today top 3   :',
		[...today.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([k, n]) => `"${truncate(k, 44)}" (${n})`)
			.join('  '),
	);
	console.log(
		'  $unwind top 5 :',
		unwound
			.slice(0, 5)
			.map((r) => `${r._id} (${r.count})`)
			.join('  '),
	);
}

for (const field of ['tags', 'source', 'pr']) report(field);

// The miscount that looks plausible: an entity listing two specs lands in a
// combined group, so each spec's individual total reads low.
console.log('\n── how far off is a per-spec count today? ──');
const unwoundSource = new Aggregator([
	{ $match: { type: 'work' } },
	{ $unwind: '$source' },
	{ $sortByCount: '$source' },
])
	.run(norm)
	.slice(0, 5);
for (const { _id, count } of unwoundSource) {
	const todayCount = docs.filter(
		(d) => d.type === 'work' && split(d.source).join(', ') === _id,
	).length;
	const flag = todayCount === count ? '' : `  ← reads ${todayCount}, is ${count}`;
	console.log(`  ${_id}: ${count}${flag}`);
}

// A real plan view that needs $unwind: which specs have the most work behind them.
console.log('\n── spec fan-out: work items per spec ──');
console.log(
	'  ' +
		new Aggregator([
			{ $match: { type: 'work' } },
			{ $unwind: '$source' },
			{
				$group: {
					_id: '$source',
					items: { $sum: 1 },
					done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
				},
			},
			{ $sort: { items: -1 } },
			{ $limit: 5 },
		])
			.run(norm)
			.map((r) => `${r._id}: ${r.done}/${r.items} done`)
			.join('\n  '),
);

// Throughput over time — needs a date/string operator, not $unwind. In a
// shallow clone every git date collapses into one month, so this demonstrates
// the query, not the distribution.
console.log('\n── work completed per month (needs $substr; degenerate in a shallow clone) ──');
console.log(
	'  ' +
		new Aggregator([
			{ $match: { type: 'work', status: 'done', modified: { $exists: true } } },
			{ $group: { _id: { $substr: ['$modified', 0, 7] }, done: { $sum: 1 } } },
			{ $sort: { _id: 1 } },
		])
			.run(norm)
			.map((r) => `${r._id}: ${r.done}`)
			.join('  '),
);
