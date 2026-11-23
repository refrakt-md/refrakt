// A shape's `computes`, loaded and evaluated as the docs describe (after Kubernetes' `variables`):
// each value may read attributes and the values declared before it; its checked type becomes the type of
// that name for later ones; evaluation is lazy and memoised. Built on cel-js, the one with a checker.
//
//   node src/computes.mjs
import { Environment } from '@marcbachmann/cel-js';

const PROFILE_REFUSED = new Set(['matches', 'bind', 'transformMap', 'transformList']); // outside Marquise's profile

function load(shape) {
	const findings = [];
	const env = new Environment({ enableOptionalTypes: true, limits: { maxAstNodes: 500, maxDepth: 32 } });
	for (const [name, type] of Object.entries(shape.attributes)) env.registerVariable(name, type);
	const computed = [];
	for (const [name, expr] of Object.entries(shape.computes)) {
		let parsed;
		try { parsed = env.parse(expr); }
		catch (e) { findings.push({ id: 'computes-syntax', name, message: e.message.split('\n')[0] }); continue; }
		const refused = callsIn(parsed.ast).filter((c) => PROFILE_REFUSED.has(c));
		if (refused.length) { findings.push({ id: 'computes-not-in-profile', name, message: `uses ${refused.join(', ')}` }); continue; }
		// a macro inside a macro's body is quadratic in the input; refusing it keeps evaluation linear
		if (macroDepth(parsed.ast) > 1) { findings.push({ id: 'computes-not-in-profile', name, message: 'a macro inside another macro' }); continue; }
		const checked = env.check(expr);
		if (!checked.valid) {
			// a name declared later, or this one itself, is unknown here: that is how cycles are refused
			const later = Object.keys(shape.computes).find((n) => checked.error.message.includes(`Unknown variable: ${n}`));
			findings.push({ id: later ? 'computes-order' : 'computes-type', name, message: later ? `reads '${later}', which is not declared before it` : checked.error.message.split('\n')[0] });
			continue;
		}
		env.registerVariable(name, checked.type); // the checked type flows to later values
		computed.push({ name, expr, type: checked.type });
	}
	return { computed, findings, env };
}

function callsIn(ast) {
	const out = [];
	(function walk(n) {
		if (!n || typeof n !== 'object') return;
		if (Array.isArray(n)) return n.forEach(walk);
		if (n.op === 'call' || n.op === 'rcall') out.push(n.args[0]);
		walk(n.args);
	})(ast);
	return out;
}

const MACROS = new Set(['map', 'filter', 'all', 'exists', 'exists_one']);
function macroDepth(n) {
	if (!n || typeof n !== 'object') return 0;
	if (Array.isArray(n)) return Math.max(0, ...n.map(macroDepth));
	if (n.op === 'rcall' && MACROS.has(n.args[0])) {
		const [, receiver, args] = n.args;
		return Math.max(macroDepth(receiver), 1 + macroDepth(args.slice(1)));
	}
	return macroDepth(n.args);
}

// lazy and memoised: a value is computed when first read, once per record
function evaluator({ computed, env }, record) {
	const cache = new Map();
	const counts = {};
	const ctx = new Proxy({ ...record }, {
		get(target, key) {
			if (key in target) return target[key];
			const c = computed.find((x) => x.name === key);
			if (!c) return undefined;
			if (!cache.has(key)) { counts[key] = (counts[key] ?? 0) + 1; cache.set(key, env.evaluate(c.expr, ctx)); }
			return cache.get(key);
		},
		has(target, key) { return key in target || computed.some((x) => x.name === key); },
	});
	return { read: (name) => ctx[name], counts };
}

const recipe = {
	attributes: { prepTime: 'google.protobuf.Duration', cookTime: 'google.protobuf.Duration', servings: 'int' },
	computes: {
		totalTime: 'prepTime + cookTime',
		quick: "totalTime <= duration('30m')",
		label: "quick ? 'Quick' : 'Takes ' + string(totalTime.getMinutes()) + ' min'",
	},
};
const broken = {
	attributes: { a: 'int', s: 'string', l: 'list<int>' },
	computes: {
		early: 'late + 1',               // reads a value declared after it
		late: 'a * 2',
		self: 'self + 1',                // a cycle with itself
		typo: 'a + s',                   // a type error
		regex: "s.matches('^(a+)+$')",   // outside the profile
		pairs: 'l.map(x, l.map(y, x * y))', // a macro inside a macro
		chained: 'l.filter(x, x > 1).map(x, x * 2).size()', // chained macros stay linear: allowed
	},
};

const loaded = load(recipe);
console.log('recipe computes, with checked types:');
for (const c of loaded.computed) console.log(`  ${c.name}: ${c.type}`);
const { evaluate: celEval } = await import('@marcbachmann/cel-js');
const ev = evaluator(loaded, { prepTime: celEval("duration('20m')"), cookTime: celEval("duration('45m')"), servings: 4n });
console.log('  label =', ev.read('label'), '| quick =', ev.read('quick'), '| evaluations:', JSON.stringify(ev.counts));
console.log('\nbroken shape findings:');
for (const f of load(broken).findings) console.log(`  ${f.id} (${f.name}): ${f.message}`);
