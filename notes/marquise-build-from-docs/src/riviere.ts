// A thin slice of Rivière, built from riviere/README.md and docs/concepts/*.md only.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Marquise, Finding, Severity, camel, parseValue, AttrDecl, Shape } from './marquise.ts';
import { parseSelector, evaluate, Resolver, Reached, SelectorError } from './selectors.ts';

export interface CollectionConfig {
	shape: string;
	include: string | string[];
	path?: string | string[];
	id?: string | { from: string };
	formerIds?: string;
	names?: string[];
	ids?: 'corpus';
}
export interface RiviereConfig { collections: Record<string, CollectionConfig>; timezone?: string }

export interface Entity {
	collection: string;
	id: string;
	address: string; // location: file#id
	file: string;
	line: number;
	ordinal: number;
	record: Record<string, any>;
	links: Record<string, Entity[]>;
	attrTypes: Record<string, AttrDecl>;
	formerIds: string[];
}
export interface Edge { from: Entity; field: string; at: string; written: string; to?: Entity }

// corpus.md:60 the fixed slug rule: NFC, lower case, every run of non letters/digits becomes `-`
export const slug = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
// GAP-18: "every run ... becomes `-`" says nothing about leading/trailing runs ("Ada Lovelace." -> "ada-lovelace-"?). I trim them.

function globToRe(g: string) {
	return new RegExp('^' + g.split('**/').map((p) => p.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')).join('(?:.*/)?') + '$');
}
function listFiles(root: string, dir = ''): string[] {
	const out: string[] = [];
	for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
		const rel = dir ? `${dir}/${e.name}` : e.name;
		if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...listFiles(root, rel)); }
		else out.push(rel);
	}
	return out.sort();
}

export class Snapshot {
	findings: Finding[] = [];
	entities: Entity[] = [];
	edges: Edge[] = [];
	private byKey = new Map<string, Entity[]>();
	constructor(public config: RiviereConfig, public mq: Marquise, public root: string) {}

	key(collection: string, id: string) { return `${collection}:${id}`; }
	private shapeOf(e: Entity): Shape { return this.mq.shapes.get(this.config.collections[e.collection].shape)!; }
	private push(id: string, severity: Severity, message: string, file: string | undefined, line: number | undefined, address: string, params?: any, fix?: any) {
		this.findings.push({ id, severity, message, file, line, address, params, fix });
	}

	load() {
		const files = listFiles(this.root);
		const claimed = new Map<string, string>(); // instance location -> collection
		for (const [cname, cc] of Object.entries(this.config.collections)) {
			const shape = this.mq.shapes.get(cc.shape);
			if (!shape) { this.push('config-unregistered', 'error', `collection ${cname}: no shape \`${cc.shape}\``, 'riviere.config.json', undefined, cname); continue; }
			// GAP-19: no finding id for "a collection names a shape that does not exist". config-unregistered is
			// for code names; I reuse it.
			const globs = (Array.isArray(cc.include) ? cc.include : [cc.include]).map(globToRe);
			for (const f of files.filter((f) => globs.some((g) => g.test(f)))) {
				const src = fs.readFileSync(path.join(this.root, f), 'utf8');
				if (f.endsWith('.md')) this.loadMarkdown(cname, cc, f, src, claimed);
				else if (/\.(ya?ml|json)$/.test(f)) this.loadData(cname, cc, shape, f, src);
			}
		}
		this.index();
		this.resolveRefs();
		this.inverses();
		this.rules();
		return this;
	}

	private add(e: Entity) {
		this.entities.push(e);
		const k = this.key(e.collection, e.id);
		const list = this.byKey.get(k) ?? [];
		list.push(e);
		this.byKey.set(k, list);
	}

