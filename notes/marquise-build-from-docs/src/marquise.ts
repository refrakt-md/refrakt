// A thin slice of Marquise, built from marquise/README.md and docs/concepts/*.md only.
// Every place the docs did not say what to build is marked `// GAP-n:` and listed in the report.
import Markdoc from '@markdoc/markdoc';
import { parse as parseYaml } from 'yaml';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type Severity = 'error' | 'warning' | 'info';
export interface Finding {
	id: string;
	severity: Severity;
	message: string;
	file?: string;
	line?: number; // 1-based
	address: string;
	// GAP-1: findings.md / validation.md:17 / schema.md:41 say ids AND parameters are a public contract,
	// but no page lists any finding's parameters. These names are invented.
	params?: Record<string, unknown>;
	fix?: { kind: string; address: string; [k: string]: unknown };
}

// ---------- naming ----------
export const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
export const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const RESERVED = ['shape', 'id', 'address', 'slot', 'lang', 'has', 'all'];
const CEL_RESERVED = ['self', 'actor', 'now', 'today', 'input', 'terminal', 'outcome', 'links', 'entity'];

// ---------- shapes ----------
export interface AttrDecl {
	type?: string;
	matches?: unknown[];
	pattern?: string;
	list?: boolean;
	default?: unknown;
	required?: boolean;
	positional?: boolean;
	as?: string;
	to?: string[];
	fields?: Record<string, AttrDecl>;
	[ns: string]: unknown;
}
export interface FieldDecl {
	match?: string;
	as?: string;
	optional?: boolean;
	repeat?: boolean;
	shadows?: string[];
	items?: any;
	min?: number;
	max?: number;
	[k: string]: unknown;
}
export interface Shape {
	name: string;
	file: string;
	description?: string;
	attributes: Record<string, AttrDecl>;
	content?: { sequence?: Record<string, FieldDecl>; [k: string]: unknown };
	summary?: string[];
	extensions: Record<string, any>; // extending.md:59 "extensions read shape.extensions.<name>"
	raw: Record<string, unknown>;
}

const SHAPE_KEYS = [
	'extends', 'abstract', 'description', 'attributes', 'content', 'rules', 'preprocess', 'checks', 'computes',
	'prepare', 'compact', 'migrations', 'summary', 'plain', 'strict', 'requires', 'provides', 'dimensions',
];
const ATTR_KEYS = ['type', 'matches', 'pattern', 'list', 'default', 'required', 'positional', 'as', 'to', 'fields'];
// GAP-2: there is no single list of attribute `type` values. records.md:60-68 lists value types
// (number, integer, boolean, date, datetime, url, duration) but not `string`, which every example uses;
// references add `ref`. This union is my guess.
const ATTR_TYPES = ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'url', 'duration', 'ref'];
const FIELD_KEYS = [
	'match', 'as', 'optional', 'repeat', 'group', 'position', 'min', 'max', 'items', 'key', 'heading',
	'deprecated', 'content', 'template', 'shadows', 'matches', 'to', 'format', 'pattern', 'plain',
];

export interface HostOptions {
	// GAP-3: extending.md:57-59 says "each extension registers a schema for its namespace" and that an
	// uninstalled namespace is `namespace-unknown`, but no API for registering one exists in api.md, and
	// README shows createMarquise() called BEFORE createRiviere(), on an immutable instance (api.md:69).
	// I pass the namespace names into createMarquise up front.
	namespaces?: string[];
}

export class Marquise {
	shapes = new Map<string, Shape>();
	invalid = new Set<string>();
	findings: Finding[] = [];
	constructor(public host: HostOptions = {}) {}

