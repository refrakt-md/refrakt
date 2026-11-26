// A subset of marquise/docs/concepts/selectors.md's normative grammar:
// clause = ["-"] ("has:" path | ["all:"] path [":" values]); values ORed by ","; ops >= <= > <.
// Not implemented: brackets, $this/$root, shifts, regex, globs, step functions, "+" closure.
export interface Clause {
	neg: boolean;
	kind: 'has' | 'cmp';
	all: boolean;
	path: string[];
	values: { op: string; raw: string; quoted: boolean }[];
}

export class SelectorError extends Error {}

function splitTop(s: string, sep: RegExp): string[] {
	const out: string[] = [];
	let cur = '';
	let q = false;
	let depth = 0;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (ch === '\\' && q) { cur += ch + s[++i]; continue; }
		if (ch === '"') q = !q;
		if (!q && ch === '[') depth++;
		if (!q && ch === ']') depth--;
		if (!q && depth === 0 && sep.test(ch)) { if (cur) out.push(cur); cur = ''; continue; }
		cur += ch;
	}
	if (q) throw new SelectorError('unclosed quote');
	if (cur) out.push(cur);
	return out;
}

export function parseSelector(sel: string): Clause[] {
	return splitTop(sel.trim(), /\s/).map((tok) => {
		let neg = false;
		if (tok.startsWith('-')) { neg = true; tok = tok.slice(1); }
		if (tok.startsWith('has:')) return { neg, kind: 'has', all: false, path: tok.slice(4).split('.'), values: [] } as Clause;
		let all = false;
		if (tok.startsWith('all:')) { all = true; tok = tok.slice(4); }
		// selectors.md:107 "only the first `:` after a path separates it from its values"
		const i = tok.indexOf(':');
		if (i < 0) {
			if (tok.endsWith(']')) throw new SelectorError('brackets not implemented in this slice');
			throw Object.assign(new SelectorError(`bare word \`${tok}\``), { findingId: 'selector-bare-word' });
		}
		const path = tok.slice(0, i).split('.');
		const values = splitTop(tok.slice(i + 1), /,/).map((v) => {
			const m = /^(>=|<=|>|<)?(.*)$/.exec(v)!;
			const quoted = m[2].startsWith('"');
			const raw = quoted ? m[2].slice(1, -1).replace(/\\(.)/g, '$1') : m[2];
			return { op: m[1] ?? '', raw, quoted };
		});
		return { neg, kind: 'cmp', all, path, values } as Clause;
	});
}

// What a path reaches: every value, with the field's declared type, so literals parse "by the field's type".
export interface Reached {
	value: unknown;
	type?: string;
	matches?: unknown[];
	identity?: string; // for references: the resolved entity key, compared by identity (selectors.md:82)
}

export interface Resolver<T> {
	step(from: T, name: string): { reached: Reached[]; next: T[] } | undefined; // undefined: unknown field
	literalIdentity(raw: string, r: Reached): string | undefined;
}

export function evaluate<T>(clauses: Clause[], root: T, res: Resolver<T>): boolean {
	return clauses.every((c) => {
		const reached = walk(c.path, root, res);
		let v: boolean;
		if (c.kind === 'has') {
			// selectors.md:27 "has: means present and not empty"
			v = reached.some((r) => r.value !== undefined && r.value !== '' && !(Array.isArray(r.value) && r.value.length === 0));
		} else {
			const test = (r: Reached) => c.values.some((val) => compare(r, val, res));
			// selectors.md:34-36 any by default (false for empty); all: true for empty
			v = c.all ? reached.every(test) : reached.some(test);
		}
		return c.neg ? !v : v;
	});
}

function walk<T>(path: string[], root: T, res: Resolver<T>): Reached[] {
	let frontier: T[] = [root];
	let reached: Reached[] = [];
	path.forEach((step, i) => {
		const nextFrontier: T[] = [];
		reached = [];
		for (const f of frontier) {
			const r = res.step(f, step);
			if (!r) continue;
			reached.push(...r.reached);
			nextFrontier.push(...r.next);
		}
		if (i < path.length - 1) frontier = nextFrontier;
	});
	return reached;
}

function compare<T>(r: Reached, val: { op: string; raw: string }, res: Resolver<T>): boolean {
	if (r.value === undefined) return false; // two-valued logic: a clause about a missing value is false
	if (r.identity !== undefined) return !val.op && res.literalIdentity(val.raw, r) === r.identity;
	let lit: unknown = val.raw;
	if (r.type === 'integer' || r.type === 'number') lit = Number(val.raw);
	if (r.type === 'boolean') lit = val.raw === 'true';
	const a = r.value as any;
	switch (val.op) {
		case '': return typeof a === 'string' ? a.normalize('NFC') === String(lit).normalize('NFC') : a === lit;
		case '>': return a > (lit as any);
		case '<': return a < (lit as any);
		case '>=': return a >= (lit as any);
		case '<=': return a <= (lit as any);
	}
	return false;
}
