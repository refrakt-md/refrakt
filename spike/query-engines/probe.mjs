// Why liqe cannot host SPEC-070's semantics — three probes, no repo data needed.
//
//   node probe.mjs
//
// SPEC-070 matches exactly and case-sensitively (packages/runes/src/field-match.ts:111).
// liqe matches substrings, case-insensitively. The only exact-match escape is a
// regex literal — and liqe cannot parse two of those in one query.

import { readFileSync } from 'node:fs';
import * as liqe from 'liqe';

const version = JSON.parse(
	readFileSync(new URL('./node_modules/liqe/package.json', import.meta.url), 'utf8'),
).version;

const rows = [
	{ id: 'A', status: 'ready', n: 5, modified: '2026-09-10', nested: { k: 'x' } },
	{ id: 'B', status: 'readyish', n: 12, modified: '2026-01-02' },
	{ id: 'C', status: 'Ready', n: 3 },
	{ id: 'D', status: 'done' },
];

const attempt = (q) => {
	try {
		return (
			liqe
				.filter(liqe.parse(q), rows)
				.map((r) => r.id)
				.join(',') || '(none)'
		);
	} catch (err) {
		return `ERR: ${String(err.message).split('\n')[0]}`;
	}
};

console.log(`\nliqe ${version}\n`);

console.log('── 1. default matching is substring + case-insensitive ──');
console.log('   SPEC-070 would return A alone for every one of these.\n');
for (const q of [
	'status:ready',
	'status:"ready"',
	'status:READY',
	'status:read*',
	'status:/^ready$/',
]) {
	console.log(`   ${q.padEnd(22)} -> ${attempt(q)}`);
}

console.log('\n── 2. two regex literals in one query do not parse ──');
console.log('   Regex is the ONLY exact-match mechanism, so two exact clauses');
console.log('   — the commonest query shape in the codebase — are unreachable.');
console.log('   Cause: liqe/dist/src/parse.js:47, the nearley grammar yields');
console.log('   multiple distinct parses and parse() refuses to pick.\n');
for (const q of [
	'status:/^ready$/',
	'a:/x/ b:y',
	'a:x b:/y/',
	'status:/^ready$/ priority:/^high$/',
	'status:/^ready$/ AND priority:/^high$/',
	'status:/^ready$/ OR status:/^done$/',
]) {
	let verdict;
	try {
		liqe.parse(q);
		verdict = 'parses';
	} catch (err) {
		verdict = `THROWS — ${String(err.message).split('\n')[0]}`;
	}
	console.log(`   ${q.padEnd(40)} ${verdict}`);
}

console.log('\n── 3. comparison operators are numeric-only ──');
console.log('   So a date window over ISO strings cannot be expressed.\n');
for (const q of [
	'n:>4',
	'n:[3 TO 6]',
	'modified:>=2026-09-01',
	'modified:>="2026-09-01"',
	'modified:[2026-09-01 TO 2026-12-31]',
]) {
	console.log(`   ${q.padEnd(38)} -> ${attempt(q)}`);
}

console.log('\n── what liqe does handle well ──\n');
for (const q of [
	'NOT status:done',
	'-status:done',
	'(status:ready AND n:>4) OR id:C',
	'nested.k:x',
]) {
	console.log(`   ${q.padEnd(38)} -> ${attempt(q)}`);
}

console.log('\n── implicit operator is uniformly AND ──');
console.log('   SPEC-070 ANDs across distinct fields but ORs a repeated one');
console.log('   (packages/runes/src/field-match.ts:132), which liqe cannot express.\n');
console.log(
	`   status:ready n:>4  -> ${attempt('status:ready n:>4')}   (AND — agrees with SPEC-070)`,
);
console.log(
	`   status:ready status:done -> ${attempt('status:ready status:done')}   (AND — SPEC-070 means OR)\n`,
);