	private loadMarkdown(cname: string, cc: CollectionConfig, file: string, src: string, claimed: Map<string, string>) {
		const doc = this.mq.load(src, { path: file });
		this.findings.push(...doc.findings);
		for (const inst of doc.instances.filter((i) => i.shape === cc.shape)) {
			// GAP-20: `extends` (a collection of a base collects descendants) is not implemented; exact shape only.
			let id = inst.id;
			if (!id && typeof cc.id === 'object') id = slug(String(inst.record[camel(cc.id.from.split('.').pop()!)] ?? ''));
			// GAP-21: `id: { from: 'term.name' }` is written as `shape.field` in corpus.md:54 but `{ from: 'name' }` in
			// corpus.md:136. Is the shape prefix required, optional, or a path into nested fields? I take the last segment.
			if (!id) { this.push('entity-id-missing', 'error', `${cc.shape}: an instance in ${cname}'s files has no id`, file, inst.line, inst.address); continue; }
			const loc = `${file}#${inst.ordinal}:${inst.shape}`;
			if (claimed.has(loc)) { this.push('collection-overlap', 'error', `claimed by ${claimed.get(loc)} and ${cname}`, file, inst.line, inst.address); continue; }
			claimed.set(loc, cname);
			const former = cc.formerIds ? (inst.record[camel(cc.formerIds)] ?? []) : [];
			this.add({ collection: cname, id, address: `${file}#${id}`, file, line: inst.line, ordinal: inst.ordinal, record: inst.record, links: {}, attrTypes: inst.attrTypes, formerIds: former });
		}
	}

	private loadData(cname: string, cc: CollectionConfig, shape: Shape, file: string, src: string) {
		const lines = src.split('\n');
		const lineOf = (key: string) => { const i = lines.findIndex((l) => new RegExp(`^\\s*-?\\s*${key}\\s*:`).test(l)); return i < 0 ? 1 : i + 1; };
		let data: any;
		try { data = file.endsWith('.json') ? JSON.parse(src) : parseYaml(src); } catch (e) {
			// GAP-22: no finding id for a data file that does not parse.
			this.push('data-file-invalid', 'error', `cannot parse: ${(e as Error).message}`, file, 1, file); return;
		}
		// corpus.md:140-142: a list gives one entity per item; "a map gives one entity per key, the key being the id".
		// GAP-23: a single record (`team/ada.yaml`, corpus.md:128) IS a YAML map. How is "one record" told apart from
		// "a map of records"? I treat it as a map of records only when every value is an object and no key is a
		// declared attribute of the shape.
		let items: { obj: any; keyId?: string }[];
		const attrNames = Object.keys(shape.attributes);
		if (Array.isArray(data)) items = data.map((obj) => ({ obj }));
		else if (data && typeof data === 'object' && Object.values(data).every((v) => v && typeof v === 'object' && !Array.isArray(v)) && !Object.keys(data).some((k) => attrNames.includes(k)))
			items = Object.entries(data).map(([k, obj]) => ({ obj, keyId: k }));
		else items = [{ obj: data }];
		items.forEach(({ obj, keyId }, ordinal) => {
			let id = keyId ?? (typeof obj.id === 'string' ? obj.id : undefined);
			if (!id && typeof cc.id === 'object') id = slug(String(obj[cc.id.from.split('.').pop()!] ?? ''));
			const address = id ? `${file}#${id}` : file;
			if (!id) { this.push('entity-id-missing', 'error', `an entry in ${file} has no id`, file, 1, address); return; }
			// corpus.md:139 "Validated against the shape's input schema, with findings carrying lines and the same addresses."
			// GAP-24: which finding ids does input-schema validation of data produce? The catalogue's ids are about
			// "attributes" written on tags. I reuse attribute-missing / attribute-type-invalid / attribute-unknown.
			const record: Record<string, any> = { shape: shape.name, id };
			const attrTypes: Record<string, AttrDecl> = {};
			for (const [an, decl] of Object.entries(shape.attributes)) {
				const cn = camel(an);
				attrTypes[cn] = decl;
				// GAP-25: does a data file use the shape's kebab-case names or the input schema's camelCase names?
				// records.md says inputs are the record's data names (camelCase). I accept both.
				const raw = obj[an] ?? obj[cn];
				const at = `${address}.${cn}`;
				if (raw === undefined) {
					if (decl.required) this.push('attribute-missing', 'error', `${shape.name}: missing \`${an}\``, file, 1, at, { attribute: an });
					else if (decl.default !== undefined) record[cn] = decl.default;
					continue;
				}
				// records.md:104 "Data never takes it: ... a string for a list is an error."
				if (decl.list && !Array.isArray(raw)) { this.push('attribute-type-invalid', 'error', `${shape.name}.${an}: must be a list (got ${JSON.stringify(raw)})`, file, lineOf(an), at, { attribute: an, got: raw }); continue; }
				const vals = decl.list ? raw : [raw];
				const ok: unknown[] = [];
				vals.forEach((v: unknown, i: number) => {
					const p = parseValue(decl.type, v);
					const sub = decl.list ? `${at}[${i}]` : at;
					if (!p.ok) this.push('attribute-type-invalid', 'error', `${shape.name}.${an}: ${p.reason}`, file, lineOf(an), sub, { attribute: an, got: v });
					else if (decl.matches && !decl.matches.includes(p.value)) this.push('attribute-type-invalid', 'error', `${shape.name}.${an}: must be one of ${decl.matches.join(', ')} (got ${JSON.stringify(v)})`, file, lineOf(an), sub, { attribute: an, got: v, allowed: decl.matches });
					else ok.push(p.value);
				});
				record[cn] = decl.list ? ok : ok[0];
			}
			for (const k of Object.keys(obj)) if (k !== 'id' && !attrNames.includes(k) && !attrNames.map(camel).includes(k))
				this.push('attribute-unknown', 'error', `${shape.name}: unknown key \`${k}\``, file, lineOf(k), address, { attribute: k });
			record.address = address;
			const former = cc.formerIds ? (record[camel(cc.formerIds)] ?? []) : [];
			this.add({ collection: cname, id, address, file, line: 1, ordinal, record, links: {}, attrTypes, formerIds: former });
		});
	}

