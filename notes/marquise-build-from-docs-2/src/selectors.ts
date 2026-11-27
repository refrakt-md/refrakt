// A slice of Marquise's selector language (selectors.md), with three-valued results for refused values.
export const UNKNOWN = Symbol('unknown');
export type Tri = true | false | typeof UNKNOWN;

interface Step { name: string; fn?: string[]; plus: boolean; brackets: Clause[][] }
interface Value { op?: string; raw: string; quoted: boolean; rhs?: Step[] }
export interface Clause { neg: boolean; has: boolean; all: boolean; path: Step[]; values?: Value[] }

export class SelectorError extends Error { constructor(public id: string, msg: string) { super(msg); } }

function splitTop(s: string, sep: (c: string) => boolean): string[] {
	const out: string[] = [];
	let depth = 0, q = false, cur = '';
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (q) { cur += c; if (c === '\\') { cur += s[++i]; } else if (c === '"') q = false; continue; }
		if (c === '"') { q = true; cur += c; continue; }
		if (c === '[' || c === '(') depth++;
		if (c === ']' || c === ')') depth--;
		if (depth === 0 && sep(c)) { if (cur) out.push(cur); cur = ''; continue; }
		cur += c;
	}
	if (q || depth !== 0) throw new SelectorError('selector-invalid', `unbalanced quotes or brackets in \`${s}\``);
	if (cur) out.push(cur);
	return out;
}

export function parse(sel: string): Clause[] {
	return splitTop(sel.trim(), (c) => /\s/.test(c)).map(parseClause);
}

function parseClause(t: string): Clause {
	const c: Clause = { neg: false, has: false, all: false, path: [] };
	if (t.startsWith('-')) { c.neg = true; t = t.slice(1); }
	if (t.startsWith('has:')) { c.has = true; c.path = parsePath(t.slice(4)); return c; }
	if (t.startsWith('all:')) { c.all = true; t = t.slice(4); }
	// only the first top-level `:` after a path separates it from its values
	let depth = 0, idx = -1;
	for (let i = 0; i < t.length; i++) {
		if (t[i] === '[' || t[i] === '(') depth++;
		else if (t[i] === ']' || t[i] === ')') depth--;
		else if (t[i] === ':' && depth === 0) { idx = i; break; }
	}
	if (idx < 0) {
		c.path = parsePath(t);
		if (!c.path.length || !c.path[c.path.length - 1].brackets.length) throw new SelectorError('selector-bare-word', `bare word \`${t}\``);
		c.has = true; // "A bare path ending in brackets is a clause meaning has:"
		return c;
	}
	c.path = parsePath(t.slice(0, idx));
	c.values = splitTop(t.slice(idx + 1), (ch) => ch === ',').map(parseValue);
	return c;
}

function parsePath(p: string): Step[] {
	return splitTop(p, (c) => c === '.').map((s) => {
		const brackets: Clause[][] = [];
		let m: RegExpExecArray | null;
		while ((m = /\[([^\]]*)\]$/.exec(s))) { brackets.unshift(parse(m[1])); s = s.slice(0, m.index); }
		let plus = false;
		if (s.endsWith('+')) { plus = true; s = s.slice(0, -1); }
		const fm = /^([A-Za-z][\w-]*)\((.*)\)$/.exec(s);
		if (fm) return { name: fm[1], fn: fm[2].split(',').map((x) => x.trim()), plus, brackets };
		if (!/^\$?[A-Za-z][A-Za-z0-9_]*(-[A-Za-z0-9_]+)*$/.test(s)) throw new SelectorError('selector-invalid', `bad step \`${s}\``);
		return { name: s, plus, brackets };
	});
}

function parseValue(v: string): Value {
	const om = /^(>=|<=|>|<)/.exec(v);
	const op = om?.[1];
	if (op) v = v.slice(op.length);
	if (v.startsWith('"')) return { op, raw: JSON.parse(v), quoted: true };
	if (v.startsWith('$')) return { op, raw: v, quoted: false, rhs: parsePath(v) };
	return { op, raw: v, quoted: false };
}

/** What a host's resolver answers: one step from a value; UNKNOWN for a refused member. */
export interface Resolver {
	step(from: any, step: Step, ctx: { root: any; self: any }): any[] | typeof UNKNOWN;
	compare(value: any, literal: string, op: string | undefined, ctx: { path: Step[]; root: any }): boolean;
	nonEmpty(value: any): boolean;
}

export function evaluate(clauses: Clause[], subject: any, r: Resolver, root = subject): Tri {
	let res: Tri = true;
	for (const c of clauses) {
		const v = clause(c, subject, r, root);
		if (v === false) return false;
		if (v === UNKNOWN) res = UNKNOWN;
	}
	return res;
}

function walk(path: Step[], subject: any, r: Resolver, root: any): any[] | typeof UNKNOWN {
	let cur: any[] = [subject];
	let unknown = false;
	for (const st of path) {
		let next: any[] = [];
		const one = (x: any) => { const out = r.step(x, st, { root, self: x }); if (out === UNKNOWN) { unknown = true; return []; } return out; };
		if (st.plus) {
			const seen = new Set<any>();
			let frontier = cur;
			while (frontier.length) {
				const f2: any[] = [];
				for (const x of frontier) for (const y of one(x)) if (!seen.has(y)) { seen.add(y); next.push(y); f2.push(y); }
				frontier = f2;
			}
		} else for (const x of cur) next.push(...one(x));
		for (const b of st.brackets) {
			const kept: any[] = [];
			for (const x of next) { const t = evaluate(b, x, r, root); if (t === true) kept.push(x); else if (t === UNKNOWN) unknown = true; }
			next = kept;
		}
		cur = next;
	}
	// a refused value reached by the path makes the clause unknown, unless something definite is found (see caller)
	return unknown && cur.length === 0 ? UNKNOWN : unknown ? Object.assign(cur, { partialUnknown: true }) : cur;
}

function clause(c: Clause, subject: any, r: Resolver, root: any): Tri {
	const vals = walk(c.path, subject, r, root);
	let t: Tri;
	if (vals === UNKNOWN) t = UNKNOWN;
	else if (c.has) t = vals.some((v) => r.nonEmpty(v)) ? true : (vals as any).partialUnknown ? UNKNOWN : false;
	else {
		const test = (v: any) => c.values!.some((lit) => r.compare(v, lit.raw, lit.op, { path: c.path, root }));
		if (c.all) t = (vals as any).partialUnknown ? UNKNOWN : vals.every(test);
		else t = vals.some(test) ? true : (vals as any).partialUnknown ? UNKNOWN : false;
	}
	if (t === UNKNOWN) return UNKNOWN; // "A clause reading a value ... refused is unknown, and so is its negation"
	return c.neg ? !t : t;
}