	loadShapeFile(file: string, source: string) {
		const ast = Markdoc.parse(source);
		const fm = (parseYaml(String(ast.attributes.frontmatter ?? '')) ?? {}) as Record<string, any>;
		// GAP-4: the shape's name is never stated to come from the file name; overview.md:12 only says
		// "Define a `recipe` shape in `shapes/recipe.md`". I take the basename.
		const name = path.basename(file, '.md');
		const f = (id: string, severity: Severity, message: string, address = name, params?: any) =>
			this.findings.push({ id, severity, message, file, line: 1, address, params });
		const ns = new Set(this.host.namespaces ?? []);
		const extensions: Record<string, any> = {};
		for (const k of Object.keys(fm)) {
			if (SHAPE_KEYS.includes(k)) continue;
			if (ns.has(k)) { extensions[k] = fm[k]; continue; }
			// GAP-5: an unknown top-level key that is not a namespace: is it `shape-key-unknown` (error) or
			// an uninstalled namespace (`namespace-unknown`, info)? Syntactically they are the same. I treat
			// any key that is not core as an uninstalled namespace unless it is camelCase.
			f('namespace-unknown', 'info', `${name}: namespace \`${k}\` is not installed; its data passes through`, name, { namespace: k });
			extensions[k] = fm[k];
		}
		if (fm.rules) {
			// validation.md:295: rules need @marquise-md/selectors; not installed in this slice
			f('capability-unavailable', 'error', `${name}: \`rules\` needs @marquise-md/selectors`, name, { key: 'rules', package: '@marquise-md/selectors' });
		}
		const attributes: Record<string, AttrDecl> = fm.attributes ?? {};
		const seen = new Map<string, string>();
		const checkName = (n: string, where: string) => {
			if (/[A-Z]/.test(n)) f('name-camelcase', 'warning', `${name}: \`${n}\` is camelCase`, `${name}.${camel(n)}`);
			if (RESERVED.includes(n) || CEL_RESERVED.includes(n)) f('name-collision', 'error', `${name}: \`${n}\` is reserved`, `${name}.${n}`, { name: n });
			const c = camel(n);
			if (seen.has(c)) f('name-collision', 'error', `${name}: \`${n}\` collides with \`${seen.get(c)}\``, `${name}.${c}`, { name: n, other: seen.get(c) });
			seen.set(c, n);
			void where;
		};
		for (const [an, a] of Object.entries(attributes)) {
			checkName(an, 'attribute');
			for (const k of Object.keys(a)) {
				if (!ATTR_KEYS.includes(k) && !ns.has(k)) f('shape-key-unknown', 'error', `${name}.${an}: unknown key \`${k}\``, `${name}.${camel(an)}`, { key: k });
			}
			if (a.type && !ATTR_TYPES.includes(a.type)) f('shape-key-unknown', 'error', `${name}.${an}: unknown type \`${a.type}\``, `${name}.${camel(an)}`, { type: a.type });
		}
		const seq = fm.content?.sequence as Record<string, FieldDecl> | undefined;
		if (fm.content && !seq) {
			// only `sequence` is implemented in this slice
			f('shape-key-unknown', 'info', `${name}: only content.sequence is implemented in this slice`, name);
		}
		if (seq) {
			for (const [fname, fd] of Object.entries(seq)) {
				checkName(fname, 'field');
				for (const k of Object.keys(fd)) if (!FIELD_KEYS.includes(k) && !ns.has(k)) f('shape-key-unknown', 'error', `${name}.${fname}: unknown key \`${k}\``, `${name}.${camel(fname)}`, { key: k });
			}
			this.analyse(name, file, seq);
		}
		const shape: Shape = { name, file, description: fm.description, attributes, content: fm.content, summary: fm.summary, extensions, raw: fm };
		// body: only {% example %} blocks (shapes.md:384-395)
		const examples: any[] = [];
		for (const node of ast.children) {
			if (node.type === 'tag' && node.tag === 'example') examples.push(node);
			else if (node.type !== 'comment') f('definition-loose-content', 'error', `${name}: content outside an example block`, name, { line: (node.lines?.[0] ?? 0) + 1 });
		}
		// api.md:73 "A shape with error findings is left out, and its tags get shape-invalid"
		// GAP-41: do findings from the shape's own examples count as the shape's error findings (which would
		// remove a shape because a demo is wrong)? I check errors before examples run.
		if (this.findings.some((x) => x.file === file && x.severity === 'error')) { this.invalid.add(name); return; }
		this.shapes.set(name, shape);
		// GAP-6: examples must be validated (shapes.md:390) with `expect` listing expected findings, but the
		// form of `expect` (ids? id@address? a list or a string?) is not given. I accept a comma string of ids.
		for (const ex of examples) {
			const exSrc = source.split('\n').slice(ex.lines[1], ex.lines[ex.lines.length - 2]).join('\n');
			const doc = this.load(exSrc, { path: `${file}#${ex.attributes.id ?? 'example'}` });
			const expect = String(ex.attributes.expect ?? '').split(',').map((s) => s.trim()).filter(Boolean);
			for (const df of doc.findings) {
				if (!expect.includes(df.id)) f('example-failed', 'error', `${name}: example #${ex.attributes.id} gives ${df.id}: ${df.message}`, name, { example: ex.attributes.id, finding: df.id });
				// GAP-7: no finding id exists for "an example produced an unexpected finding" ("broken examples"
				// are listed under validation.md:290 but have no id in findings.md). `example-failed` is invented.
			}
		}
	}

