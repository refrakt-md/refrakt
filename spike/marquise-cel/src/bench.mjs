// Compile once per shape, evaluate once per record: how long each takes.
//   node src/bench.mjs
import { makeCelJs, makeBuf } from './engines.mjs';
const engines = [makeCelJs({}), await makeBuf()];
const work = Array.from({ length: 40 }, (_, i) => ({ status: i % 3 ? 'done' : 'ready', coverage: i % 2 ? 'full' : 'partial' }));
const exprs = [
	['durations', 'prepTime + cookTime', { prepTime: 'duration', cookTime: 'duration' }, { prepTime: 'PT15M', cookTime: 'PT1H' }],
	['percent', 'max == 0 ? 0 : value * 100 / max', { value: 'integer', max: 'integer' }, { value: 7, max: 9 }],
	['filter 40 items', "size(l) == 0 ? 0 : size(l.filter(x, x.coverage == 'full')) * 100 / size(l)", { l: 'list<any>' }, { l: work }],
	['selects in a macro', "size(l.filter(x, selects(x, 'status:done')))", { l: 'list<any>' }, { l: work }],
];
console.log('| Expression | Engine | Compile (µs) | Evaluate (µs) |');
console.log('|---|---|---:|---:|');
for (const [label, expr, vars, values] of exprs) {
	for (const e of engines) {
		let t = performance.now();
		const N = 2000;
		let c;
		for (let i = 0; i < N; i++) c = e.compile(expr, { vars });
		const compile = ((performance.now() - t) * 1000) / N;
		t = performance.now();
		const M = 20000;
		for (let i = 0; i < M; i++) c.evaluate(values);
		const evaluate = ((performance.now() - t) * 1000) / M;
		console.log(`| ${label} | ${e.name} | ${compile.toFixed(0)} | ${evaluate.toFixed(1)} |`);
	}
}
