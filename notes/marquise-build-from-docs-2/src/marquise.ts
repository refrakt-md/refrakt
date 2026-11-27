// A thin Marquise slice, built from marquise/docs only. GAP-n markers point at report entries.
import Markdoc from '@markdoc/markdoc';
import YAML, { LineCounter, isMap, isScalar, isSeq } from 'yaml';

export type Severity = 'error' | 'warning' | 'info';
export interface Finding {
	id: string;
	severity: Severity;
	file: string;
	address: string;
	// GAP-1: Markdoc gives line ranges only; columns are unknowable without a locator (after 1.0).
	// We print columns as 0 and the end as the start of the line after the node.
	range: { start: [number, number]; end: [number, number] };
	message: string;
	params: Record<string, unknown>;
	fixes?: unknown[];
}

// ---------- naming ----------
export const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
export const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const RESERVED = ['shape', 'id', 'address', 'invalid', 'slot', 'lang', 'has', 'all'];
const BLOCK_MATCH = ['paragraph', 'heading', 'list', 'image', 'fence', 'blockquote', 'table', 'hr', 'tag', 'any'];
const RESERVED_SHAPE_NAMES = ['markdown', 'syntax', 'text', 'shapes', 'nodes', ...BLOCK_MATCH];
const VALUE_TYPES = ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'url', 'duration', 'ref'];
const CORE_KEYS = [
	'extends', 'abstract', 'description', 'attributes', 'content', 'rules', 'preprocess', 'checks', 'computes',
	'prepare', 'compact', 'migrations', 'summary', 'plain', 'strict', 'requires', 'provides', 'dimensions',
];
const ATTR_KEYS = ['type', 'matches', 'list', 'default', 'required', 'positional', 'fields', 'to', 'pattern', 'as', 'description'];
// GAP-2: no page lists the complete set of keys a field declaration may take. Collected from examples.
const FIELD_KEYS = [
	'match', 'optional', 'repeat', 'as', 'items', 'shadows', 'template', 'min', 'max', 'position', 'group', 'to',
	'matches', 'key', 'list', 'heading', 'deprecated', 'content', 'parts', 'level',
];

