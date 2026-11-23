// The worked computations: refrakt's (SPEC-195) and Rivière's worked pages, written in CEL and
// run on both implementations through one interface.
//
//   node src/cases.mjs
import { makeCelJs, makeBuf } from './engines.mjs';

const d = (s) => new Date(s);
const records = {
	Panel: { label: 'string', language: 'string', source: 'string', lines: 'string' },
	Attrs: { kind: 'string', title: 'string' },
};

export const cases = [
	// ---- refrakt ----
	{ id: 'recipe-total', from: 'recipe (SPEC-195)', vars: { prepTime: 'duration', cookTime: 'duration' },
		values: { prepTime: 'PT15M', cookTime: 'PT1H' }, expr: 'prepTime + cookTime', expect: { duration: '4500s' } },
	{ id: 'recipe-total-days', from: 'recipe, a sourdough', vars: { prepTime: 'duration', cookTime: 'duration' },
		values: { prepTime: 'PT30M', cookTime: 'PT1H' }, expr: 'prepTime + cookTime + days(2)', expect: { duration: '178200s' } },
	{ id: 'progress-percent', from: 'progress', vars: { value: 'integer', max: 'integer' },
		values: { value: 7, max: 9 }, expr: 'max == 0 ? 0 : value * 100 / max', expect: 77 },
	{ id: 'progress-zero', from: 'progress, max 0', vars: { value: 'integer', max: 'integer' },
		values: { value: 0, max: 0 }, expr: 'value * 100 / max', expect: { error: true } },
	{ id: 'progress-rounded', from: 'progress, rounded', vars: { value: 'integer', max: 'integer' },
		values: { value: 7, max: 9 }, expr: 'int(math.round(double(value) * 100.0 / double(max)))', expect: 78,
		note: 'needs the math extension (math.round)' },
	{ id: 'progress-rounded-core', from: 'progress, rounded in core CEL', vars: { value: 'integer', max: 'integer' },
		values: { value: 7, max: 9 }, expr: '(value * 200 / max + 1) / 2', expect: 78 },
	{ id: 'conversation-speaker', from: 'conversation', vars: { index: 'integer', speakers: 'list<string>' },
		values: { index: 5, speakers: ['Ada', 'Grace'] }, expr: 'speakers[index % size(speakers)]', expect: 'Grace' },
	{ id: 'drawer-level', from: 'drawer (clamp)', vars: { level: 'integer' },
		values: { level: 6 }, expr: 'level + 1 > 6 ? 6 : level + 1', expect: 6 },
	{ id: 'drawer-level-math', from: 'drawer, math.least', vars: { level: 'integer' },
		values: { level: 6 }, expr: 'math.least(level + 1, 6)', expect: 6, note: 'needs the math extension' },
	{ id: 'layout', from: 'tabs or single', vars: { panels: 'list<any>' },
		values: { panels: [{}] }, expr: "size(panels) == 1 ? 'single' : 'tabs'", expect: 'single' },
	{ id: 'panel-label-optional', from: 'codegroup label, optional values', vars: { labels: 'string', index: 'integer', node: 'Panel' },
		values: { labels: 'Client, Server', index: 1, node: { language: 'ts', source: 'src/a.ts' } },
		expr: "labels.split(',').map(s, s.trim())[?index].or(node.?label).orValue(language(node.language))", expect: 'Server' },
	{ id: 'panel-label-optional-fallback', from: 'codegroup label, falls through', vars: { labels: 'string', index: 'integer', node: 'Panel' },
		values: { labels: 'Client', index: 1, node: { language: 'ts', source: 'src/a.ts' } },
		expr: "labels.split(',').map(s, s.trim())[?index].or(node.?label).orValue(language(node.language))", expect: 'TypeScript' },
	{ id: 'panel-label-empty-labels', from: 'codegroup label, labels=""', vars: { labels: 'string', index: 'integer', node: 'Panel' },
		values: { labels: '', index: 0, node: { language: 'ts', source: 'src/a.ts' } },
		expr: "labels.split(',').map(s, s.trim())[?index].or(node.?label).orValue(language(node.language))", expect: 'TypeScript',
		note: '"".split(",") is [""], so [?0] is present and empty: optionals mean present, not non-empty' },
	{ id: 'panel-label-first', from: 'codegroup label, first()', vars: { labels: 'string', index: 'integer', node: 'Panel' },
		values: { labels: '', index: 0, node: { language: 'ts', source: 'src/a.ts' } },
		expr: "first([index < size(labels.split(',')) ? labels.split(',')[index].trim() : '', has(node.label) ? node.label : '', language(node.language)])",
		expect: 'TypeScript' },
	{ id: 'panel-file', from: 'codegroup file', vars: { node: 'Panel' },
		values: { node: { language: 'ts', source: 'src/lib/a.ts', lines: '3-9' } },
		expr: "has(node.lines) ? basename(node.source) + ':' + node.lines : basename(node.source)", expect: 'a.ts:3-9' },
	{ id: 'symbol-selects', from: 'symbol (the selects bridge)', vars: { attrs: 'Attrs' },
		values: { attrs: { kind: 'interface' } }, expr: "selects(attrs, 'kind:class,interface,module')", expect: true },
	{ id: 'title-default', from: 'an optional attribute', vars: { attrs: 'Attrs' },
		values: { attrs: { kind: 'class' } }, expr: "has(attrs.title) ? attrs.title : 'Untitled'", expect: 'Untitled' },
	{ id: 'budget-subtotal', from: 'budget (amounts)', vars: { items: 'list<any>' },
		values: { items: [{ description: 'Hall', amount: { value: 1200, currency: 'EUR' } }, { description: 'Food', amount: { value: 40, currency: 'EUR' } }] },
		expr: 'sumAmounts(items.map(i, i.amount)).value', expect: 1240 },
	// ---- Rivière ----
	{ id: 'coverage', from: 'traceability: coverage %', vars: { verifiedBy: 'list<any>' },
		values: { verifiedBy: [{ coverage: 'full' }, { coverage: 'partial' }, { coverage: 'full' }] },
		expr: "size(verifiedBy) == 0 ? 0 : size(verifiedBy.filter(l, l.coverage == 'full')) * 100 / size(verifiedBy)", expect: 66 },
	{ id: 'latest-run', from: 'traceability: the latest run', vars: { runs: 'list<any>' },
		values: { runs: [{ result: 'pass', at: d('2026-11-19T10:00:00Z') }, { result: 'fail', at: d('2026-11-20T14:03:00Z') }] },
		expr: "size(runs) == 0 ? 'none' : latest(runs, 'at').result", expect: 'fail' },
	{ id: 'milestone-progress', from: 'plan: done work, selects in a macro', vars: { work: 'list<any>' },
		values: { work: [{ status: 'done' }, { status: 'ready' }, { status: 'done' }, { status: 'cancelled' }] },
		expr: "size(work.filter(w, selects(w, 'status:done'))) * 100 / size(work.filter(w, selects(w, '-status:cancelled,superseded')))",
		expect: 66 },
	{ id: 'next-occurrence', from: 'events: the next occurrence', vars: { start: 'datetime', now: 'datetime' },
		values: { start: d('2026-09-01T17:00:00Z'), now: d('2026-11-23T09:00:00Z') }, expr: 'nextAfter(start, days(7), now)',
		expect: d('2026-11-24T17:00:00Z') },
	{ id: 'next-occurrence-core', from: 'events: in core CEL', vars: { start: 'datetime', now: 'datetime' },
		values: { start: d('2026-09-01T17:00:00Z'), now: d('2026-11-23T09:00:00Z') },
		expr: 'timestamp(int(start) + ((int(now) - int(start)) / 604800 + 1) * 604800)', expect: d('2026-11-24T17:00:00Z') },
	{ id: 'stale', from: 'traceability: reviewed over a year ago', vars: { reviewed: 'date', today: 'date' },
		values: { reviewed: d('2025-10-01T00:00:00Z'), today: d('2026-11-23T00:00:00Z') }, expr: 'today - reviewed > days(365)', expect: true },
	{ id: 'year-in-zone', from: 'docs: the year of a post, in the site zone', vars: { published: 'datetime' },
		values: { published: d('2026-12-31T23:30:00Z') }, expr: "published.getFullYear('Europe/Stockholm')", expect: 2027 },
];

