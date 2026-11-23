// Marquise's vocabulary as CEL custom functions, registered on both implementations.
// Each has one implementation over plain JS values; thin wrappers adapt each library's values.
import * as buf from '@bufbuild/cel';
import { timestampFromDate, timestampDate, durationFromMs } from '@bufbuild/protobuf/wkt';
import { Duration as CelJsDuration } from './celjs-internals.mjs';

const LANGUAGES = { ts: 'TypeScript', js: 'JavaScript', sh: 'Shell', shell: 'Shell', md: 'Markdown', py: 'Python' };
const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

// A tiny stand-in for Marquise's selector engine: `field:a,b`, `-field:a`, `has:field`, clauses ANDed.
export function selects(record, selector) {
	return selector.trim().split(/\s+/).every((clause) => {
		const neg = clause.startsWith('-');
		const c = neg ? clause.slice(1) : clause;
		const [field, values] = c.split(':');
		const ok = field === 'has' ? !empty(record[values]) : values.split(',').includes(String(record[field]));
		return neg ? !ok : ok;
	});
}

// plain implementations
const impl = {
	first: (list) => list.find((v) => !empty(v)) ?? null,
	basename: (p) => p.split('/').pop(),
	language: (code) => LANGUAGES[code] ?? code.charAt(0).toUpperCase() + code.slice(1),
	latest: (list, field) => list.reduce((best, x) => (best === null || x[field] > best[field] ? x : best), null),
	// the first occurrence of start + k·every that is after `after`
	nextAfter: (startMs, everyMs, afterMs) => {
		if (afterMs < startMs) return startMs;
		return startMs + (Math.floor((afterMs - startMs) / everyMs) + 1) * everyMs;
	},
	sumAmounts: (list) => {
		if (list.length === 0) return { value: 0, currency: '' };
		const currency = list[0].currency;
		if (list.some((a) => a.currency !== currency)) throw new Error('amounts in different currencies');
		return { value: list.reduce((s, a) => s + Number(a.value), 0), currency };
	},
};

// ---- adapters ----
const fromBufList = (l) => [...l].map(fromBufValue);
function fromBufValue(x) {
	if (buf.isCelList(x)) return fromBufList(x);
	if (buf.isCelMap(x)) return Object.fromEntries([...x.entries()].map(([k, v]) => [k, fromBufValue(v)]));
	if (x?.desc?.typeName === 'google.protobuf.Timestamp') return timestampDate(x.message);
	return x;
}
const toBufValue = (x) => (x && typeof x === 'object' && !(x instanceof Date) ? new Map(Object.entries(x).map(([k, v]) => [k, typeof v === 'number' && Number.isInteger(v) ? BigInt(v) : v])) : x);
const D = buf.CelScalar;
const TS = buf.objectType('google.protobuf.Timestamp');
const DUR = buf.objectType('google.protobuf.Duration');
const durMs = (d) => Number(d.seconds) * 1000 + d.nanos / 1e6;

export const vocabulary = [
	{
		name: 'first',
		celjs: { signature: 'first(list): dyn', handler: (l) => impl.first(l) },
		buf: buf.celFunc('first', [buf.listType(D.DYN)], D.DYN, (l) => toBufValue(impl.first(fromBufList(l)))),
	},
	{
		name: 'basename',
		celjs: { signature: 'basename(string): string', handler: impl.basename },
		buf: buf.celFunc('basename', [D.STRING], D.STRING, impl.basename),
	},
	{
		name: 'language',
		celjs: { signature: 'language(string): string', handler: impl.language },
		buf: buf.celFunc('language', [D.STRING], D.STRING, impl.language),
	},
	{
		name: 'days',
		celjs: { signature: 'days(int): google.protobuf.Duration', handler: (n) => new CelJsDuration(n * 86400n, 0) },
		buf: buf.celFunc('days', [D.INT], DUR, (n) => durationFromMs(Number(n) * 86400000)),
	},
	{
		name: 'selects',
		celjs: { signature: 'selects(dyn, string): bool', handler: (r, s) => selects(r instanceof Map ? Object.fromEntries(r) : r, s) },
		buf: buf.celFunc('selects', [D.DYN, D.STRING], D.BOOL, (r, s) => selects(fromBufValue(r), s)),
	},
	{
		name: 'latest',
		celjs: { signature: 'latest(list, string): dyn', handler: impl.latest },
		buf: buf.celFunc('latest', [buf.listType(D.DYN), D.STRING], D.DYN, (l, f) => toBufValue(impl.latest(fromBufList(l), f))),
	},
	{
		name: 'nextAfter',
		celjs: {
			signature: 'nextAfter(google.protobuf.Timestamp, google.protobuf.Duration, google.protobuf.Timestamp): google.protobuf.Timestamp',
			handler: (s, every, after) => new Date(impl.nextAfter(s.getTime(), Number(every.seconds) * 1000 + every.nanos / 1e6, after.getTime())),
		},
		buf: buf.celFunc('nextAfter', [TS, DUR, TS], TS, (s, every, after) =>
			timestampFromDate(new Date(impl.nextAfter(timestampDate(s.message).getTime(), durMs(every.message), timestampDate(after.message).getTime())))),
	},
	{
		name: 'sumAmounts',
		celjs: { signature: 'sumAmounts(list): map', handler: (l) => impl.sumAmounts(l) },
		buf: buf.celFunc('sumAmounts', [buf.listType(D.DYN)], buf.mapType(D.STRING, D.DYN), (l) => toBufValue(impl.sumAmounts(fromBufList(l)))),
	},
];