	private index() {
		for (const [k, list] of this.byKey) if (list.length > 1)
			this.push('id-duplicate', 'error', `${k} is claimed by ${list.map((e) => `${e.file}:${e.line}`).join(' and ')}`, list[1].file, list[1].line, list[1].address, { id: k, locations: list.map((e) => e.address) });
		// corpus.md:628 "A former id stays taken: no new entity may use it (id-reused)"
		// GAP-26: in ONE snapshot, which of the two is "new"? Without --against nothing says which came first.
		// I report every current id that equals another entity's former id in the same collection.
		for (const e of this.entities) for (const f of e.formerIds) {
			const holder = this.byKey.get(this.key(e.collection, f));
			if (holder) for (const h of holder) this.push('id-reused', 'error', `${h.collection}:${f} is a former id of ${e.id}`, h.file, h.line, `#${h.id}`, { id: f, formerOf: e.id });
		}
	}

	// corpus.md:599-606 the one resolution rule
	resolve(written: string, to?: string[]): { entity?: Entity; via?: 'id' | 'former' | 'name'; candidates?: Entity[]; finding?: string } {
		let pool = this.entities;
		let bare = written;
		const q = /^([a-z][a-z0-9-]*):(.+)$/.exec(written);
		if (q && this.config.collections[q[1]]) { pool = pool.filter((e) => e.collection === q[1]); bare = q[2]; }
		else if (to) {
			// (2) `to` names shapes; constrain to those shapes' collections
			const cols = Object.entries(this.config.collections).filter(([, c]) => to.includes(c.shape)).map(([n]) => n);
			pool = pool.filter((e) => cols.includes(e.collection));
		}
		// GAP-27: step (3) "corpus-unique collections are searched together" then (4) "otherwise one match
		// resolves". When there is no `to` and no qualifier, and collections are NOT corpus-unique, is the search
		// over all collections (so an id in two is ambiguous) or none? I search all.
		bare = bare.normalize('NFC');
		const steps: [('id' | 'former' | 'name'), (e: Entity) => boolean][] = [
			['id', (e) => e.id === bare],
			['former', (e) => e.formerIds.includes(bare)],
			['name', (e) => (this.config.collections[e.collection].names ?? []).some((n) => e.record[camel(n)] === bare)],
		];
		for (const [via, pred] of steps) {
			const m = pool.filter(pred);
			if (m.length === 1) return { entity: m[0], via };
			if (m.length > 1) return { candidates: m, via, finding: 'ref-ambiguous' };
		}
		return { finding: 'ref-unresolved' };
	}

