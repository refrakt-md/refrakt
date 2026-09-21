// Predicate tier: liqe vs mingo vs JSONata, over this repo's real plan entities.
//
//   node extract.mjs && node compare.mjs
//
// Every engine sees the SAME flattened document an engine adapter would build
// from a RegistryEntity: top-level id/type/url plus the `data` bag inlined,
// mirroring resolveEntityField's top-level-then-data lookup
// (packages/runes/src/field-match.ts:94).
//
// Ground truth is a hand-written JS predicate per query. An engine passes only
// if its result set is identical to ground truth — a query that runs but
// returns the wrong rows is a failure, which is the whole point: the
// interesting liqe results are silent, not loud.

import { readFileSync } from 'node:fs';
import * as liqe from 'liqe';
import { Query as MingoQuery, Aggregator } from 'mingo';
import jsonata from 'jsonata';

const raw = JSON.parse(readFileSync(new URL('./entities.json', import.meta.url), 'utf8'));

/** What an engine adapter hands the engine. */
const docs = raw.map((e) => ({ id: e.id, type: e.type, url: e.sourceUrl, ...e.data }));

const split = (s) =>
	s
		? String(s)
				.split(',')
				.map((x) => x.trim())
				.filter(Boolean)
		: [];

/** The same documents with comma-strings normalized to arrays — the extra work
 *  an adapter must do before array operators mean anything. */
const docsNorm = docs.map((d) => ({
	...d,
	tags: split(d.tags),
	source: split(d.source),
	pr: split(d.pr),
}));

const tagsOf = (d) => split(d.tags);
const ids = (rows) => rows.map((r) => r.id).sort();
const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const mingoFind = (q, set = docs) => new MingoQuery(q).find(set).all();

const results = [];
function run(name, truthFn, attempts) {
	const truth = ids(docs.filter(truthFn));
	const row = { name, count: truth.length, engines: {} };
	for (const [engine, fn] of Object.entries(attempts)) {
		let got;
		try {
			got = fn();
		} catch (err) {
			row.engines[engine] = { ok: false, note: `ERROR: ${String(err.message).split('\n')[0]}` };
			continue;
		}
		if (got === null) {
			row.engines[engine] = { ok: false, note: 'NOT EXPRESSIBLE' };
			continue;
		}
		const g = ids(got);
		const ok = eq(g, truth);
		row.engines[engine] = {
			ok,
			note: ok ? 'match' : `${g.length} rows (expected ${truth.length})`,
		};
	}
	results.push(row);
}

// ── Q1 — attention list: cross-field OR + absence ───────────────────────
run(
	'Q1 cross-field OR + absence',
	(d) => d.priority === 'critical' || d.status === 'blocked' || !d.assignee,
	{
		liqe: () =>
			liqe.filter(liqe.parse('priority:critical OR status:blocked OR NOT assignee:*'), docs),
		mingo: () =>
			mingoFind({
				$or: [{ priority: 'critical' }, { status: 'blocked' }, { assignee: { $in: [null, ''] } }],
			}),
	},
);

// ── Q2 — date window over ISO strings ───────────────────────────────────
run('Q2 date window', (d) => d.type === 'work' && !!d.modified && d.modified >= '2026-09-01', {
	// liqe's comparison operators are numeric-only — see probe.mjs.
	liqe: () => null,
	mingo: () => mingoFind({ type: 'work', modified: { $gte: '2026-09-01' } }),
});

// ── Q3 — orphans: negation over a set + missing/empty field ─────────────
run(
	'Q3 negation over set + absence',
	(d) => d.type === 'work' && !['done', 'cancelled', 'superseded'].includes(d.status) && !d.source,
	{
		liqe: () =>
			liqe.filter(
				liqe.parse('type:/^work$/ AND NOT status:/^(done|cancelled|superseded)$/ AND NOT source:*'),
				docs,
			),
		mingo: () =>
			mingoFind({
				type: 'work',
				status: { $nin: ['done', 'cancelled', 'superseded'] },
				source: { $in: [null, ''] },
			}),
	},
);