	loadShapesDir(dir: string) {
		for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort())
			this.loadShapeFile(path.join(dir, f), fs.readFileSync(path.join(dir, f), 'utf8'));
	}

	// content-models.md:51-62 shape analysis
	private analyse(shape: string, file: string, seq: Record<string, FieldDecl>) {
		const entries = Object.entries(seq);
		const canStart = (m = 'any') => new Set(m.split('|').map((s) => s.trim()));
		const overlaps = (a: string | undefined, b: string | undefined) => {
			const A = canStart(a), B = canStart(b);
			if (A.has('any') || B.has('any')) return true;
			for (const x of A) for (const y of B) {
				if (x === y) return true;
				// heading overlaps heading:2; list overlaps list:ordered
				if (x.split(':')[0] === y.split(':')[0] && (!x.includes(':') || !y.includes(':'))) return true;
				if ((x === 'image' && y === 'paragraph') || (x === 'paragraph' && y === 'image')) return true; // content-models.md:39
			}
			return false;
		};
		entries.forEach(([n, fd], i) => {
			const acknowledged = new Set(fd.shadows ?? []);
			const used = new Set<string>();
			// unreachable: an earlier repeating `any` field takes everything (content-models.md:31)
			for (let k = 0; k < i; k++) {
				const [, prev] = entries[k];
				if (prev.repeat && canStart(prev.match).has('any'))
					this.findings.push({ id: 'field-unreachable', severity: 'error', message: `${shape}.${n}: \`${entries[k][0]}\` takes every node first`, file, line: 1, address: `${shape}.${camel(n)}` });
			}
			if (!fd.optional) return;
			// GAP-8: "an optional field takes what a later field could start with" (content-models.md:58). Which
			// later fields? All of them, or only those reachable when this one is empty (up to the next required
			// field that would itself take the node)? I check later fields up to and including the first required one.
			for (let j = i + 1; j < entries.length; j++) {
				const [ln, later] = entries[j];
				if (overlaps(fd.match, later.match)) {
					if (acknowledged.has(ln)) { used.add(ln); this.findings.push({ id: 'field-shadowed', severity: 'info', message: `${shape}.${n} shadows ${ln} (acknowledged)`, file, line: 1, address: `${shape}.${camel(n)}`, params: { field: n, shadowed: ln } }); }
					else this.findings.push({ id: 'field-shadowed', severity: 'error', message: `${shape}.${n}: takes what \`${ln}\` could start with; acknowledge with shadows: [${ln}] or use an explicit slot`, file, line: 1, address: `${shape}.${camel(n)}`, params: { field: n, shadowed: ln } });
				}
				if (!later.optional) break;
			}
			for (const s of acknowledged) if (!used.has(s)) this.findings.push({ id: 'shadows-unused', severity: 'warning', message: `${shape}.${n}: shadows \`${s}\` but there is no overlap`, file, line: 1, address: `${shape}.${camel(n)}` });
		});
	}

	load(source: string, opts: { path: string }) {
		return new MarquiseDocument(this, source, opts.path);
	}
}