	private resolveRefs() {
		for (const e of this.entities) {
			for (const [cn, decl] of Object.entries(e.attrTypes)) {
				if (decl.type !== 'ref' || e.record[cn] === undefined) continue;
				const vals: string[] = decl.list ? e.record[cn] : [e.record[cn]];
				vals.forEach((w, i) => {
					const at = decl.list ? `#${e.id}.${cn}[${i}]` : `#${e.id}.${cn}`;
					const r = this.resolve(w, decl.to);
					// references.md:39 "Every finding points at the reference's own address"
					// GAP-28: "the reference's own address": in Rivière an address starting with an entity id is
					// `#WORK-123.criteria` (corpus.md:614) but Marquise's cross-file form is `file#id.field`. Which is printed?
					// I print `#id.field` and give the file separately.
					if (r.finding === 'ref-unresolved') this.push('ref-unresolved', 'error', `${e.collection}:${e.id}.${cn}: no entity \`${w}\` in ${decl.to?.join(', ') ?? 'the corpus'}`, e.file, e.line, at, { written: w, to: decl.to });
					else if (r.finding === 'ref-ambiguous') this.push('ref-ambiguous', 'error', `\`${w}\` matches ${r.candidates!.map((c) => `${c.collection}:${c.id}`).join(', ')}`, e.file, e.line, at, { written: w, candidates: r.candidates!.map((c) => `${c.collection}:${c.id}`) }, { kind: 'set', address: at });
					else {
						if (r.via === 'former') this.push('ref-former-id', 'info', `\`${w}\` is a former id of ${r.entity!.id}`, e.file, e.line, at, { written: w, current: r.entity!.id }, { kind: 'set', address: at, value: r.entity!.id });
						// GAP-29: a reference resolved by NAME has no finding; is it silent (like an id) or should it
						// suggest the id, as names "come later" and ambiguity gets "the id as the fix" (corpus.md:637)? Silent.
						// GAP-30: ref-wrong-target can never fire under the resolution rule, since `to` already
						// constrains the search to the allowed shapes' collections (corpus.md:602). When does it fire?
						// Only with a qualifier naming a collection of another shape; implemented that way.
						const tshape = this.config.collections[r.entity!.collection].shape;
						if (decl.to && !decl.to.includes(tshape)) this.push('ref-wrong-target', 'error', `${w} is a ${tshape}, not ${decl.to.join('/')}`, e.file, e.line, at, { written: w, shape: tshape });
					}
					this.edges.push({ from: e, field: cn, at, written: w, to: r.entity });
				});
			}
		}
	}

	private inverses() {
		for (const e of this.entities) {
			const inv = this.shapeOf(e).extensions.riviere?.inverse ?? {};
			for (const [iname, decl] of Object.entries<any>(inv)) {
				// references.md:18 `of: collection.field` names a collection; GAP-31: `of` may also be a list
				// (`of: [work.source, bug.source]`); and is `field` the kebab name or either? I accept both.
				const ofs: string[] = Array.isArray(decl.of) ? decl.of : [decl.of];
				const found: Entity[] = [];
				for (const of of ofs) {
					const [col, ...fp] = of.split('.');
					const field = camel(fp.join('.'));
					for (const ed of this.edges) if (ed.from.collection === col && ed.field === field && ed.to === e && !found.includes(ed.from)) found.push(ed.from);
				}
				e.links[camel(iname)] = found;
			}
		}
	}

