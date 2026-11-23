// Safety for untrusted shapes (the site builder's customer blocks): regular expressions, limits, determinism.
//
//   node src/safety.mjs
import * as celjs from '@marcbachmann/cel-js';
import * as buf from '@bufbuild/cel';

function time(fn) {
	const t = performance.now();
	let out;
	try { out = fn(); } catch (e) { out = 'ERR ' + e.message.split('\n')[0].slice(0, 80); }
	return { ms: +(performance.now() - t).toFixed(1), out: typeof out === 'bigint' ? `${out}n` : buf.isCelError?.(out) ? 'ERR ' + out.message.slice(0, 80) : String(out).slice(0, 80) };
}
const env = new celjs.Environment({ unlistedVariablesAreDyn: true });
const both = (label, expr, ctx = {}) => {
	const a = time(() => env.evaluate(expr, ctx));
	const b = time(() => buf.run(expr, ctx));
	console.log(`| ${label} | \`${expr.length > 60 ? expr.slice(0, 57) + '…' : expr}\` | ${a.out} (${a.ms} ms) | ${b.out} (${b.ms} ms) |`);
};

console.log('| Check | Expression | cel-js | @bufbuild/cel |');
console.log('|---|---|---|---|');
// RE2 semantics: no backtracking, so no catastrophic patterns; RE2-only syntax
const evil = 'a'.repeat(28) + '!';
both('catastrophic backtracking (28 a\'s)', `s.matches('^(a+)+$')`, { s: evil });
both('backreference (not RE2)', `'abab'.matches('(ab)\\\\1')`);
both('lookahead (not RE2)', `'ab'.matches('a(?=b)')`);
both('RE2 inline flag', `'ABC'.matches('(?i)abc')`);
both('RE2 \\pL class', `'é'.matches('^\\\\pL$')`);
// size and cost
const big = Array.from({ length: 2000 }, (_, i) => BigInt(i));
both('nested map over 2000 × 2000', 'l.map(a, l.map(b, a * b)).size()', { l: big });
both('string repeat by concatenation', `l.map(a, 'xxxxxxxxxx').join('').size()`, { l: big });
both('deep nesting (40 parens)', '('.repeat(40) + '1' + ')'.repeat(40));
both('long expression (600 terms)', Array.from({ length: 600 }, (_, i) => String(i)).join(' + '));
// determinism: no clock or randomness in the standard library
both('now() exists?', 'now()');
both('int overflow', '9223372036854775807 + 1');
// limits cel-js offers
const limited = new celjs.Environment({ limits: { maxAstNodes: 200, maxDepth: 16, maxListElements: 100 } });
const t = time(() => limited.evaluate(Array.from({ length: 600 }, (_, i) => String(i)).join(' + ')));
console.log(`\ncel-js with limits { maxAstNodes: 200, maxDepth: 16 } on 600 terms: ${t.out}`);