// ── Q4 — array AND (both tags) ──────────────────────────────────────────
run('Q4 array AND (both tags)', (d) => tagsOf(d).includes('runes') && tagsOf(d).includes('data'), {
	liqe: () =>
		liqe.filter(liqe.parse('tags:/(^|,\\s*)runes(,|$)/ AND tags:/(^|,\\s*)data(,|$)/'), docs),
	'mingo (raw comma-string)': () => mingoFind({ tags: { $all: ['runes', 'data'] } }),
	'mingo (adapter-normalized)': () => mingoFind({ tags: { $all: ['runes', 'data'] } }, docsNorm),
});

// ── Q5a — SPEC-070 compat: AND across distinct fields ───────────────────
run('Q5a SPEC-070: AND across fields', (d) => d.status === 'ready' && d.priority === 'high', {
	'liqe (exact, via regex)': () =>
		liqe.filter(liqe.parse('status:/^ready$/ priority:/^high$/'), docs),
	'liqe (bare words)': () => liqe.filter(liqe.parse('status:ready priority:high'), docs),
	mingo: () => mingoFind({ status: 'ready', priority: 'high' }),
});

// ── Q5b — SPEC-070 compat: repeated field means OR ──────────────────────
run(
	'Q5b SPEC-070: repeated field = OR',
	(d) => tagsOf(d).includes('runes') || tagsOf(d).includes('data'),
	{
		'liqe (as SPEC-070 writes it)': () =>
			liqe.filter(liqe.parse('tags:/(^|,\\s*)runes(,|$)/ tags:/(^|,\\s*)data(,|$)/'), docs),
		'liqe (rewritten with OR)': () =>
			liqe.filter(liqe.parse('tags:/(^|,\\s*)runes(,|$)/ OR tags:/(^|,\\s*)data(,|$)/'), docs),
		mingo: () =>
			mingoFind({ $or: [{ tags: /(^|,\s*)runes(,|$)/ }, { tags: /(^|,\s*)data(,|$)/ }] }),
	},
);

console.log(`\n=== PREDICATE TIER — ${docs.length} real plan entities ===\n`);
for (const r of results) {
	console.log(`${r.name}  (ground truth: ${r.count} rows)`);
	for (const [engine, res] of Object.entries(r.engines)) {
		console.log(`   ${res.ok ? 'PASS' : 'FAIL'}  ${engine.padEnd(28)} ${res.note}`);
	}
	console.log('');
}

// ── JSONata — same queries, async API so it runs separately ─────────────
console.log('=== JSONata (same queries) ===\n');
const TAGS = '$split(tags & "", /\\s*,\\s*/)';
const jsonataQueries = {
	'Q1 cross-field OR + absence': [
		'$[priority="critical" or status="blocked" or $not($exists(assignee))]',
		(d) => d.priority === 'critical' || d.status === 'blocked' || !d.assignee,
	],
	'Q2 date window': [
		'$[type="work" and modified >= "2026-09-01"]',
		(d) => d.type === 'work' && !!d.modified && d.modified >= '2026-09-01',
	],
	'Q3 negation over set + absence': [
		'$[type="work" and $not(status in ["done","cancelled","superseded"]) and ($not($exists(source)) or source="")]',
		(d) =>
			d.type === 'work' && !['done', 'cancelled', 'superseded'].includes(d.status) && !d.source,
	],
	'Q4 array AND (both tags)': [
		`$[("runes" in ${TAGS}) and ("data" in ${TAGS})]`,
		(d) => tagsOf(d).includes('runes') && tagsOf(d).includes('data'),
	],
	'Q5a AND across fields': [
		'$[status="ready" and priority="high"]',
		(d) => d.status === 'ready' && d.priority === 'high',
	],
	'Q5b repeated field = OR': [
		`$[("runes" in ${TAGS}) or ("data" in ${TAGS})]`,
		(d) => tagsOf(d).includes('runes') || tagsOf(d).includes('data'),
	],
};
for (const [name, [expr, truthFn]] of Object.entries(jsonataQueries)) {
	const truth = ids(docs.filter(truthFn));
	try {
		const out = await jsonata(expr).evaluate(docs);
		const got = ids(out === undefined ? [] : Array.isArray(out) ? out : [out]);
		const ok = eq(got, truth);
		console.log(
			`   ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(32)} ${ok ? 'match' : `${got.length} rows (expected ${truth.length})`}`,
		);
	} catch (err) {
		console.log(`   FAIL  ${name.padEnd(32)} ERROR: ${String(err.message).split('\n')[0]}`);
	}
}