// ---------- values ----------
export function parseValue(type: string | undefined, raw: unknown): { ok: true; value: unknown } | { ok: false; reason: string } {
	if (type === undefined || type === 'string' || type === 'ref') {
		// GAP-9: the JSON form of a reference in a record is never given. records.md's value-type table has
		// no `ref` row; Rivière's types say `Ref<'spec'>` with `.resolve()`. I keep the written string.
		if (typeof raw === 'string') return { ok: true, value: raw.normalize('NFC') };
		return { ok: false, reason: 'must be a string' };
	}
	if (type === 'integer' || type === 'number') {
		const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
		if (Number.isNaN(n) || (type === 'integer' && !Number.isInteger(n))) return { ok: false, reason: `must be ${type === 'integer' ? 'an integer' : 'a number'}` };
		return { ok: true, value: n };
	}
	if (type === 'boolean') return typeof raw === 'boolean' ? { ok: true, value: raw } : { ok: false, reason: 'must be true or false' };
	if (type === 'date') return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? { ok: true, value: raw } : { ok: false, reason: 'must be a date' };
	return { ok: true, value: raw };
}

// ---------- documents ----------
export interface Instance {
	shape: string;
	id?: string;
	address: string;
	line: number;
	record: Record<string, any>;
	attrTypes: Record<string, AttrDecl>; // camelCase name -> declaration
	ordinal: number; // index among instances of this shape in the document
}

export class MarquiseDocument {
	findings: Finding[] = [];
	instances: Instance[] = [];
	private lines: string[];
	constructor(private mq: Marquise, private source: string, public path: string) {
		this.lines = source.split('\n');
		const ast = Markdoc.parse(source);
		const counts = new Map<string, number>();
		const walk = (nodes: any[]) => {
			for (const n of nodes) {
				if (n.type === 'tag') {
					const shape = mq.shapes.get(n.tag);
					if (!shape && mq.invalid.has(n.tag)) {
						this.findings.push({ id: 'shape-invalid', severity: 'error', message: `shape \`${n.tag}\` has error findings and was left out`, file: path, line: n.lines[0] + 1, address: n.tag });
						walk(n.children);
						continue;
					}
					if (!shape) {
						this.findings.push({ id: 'shape-unknown', severity: 'error', message: `no shape defines \`${n.tag}\``, file: path, line: n.lines[0] + 1, address: n.tag });
						walk(n.children);
						continue;
					}
					const ord = counts.get(n.tag) ?? 0;
					counts.set(n.tag, ord + 1);
					this.resolve(shape, n, ord);
					// nested shapes inside fields would go in `shapes` of rich text; not walked further here
				} else if (n.children?.length) walk(n.children);
			}
		};
		walk(ast.children);
	}

	records() {
		return this.instances.map((i) => i.record);
	}

