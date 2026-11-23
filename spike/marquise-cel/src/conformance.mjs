// Runs CEL's conformance suite (cel-spec v0.25.1, as packaged by @bufbuild/cel-spec) on both
// JavaScript implementations, in plain-value terms: no protobuf messages, which Marquise never uses.
//
//   node src/conformance.mjs            per-file table
//   node src/conformance.mjs --fails F  failing tests of file F, per implementation
import { getConformanceSuite } from '@bufbuild/cel-spec/testdata/tests.js';
import { getTestRegistry } from '@bufbuild/cel-spec/testdata/registry.js';
import { anyUnpack } from '@bufbuild/protobuf/wkt';
import * as celjs from '@marcbachmann/cel-js';
import * as buf from '@bufbuild/cel';
import { strings } from '@bufbuild/cel/ext';

const registry = getTestRegistry();
// Files about protobuf messages, enums and wrappers: outside anything Marquise evaluates.
const PROTO_FILES = new Set(['proto2', 'proto2_ext', 'proto3', 'wrappers', 'enums']);

class Skip extends Error {}
// An expression that builds or names a protobuf message.
const MESSAGE_EXPR = /google\.protobuf\.|TestAllTypes|NestedMessage|NestedEnum|GlobalEnum|cel\.expr\.|\bproto\.|\b[A-Z]\w*\{/;

// ---- expected values (cel.expr.Value) to a tagged, comparable form ----
function fromValue(v) {
	const k = v.kind;
	switch (k.case) {
		case 'int64Value': return { t: 'int', v: String(k.value) };
		case 'uint64Value': return { t: 'uint', v: String(k.value) };
		case 'doubleValue': return { t: 'double', v: k.value };
		case 'stringValue': return { t: 'string', v: k.value };
		case 'boolValue': return { t: 'bool', v: k.value };
		case 'bytesValue': return { t: 'bytes', v: Buffer.from(k.value).toString('hex') };
		case 'nullValue': return { t: 'null' };
		case 'listValue': return { t: 'list', v: k.value.values.map(fromValue) };
		case 'mapValue': return { t: 'map', v: k.value.entries.map((e) => [fromValue(e.key), fromValue(e.value)]) };
		case 'typeValue': return { t: 'type', v: k.value };
		case 'objectValue': {
			const tn = k.value.typeUrl.split('/').pop();
			if (tn === 'google.protobuf.Timestamp' || tn === 'google.protobuf.Duration') {
				const m = anyUnpack(k.value, registry);
				return { t: tn.endsWith('Timestamp') ? 'timestamp' : 'duration', v: `${m.seconds}:${m.nanos}` };
			}
			throw new Skip('message value');
		}
		default: throw new Skip('value kind ' + k.case);
	}
}

// bindings to plain JS inputs, per implementation
function toInput(v, impl) {
	const k = v.kind;
	switch (k.case) {
		case 'int64Value': return BigInt(k.value);
		case 'uint64Value': return impl === 'celjs' ? new UnsignedInt(BigInt(k.value)) : buf.celUint(BigInt(k.value));
		case 'doubleValue': return k.value;
		case 'stringValue': return k.value;
		case 'boolValue': return k.value;
		case 'bytesValue': return k.value;
		case 'nullValue': return null;
		case 'listValue': return k.value.values.map((x) => toInput(x, impl));
		case 'mapValue': {
			const m = new Map(k.value.entries.map((e) => [toInput(e.key, impl), toInput(e.value, impl)]));
			if (impl === 'celjs' && [...m.keys()].every((x) => typeof x === 'string')) return Object.fromEntries(m);
			return m;
		}
		default: throw new Skip('binding ' + k.case);
	}
}

// ---- results to the same tagged form ----
let UnsignedInt, CelJsDuration;
function fromCelJs(x) {
	if (typeof x === 'bigint') return { t: 'int', v: String(x) };
	if (typeof x === 'number') return { t: 'double', v: x };
	if (typeof x === 'string') return { t: 'string', v: x };
	if (typeof x === 'boolean') return { t: 'bool', v: x };
	if (x === null || x === undefined) return { t: 'null' };
	if (x instanceof Uint8Array) return { t: 'bytes', v: Buffer.from(x).toString('hex') };
	if (Array.isArray(x)) return { t: 'list', v: x.map(fromCelJs) };
	if (x instanceof Date) {
		const ms = x.getTime();
		const s = Math.floor(ms / 1000);
		return { t: 'timestamp', v: `${s}:${(ms - s * 1000) * 1e6}` };
	}
	const name = x.constructor?.name;
	if (name === 'UnsignedInt') return { t: 'uint', v: String(x.value) };
	if (name === 'Duration') return { t: 'duration', v: `${x.seconds}:${x.nanos}` };
	if (x instanceof Map) return { t: 'map', v: [...x].map(([a, b]) => [fromCelJs(a), fromCelJs(b)]) };
	if (name === 'Type' || name === 'TypeDeclaration' || typeof x.name === 'string' && name?.includes('Type')) return { t: 'type', v: String(x.name ?? x) };
	if (name === 'Optional') throw new Skip('optional result');
	if (typeof x === 'object') return { t: 'map', v: Object.entries(x).map(([a, b]) => [{ t: 'string', v: a }, fromCelJs(b)]) };
	return { t: 'unknown', v: String(x) };
}
function fromBuf(x) {
	if (typeof x === 'bigint') return { t: 'int', v: String(x) };
	if (typeof x === 'number') return { t: 'double', v: x };
	if (typeof x === 'string') return { t: 'string', v: x };
	if (typeof x === 'boolean') return { t: 'bool', v: x };
	if (x === null) return { t: 'null' };
	if (x instanceof Uint8Array) return { t: 'bytes', v: Buffer.from(x).toString('hex') };
	if (buf.isCelUint(x)) return { t: 'uint', v: String(x.value) };
	if (buf.isCelList(x)) return { t: 'list', v: [...x].map(fromBuf) };
	if (buf.isCelMap(x)) return { t: 'map', v: [...x.entries()].map(([a, b]) => [fromBuf(a), fromBuf(b)]) };
	if (buf.isCelType(x)) return { t: 'type', v: x.name };
	const tn = x?.desc?.typeName;
	if (tn === 'google.protobuf.Timestamp') return { t: 'timestamp', v: `${x.message.seconds}:${x.message.nanos}` };
	if (tn === 'google.protobuf.Duration') return { t: 'duration', v: `${x.message.seconds}:${x.message.nanos}` };
	return { t: 'unknown', v: String(x) };
}

const key = (a) => JSON.stringify(a);
function equal(a, b) {
	if (a.t !== b.t) {
		// cel-js has no distinct type values; compare by name
		return false;
	}
	switch (a.t) {
		case 'double': return Number.isNaN(a.v) ? Number.isNaN(b.v) : a.v === b.v || Object.is(a.v, b.v);
		case 'list': return a.v.length === b.v.length && a.v.every((x, i) => equal(x, b.v[i]));
		case 'map': {
			if (a.v.length !== b.v.length) return false;
			return a.v.every(([k, v]) => b.v.some(([k2, v2]) => equal(k, k2) && equal(v, v2)));
		}
		case 'type': return String(a.v).replace(/^google\.protobuf\./, '') === String(b.v).replace(/^google\.protobuf\./, '');
		default: return key(a) === key(b);
	}
}

// ---- running one test ----
function runCelJs(test) {
	const o = test.original;
	const env = new celjs.Environment({ unlistedVariablesAreDyn: true, enableOptionalTypes: true, homogeneousAggregateLiterals: false });
	const ctx = {};
	for (const [name, ev] of Object.entries(o.bindings)) {
		if (ev.kind.case !== 'value') throw new Skip('binding kind');
		ctx[name] = toInput(ev.kind.value, 'celjs');
	}
	return fromCelJs(env.evaluate(o.expr, ctx));
}
function runBuf(test) {
	const o = test.original;
	const ctx = {};
	for (const [name, ev] of Object.entries(o.bindings)) {
		if (ev.kind.case !== 'value') throw new Skip('binding kind');
		ctx[name] = toInput(ev.kind.value, 'buf');
	}
	const r = buf.run(o.expr, ctx, { funcs: strings });
	if (buf.isCelError(r)) throw r;
	return fromBuf(r);
}

function judge(test, impl) {
	const o = test.original;
	if (o.container) throw new Skip('container');
	if (MESSAGE_EXPR.test(o.expr)) throw new Skip('message in expression');
	if (o.typeEnv.some((d) => d.declKind.case === 'ident' && d.declKind.value.type?.typeKind.case === 'messageType')) throw new Skip('message variable');
	if (o.checkOnly) throw new Skip('check only');
	const rm = o.resultMatcher;
	let expected;
	if (rm.case === 'value') expected = fromValue(rm.value);
	else if (rm.case !== 'evalError') throw new Skip('matcher ' + rm.case);
	let got, err;
	try { got = impl === 'celjs' ? runCelJs(test) : runBuf(test); }
	catch (e) { if (e instanceof Skip) throw e; err = e; }
	if (rm.case === 'evalError') return err ? 'pass' : 'fail';
	if (err) return 'fail';
	return equal(got, expected) ? 'pass' : 'fail';
}

function* walk(suite, path = []) {
	for (const t of suite.tests ?? []) yield [path, t];
	for (const s of suite.suites ?? []) yield* walk(s, [...path, s.name]);
}

async function main() {
	({ UnsignedInt, Duration: CelJsDuration } = await import('./celjs-internals.mjs'));
	const suite = getConformanceSuite();
	const failsFor = process.argv.includes('--fails') ? process.argv[process.argv.indexOf('--fails') + 1] : null;
	const rows = [];
	const totals = { n: 0, skip: 0, celjs: 0, buf: 0 };
	for (const file of suite.suites) {
		const r = { file: file.name, n: 0, skip: 0, celjs: 0, buf: 0, fails: { celjs: [], buf: [] } };
		for (const [, t] of walk(file)) {
			r.n++;
			if (PROTO_FILES.has(file.name)) { r.skip++; continue; }
			let skipped = false;
			for (const impl of ['celjs', 'buf']) {
				try {
					const v = judge(t, impl);
					if (v === 'pass') r[impl]++;
					else r.fails[impl].push(`${t.name}: ${t.original.expr}`);
				} catch (e) {
					if (e instanceof Skip) { skipped = true; break; }
					r.fails[impl].push(`${t.name}: THREW ${e.message.split('\n')[0]}`);
				}
			}
			if (skipped) { r.skip++; r.celjs -= 0; }
		}
		rows.push(r);
		for (const k of ['n', 'skip', 'celjs', 'buf']) totals[k] += r[k];
	}
	if (failsFor) {
		const r = rows.find((x) => x.file === failsFor);
		for (const impl of ['celjs', 'buf']) {
			console.log(`\n## ${impl} fails in ${failsFor} (${r.fails[impl].length})`);
			for (const f of r.fails[impl]) console.log('  ' + f.slice(0, 160));
		}
		return;
	}
	const pct = (a, b) => (b ? ((100 * a) / b).toFixed(0) + '%' : '-');
	console.log('| File | Tests | Run | cel-js | @bufbuild/cel |');
	console.log('|---|---:|---:|---:|---:|');
	for (const r of rows) {
		const ran = r.n - r.skip;
		console.log(`| ${r.file} | ${r.n} | ${ran} | ${r.celjs} (${pct(r.celjs, ran)}) | ${r.buf} (${pct(r.buf, ran)}) |`);
	}
	const ran = totals.n - totals.skip;
	console.log(`| **all** | ${totals.n} | ${ran} | ${totals.celjs} (${pct(totals.celjs, ran)}) | ${totals.buf} (${pct(totals.buf, ran)}) |`);
}
main();