	// Rivière's resolver for Marquise's selectors: follows references (queries.md:54) and reads `links`.
	resolver(): Resolver<Entity> {
		return {
			step: (e, name) => {
				const cn = camel(name);
				if (cn in e.links) return { reached: e.links[cn].map((t) => ({ value: t.id, identity: this.key(t.collection, t.id) })), next: e.links[cn] };
				const decl = e.attrTypes[cn];
				if (!decl) return undefined;
				const v = e.record[cn];
				const vals = v === undefined ? [] : Array.isArray(v) ? v : [v];
				if (decl.type === 'ref') {
					const targets = this.edges.filter((ed) => ed.from === e && ed.field === cn);
					return { reached: targets.map((t) => ({ value: t.written, identity: t.to ? this.key(t.to.collection, t.to.id) : `unresolved:${t.written}` })), next: targets.map((t) => t.to).filter(Boolean) as Entity[] };
				}
				// GAP-32: `has:tags` on a list attribute where the list is empty: one Reached holding [] or none?
				// selectors.md:27 says has: is false for an empty list; with "any" semantics an empty list reaches nothing.
				return { reached: vals.map((x) => ({ value: x, type: decl.type, matches: decl.matches })), next: [] };
			},
			literalIdentity: (raw, r) => {
				void r;
				const res = this.resolve(raw); // GAP-33: a literal compared to a reference: resolved with the field's `to`? The step has lost it here.
				return res.entity ? this.key(res.entity.collection, res.entity.id) : undefined;
			},
		};
	}

	select(selector: string) {
		return (e: Entity) => evaluate(parseSelector(selector), e, this.resolver());
	}

	find(collection: string, selector: string) {
		const pred = this.select(selector);
		return this.entities.filter((e) => e.collection === collection).filter(pred);
	}

	private rules() {
		for (const e of this.entities) {
			const shape = this.shapeOf(e);
			const rules = shape.extensions.riviere?.rules ?? {};
			for (const [rname, rule] of Object.entries<any>(rules)) {
				let fire: boolean;
				try {
					const when = rule.when ? this.select(rule.when)(e) : true;
					// validation.md:313 "a rule with only `when` reports any record in that state"; otherwise when && !require
					fire = rule.require ? when && !this.select(rule.require)(e) : when;
				} catch (err) {
					if (err instanceof SelectorError) { this.push((err as any).findingId ?? 'selector-invalid', 'error', `${shape.name}/${rname}: ${err.message}`, shape.file, 1, shape.name); continue; }
					throw err;
				}
				// references.md:370 findings belong to the entity whose shape declares the rule, at its address
				// GAP-34: a rule's default severity, and whether `message` is required, are not stated.
				if (fire) this.push(`${shape.name}/${rname}`, rule.severity ?? 'error', rule.message ?? rname, e.file, e.line, `#${e.id}`, { rule: rname, shape: shape.name }, rule.fix ? { kind: 'set', address: `#${e.id}`, ...rule.fix } : undefined);
			}
		}
	}
}

export function createRiviere(config: RiviereConfig, host: { marquise: Marquise; root: string }) {
	return { load: () => new Snapshot(config, host.marquise, host.root).load() };
}

