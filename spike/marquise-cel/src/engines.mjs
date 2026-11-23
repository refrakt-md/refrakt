// One interface over both implementations: what `@marquise-md/cel` would expose to Marquise.
//
//   engine.compile(expr, { vars }) → { ok, type?, error?, refs, evaluate(values) }
//
// `vars` uses Marquise's value types (string, integer, number, boolean, date, datetime, duration,
// list<T>, a record type by name); `values` are plain JS values as records hold them (Date for dates,
// { seconds, nanos } or ISO strings for durations are converted here).
import * as celjs from '@marcbachmann/cel-js';
import * as buf from '@bufbuild/cel';
import { strings } from '@bufbuild/cel/ext';
import { timestampFromDate, durationFromMs } from '@bufbuild/protobuf/wkt';
import { vocabulary } from './vocabulary.mjs';

// ---- Marquise types → each implementation's types ----
const CELJS_TYPE = { string: 'string', integer: 'int', number: 'double', boolean: 'bool', date: 'google.protobuf.Timestamp', datetime: 'google.protobuf.Timestamp', duration: 'google.protobuf.Duration', any: 'dyn' };
function celjsType(t) {
	if (t.startsWith('list<')) return `list<${celjsType(t.slice(5, -1))}>`;
	return CELJS_TYPE[t] ?? t; // a record type registered by name
}

// Records are registered as typed objects in cel-js, so the checker knows their fields.
export function makeCelJs(records = {}) {
	const env = new celjs.Environment({ enableOptionalTypes: true, limits: { maxAstNodes: 500, maxDepth: 32 } });
	for (const [name, fields] of Object.entries(records)) {
		env.registerType(name, { fields: Object.fromEntries(Object.entries(fields).map(([f, t]) => [f, celjsType(t)])) });
	}
	for (const fn of vocabulary) env.registerFunction(fn.celjs.signature, fn.celjs.handler ?? fn.impl);
	return {
		name: 'cel-js',
		compile(expr, { vars = {} } = {}) {
			const e = env.clone();
			for (const [n, t] of Object.entries(vars)) e.registerVariable(n, celjsType(t));
			let parsed;
			try { parsed = e.parse(expr); } catch (err) { return { ok: false, stage: 'parse', error: err.message, refs: [] }; }
			const refs = celjsRefs(parsed.ast);
			const checked = e.check(expr);
			if (!checked.valid) return { ok: false, stage: 'check', error: checked.error.message, refs };
			return {
				ok: true, type: checked.type, refs,
				evaluate(values) {
					try { return { value: e.evaluate(expr, toCelJs(values, vars)) }; }
					catch (err) { return { error: err.message.split('\n')[0] }; }
				},
			};
		},
	};
}
function toCelJs(values, vars) {
	const out = {};
	for (const [k, v] of Object.entries(values)) out[k] = convertCelJs(v, vars[k]);
	return out;
}
function convertCelJs(v, t) {
	if (v === undefined || v === null) return v;
	if (t === 'integer') return BigInt(v);
	if (t === 'duration') return celjs.evaluate(`duration("${typeof v === 'string' ? isoToCel(v) : v}")`);
	if (t?.startsWith('list<')) return v.map((x) => convertCelJs(x, t.slice(5, -1)));
	if (typeof v === 'number' && Number.isInteger(v) && t !== 'number') return BigInt(v);
	if (Array.isArray(v)) return v.map((x) => convertCelJs(x));
	if (v && typeof v === 'object' && !(v instanceof Date)) return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, convertCelJs(b)]));
	return v;
}