// ── The silent-failure measurement ──────────────────────────────────────
// liqe matches substrings, case-insensitively, by default. SPEC-070 matches
// exactly (packages/runes/src/field-match.ts:111). This is what that costs on
// real tags, and it is the finding that decided the spike: no error, just
// more rows than the author asked for.
console.log('\n=== liqe default matching vs SPEC-070 exact matching ===\n');
for (const tag of ['data', 'runes', 'cli']) {
	const exact = docs.filter((d) => tagsOf(d).includes(tag)).map((d) => d.id);
	const got = liqe.filter(liqe.parse(`tags:${tag}`), docs).map((d) => d.id);
	const extra = got.filter((id) => !exact.includes(id));
	console.log(
		`   tags:${tag.padEnd(6)} exact ${String(exact.length).padStart(3)}   liqe ${String(got.length).padStart(3)}   false positives ${extra.length}`,
	);
	if (extra.length) {
		const sample = docs.find((d) => d.id === extra[0]);
		console.log(`      e.g. ${sample.id} tags="${sample.tags}"`);
	}
}

// ── AGGREGATION TIER ────────────────────────────────────────────────────
console.log('\n=== AGGREGATION TIER: per-milestone count + avg tag count ===\n');

const truthAgg = (() => {
	const m = new Map();
	for (const d of docs) {
		if (d.type !== 'work' || !d.milestone) continue;
		const e = m.get(d.milestone) ?? { n: 0, tags: 0, done: 0 };
		e.n++;
		e.tags += tagsOf(d).length;
		if (d.status === 'done') e.done++;
		m.set(d.milestone, e);
	}
	return [...m.entries()]
		.map(([k, v]) => ({ milestone: k, n: v.n, done: v.done, avgTags: +(v.tags / v.n).toFixed(2) }))
		.sort((a, b) => b.n - a.n)
		.slice(0, 5);
})();
console.log('ground truth :', JSON.stringify(truthAgg));

const mingoAgg = new Aggregator([
	{ $match: { type: 'work', milestone: { $nin: [null, ''] } } },
	{
		$group: {
			_id: '$milestone',
			n: { $sum: 1 },
			done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
			avgTags: { $avg: { $size: '$tags' } },
		},
	},
	{ $sort: { n: -1 } },
	{ $limit: 5 },
]).run(docsNorm);
console.log(
	'mingo        :',
	JSON.stringify(
		mingoAgg.map((r) => ({
			milestone: r._id,
			n: r.n,
			done: r.done,
			avgTags: +r.avgTags.toFixed(2),
		})),
	),
);

const jAgg = `(
  $w := $[type="work" and $exists(milestone) and milestone != ""];
  $rows := $each($w{ milestone: $ }, function($v, $k) {{
    "milestone": $k,
    "n": $count($v),
    "done": $count($v[status="done"]),
    "avgTags": $round($average($v.$count(${TAGS})), 2)
  }});
  $sort($rows, function($a, $b) { $a.n < $b.n })[[0..4]]
)`;
try {
	console.log('jsonata      :', JSON.stringify(await jsonata(jAgg).evaluate(docs)));
} catch (err) {
	console.log('jsonata      : ERROR:', String(err.message).split('\n')[0]);
}
console.log('liqe         : NOT EXPRESSIBLE (filter language only — no grouping or aggregation)');
