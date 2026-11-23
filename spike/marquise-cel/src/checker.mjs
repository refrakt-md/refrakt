// What the type checker catches when a shape loads: mistakes a shape author makes in `computes`.
//
//   node src/checker.mjs
import { makeCelJs, makeBuf } from './engines.mjs';

const records = {
	Panel: { label: 'string', language: 'string', source: 'string', lines: 'string' },
	Item: { description: 'string', amount: 'double' },
};
const vars = {
	prepTime: 'duration', cookTime: 'duration', value: 'integer', max: 'integer', rating: 'integer',
	score: 'number', node: 'Panel', items: 'list<Item>', panels: 'list<Panel>', published: 'datetime', labels: 'string',
};

const cases = [
	// should be refused
	{ id: 'unknown-name', expr: 'prepTme + cookTime', want: 'refuse' },
	{ id: 'wrong-operand', expr: 'prepTime + 1', want: 'refuse' },
	{ id: 'wrong-argument', expr: 'basename(3)', want: 'refuse' },
	{ id: 'unknown-function', expr: 'basenme(node.source)', want: 'refuse' },
	{ id: 'unknown-field', expr: 'node.lable', want: 'refuse' },
	{ id: 'unknown-field-in-macro', expr: 'items.map(i, i.amont)', want: 'refuse' },
	{ id: 'mixed-branches', expr: "size(panels) == 1 ? 'single' : 2", want: 'refuse' },
	{ id: 'int-times-double', expr: 'rating * 1.5', want: 'refuse', note: 'integer × number needs double(rating)' },
	{ id: 'string-compared-to-int', expr: "value == '3'", want: 'refuse' },
	{ id: 'duration-vs-int', expr: 'prepTime > 30', want: 'refuse' },
	// should be accepted, with this type
	{ id: 'duration-sum', expr: 'prepTime + cookTime', want: 'google.protobuf.Duration' },
	{ id: 'int-percent', expr: 'value * 100 / max', want: 'int' },
	{ id: 'double-explicit', expr: 'double(rating) * 1.5', want: 'double' },
	{ id: 'sum-of-items', expr: 'items.map(i, i.amount).size()', want: 'int' },
	{ id: 'labels-list', expr: "labels.split(',')", want: 'list<string>' },
	{ id: 'year', expr: 'published.getFullYear()', want: 'int' },
	{ id: 'field-of-list-item', expr: 'panels[0].label', want: 'string' },
	{ id: 'optional-type', expr: 'node.?label.orValue("")', want: 'string' },
];

const engines = [makeCelJs(records), await makeBuf()];
console.log(`| Case | Expression | Wanted | ${engines.map((e) => e.name).join(' | ')} |`);
console.log(`|---|---|---|${engines.map(() => '---').join('|')}|`);
const score = Object.fromEntries(engines.map((e) => [e.name, 0]));
for (const c of cases) {
	const cells = engines.map((e) => {
		const r = e.compile(c.expr, { vars });
		let got;
		if (!r.ok) got = { refused: true, text: `refused (${r.stage}): ${r.error.split('\n')[0].slice(0, 60)}` };
		else if (r.checkError) got = { refused: false, text: `accepted; checker threw: ${r.checkError.slice(0, 50)}` };
		else got = { refused: false, text: `accepted${r.type ? `: ${r.type}` : ', type unknown'}`, type: r.type };
		const right = c.want === 'refuse' ? got.refused : got.type === c.want;
		if (right) score[e.name]++;
		return `${right ? '✓' : '✗'} ${got.text}`;
	});
	console.log(`| ${c.id} | \`${c.expr}\` | ${c.want} | ${cells.join(' | ')} |`);
}
console.log(`\nRight: ${engines.map((e) => `${e.name} ${score[e.name]}/${cases.length}`).join(', ')}`);

// Error positions: does a finding get a location?
const r = engines[0].compile('prepTime +\n  cokTime', { vars });
console.log('\ncel-js error text for a two-line expression:\n' + r.error);