// ---- @bufbuild/cel: maps for records; no checker is public, so `type` is never known ----
let bufCheck;
const BUF_TYPE = { string: buf.CelScalar.STRING, integer: buf.CelScalar.INT, number: buf.CelScalar.DOUBLE, boolean: buf.CelScalar.BOOL, any: buf.CelScalar.DYN, date: buf.objectType('google.protobuf.Timestamp'), datetime: buf.objectType('google.protobuf.Timestamp'), duration: buf.objectType('google.protobuf.Duration') };
function bufType(t) {
	if (t.startsWith('list<')) return buf.listType(bufType(t.slice(5, -1)));
	return BUF_TYPE[t] ?? buf.mapType(buf.CelScalar.STRING, buf.CelScalar.DYN);
}
export async function makeBuf() {
	try { bufCheck = (await import('../node_modules/@bufbuild/cel/dist/esm/check.js')).check; } catch { bufCheck = null; }
	const funcs = [...strings, ...vocabulary.filter((f) => f.buf).map((f) => f.buf)];
	return {
		name: '@bufbuild/cel',
		compile(expr, { vars = {} } = {}) {
			let parsed;
			try { parsed = buf.parse(expr); } catch (err) { return { ok: false, stage: 'parse', error: err.message, refs: [] }; }
			const env = buf.celEnv({ funcs, variables: Object.fromEntries(Object.entries(vars).map(([n, t]) => [n, bufType(t)])) });
			const refs = bufRefs(parsed.expr);
			let type, checkError;
			if (bufCheck) {
				try { type = String(bufCheck(env, parsed).typeMap?.[String(parsed.expr.id)] ?? '?'); }
				catch (err) { checkError = err.message.split('\n')[0]; }
			}
			let program;
			try { program = buf.plan(env, parsed); } catch (err) { return { ok: false, stage: 'plan', error: err.message, refs }; }
			return {
				ok: true, type: undefined, checkError, refs,
				evaluate(values) {
					const r = program(toBuf(values, vars));
					return buf.isCelError(r) ? { error: r.message.split('\n')[0] } : { value: fromBuf(r) };
				},
			};
		},
	};
}
function toBuf(values, vars) {
	const out = {};
	for (const [k, v] of Object.entries(values)) out[k] = convertBuf(v, vars[k]);
	return out;
}
function convertBuf(v, t) {
	if (v === undefined || v === null) return v;
	if (v instanceof Date) return timestampFromDate(v);
	if (t === 'duration') return durationFromMs(parseFloat(typeof v === 'string' ? isoToCel(v) : v) * 1000);
	if (t === 'integer') return BigInt(v);
	if (t?.startsWith('list<')) return v.map((x) => convertBuf(x, t.slice(5, -1)));
	if (typeof v === 'number' && Number.isInteger(v) && t !== 'number') return BigInt(v);
	if (Array.isArray(v)) return v.map((x) => convertBuf(x));
	if (typeof v === 'object') return new Map(Object.entries(v).map(([a, b]) => [a, convertBuf(b)]));
	return v;
}
export function fromBuf(x) {
	if (buf.isCelList(x)) return [...x].map(fromBuf);
	if (buf.isCelMap(x)) return Object.fromEntries([...x.entries()].map(([a, b]) => [a, fromBuf(b)]));
	const tn = x?.desc?.typeName;
	if (tn === 'google.protobuf.Timestamp') return new Date(Number(x.message.seconds) * 1000 + x.message.nanos / 1e6);
	if (tn === 'google.protobuf.Duration') return { duration: `${x.message.seconds}s` };
	return x;
}

// ISO 8601 durations (PT1H30M, P3D) → CEL's duration strings, which stop at hours.
export function isoToCel(iso) {
	const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso);
	if (!m) return iso;
	const [, d = 0, h = 0, min = 0, s = 0] = m;
	return `${Number(s) + 60 * Number(min) + 3600 * Number(h) + 86400 * Number(d)}s`;
}

// ---- which names an expression reads: for ordering computed values and finding cycles ----
function celjsRefs(ast) {
	const refs = new Set();
	const bound = [];
	(function walk(n) {
		if (!n || typeof n !== 'object') return;
		if (Array.isArray(n)) return n.forEach(walk);
		if (n.op === 'id') { if (!bound.includes(n.args)) refs.add(n.args); return; }
		if (n.op === 'rcall' && ['map', 'filter', 'all', 'exists', 'exists_one'].includes(n.args?.[0])) {
			const [, receiver, args] = n.args;
			walk(receiver);
			const v = args?.[0]?.op === 'id' ? args[0].args : null;
			if (v) bound.push(v);
			args.slice(1).forEach(walk);
			if (v) bound.pop();
			return;
		}
		walk(n.args);
	})(ast);
	return [...refs].sort();
}
function bufRefs(expr) {
	const refs = new Set();
	const bound = [];
	(function walk(e) {
		if (!e) return;
		const k = e.exprKind;
		switch (k.case) {
			case 'identExpr': if (!bound.includes(k.value.name)) refs.add(k.value.name); break;
			case 'selectExpr': walk(k.value.operand); break;
			case 'callExpr': walk(k.value.target); k.value.args.forEach(walk); break;
			case 'listExpr': k.value.elements.forEach(walk); break;
			case 'structExpr': k.value.entries.forEach((en) => { walk(en.keyKind.case === 'mapKey' ? en.keyKind.value : null); walk(en.value); }); break;
			case 'comprehensionExpr': {
				const c = k.value;
				walk(c.iterRange);
				bound.push(c.iterVar, c.accuVar);
				walk(c.accuInit); walk(c.loopCondition); walk(c.loopStep); walk(c.result);
				bound.pop(); bound.pop();
				break;
			}
		}
	})(expr);
	return [...refs].filter((r) => !r.startsWith('@')).sort();
}