	private resolve(shape: Shape, node: any, ordinal: number) {
		const line = node.lines[0] + 1;
		const attrs = { ...node.attributes } as Record<string, unknown>;
		const id = typeof attrs.id === 'string' ? attrs.id : undefined;
		// writing.md:31 "The most stable address is reported: an id, then a key, then an index."
		// GAP-10: an index among what? The tag's siblings, every instance of the shape in the document, or
		// top-level only? And is index 0 written (`hero[0]`) or omitted (`hero`)? writing.md:15-16 shows
		// `hero.headline` and `hero[1].align`. I count every instance of the shape in document order and omit [0].
		const address = id ? (/^[A-Za-z0-9_-]+$/.test(id) ? `#${id}` : `#"${id}"`) : ordinal === 0 ? shape.name : `${shape.name}[${ordinal}]`;
		const record: Record<string, any> = { shape: shape.name };
		if (id) record.id = id;
		// GAP-11: records.md:6-23 and getting-started.md:369 show top-level records without `address`;
		// records.md:132 shows a nested record with one. I include it on every record.
		record.address = address;
		const push = (fid: string, severity: Severity, message: string, at: string, params?: any, l = line) =>
			this.findings.push({ id: fid, severity, message, file: this.path, line: l, address: at, params });
		delete attrs.id;
		delete attrs.class; // GAP-12: Markdoc's `.class` shorthand is never mentioned; ignored.
		const attrTypes: Record<string, AttrDecl> = {};
		for (const [an, decl] of Object.entries(shape.attributes)) {
			const cn = camel(an);
			attrTypes[cn] = decl;
			// validation.md:241 / writing.md:42: message uses source name, address the data name
			const at = `${address}.${cn}`;
			const raw = attrs[an];
			delete attrs[an];
			if (raw === undefined) {
				if (decl.required) push('attribute-missing', 'error', `${shape.name}: missing required attribute \`${an}\``, at, { attribute: an });
				else if (decl.default !== undefined) record[cn] = decl.default;
				continue;
			}
			let items: unknown[] | undefined;
			if (decl.list) {
				// records.md:100 the string form is split on commas, each item trimmed
				items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter((s) => s !== '') : [raw];
				// GAP-13: is an empty item (`"a,,b"`) or the empty string an empty list, an error, or [""]? I drop empties.
			}
			const check = (v: unknown, idx?: number): unknown => {
				const sub = idx === undefined ? at : `${at}[${idx}]`;
				const p = parseValue(decl.type, v);
				if (!p.ok) { push('attribute-type-invalid', 'error', `${shape.name}.${an}: ${p.reason} (got ${JSON.stringify(v)})`, sub, { attribute: an, got: v, expected: decl.type }); return undefined; }
				if (decl.matches && !decl.matches.includes(p.value)) {
					// GAP-14: findings.md:426 uses ONE id, attribute-type-invalid, for both "wrong type" and "not among
					// matches"; a consumer cannot tell them apart without a parameter, which is not specified.
					push('attribute-type-invalid', 'error', `${shape.name}.${an}: must be one of ${decl.matches.join(', ')} (got ${JSON.stringify(v)})`, sub, { attribute: an, got: v, allowed: decl.matches });
					// validation.md:259: suggested fix when one allowed value is a close match; not implemented
					return undefined;
				}
				return p.value;
			};
			// GAP-39: an invalid value: is it absent from the record, kept as written, or does the whole record
			// fail? records.md:232 "records arrive with findings" does not say. I drop the value (and no default applies).
			const value = items ? items.map((v, i) => check(v, i)).filter((v) => v !== undefined) : check(raw);
			if (value !== undefined) record[cn] = value;
		}
		for (const an of Object.keys(attrs)) push('attribute-unknown', 'error', `${shape.name}: unknown attribute \`${an}\``, address, { attribute: an });
		// content model: sequence only
		const seq = shape.content?.sequence;
		if (seq) {
			// content-models.md:26 cursor skips comments and blank text
			const children = (node.children as any[]).filter((c) => c.type !== 'comment' && !(c.type === 'paragraph' && this.text(c).trim() === ''));
			let cur = 0;
			for (const [fname, fd] of Object.entries(seq)) {
				const cn = camel(fname);
				const taken: any[] = [];
				while (cur < children.length && this.matches(fd.match ?? 'any', children[cur])) {
					taken.push(children[cur++]);
					if (!fd.repeat) break;
				}
				if (!taken.length) {
					// GAP-15: is a `repeat` field without `optional` required to take at least one node? The callout
					// in shapes.md:278 (`body: { match: any, repeat: true }`) would then make an empty callout an error.
					// I treat repeat without optional as required (>= 1).
					if (!fd.optional) push('content-missing', 'error', `${shape.name}.${fname}: needs ${this.describe(fd.match)}`, `${address}.${cn}`, { field: fname, match: fd.match }, children[cur] ? children[cur].lines[0] + 1 : line);
					continue;
				}
				record[cn] = this.deliver(fd, taken);
			}
			for (const left of children.slice(cur))
				// writing.md:37 "Content no field claimed ... reports the shape's address plus a source range"
				push('content-unmatched', 'warning', `${shape.name}: a ${left.type} matches no field and would be dropped`, address, { node: left.type, range: [left.lines[0] + 1, left.lines[left.lines.length - 1]] }, left.lines[0] + 1);
		}
		this.instances.push({ shape: shape.name, id, address, line, record, attrTypes, ordinal });
	}