// ---------- --against ----------
// corpus.md:628-631, findings.md:18, cli-and-mcp.md:37-39, references.md:372
export function against(base: Snapshot, head: Snapshot): Finding[] {
	const out: Finding[] = [];
	const headIds = new Set(head.entities.map((e) => head.key(e.collection, e.id)));
	const headFormer = new Set(head.entities.flatMap((e) => e.formerIds.map((f) => head.key(e.collection, f))));
	// GAP-40: when the head has BOTH an entity with id X and another whose former ids include X (fixtures/v3),
	// which one is the base's X? The resolution rule says the id wins (corpus.md:605), so pairing by id first
	// makes the rename invisible and every reference silently re-points at the newcomer, with only id-reused left.
	// pairing: identity, then former ids (corpus.md:721 "renames read through former ids")
	const unpairedBase = base.entities.filter((b) => !headIds.has(base.key(b.collection, b.id)) && !headFormer.has(base.key(b.collection, b.id)));
	const pairedHead = new Set<Entity>();
	for (const h of head.entities) if (base.entities.some((b) => b.collection === h.collection && (b.id === h.id || h.formerIds.includes(b.id)))) pairedHead.add(h);
	// GAP-35: "an entity at the same location whose id changed gives id-changed" (corpus.md:630). For a tag
	// entity the location IS `file#id` (corpus.md:589), so a changed id is never at the same location; and with
	// `path: '{id}-{slug}.md'` a renamed document moves too. What pairs the two versions? I pair an unpaired base
	// entity with an unpaired head entity in the same file, same shape, same ordinal. Git rename detection would
	// be another plausible answer for one-per-file collections.
	for (const b of unpairedBase) {
		const h = head.entities.find((x) => !pairedHead.has(x) && x.collection === b.collection && x.file === b.file && x.ordinal === b.ordinal);
		if (h) {
			pairedHead.add(h);
			out.push({ id: 'id-changed', severity: 'warning', message: `${b.collection}:${b.id} became ${h.id} by hand; record the former id`, file: h.file, line: h.line, address: `#${h.id}`, params: { from: b.id, to: h.id }, fix: { kind: 'set', address: `#${h.id}.${camel(head.config.collections[h.collection].formerIds ?? 'formerly')}`, value: [...h.formerIds, b.id] } });
		}
	}
	// GAP-36: is a rename WITH a former id recorded silent under --against? corpus.md:630 only names the hand-edit
	// case. I report nothing for it (the diff reads it as a rename), and references still using the old id get
	// ref-former-id from head validation as usual.
	// "a collision (an id the base branch added after the branch point)": with no merge-base (two plain
	// versions, corpus.md:717 "otherwise with the version itself"), a collision cannot be told from an id both
	// sides share. GAP-37: what --against reports without a common ancestor is unspecified; I report only
	// former-id collisions: a head entity taking an id that the BASE lists as a former id.
	const baseFormer = new Map<string, Entity>();
	for (const b of base.entities) for (const f of b.formerIds) baseFormer.set(base.key(b.collection, f), b);
	for (const h of head.entities) {
		const holder = baseFormer.get(head.key(h.collection, h.id));
		if (holder) out.push({ id: 'id-reused', severity: 'error', message: `${h.collection}:${h.id} was a former id of ${holder.id} at the base`, file: h.file, line: h.line, address: `#${h.id}` });
	}
	// references.md:372: "reports a rule newly broken on a branch like any other finding". GAP-38: is the
	// output of `validate --against` ONLY what is new on the branch, or every head finding plus the diff's? And how
	// is "the same finding" recognised across versions when addresses contain ids that were renamed? I report
	// head findings whose (id, address-with-renames-mapped-back, written value) is not in base.
	const renames = new Map<string, string>();
	for (const h of head.entities) for (const f of h.formerIds) renames.set(`#${h.id}`, `#${f}`);
	for (const f of out) if (f.id === 'id-changed') renames.set(`#${(f.params as any).to}`, `#${(f.params as any).from}`);
	const norm = (f: Finding) => {
		let a = f.address;
		for (const [now, was] of renames) if (a === now || a.startsWith(now + '.') || a.startsWith(now + '[')) a = was + a.slice(now.length);
		return `${f.id}|${a}|${JSON.stringify(f.params?.written ?? '')}`;
	};
	const baseSet = new Set(base.findings.map(norm));
	for (const f of head.findings) if (!baseSet.has(norm(f))) out.push({ ...f, message: `(new on this branch) ${f.message}` });
	return out;
}