// ---------- value types ----------
export function parseValue(type: string, v: unknown): { ok: true; value: unknown } | { ok: false } {
	switch (type) {
		case 'string':
		case 'ref': // GAP-3: Marquise "checks a reference's form within the document"; no form is defined. Any non-empty string.
			return typeof v === 'string' && (type === 'string' || v.length > 0) ? { ok: true, value: v.normalize('NFC') } : { ok: false };
		case 'integer':
		case 'number': {
			// GAP-4: is a Markdoc string attribute "4" an integer (parsed, as list items are) or a type error? Parsed.
			const n = typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN;
			if (Number.isNaN(n) || (type === 'integer' && !Number.isInteger(n))) return { ok: false };
			return { ok: true, value: n };
		}
		case 'boolean':
			return typeof v === 'boolean' ? { ok: true, value: v } : { ok: false };
		case 'date':
			return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? { ok: true, value: v } : { ok: false };
		case 'url':
			// GAP-5: "checked against the protocol allowlist" - the allowlist is never given. Chose http, https, mailto, relative.
			return typeof v === 'string' && (/^(https?:|mailto:)/.test(v) || /^[./#a-z0-9]/i.test(v)) ? { ok: true, value: v } : { ok: false };
		default:
			return typeof v === 'string' ? { ok: true, value: v } : { ok: false };
	}
}

// ---------- shapes ----------
export interface AttrDecl {
	name: string; // kebab, as written
	type?: string;
	matches?: unknown[];
	list?: boolean;
	default?: unknown;
	required?: boolean;
	positional?: boolean;
	fields?: Record<string, AttrDecl>;
	to?: string[];
	extensions: Record<string, unknown>;
}
export interface FieldDecl {
	name: string;
	match: string;
	optional?: boolean;
	repeat?: boolean;
	as?: string;
	items?: ItemModel;
	shadows?: string[];
	template?: string;
	members?: Record<string, any>;
	extensions: Record<string, unknown>;
}
export interface ItemModel {
	template?: string;
	key?: string;
	members: Record<string, any>; // member name -> declaration
	single?: any; // a single value declaration ("a list of values")
}
export interface Shape {
	name: string;
	file: string;
	description?: string;
	attributes: Record<string, AttrDecl>;
	sequence?: FieldDecl[];
	strict: boolean;
	rules: Record<string, any>;
	summary?: string[];
	extensions: Record<string, unknown>;
	isData: boolean;
	examples: { id?: string; expect?: string[]; body: string; line: number }[];
	findings: Finding[];
	excluded: boolean;
}

function sf(file: string, id: string, severity: Severity, address: string, message: string, params: Record<string, unknown> = {}, line = 1): Finding {
	return { id, severity, file, address, range: { start: [line, 0], end: [line + 1, 0] }, message, params };
}

const FRONT = /^---\n([\s\S]*?)\n---\n?/;

export interface Instance {
	shapes: Map<string, Shape>;
	findings: Finding[];
	extensions: string[];
}

export function createMarquise(sources: { file: string; text: string }[], host: { extensions?: string[]; extraShapes?: Shape[] } = {}): Instance {
	// GAP-6: createMarquise is documented async, reading through `files`; we take sources directly (configuration
	// says "shape sources as strings" are allowed, with no signature for passing them).
	const shapes = new Map<string, Shape>();
	const findings: Finding[] = [];
	const exts = host.extensions ?? [];
	for (const { file, text } of sources) {
		const name = file.replace(/^.*\//, '').replace(/\.md$/, '');
		const s = loadShape(name, file, text, exts);
		analyse(s);
		findings.push(...s.findings);
		// "A shape with error findings (other than example-mismatch) is left out"
		s.excluded = s.findings.some((f) => f.severity === 'error' && f.id !== 'example-mismatch');
		shapes.set(name, s);
	}
	for (const s of host.extraShapes ?? []) shapes.set(s.name, s);
	return { shapes, findings, extensions: exts };
}

function loadShape(name: string, file: string, text: string, exts: string[]): Shape {
	const m = FRONT.exec(text);
	const fm: any = m ? YAML.parse(m[1], { version: '1.2' }) ?? {} : {};
	const body = m ? text.slice(m[0].length) : text;
	const bodyLine = m ? m[0].split('\n').length : 1;
	const s: Shape = {
		name, file, attributes: {}, strict: fm.strict !== false, rules: fm.rules ?? {}, summary: fm.summary,
		description: fm.description, extensions: {}, isData: !fm.content, examples: [], findings: [], excluded: false,
	};
	const F = (id: string, sev: Severity, msg: string, params: Record<string, unknown> = {}, addr = '') => s.findings.push(sf(file, id, sev, addr, msg, params));
	if (RESERVED_SHAPE_NAMES.includes(name)) F('name-collision', 'error', `\`${name}\` cannot name a shape`, { name });
	for (const k of Object.keys(fm)) {
		if (CORE_KEYS.includes(k)) continue;
		if (exts.includes(k)) { s.extensions[k] = fm[k]; continue; }
		// GAP-7: "close match for a core key" is undefined. Chose edit distance <= 2.
		const close = CORE_KEYS.find((c) => editDistance(c, k) <= 2);
		if (close) F('shape-key-unknown', 'error', `unknown key \`${k}\` (did you mean \`${close}\`?)`, { name: k });
		else { F('namespace-unknown', 'info', `extension namespace \`${k}\` is not installed; its data passes through`, { name: k }); s.extensions[k] = fm[k]; }
	}
	// GAP-8: `rules` needs @marquise-md/selectors (else capability-unavailable); the capability's install contract is
	// unspecified (no interface for what `selectors` must provide). We treat it as installed and evaluate in riviere.ts.
	for (const [k, d] of Object.entries<any>(fm.attributes ?? {})) s.attributes[k] = loadAttr(k, d, s, F, exts, k);
	if (fm.content) {
		if (fm.content.sequence) s.sequence = Object.entries<any>(fm.content.sequence).map(([k, d]) => loadField(k, d, s, F, exts));
		else F('shape-key-unknown', 'error', 'only `sequence` content models are implemented in this slice', { name: Object.keys(fm.content)[0] });
	}
	// names: collisions after conversion, reserved names, camelCase
	const all = [...Object.keys(s.attributes), ...(s.sequence ?? []).map((f) => f.name)];
	const seen = new Map<string, string>();
	for (const n of all) {
		if (RESERVED.includes(n)) F('name-collision', 'error', `\`${n}\` is a reserved name`, { name: n }, camel(n));
		if (/[A-Z]/.test(n)) F('name-camelcase', 'warning', `\`${n}\` is camelCase; shape files use kebab-case`, { name: n }, camel(n));
		const c = camel(n);
		if (seen.has(c) && seen.get(c) !== n) F('name-collision', 'error', `\`${n}\` and \`${seen.get(c)}\` collide as \`${c}\``, { name: n, other: { file, address: seen.get(c) } }, c);
		seen.set(c, n);
	}
	for (const [rn, r] of Object.entries<any>(s.rules)) if (!r.message) F('rule-message-missing', 'error', `rule \`${rn}\` declares no message`, { name: rn });
	// body: only {% example %} blocks
	const ast = Markdoc.parse(body);
	for (const n of ast.children) {
		if (n.type === 'tag' && n.tag === 'example') {
			const lines = body.split('\n');
			const inner = lines.slice(n.lines[0] + 1, n.lines[n.lines.length - 2]).join('\n');
			s.examples.push({ id: n.attributes.id, expect: n.attributes.expect, body: inner, line: bodyLine + n.lines[0] });
		} else if (!(n.type === 'paragraph' && !n.lines.length)) {
			s.findings.push(sf(file, 'definition-loose-content', 'error', '', `content outside \`{% example %}\` blocks`, {}, bodyLine + (n.lines[0] ?? 0)));
		}
	}
	return s;
}

function loadAttr(k: string, d: any, s: Shape, F: any, exts: string[], path: string): AttrDecl {
	const a: AttrDecl = { name: k, extensions: {} };
	for (const key of Object.keys(d ?? {})) {
		if (ATTR_KEYS.includes(key)) (a as any)[key] = d[key];
		else if (exts.includes(key)) a.extensions[key] = d[key];
		// GAP-9: at the attribute level, an unknown non-namespace key: error (extending.md "inside a known namespace")
		// or namespace-unknown (the top-level rule)? Chose shape-key-unknown, as findings.md says.
		else F('shape-key-unknown', 'error', `unknown key \`${key}\` on attribute \`${path}\``, { name: key }, camel(path));
	}
	if (a.fields) {
		a.fields = Object.fromEntries(Object.entries<any>(a.fields).map(([fk, fd]) => [fk, loadAttr(fk, fd, s, F, exts, `${path}.${fk}`)]));
		// GAP-10: a structured attribute with `fields:` - is `type` required on it? (attribute-type-missing says every
		// attribute a shape introduces needs `type`, but no `type: object` exists.) Chose: not required when `fields` is given.
	} else if (!a.type) F('attribute-type-missing', 'error', `attribute \`${path}\` declares no type`, { name: path }, camel(path));
	else if (!VALUE_TYPES.includes(a.type)) F('shape-key-unknown', 'error', `unknown value type \`${a.type}\``, { name: 'type', value: a.type, allowed: VALUE_TYPES }, camel(path));
	return a;
}

function loadField(k: string, d: any, s: Shape, F: any, exts: string[]): FieldDecl {
	const f: FieldDecl = { name: k, match: d.match ?? 'any', extensions: {}, members: {} };
	for (const key of Object.keys(d)) {
		if (FIELD_KEYS.includes(key)) (f as any)[key] = d[key];
		else if (exts.includes(key)) f.extensions[key] = d[key];
		else f.members![key] = d[key]; // template members sit beside `template:` (content-models.md "term" example)
	}
	if (d.items) {
		const { template, key, ...rest } = d.items;
		const named = Object.entries(rest).filter(([, v]) => v && typeof v === 'object');
		// "When items: is a single value declaration, with no named members, the list holds values"
		if (!template && named.length === 0) f.items = { members: {}, single: rest };
		else f.items = { template, key, members: Object.fromEntries(named) };
	}
	return f;
}

// ---------- analysis ----------
function startSet(f: FieldDecl): string[] {
	return f.match.split('|').map((x) => x.trim());
}
function overlaps(a: string, b: string): boolean {
	if (a === 'any' || b === 'any') return true;
	if (a === b) return true;
	const base = (x: string) => x.split(':')[0];
	if (base(a) === base(b) && ['heading', 'list', 'tag'].includes(base(a)) && (!a.includes(':') || !b.includes(':'))) return true;
	if ((a === 'image' && b === 'paragraph') || (a === 'paragraph' && b === 'image')) return true;
	return false;
}
function setsOverlap(a: string[], b: string[]): string[] {
	const out: string[] = [];
	for (const x of a) for (const y of b) if (overlaps(x, y)) out.push(x === 'any' ? y : x);
	return [...new Set(out)];
}

function analyse(s: Shape) {
	const seq = s.sequence ?? [];
	const used = new Map<string, Set<string>>();
	seq.forEach((f, i) => {
		if (!f.optional && !f.repeat) return;
		for (let j = i + 1; j < seq.length; j++) {
			const g = seq[j];
			const ov = setsOverlap(startSet(f), startSet(g));
			if (ov.length) {
				// unreachable: a repeating `any` (or a repeat covering g's whole start set) before g
				const covers = f.repeat && startSet(g).every((x) => startSet(f).some((y) => y === 'any' || y === x));
				if (covers) {
					s.findings.push(sf(s.file, 'field-unreachable', 'error', camel(g.name),
						`\`${g.name}\` can never take a node: \`${f.name}\` (repeating) takes every ${startSet(g).join(' or ')} before it`, { name: g.name, other: { file: s.file, address: camel(f.name) } }));
				} else {
					const ack = f.shadows?.includes(g.name);
					if (ack) (used.get(f.name) ?? used.set(f.name, new Set()).get(f.name)!).add(g.name);
					const sev: Severity = ack ? 'info' : s.strict ? 'error' : !g.optional && !g.repeat ? 'warning' : 'info';
					s.findings.push(sf(s.file, 'field-shadowed', sev, camel(f.name),
						`A ${ov.join('/')} ${i > 0 ? 'after ' + seq[i - 1].name : 'first'} always becomes \`${f.name}\`; a \`${g.name}\` that starts with one needs \`${f.name}\`, or an explicit \`#${g.name}\` slot`,
						{ name: f.name, other: { file: s.file, address: camel(g.name) } }));
				}
			}
			if (!g.optional && !g.repeat) break; // "up to and including the first required one"
		}
	});
	for (const f of seq) for (const t of f.shadows ?? []) if (!used.get(f.name)?.has(t))
		s.findings.push(sf(s.file, 'shadows-unused', 'warning', camel(f.name), `\`${f.name}\` declares shadows: [${t}] but no overlap exists`, { name: t }));
	// templates
	for (const f of seq) {
		const tpl = f.template ?? f.items?.template;
		if (!tpl) continue;
		const members = f.template ? f.members! : f.items!.members;
		const toks = parseTemplate(tpl);
		const err = checkTemplate(toks, members);
		if (err) s.findings.push(sf(s.file, err.id, 'error', camel(f.name), err.message, { name: f.name, value: tpl }));
	}
}

// ---------- templates ----------
type Tok =
	| { k: 'lit'; s: string }
	| { k: 'ph'; name: string; fmt?: string }
	| { k: 'strong' | 'em'; inner: Tok[] }
	| { k: 'link'; label: Tok[]; href: Tok[] }
	| { k: 'opt'; inner: Tok[] }
	| { k: 'alt'; options: string[] };

export function parseTemplate(t: string): Tok[] {
	let i = 0;
	function seq(stop: string[]): Tok[] {
		const out: Tok[] = [];
		let lit = '';
		const flush = () => { if (lit) out.push({ k: 'lit', s: lit }); lit = ''; };
		while (i < t.length) {
			if (stop.some((x) => t.startsWith(x, i))) break;
			const c = t[i];
			if (c === '\\') { lit += t[i + 1]; i += 2; continue; }
			if (c === '{') { flush(); const j = t.indexOf('}', i); const [name, fmt] = t.slice(i + 1, j).split(':'); out.push({ k: 'ph', name, fmt }); i = j + 1; continue; }
			if (t.startsWith('[?', i)) { flush(); i += 2; const inner = seq([']']); i++; out.push({ k: 'opt', inner }); continue; }
			if (t.startsWith('[|', i)) {
				flush(); i += 2; const j = t.indexOf(']', i);
				// GAP-11: are spaces around alternatives significant? "[| — | – | - ]" reads "Ada — Engineer"; we keep
				// each option as written between bars, trimmed to a single surrounding space.
				const options = t.slice(i, j).split('|').map((o) => ' ' + o.trim() + ' ');
				out.push({ k: 'alt', options }); i = j + 1; continue;
			}
			if (t.startsWith('**', i)) { flush(); i += 2; const inner = seq(['**']); i += 2; out.push({ k: 'strong', inner }); continue; }
			if (c === '*' ) { flush(); i += 1; const inner = seq(['*']); i += 1; out.push({ k: 'em', inner }); continue; }
			if (c === '[') { flush(); i++; const label = seq([']']); i += 2; const href = seq([')']); i++; out.push({ k: 'link', label, href }); continue; }
			lit += c; i++;
		}
		flush();
		return out;
	}
	return seq([]);
}

function checkTemplate(toks: Tok[], members: Record<string, any>): { id: string; message: string } | null {
	const flat: Tok[] = [];
	const walk = (ts: Tok[]) => ts.forEach((x) => {
		flat.push(x);
		if (x.k === 'strong' || x.k === 'em' || x.k === 'opt') walk(x.inner);
		if (x.k === 'link') { walk(x.label); walk(x.href); }
	});
	walk(toks);
	for (const x of flat) if (x.k === 'ph' && x.fmt) return { id: 'template-invalid', message: `a format (\`{${x.name}:${x.fmt}}\`) is only for the template() API` };
	for (let i = 0; i + 1 < toks.length; i++) {
		const a = toks[i], b = toks[i + 1];
		if (a.k === 'ph' && b.k === 'ph' && !typed(members[a.name]) && !typed(members[b.name]))
			return { id: 'template-ambiguous', message: `\`{${a.name}}\` and \`{${b.name}}\` are untyped with no literal between them` };
	}
	const inTpl = new Set(flat.filter((x): x is any => x.k === 'ph').map((x) => x.name));
	for (const [m, d] of Object.entries(members)) if (!inTpl.has(m) && !d?.optional) return { id: 'template-invalid', message: `required member \`${m}\` is not reachable from the template` };
	return null;
}
const typed = (d: any) => !!d && ((d.as && !['text', 'inline', 'block'].includes(d.as)) || !!d.matches);

// inline stream: chars of text, or atomic parts
type Part = { k: 'ch'; c: string } | { k: 'strong' | 'em'; node: any } | { k: 'link'; node: any } | { k: 'code'; node: any } | { k: 'tag'; node: any } | { k: 'image'; node: any };
function stream(nodes: any[]): Part[] {
	const out: Part[] = [];
	for (const n of nodes) {
		if (n.type === 'text') for (const c of n.attributes.content) out.push({ k: 'ch', c });
		else if (n.type === 'softbreak' || n.type === 'hardbreak') out.push({ k: 'ch', c: ' ' });
		else if (['strong', 'em', 'link', 'code', 'tag', 'image'].includes(n.type)) out.push({ k: n.type, node: n } as Part);
	}
	return out;
}
const plain = (ps: Part[]): string => ps.map((p) => (p.k === 'ch' ? p.c : p.k === 'code' ? p.node.attributes.content : p.k === 'tag' ? '' : plainNode(p.node))).join('');
export function plainNode(n: any): string {
	if (n.type === 'text') return n.attributes.content;
	if (n.type === 'code') return n.attributes.content;
	if (n.type === 'softbreak' || n.type === 'hardbreak') return ' ';
	return (n.children ?? []).map(plainNode).join('');
}

/** Read a node's inline parts by a template; returns member values (raw parts) or a mismatch. */
export function readTemplate(toks: Tok[], parts: Part[], members: Record<string, any>): { ok: true; values: Record<string, Part[]>; alts: string[] } | { ok: false; at: number } {
	const values: Record<string, Part[]> = {};
	const alts: string[] = [];
	const ws = (c: string) => /\s/.test(c);
	function matchLit(s: string, pos: number): number {
		// GAP-12: "literal text matches text" - is whitespace in a literal exact or any run of whitespace? Any run (>=0 at edges).
		let p = pos;
		for (let i = 0; i < s.length; i++) {
			if (ws(s[i])) { while (p < parts.length && parts[p].k === 'ch' && ws((parts[p] as any).c)) p++; continue; }
			if (p < parts.length && parts[p].k === 'ch' && (parts[p] as any).c === s[i]) p++;
			else return -1;
		}
		return p;
	}
	function firstLit(ts: Tok[], from: number): string[] {
		const t = ts[from];
		if (!t) return [];
		if (t.k === 'lit') return [t.s];
		if (t.k === 'alt') return t.options;
		if (t.k === 'opt') return [...firstLit(t.inner, 0), ...firstLit(ts, from + 1)];
		return [];
	}
	function run(ts: Tok[], pos: number, end: number): number {
		for (let i = 0; i < ts.length; i++) {
			const t = ts[i];
			if (t.k === 'lit') { const p = matchLit(t.s, pos); if (p < 0) return -1; pos = p; }
			else if (t.k === 'alt') {
				const opts = [...t.options].sort((a, b) => b.length - a.length); // "tried longest first"
				let hit = -1;
				for (const o of opts) { const p = matchLit(o, pos); if (p >= 0) { hit = p; alts.push(o.trim()); break; } }
				if (hit < 0) return -1; pos = hit;
			} else if (t.k === 'opt') {
				const lits = firstLit(t.inner, 0);
				if (lits.some((l) => matchLit(l, pos) >= 0) || (t.inner[0] && t.inner[0].k !== 'lit' && t.inner[0].k !== 'alt')) {
					const p = run(t.inner, pos, end); if (p >= 0) pos = p;
				}
			} else if (t.k === 'strong' || t.k === 'em' || t.k === 'link') {
				while (pos < end && parts[pos].k === 'ch' && ws((parts[pos] as any).c)) pos++;
				const p = parts[pos];
				if (!p || p.k !== t.k) return -1;
				if (t.k === 'link') {
					const hrefTok = t.href.find((x) => x.k === 'ph') as any;
					if (hrefTok) values[hrefTok.name] = [...p.node.attributes.href].map((c: string) => ({ k: 'ch', c }) as Part);
					const inner = stream(p.node.children[0]?.type === 'inline' ? p.node.children[0].children : p.node.children);
					const r = readTemplate(t.label, inner, members); if (!r.ok) return -1; Object.assign(values, r.values);
				} else {
					const inner = stream(p.node.children);
					// "A literal that closes its container is matched from the end"
					const r = readTemplate(t.inner, inner, members); if (!r.ok) return -1; Object.assign(values, r.values);
				}
				pos++;
			} else if (t.k === 'ph') {
				const d = members[t.name];
				let stop = end;
				const next = firstLit(ts, i + 1);
				if (typed(d) && d.matches) {
					const opts = [...d.matches].map(String).sort((a, b) => b.length - a.length);
					const o = opts.find((x) => matchLit(x, pos) === pos + x.length);
					if (!o) return -1; stop = pos + o.length;
				} else if (typed(d) && ['integer', 'number'].includes(d.as)) {
					stop = pos; while (stop < end && parts[stop].k === 'ch' && /[\d.]/.test((parts[stop] as any).c)) stop++;
				} else if (typed(d) && d.as === 'date') {
					stop = Math.min(end, pos + 10);
				} else if (next.length) {
					// "Only untyped text runs up to the next literal"; group/alternative: the earliest one found
					stop = -1;
					for (let p = pos; p <= end && stop < 0; p++) if (next.some((l) => matchLit(l, p) >= 0)) stop = p;
					if (stop < 0) stop = ts[i + 1]?.k === 'opt' ? end : -1;
					if (stop < 0) return -1;
					while (stop > pos && parts[stop - 1].k === 'ch' && ws((parts[stop - 1] as any).c)) stop--;
				} else if (i === ts.length - 1) {
					stop = end;
				}
				values[t.name] = parts.slice(pos, stop);
				pos = stop;
			}
		}
		return pos;
	}
	// container-closing literal from the end: try greedy for a trailing literal
	const last = toks[toks.length - 1];
	if (last && last.k === 'lit' && toks.length >= 2 && toks[toks.length - 2].k === 'ph') {
		const tail = last.s;
		const txt = plain(parts);
		if (!txt.endsWith(tail)) return { ok: false, at: parts.length };
		const r = run(toks.slice(0, -1), 0, parts.length - tail.length);
		if (r < 0) return { ok: false, at: 0 };
		return { ok: true, values, alts };
	}
	const p = run(toks, 0, parts.length);
	let q = p;
	while (q >= 0 && q < parts.length && parts[q].k === 'ch' && ws((parts[q] as any).c)) q++;
	if (p < 0 || q !== parts.length) return { ok: false, at: Math.max(p, 0) };
	return { ok: true, values, alts };
}

// ---------- documents ----------
export interface Doc {
	path: string;
	findings: Finding[];
	records: any[];
	mentions: { kind: 'ref' | 'link' | 'code'; value: string; line: number; passage: string; reviewed?: string; shapeAddress: string }[];
	refFields: { address: string; value: string; to: string[]; line: number; field: string }[];
	frontmatter?: any;
	source: string;
	lineOffset?: number;
}

export function load(mq: Instance, source: string, opts: { path: string; documentShape?: string }): Doc {
	const path = opts.path;
	const doc: Doc = { path, findings: [], records: [], mentions: [], refFields: [], source };
	const m = FRONT.exec(source);
	const fmLines = m ? m[0].split('\n').length - 1 : 0;
	doc.lineOffset = fmLines;
	const body = m ? source.slice(m[0].length) : source;
	const lines = body.split('\n');
	const F = (id: string, severity: Severity, address: string, message: string, params: Record<string, unknown>, line: number) =>
		doc.findings.push(sf(path, id, severity, address, message, params, line));
	// GAP-13: Markdoc's `<!-- -->` comments: "Marquise enables them" - Markdoc's option name is not given; we strip them.
	const ast = Markdoc.parse(body.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' ')));
	const L = (n: any) => fmLines + (n.lines?.[0] ?? 0) + 1;
	const fm = m ? YAML.parse(m[1], { version: '1.2' }) : undefined;
	doc.frontmatter = fm;
	const docShapeName = (fm && fm.shape) || opts.documentShape;
	if (docShapeName && fm) {
		const s = mq.shapes.get(docShapeName);
		if (!s) F('shape-unknown', 'error', '', `no shape \`${docShapeName}\``, { shape: docShapeName }, 1);
		else {
			const rec = resolveInstance(s, fm, ast.children, { root: true, line: 1, frontmatter: true });
			doc.records.push(rec);
		}
	} else {
		const counts = new Map<string, number>();
		const totals = new Map<string, number>();
		for (const n of ast.children) if (n.type === 'tag') totals.set(n.tag, (totals.get(n.tag) ?? 0) + 1);
		for (const n of ast.children) {
			if (n.type !== 'tag') { scanInline(n, '', doc); continue; }
			const i = counts.get(n.tag) ?? 0; counts.set(n.tag, i + 1);
			const s = mq.shapes.get(n.tag);
			if (!s) { F('shape-unknown', 'error', n.tag, `no shape defines \`${n.tag}\``, { shape: n.tag }, L(n)); continue; }
			if (s.excluded) { F('shape-invalid', 'error', n.tag, `shape \`${n.tag}\` has error findings and was left out`, { shape: n.tag }, L(n)); continue; }
			const posAddr = totals.get(n.tag)! > 1 ? `${n.tag}[${i}]` : n.tag;
			const rec = resolveInstance(s, n.attributes, n.children, { root: false, line: L(n), posAddr, node: n });
			doc.records.push(rec);
		}
	}
	return doc;

	function resolveInstance(s: Shape, rawAttrs: any, children: any[], ctx: { root: boolean; line: number; posAddr?: string; node?: any; frontmatter?: boolean }): any {
		const id = rawAttrs.id;
		// "The most stable address is reported: an id, then a key, then an index"
		const addr = id ? `#${/^[A-Za-z0-9_-]+$/.test(String(id)) ? id : JSON.stringify(String(id))}` : ctx.root ? '' : ctx.posAddr!;
		const at = (member: string) => (addr ? `${addr}.${member}` : member);
		const rec: any = { shape: s.name, address: addr };
		if (id !== undefined) rec.id = String(id);
		const invalid: string[] = [];
		// attributes
		const written = new Set<string>();
		for (const [k, v] of Object.entries<any>(rawAttrs)) {
			if (k === 'id' || (ctx.frontmatter && k === 'shape')) continue;
			if (k === 'primary') { /* positional */ }
			const decl = s.attributes[k] ?? Object.values(s.attributes).find((a) => k === 'primary' && a.positional);
			if (!decl) {
				// frontmatter keys the shape does not declare pass through to the host, without a finding
				if (!ctx.frontmatter) F('attribute-unknown', 'error', at(camel(k)), `${s.name}: unknown attribute \`${k}\``, { name: k, shape: s.name }, ctx.line);
				continue;
			}
			written.add(decl.name);
			const r = checkAttr(decl, v, at(camel(decl.name)), ctx.line, s);
			if (r.ok) rec[camel(decl.name)] = r.value;
			else invalid.push(camel(decl.name));
		}
		for (const a of Object.values(s.attributes)) {
			if (written.has(a.name)) continue;
			if (a.required) { F('attribute-missing', 'error', at(camel(a.name)), `${s.name}: \`${a.name}\` is required`, { name: a.name, shape: s.name }, ctx.line); invalid.push(camel(a.name)); }
			else if (a.default !== undefined) rec[camel(a.name)] = a.default; // defaults only when absent
		}
		// content
		if (s.isData) {
			const significant = children.filter((c) => !(c.type === 'paragraph' && plainNode(c).trim() === ''));
			for (const c of significant) F('content-unmatched', 'warning', addr || '', `${s.name}: a ${c.type} matches no field and would be dropped`, { shape: s.name }, L(c));
		} else {
			readSequence(s, children, rec, invalid, at, addr, ctx.line);
		}
		// GAP-21: `invalid` holds addresses "of its members" - relative to the record (the example shows "status" beside
		// address "#TASK-4"). Nested item members are written relative too (people[2]).
		if (invalid.length) rec.invalid = [...new Set(invalid.map((x) => (addr && x.startsWith(addr + '.') ? x.slice(addr.length + 1) : x)))];
		return rec;
	}

	function checkAttr(decl: AttrDecl, v: any, address: string, line: number, s: Shape): { ok: true; value: any } | { ok: false } {
		if (decl.fields) {
			const items = decl.list ? v : [v];
			if (!Array.isArray(items) || items.some((x) => typeof x !== 'object' || x === null || Array.isArray(x))) {
				F('attribute-type-invalid', 'error', address, `${s.name}: \`${decl.name}\` must be ${decl.list ? 'a list of objects' : 'an object'}`, { name: decl.name, value: v, expected: decl.list ? 'object[]' : 'object' }, line);
				return { ok: false };
			}
			let bad = false;
			const out = items.map((o: any, idx: number) => {
				const r: any = {};
				for (const [fk, fv] of Object.entries(o)) {
					const fd = decl.fields![fk];
					const a2 = decl.list ? `${address}[${idx}].${camel(fk)}` : `${address}.${camel(fk)}`;
					if (!fd) { F('attribute-unknown', 'error', a2, `${s.name}: unknown field \`${fk}\` in \`${decl.name}\``, { name: fk }, line); bad = true; continue; }
					const rr = checkAttr(fd, fv, a2, line, s); if (rr.ok) r[camel(fk)] = rr.value; else bad = true;
				}
				return r;
			});
			// GAP-14: one bad nested member - is the whole attribute refused (left out, listed in `invalid`), or only the
			// nested member? `invalid` "lists the addresses of its members"; chose to keep the good parts and list the member.
			return bad ? { ok: false } : { ok: true, value: decl.list ? out : out[0] };
		}
		let vals: any[] = [v];
		if (decl.list) {
			if (typeof v === 'string') vals = v.split(',').map((x) => x.trim()).filter((x) => x !== ''); // "Lists written as text"
			else if (Array.isArray(v)) vals = v;
		}
		const out: any[] = [];
		for (const x of vals) {
			const p = parseValue(decl.type!, x);
			if (!p.ok) { F('attribute-type-invalid', 'error', address, `${s.name}: \`${decl.name}\` must be ${decl.type} (got ${JSON.stringify(x)})`, { name: decl.name, value: x, expected: decl.type }, line); return { ok: false }; }
			if (decl.matches && !decl.matches.map(String).includes(String(p.value))) {
				F('attribute-value-invalid', 'error', address, `${s.name}: \`${x}\` is not an allowed ${decl.name}`, { name: decl.name, value: x, allowed: decl.matches }, line);
				return { ok: false };
			}
			out.push(p.value);
		}
		return { ok: true, value: decl.list ? out : out[0] };
	}

	function nodeKind(n: any): string[] {
		const k: string[] = [];
		if (n.type === 'paragraph') {
			k.push('paragraph');
			const inl = n.children[0]?.children ?? [];
			if (inl.length === 1 && inl[0].type === 'image') k.push('image');
		} else if (n.type === 'heading') k.push('heading', `heading:${n.attributes.level}`);
		else if (n.type === 'list') k.push('list', n.attributes.ordered ? 'list:ordered' : 'list:unordered');
		else if (n.type === 'tag') k.push('tag', `tag:${n.tag}`, n.tag);
		else if (['fence', 'blockquote', 'table', 'hr', 'image'].includes(n.type)) k.push(n.type);
		return k;
	}
	function matches(f: FieldDecl, n: any) {
		const kinds = nodeKind(n);
		return startSet(f).some((m) => m === 'any' || kinds.includes(m));
	}
	function slice(n: any): string {
		return lines.slice(n.lines[0], n.lines[n.lines.length - 1]).join('\n').replace(/\n+$/, '');
	}
	function richText(nodes: any[], inline: boolean, fieldAddr: string): any {
		// GAP-15: rich text `text` - how are blocks and list items joined? The example joins with one space. Chose that.
		const md = inline ? nodes.map((n) => slice(n).replace(/^#{1,6}\s+/, '')).join('\n\n') : nodes.map(slice).join('\n\n');
		const text = nodes.map((n) => plainNode(n).replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');
		const shapes: any[] = [];
		const counts = new Map<string, number>();
		for (const n of nodes) {
			scanInline(n, fieldAddr, doc);
			if (n.type === 'tag') {
				const s2 = mq.shapes.get(n.tag);
				const i = counts.get(n.tag) ?? 0; counts.set(n.tag, i + 1);
				if (!s2) { F('shape-unknown', 'error', `${fieldAddr}.${n.tag}`, `no shape defines \`${n.tag}\``, { shape: n.tag }, L(n)); continue; }
				shapes.push(resolveInstance(s2, n.attributes, n.children, { root: false, line: L(n), posAddr: `${fieldAddr}.${n.tag}${i ? `[${i}]` : ''}`, node: n }));
			}
		}
		return { markdown: md, syntax: 'markdoc', text, shapes };
	}
	function deliver(f: FieldDecl, nodes: any[], fieldAddr: string, invalid: string[]): any {
		if (f.items) return nodes.flatMap((n) => readItems(f, n, fieldAddr, invalid));
		if (f.template) {
			const toks = parseTemplate(f.template);
			const parts = stream(nodes[0].children[0]?.children ?? []);
			const r = readTemplate(toks, parts, f.members!);
			if (!r.ok) { F('text-mismatch', 'error', fieldAddr, `${f.name}: the node does not fit \`${f.template}\``, { name: f.name, value: plain(parts) }, L(nodes[0])); invalid.push(f.name); return undefined; }
			return typeMembers(r.values, f.members!, fieldAddr, L(nodes[0]), invalid);
		}
		const as = f.as ?? 'block';
		if (as === 'text') return nodes.map((n) => plainNode(n).trim()).join(' ');
		if (as === 'inline' || as === 'block') return richText(nodes, as === 'inline', fieldAddr);
		const raw = nodes.map((n) => plainNode(n).trim()).join(' ');
		const p = parseValue(as, raw);
		if (!p.ok) { F('attribute-type-invalid', 'error', fieldAddr, `${f.name} must be a ${as}`, { name: f.name, value: raw, expected: as }, L(nodes[0])); return undefined; }
		return p.value;
	}
	function typeMembers(vals: Record<string, Part[]>, members: Record<string, any>, base: string, line: number, invalid: string[]) {
		const r: any = {};
		for (const [k, ps] of Object.entries(vals)) {
			const d = members[k] ?? {};
			const txt = plain(ps).trim();
			if (d.as === 'ref') {
				const tag = ps.find((p) => p.k === 'tag') as any;
				const val = tag ? String(tag.node.attributes.primary) : txt;
				r[camel(k)] = val;
				doc.refFields.push({ address: `${base}.${camel(k)}`, value: val, to: d.to ?? [], line, field: k });
				continue;
			}
			const as = d.matches ? 'string' : d.as === 'inline' ? 'string' : d.as ?? 'string';
			// GAP-16: an `as: inline` template member - a rich-text value, or the text? Records.md says inline is rich text;
			// a placeholder's parts are not nodes we can slice. Chose plain text.
			const p = parseValue(as === 'text' ? 'string' : as, txt);
			if (!p.ok || (d.matches && !d.matches.includes(txt))) {
				F(d.matches ? 'attribute-value-invalid' : 'attribute-type-invalid', 'error', `${base}.${camel(k)}`, `${k}: ${JSON.stringify(txt)} is not allowed`, { name: k, value: txt, ...(d.matches ? { allowed: d.matches } : { expected: as }) }, line);
				invalid.push(`${base}.${camel(k)}`);
				continue;
			}
			r[camel(k)] = p.value;
		}
		return r;
	}
	function readItems(f: FieldDecl, n: any, base: string, invalid: string[]): any[] {
		const im = f.items!;
		if (n.type === 'fence') {
			// "an item model reads its members `language`, its info-string attributes by name, and `content`"
			// GAP-17: Markdoc drops info-string attributes (`js label="Server"`); we re-read the fence's opening line.
			const open = lines[n.lines[0]];
			const attrs: any = { language: n.attributes.language, content: n.attributes.content };
			for (const mm of open.matchAll(/(\w+)="([^"]*)"/g)) attrs[mm[1]] = mm[2];
			const r: any = {};
			for (const [k, d] of Object.entries<any>(im.members)) {
				if (attrs[k] === undefined) { if (!d.optional) { F('content-missing', 'error', base, `${k} is missing`, { name: k }, L(n)); invalid.push(base); } continue; }
				r[camel(k)] = attrs[k];
			}
			return [r];
		}
		if (n.type !== 'list') return [];
		const out: any[] = [];
		const keys = new Set<string>();
		n.children.forEach((item: any, idx: number) => {
			const inl = item.children.find((c: any) => c.type === 'inline' || c.type === 'paragraph');
			const inlineKids = inl?.type === 'paragraph' ? inl.children[0].children : inl?.children ?? [];
			const line = L(item);
			const ia = `${base}[${idx}]`;
			if (im.single) {
				const d = im.single;
				const tag = inlineKids.find((c: any) => c.type === 'tag');
				const val = tag ? String(tag.attributes.primary) : plainNode({ children: inlineKids }).trim();
				if (d.as === 'ref') doc.refFields.push({ address: ia, value: val, to: d.to ?? [], line, field: f.name });
				out.push(val);
				return;
			}
			if (im.template) {
				const r = readTemplate(parseTemplate(im.template), stream(inlineKids), im.members);
				if (!r.ok) { F('text-mismatch', 'error', ia, `item does not fit \`${im.template}\``, { name: f.name, value: plainNode({ children: inlineKids }) }, line); invalid.push(ia); out.push({}); return; }
				const rec = typeMembers(r.values, im.members, ia, line, invalid);
				for (const [k, d] of Object.entries<any>(im.members)) if (!d.optional && !(camel(k) in rec) && !r.values[k]) { F('content-missing', 'error', `${ia}.${camel(k)}`, `${k} is missing`, { name: k }, line); }
				// GAP-18: an item's key is `key:`; addresses then use ["key"]. Our items have no key; index addresses.
				out.push(rec);
				return;
			}
			// parts: each field takes the first part of its kind not yet taken
			const rec: any = {};
			let rest = [...inlineKids];
			for (const [k, d] of Object.entries<any>(im.members)) {
				if (d.match === 'task') {
					const t = rest[0]?.type === 'text' ? /^\[( |x|X)\]\s*/.exec(rest[0].attributes.content) : null;
					if (t) { rec[camel(k)] = t[1] !== ' '; rest[0] = { ...rest[0], attributes: { content: rest[0].attributes.content.slice(t[0].length) } }; }
					else if (!d.optional) F('content-missing', 'error', `${ia}.${camel(k)}`, `${k} is missing`, { name: k }, line);
					continue;
				}
				const kind = d.match ?? 'text';
				const j = rest.findIndex((c: any) => c.type === kind);
				if (j < 0) { if (!d.optional) F('content-missing', 'error', `${ia}.${camel(k)}`, `${k} is missing`, { name: k }, line); continue; }
				rec[camel(k)] = plainNode(rest[j]).trim();
				rest.splice(j, 1);
			}
			if (im.key) { const kv = String(rec[camel(im.key)]); if (keys.has(kv)) F('key-duplicate', 'error', ia, `two items keyed ${kv}`, { name: im.key, value: kv }, line); keys.add(kv); }
			out.push(rec);
		});
		return out;
	}
	function readSequence(s: Shape, children: any[], rec: any, invalid: string[], at: (m: string) => string, shapeAddr: string, lineHint: number) {
		const nodes = children.filter((c) => !(c.type === 'paragraph' && plainNode(c).trim() === '') && c.type !== 'comment');
		let cur = 0;
		for (const f of s.sequence!) {
			const taken: any[] = [];
			while (cur < nodes.length && matches(f, nodes[cur])) {
				taken.push(nodes[cur++]);
				if (!f.repeat) break;
			}
			const fa = at(camel(f.name));
			if (!taken.length) {
				if (!f.optional) {
					F('content-missing', 'error', fa, `${s.name}.${f.name}: needs a ${f.match}`, { name: f.name, shape: s.name, expected: f.match }, nodes[cur] ? L(nodes[cur]) : lineHint);
					invalid.push(camel(f.name));
				}
				continue;
			}
			const v = deliver(f, taken, fa, invalid);
			if (v !== undefined) rec[camel(f.name)] = v;
		}
		for (; cur < nodes.length; cur++) {
			const n = nodes[cur];
			// "Content no field claimed has no field address: its finding reports the shape's address plus a source range"
			F('content-unmatched', 'warning', shapeAddr, `${s.name}: a ${n.type} matches no field and would be dropped`, { shape: s.name }, L(n));
		}
	}
	function rawLine() { return fmLines + 1; }
}

function scanInline(n: any, passage: string, doc: Doc) {
	// collect inline tags (ref, reviewed), links and code spans for a corpus layer; Marquise only records them.
	const walk = (x: any, passageLine: number) => {
		const kids = x.children ?? [];
		kids.forEach((c: any, i: number) => {
			const next = kids[i + 1];
			const rev = next?.type === 'tag' && next.tag === 'reviewed' ? String(next.attributes.primary) : undefined;
			const line = (c.lines?.[0] ?? passageLine) + 1;
			if (c.type === 'tag' && c.tag === 'ref') doc.mentions.push({ kind: 'ref', value: String(c.attributes.primary), line, passage, reviewed: c.attributes.reviewed, shapeAddress: passage });
			else if (c.type === 'link') doc.mentions.push({ kind: 'link', value: c.attributes.href, line, passage, reviewed: rev, shapeAddress: passage });
			else if (c.type === 'code') doc.mentions.push({ kind: 'code', value: c.attributes.content, line, passage, reviewed: rev, shapeAddress: passage });
			if (c.type !== 'fence') walk(c, line - 1);
		});
	};
	walk({ children: [n] }, 0);
}

// ---------- data (input schema) ----------
export function validateData(mq: Instance, shapeName: string, file: string, text: string, rootAddress: string): { record: any; findings: Finding[] } {
	// GAP-19: no documented API validates *input data* and returns findings with lines (Standard Schema's validate takes a
	// record, has no lines, and keeps only errors). We use the attribute checks with YAML positions.
	const s = mq.shapes.get(shapeName)!;
	const lc = new LineCounter();
	const d = YAML.parseDocument(text, { version: '1.2', lineCounter: lc });
	const findings: Finding[] = [];
	const rec: any = { shape: s.name, address: rootAddress };
	const invalid: string[] = [];
	const at = (m: string) => (rootAddress ? `${rootAddress}.${m}` : m);
	const root = d.contents;
	const lineOf = (node: any) => (node?.range ? lc.linePos(node.range[0]).line : 1);
	if (!isMap(root)) { findings.push(sf(file, 'data-file-invalid', 'error', rootAddress, 'not an object', {})); return { record: rec, findings }; }
	const byCamel = new Map(Object.values(s.attributes).map((a) => [camel(a.name), a]));
	const seen = new Set<string>();
	for (const pair of root.items) {
		const k = String((pair.key as any).value);
		const line = lineOf(pair.key);
		const decl = byCamel.get(k);
		if (!decl) {
			const kebabMatch = s.attributes[k] && camel(k) !== k;
			findings.push({ ...sf(file, 'attribute-unknown', 'error', at(k), `${s.name}: unknown key \`${k}\``, { name: k, shape: s.name }, line),
				...(kebabMatch ? { fixes: [{ kind: 'rename', address: at(k), to: camel(k) }] } : {}) });
			continue;
		}
		seen.add(decl.name);
		const v = pair.value ? (pair.value as any).toJSON() : null;
		// "Data never takes it": a string for a list is an error
		if (decl.list && !Array.isArray(v)) {
			findings.push(sf(file, 'attribute-type-invalid', 'error', at(k), `${s.name}: \`${k}\` must be a list`, { name: k, value: v, expected: `${decl.type ?? 'object'}[]` }, line));
			invalid.push(k); continue;
		}
		const tmp: Doc = { path: file, findings: [], records: [], mentions: [], refFields: [], source: text };
		const r = checkAttrData(s, decl, v, at(k), line, tmp.findings);
		findings.push(...tmp.findings);
		if (r.ok) rec[k] = r.value; else invalid.push(k);
	}
	for (const a of Object.values(s.attributes)) {
		if (seen.has(a.name)) continue;
		if (a.required) { findings.push(sf(file, 'attribute-missing', 'error', at(camel(a.name)), `${s.name}: \`${a.name}\` is required`, { name: a.name, shape: s.name }, 1)); invalid.push(camel(a.name)); }
		else if (a.default !== undefined) rec[camel(a.name)] = a.default;
	}
	if (invalid.length) rec.invalid = invalid;
	return { record: rec, findings };
}
function checkAttrData(s: Shape, decl: AttrDecl, v: any, address: string, line: number, out: Finding[]): { ok: boolean; value?: any } {
	if (decl.fields) {
		const items = decl.list ? v : [v];
		const res = items.map((o: any, i: number) => {
			const r: any = {};
			for (const [fk, fv] of Object.entries(o ?? {})) {
				const fd = Object.values(decl.fields!).find((x) => camel(x.name) === fk);
				const a = decl.list ? `${address}[${i}].${fk}` : `${address}.${fk}`;
				if (!fd) { out.push(sf('', 'attribute-unknown', 'error', a, `unknown key \`${fk}\``, { name: fk }, line)); continue; }
				const rr = checkAttrData(s, fd, fv, a, line, out); if (rr.ok) r[fk] = rr.value;
			}
			return r;
		});
		return { ok: !out.length, value: decl.list ? res : res[0] };
	}
	const vals = decl.list ? v : [v];
	const res: any[] = [];
	for (const x of vals) {
		// GAP-20: data is "checked against the input schema", a JSON Schema; does a YAML string "4" for an integer pass
		// (value parse, as in Markdown) or fail (JSON Schema)? Chose JSON Schema strictness for data.
		const p = decl.type === 'integer' || decl.type === 'number' ? (typeof x === 'number' ? parseValue(decl.type, x) : { ok: false as const }) : parseValue(decl.type!, x);
		if (!p.ok) { out.push(sf('', 'attribute-type-invalid', 'error', address, `must be ${decl.type}`, { name: decl.name, value: x, expected: decl.type }, line)); return { ok: false }; }
		if (decl.matches && !decl.matches.includes(p.value)) { out.push(sf('', 'attribute-value-invalid', 'error', address, `\`${x}\` is not an allowed ${decl.name}`, { name: decl.name, value: x, allowed: decl.matches }, line)); return { ok: false }; }
		res.push(p.value);
	}
	return { ok: true, value: decl.list ? res : res[0] };
}

export function printFinding(f: Finding): string {
	// "the CLI prints them as `file:line  address`" (validation.md), with severity and id as in its example block.
	return `${f.file}:${f.range.start[0]}  ${f.severity.padEnd(7)}  ${f.id.padEnd(24)}  ${f.address || '(root)'}: ${f.message}`;
}

function editDistance(a: string, b: string): number {
	const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 1; j <= b.length; j++) d[0][j] = j;
	for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
		d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
	return d[a.length][b.length];
}