function normalise(v) {
	if (typeof v === 'bigint') return Number(v);
	if (v instanceof Date) return v.toISOString();
	if (v?.constructor?.name === 'Duration') return { duration: `${v.seconds}s` };
	if (v?.desc?.typeName === 'google.protobuf.Duration') return { duration: `${v.message.seconds}s` };
	if (Array.isArray(v)) return v.map(normalise);
	if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, normalise(b)]));
	return v;
}

export async function runCases() {
	const engines = [makeCelJs(records), await makeBuf()];
	const rows = [];
	for (const c of cases) {
		const row = { id: c.id, from: c.from, results: {} };
		for (const e of engines) {
			const compiled = e.compile(c.expr, { vars: c.vars });
			if (!compiled.ok) { row.results[e.name] = { status: 'refused', detail: `${compiled.stage}: ${compiled.error.split('\n')[0]}` }; continue; }
			const r = compiled.evaluate(c.values);
			const expectError = c.expect && typeof c.expect === 'object' && c.expect.error;
			let status;
			if (r.error) status = expectError ? 'ok' : 'error';
			else status = JSON.stringify(normalise(r.value)) === JSON.stringify(normalise(c.expect)) ? 'ok' : 'wrong';
			row.results[e.name] = { status, type: compiled.type, detail: r.error ?? JSON.stringify(normalise(r.value)), refs: compiled.refs };
		}
		rows.push(row);
	}
	return { engines: engines.map((e) => e.name), rows };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const { engines, rows } = await runCases();
	console.log(`| Case | From | ${engines.join(' | ')} |`);
	console.log(`|---|---|${engines.map(() => '---').join('|')}|`);
	for (const r of rows) {
		const cell = (e) => {
			const x = r.results[e];
			const mark = { ok: '✓', wrong: '✗ wrong', error: '✗ error', refused: '✗ refused' }[x.status];
			return x.status === 'ok' ? `${mark}${x.type ? ` (${x.type})` : ''}` : `${mark}: ${x.detail.slice(0, 70)}`;
		};
		console.log(`| ${r.id} | ${r.from} | ${engines.map(cell).join(' | ')} |`);
	}
}