	private describe(m = 'any') {
		return m === 'any' ? 'content' : m.startsWith('heading') ? 'a heading' : `a ${m}`;
	}

	private matches(match: string, n: any): boolean {
		return match.split('|').some((m) => {
			const [kind, arg] = m.trim().split(':');
			if (kind === 'any') return true;
			if (kind === 'heading') return n.type === 'heading' && (!arg || String(n.attributes.level) === arg);
			if (kind === 'paragraph') return n.type === 'paragraph';
			if (kind === 'list') return n.type === 'list' && (!arg || (arg === 'ordered') === !!n.attributes.ordered);
			if (kind === 'image') return n.type === 'image' || (n.type === 'paragraph' && this.onlyImage(n));
			if (kind === 'tag') return n.type === 'tag' && n.tag === arg;
			return false;
		});
	}
	private onlyImage(p: any) {
		const inl = p.children?.[0]?.children ?? [];
		const sig = inl.filter((c: any) => !(c.type === 'text' && c.attributes.content.trim() === ''));
		return sig.length === 1 && sig[0].type === 'image';
	}
	private text(n: any): string {
		if (n.type === 'text') return n.attributes.content;
		if (n.type === 'softbreak') return ' ';
		if (n.type === 'code') return n.attributes.content;
		return (n.children ?? []).map((c: any) => this.text(c)).join(n.type === 'list' || n.type === 'document' ? ' ' : '');
	}
	private src(nodes: any[], inline: boolean) {
		const first = nodes[0].lines[0];
		const last = nodes[nodes.length - 1].lines[nodes[nodes.length - 1].lines.length - 1];
		let s = this.lines.slice(first, last).join('\n').trim();
		// GAP-16: for `as: inline` from a heading, is rich text's `markdown` the heading with or without its
		// `#` marker? The docs say the field delivers "the element's inline content only" but records.md
		// describes `markdown` as "the source as written". I strip the marker.
		if (inline && nodes[0].type === 'heading') s = s.replace(/^#{1,6}\s+/, '');
		return s;
	}
	private deliver(fd: FieldDecl, nodes: any[]) {
		const as = fd.as ?? 'block';
		if (as === 'text') return nodes.map((n) => this.text(n)).join(' ').trim();
		if (as === 'block' || as === 'inline') {
			// GAP-17: a `repeat` block field delivers one rich-text value or a list of them? records.md:17-22
			// shows `method` as ONE value holding several paragraphs; nothing states it. I join them.
			return {
				markdown: this.src(nodes, as === 'inline'),
				syntax: 'markdoc',
				text: nodes.map((n) => this.text(n)).join(' ').trim(),
				shapes: [], // nested shapes not resolved in this slice
			};
		}
		const p = parseValue(as, this.text(nodes[0]));
		return p.ok ? p.value : undefined;
	}
}
