// A thin Rivière slice, built from riviere/docs only. GAP-n markers point at report entries.
import { createHash } from 'node:crypto';
import { createMarquise, load, validateData, camel, type Finding, type Instance, type Severity, type Shape } from './marquise.ts';
import { findSymbol, verdict } from './anchoring.ts';
import { parse, evaluate, UNKNOWN, SelectorError, type Resolver } from './selectors.ts';

export interface Collection {
	shape?: string;
	include?: string | string[];
	path?: string;
	id?: string | { from: string };
	formerIds?: string;
	mentions?: { code?: boolean | { to: string[] }; ids?: boolean };
	names?: string[];
	generate?: string;
}
export interface Config { collections: Record<string, Collection>; }
export interface Entity {
	collection: string; id: string; address: string; file?: string; shape: string;
	record: any; links: Record<string, Entity[]>; refs: Record<string, { collection: string; id: string } | null>;
	formerIds: string[]; names: string[]; position: number;
}
type Source = Map<string, string>; // path -> content (an in-memory source)

const slug = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
function glob(pattern: string, path: string) {
	const re = new RegExp('^' + pattern.split('**/').map((p) => p.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('(?:.*/)?') + '$');
	return re.test(path);
}
const F = (file: string, id: string, severity: Severity, address: string, message: string, params: Record<string, unknown>, line = 1): Finding =>
	({ id, severity, file, address, range: { start: [line, 0], end: [line + 1, 0] }, message, params });

// Rivière core's own shapes. GAP-23: the `ref` shape (and the `reviewed` marker's shape) are never published:
// attribute names, which is positional, and whether `reviewed` is core's or the trace plugin's.
const CORE_SHAPES = [
	{ file: '@riviere-md/core#ref', text: '---\ndescription: One entity, as a link\nattributes:\n  target: { type: string, positional: true, required: true }\n  reviewed: { type: string }\n---\n' },
	{ file: '@riviere-md/core#reviewed', text: '---\ndescription: A review marker\nattributes:\n  hash: { type: string, positional: true, required: true }\n  by: { type: string }\n---\n' },
];

export function createRiviere(config: Config, host: { source: Source }) {
	const shapeSources = [...host.source].filter(([p]) => glob('shapes/*.md', p)).map(([file, text]) => ({ file, text }));
	const mq = createMarquise([...shapeSources, ...CORE_SHAPES.map((s) => ({ ...s, file: s.file.replace('@riviere-md/core#', '') }))], { extensions: ['riviere'] });
	const findings: Finding[] = [...mq.findings];
	for (const [name, c] of Object.entries(config.collections)) {
		if (c.shape && !mq.shapes.has(c.shape)) findings.push(F('riviere.config.json', 'collection-shape-unknown', 'error', `collections.${name}`, `no shape \`${c.shape}\``, { shape: c.shape }));
		if (c.generate && c.generate !== 'files') findings.push(F('riviere.config.json', 'config-unregistered', 'error', `collections.${name}`, `no generator \`${c.generate}\``, { name: c.generate }));
	}
	return { mq, findings, load: () => loadSnapshot(config, host.source, mq, findings) };
}

export type Snapshot = ReturnType<typeof loadSnapshot>;

function loadSnapshot(config: Config, source: Source, mq: Instance, instanceFindings: Finding[]) {
	const findings: Finding[] = [];
	const entities: Entity[] = [];
	const docs = new Map<string, ReturnType<typeof load>>();
	const owner = new Map<string, string>(); // file -> collection (collection-overlap)
	// ---- phase 1: entities
	for (const [cname, c] of Object.entries(config.collections)) {
		if (c.generate === 'files') {
			// GAP-24: the `files` collection's shape name, its keys (does it take `include`? `names`?) and the hash
			// (git blob id or a content hash) are not specified. Shape `file`; every listed file; sha1 of content.
			for (const [path, text] of source) {
				const name = path.replace(/^.*\//, '');
				entities.push({ collection: cname, id: path, address: '', file: path, shape: 'file', position: 0,
					record: { shape: 'file', id: path, address: '', path, name, extension: name.includes('.') ? name.replace(/^.*\./, '.') : '', language: lang(path), hash: createHash('sha1').update(text).digest('hex').slice(0, 12) },
					links: {}, refs: {}, formerIds: [], names: [name] });
			}
			continue;
		}
		const incl = Array.isArray(c.include) ? c.include : [c.include!];
		for (const [path, text] of source) {
			if (!incl.some((g) => glob(g, path))) continue;
			if (owner.has(path)) { findings.push(F(path, 'collection-overlap', 'error', '', `claimed by ${owner.get(path)} and ${cname}`, { other: owner.get(path) })); continue; }
			owner.set(path, cname);
			const shape = mq.shapes.get(c.shape!)!;
			let recs: { rec: any; line: number }[] = [];
			if (/\.ya?ml$/.test(path)) {
				// id from a field: derive first, so findings can be rooted at it ("team/ada.yaml#ada-lovelace.role")
				const pre = validateData(mq, c.shape!, path, text, '');
				const derived = typeof c.id === 'object' && pre.record[camel(c.id.from)] ? slug(String(pre.record[camel(c.id.from)])) : undefined;
				// GAP-25: a data-file record's own `id` - a key in the file, or only the collection's? The input schema has no
				// `id` (reserved). Chose derived id only.
				const root = derived ? `#${derived}` : '';
				const r = validateData(mq, c.shape!, path, text, root);
				findings.push(...r.findings.map((f) => ({ ...f, file: path })));
				if (derived) r.record.id = derived;
				recs = [{ rec: r.record, line: 1 }];
			} else {
				// GAP-26: does a collection's `shape` make it the document shape of files without `shape:` in frontmatter,
				// or collect `{% work %}` tags in them? "A collection collects every instance of its shape" either way. Chose:
				// a file with frontmatter is read with the collection's shape as its document shape.
				const d = load(mq, text, { path, documentShape: text.startsWith('---\n') ? c.shape : undefined });
				docs.set(path, d);
				findings.push(...d.findings);
				recs = d.records.filter((r) => r.shape === c.shape).map((rec) => ({ rec, line: 1 }));
			}
			let pos = 0;
			for (const { rec } of recs) {
				const id = rec.id;
				if (!id) { findings.push(F(path, 'entity-id-missing', 'error', rec.address, `an instance of ${c.shape} has no id`, { shape: c.shape })); continue; }
				if (typeof c.id === 'string') {
					const pat = new RegExp('^' + c.id.replace(/\{n\}/, '\\d+').replace(/\{[^}]+\}/g, '.+') + '$');
					if (!pat.test(id)) findings.push(F(path, 'id-pattern-mismatch', 'warning', `#${id}`, `\`${id}\` does not fit ${c.id}`, { value: id, expected: c.id }));
				}
				const former = c.formerIds ? (rec[camel(c.formerIds)] ?? []) : [];
				entities.push({ collection: cname, id, address: `${path}#${id}`, file: path, shape: c.shape!, record: rec, links: {}, refs: {}, formerIds: former, names: (c.names ?? []).map((n) => rec[camel(n)]).filter(Boolean), position: pos++ });
			}
		}
	}
	// ---- duplicates and reused former ids
	const byKey = new Map<string, Entity[]>();
	for (const e of entities) byKey.set(`${e.collection}:${e.id}`, [...(byKey.get(`${e.collection}:${e.id}`) ?? []), e]);
	for (const [, es] of byKey) if (es.length > 1) for (const e of es.slice(1))
		findings.push(F(e.file!, 'id-duplicate', 'error', `#${e.id}`, `\`${e.id}\` is also claimed by ${es[0].file}`, { value: e.id, other: { file: es[0].file, address: `#${es[0].id}` } }));
	const reused = new Set<Entity>();
	for (const e of entities) for (const o of entities) if (o !== e && o.collection === e.collection && o.formerIds.includes(e.id)) {
		reused.add(e);
		findings.push(F(e.file!, 'id-reused', 'error', `#${e.id}`, `\`${e.id}\` is a former id of ${o.id}`, { value: e.id, other: { file: o.file, address: `#${o.id}` } }));
	}
	// ---- resolution: scope, then tiers (id, former id, name)
	const shapeColls = (to: string[]) => Object.entries(config.collections).filter(([, c]) => to.includes(c.shape ?? (c.generate === 'files' ? 'file' : ''))).map(([n]) => n);
	function resolve(value: string, scope: string[] | null): { kind: 'ok'; e: Entity; tier: string } | { kind: 'none' } | { kind: 'ambiguous'; cands: Entity[] } | { kind: 'wrong'; e: Entity; qualified?: boolean } {
		let colls = scope ?? Object.keys(config.collections);
		const q = /^([a-z][\w-]*):(.+)$/.exec(value);
		if (q && config.collections[q[1]]) {
			if (scope && !scope.includes(q[1])) { const r = resolve(q[2], [q[1]]); return r.kind === 'ok' ? { kind: 'wrong', e: r.e, qualified: true } : r; }
			colls = [q[1]]; value = q[2];
		}
		const pool = entities.filter((e) => colls.includes(e.collection));
		const tiers: [string, (e: Entity) => boolean][] = [
			['id', (e) => e.id === value],
			['former', (e) => e.formerIds.includes(value)],
			// GAP-27: names "come later", yet files carry `name` "for unique-only resolution". Chose: file names and
			// declared `names` take part in the name tier.
			['name', (e) => e.names.includes(value)],
		];
		for (const [tier, pred] of tiers) {
			const hit = pool.filter(pred);
			if (!hit.length) continue;
			// a reused former id: "references to that id resolve to neither: they are ref-ambiguous, with both"
			if (tier === 'id' && hit.length === 1 && reused.has(hit[0])) return { kind: 'ambiguous', cands: [hit[0], ...pool.filter((e) => e.formerIds.includes(value))] };
			return hit.length === 1 ? { kind: 'ok', e: hit[0], tier } : { kind: 'ambiguous', cands: hit };
		}
		if (scope) { const r = resolve(value, null); if (r.kind === 'ok') return { kind: 'wrong', e: r.e }; }
		return { kind: 'none' };
	}
	const key = (e: Entity) => ({ collection: e.collection, id: e.id });
	// ---- typed references (edges)
	const edges: { from: Entity; field: string; to: Entity; at: string }[] = [];
	for (const e of entities) {
		const s = mq.shapes.get(e.shape);
		if (!s || e.collection === 'file') continue;
		const refSites: { path: string; value: string; to: string[] }[] = [];
		for (const a of Object.values(s.attributes)) if (a.type === 'ref') {
			const v = e.record[camel(a.name)];
			if (v === undefined) continue;
			// GAP-28: the `$refs` key for an item of a list of references: `related[0]`, or one key holding a list? Chose `related[0]`.
			(Array.isArray(v) ? v : [v]).forEach((x: string, i: number) => refSites.push({ path: a.list ? `${camel(a.name)}[${i}]` : camel(a.name), value: x, to: a.to ?? [] }));
		}
		const d = e.file ? docs.get(e.file) : undefined;
		for (const rf of d?.refFields ?? []) refSites.push({ path: rf.address.replace(/^#[^.]+\./, ''), value: rf.value, to: rf.to });
		for (const site of refSites) {
			const addr = `#${e.id}.${site.path}`;
			const r = resolve(site.value, shapeColls(site.to));
			if (r.kind === 'ok') {
				e.refs[site.path] = key(r.e);
				edges.push({ from: e, field: site.path.replace(/\[\d+\]$/, ''), to: r.e, at: addr });
				if (r.tier === 'former') findings.push(F(e.file!, 'ref-former-id', 'info', addr, `\`${site.value}\` is a former id of ${r.e.id}`, { value: site.value, target: key(r.e) }));
				if (r.tier === 'name') findings.push(F(e.file!, 'ref-by-name', 'info', addr, `resolved by name`, { value: site.value, target: key(r.e) }));
			} else {
				e.refs[site.path] = null;
				if (r.kind === 'none') findings.push(F(e.file!, 'ref-unresolved', 'error', addr, `\`${site.value}\` names no entity`, { value: site.value, expected: site.to }));
				if (r.kind === 'wrong') findings.push(F(e.file!, 'ref-wrong-target', 'error', addr, `\`${site.value}\` is a ${r.e.shape}, not ${site.to.join(' or ')}`, { value: site.value, target: key(r.e), expected: site.to }));
				if (r.kind === 'ambiguous') findings.push(F(e.file!, 'ref-ambiguous', 'error', addr, `\`${site.value}\` matches ${r.cands.length} entities`, { value: site.value, other: r.cands.map((c) => ({ file: c.file, address: `#${c.id}`, collection: c.collection })) }));
			}
		}
	}
	// ---- mentions
	const mentions: { from: Entity | null; file: string; to: Entity | null; cls: string; line: number; region?: string; reviewed?: string; verdict?: string }[] = [];
	for (const [path, d] of docs) {
		const from = entities.find((e) => e.file === path && e.collection !== 'file') ?? null;
		const coll = from ? config.collections[from.collection] : undefined;
		for (const m0 of d.mentions) {
			const m = { ...m0, line: m0.line + (d.lineOffset ?? 0) };
			const at = from ? `#${from.id}` : '';
			let target: Entity | null = null;
			let region: string | undefined;
			if (m.kind === 'ref') {
				const r = resolve(m.value, null);
				if (r.kind === 'ok') target = r.e;
				else if (r.kind === 'ambiguous') findings.push(F(path, 'ref-ambiguous', 'error', at, `\`${m.value}\` matches ${r.cands.length} entities`, { value: m.value, other: r.cands.map((c) => ({ file: c.file, address: c.id, collection: c.collection })) }, m.line));
				else findings.push(F(path, 'ref-unresolved', 'error', at, `\`${m.value}\` names no entity`, { value: m.value }, m.line));
			} else if (m.kind === 'link') {
				if (/^[a-z]+:/.test(m.value)) continue; // GAP-29: only `repository` URL templates make web links mentions; none configured
				const [rel, frag] = m.value.split('#');
				const p = normalise(path, rel);
				const fe = entities.find((e) => e.collection === 'file' && e.id === p);
				if (!fe) { findings.push(F(path, 'ref-unresolved', 'error', at, `link to \`${rel}\` names no file`, { value: m.value }, m.line)); continue; }
				const held = entities.filter((e) => e.file === p && e.collection !== 'file');
				target = held.length === 1 ? held[0] : fe; // the most specific target
				if (frag) {
					// "A fragment means a symbol where one exists, a region otherwise"
					const reg = findSymbol(p, source.get(p)!, frag);
					// GAP-30: a link whose fragment names no region: `ref-unresolved` (references.md) or Marquise's
					// `link-anchor-missing`? Chose ref-unresolved, as "In Rivière a refused reference is ref-unresolved".
					if (!reg.ok) { findings.push(F(path, 'ref-unresolved', 'error', at, reg.reason, { value: m.value }, m.line)); continue; }
					region = frag;
					if (m.reviewed) { const v = verdict(m.reviewed, reg.text); mentions.push({ from, file: path, to: fe, cls: 'link', line: m.line, region, reviewed: m.reviewed, verdict: v });
						// GAP-31: without the `trace` plugin, does core report a stale marker at all? Chose the trace plugin's
						// `trace-reference-suspect`, since markers are only meaningful with it.
						if (v === 'stale') findings.push(F(path, 'trace-reference-suspect', 'warning', at, `the region \`${p}#${frag}\` changed since it was reviewed`, { target: { collection: 'file', id: p }, value: m.reviewed }, m.line));
						continue; }
				}
			} else if (m.kind === 'code') {
				// GAP-32: `mentions: { code }` is "opted into per collection" - the mentioning collection's key (chosen), or the target's?
				const opt = coll?.mentions?.code;
				if (!opt) continue;
				const to = opt === true ? Object.entries(config.collections).filter(([, c]) => c.generate).map(([n]) => n) : opt.to;
				const v = m.value.replace(/\(.*\)$/, ''); // "Call syntax is stripped"
				const r = resolve(v, to);
				if (r.kind === 'ok') target = r.e;
				else if (r.kind === 'ambiguous') findings.push(F(path, 'mention-ambiguous', 'info', at, `\`${v}\` matches ${r.cands.map((c) => c.id).join(', ')}`, { value: v, other: r.cands.map((c) => ({ address: c.id, collection: c.collection })) }, m.line));
				if (!target) continue; // an unresolved inferred candidate is silent
			}
			if (m.reviewed && m.kind !== 'link') { /* reviewed on a whole entity/file: fingerprint of fields (trace) - not in this slice */ }
			mentions.push({ from, file: path, to: target, cls: m.kind, line: m.line, region });
		}
	}
	// ---- inverses (links)
	for (const e of entities) {
		const inv = (mq.shapes.get(e.shape)?.extensions.riviere as any)?.inverse ?? {};
		for (const [name, d] of Object.entries<any>(inv)) {
			const [coll, field] = String(d.of).split('.');
			e.links[camel(name)] = edges.filter((x) => x.to === e && x.from.collection === coll && x.field === camel(field)).map((x) => x.from);
		}
	}
	// ---- selectors over the snapshot
	const resolver: Resolver = {
		step(from, st) {
			if (!from || typeof from !== 'object') return [];
			const e: Entity | undefined = from.__entity ? from : undefined;
			if (st.fn) {
				if (st.name === 'backrefs' && e) { const [c, f] = st.fn[0].split('.'); return edges.filter((x) => x.to === e && x.from.collection === c && x.field === camel(f)).map((x) => x.from); }
				if (st.name === 'mentionedBy' && e) return mentions.filter((m) => m.to === e && m.from && m.from.collection === st.fn![0]).map((m) => m.from);
				throw new SelectorError('selector-unavailable', `no step \`${st.name}()\``);
			}
			if (e) {
				const n = camel(st.name);
				if (n === '$collection') return [e.collection];
				if (n === '$file') return e.file ? [e.file] : [];
				if (n in e.links) return e.links[n];
				if ((e.record.invalid ?? []).includes(n)) return UNKNOWN; // a refused value is unknown
				const v = e.record[n];
				if (v === undefined) return [];
				const refd = Object.entries(e.refs).filter(([p]) => p === n || p.startsWith(n + '['));
				if (refd.length) return refd.map(([, k]) => (k ? entities.find((x) => x.collection === k.collection && x.id === k.id) : undefined)).filter(Boolean);
				return Array.isArray(v) ? v : [v];
			}
			const v = from[camel(st.name)];
			return v === undefined ? [] : Array.isArray(v) ? v : [v];
		},
		compare(v, lit, op) {
			if (v && v.__entity) { const r = resolve(lit, [v.collection]); return r.kind === 'ok' && r.e === v; } // references compare by identity
			if (op) { const a = Number(v), b = Number(lit); if (Number.isNaN(a) || Number.isNaN(b)) return false; return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b; }
			return String(v).normalize('NFC') === lit.normalize('NFC');
		},
		nonEmpty(v) { return v !== undefined && v !== '' && !(Array.isArray(v) && !v.length); },
	};
	for (const e of entities) Object.defineProperty(e, '__entity', { value: true });
	// ---- rules across entities (a shape's riviere: rules)
	for (const e of entities) {
		const rules = (mq.shapes.get(e.shape)?.extensions.riviere as any)?.rules ?? {};
		for (const [rn, r] of Object.entries<any>(rules)) {
			const sev: Severity = r.severity ?? 'error';
			const when = evaluate(parse(r.when), e, resolver);
			const req = r.require ? evaluate(parse(r.require), e, resolver) : false;
			const ruleId = `${e.shape}/${rn}`;
			if (when === UNKNOWN || (when === true && req === UNKNOWN)) {
				// GAP-33: which value was unknown, and in what form `selector-inconclusive` names "the context and the value".
				findings.push(F(e.file!, 'selector-inconclusive', sev, `#${e.id}`, `rule ${ruleId} could not be decided: it reads a refused value`, { name: ruleId, value: (e.record.invalid ?? []).join(', ') }));
			} else if (when === true && req !== true) findings.push(F(e.file!, ruleId, sev, `#${e.id}`, r.message, { name: rn }));
		}
	}
	const snap = {
		entities, findings: [...findings], mentions, edges, resolve,
		get: (c: string, id: string) => entities.find((e) => e.collection === c && e.id === id),
		find(c: string, sel: string): { result: Entity[]; inconclusive: Entity[] } {
			const cl = parse(sel);
			const result: Entity[] = [], inconclusive: Entity[] = [];
			for (const e of entities.filter((x) => x.collection === c)) { const t = evaluate(cl, e, resolver); if (t === true) result.push(e); else if (t === UNKNOWN) inconclusive.push(e); }
			return { result, inconclusive };
		},
		exportJsonl(): string {
			// GAP-34: the JSONL export's line format is unspecified beyond "one record per line" with `links` beside
			// `record` and a `$refs` map. Chose {collection, id, address, record, links, $refs}, links as {collection, id}.
			return entities.filter((e) => e.collection !== 'file').map((e) => JSON.stringify({
				collection: e.collection, id: e.id, address: e.address, record: e.record,
				links: Object.fromEntries(Object.entries(e.links).map(([k, v]) => [k, v.map(key)])), $refs: e.refs,
			})).join('\n');
		},
	};
	return snap;
}

function normalise(from: string, rel: string): string {
	const parts = from.split('/').slice(0, -1);
	for (const p of rel.split('/')) { if (p === '..') parts.pop(); else if (p !== '.' && p) parts.push(p); }
	return parts.join('/');
}
function lang(p: string) {
	const ext = p.replace(/^.*\./, '.');
	return ({ '.ts': 'typescript', '.md': 'markdoc', '.yaml': 'yaml', '.yml': 'yaml', '.json': 'json' } as any)[ext] ?? 'text';
}

// ---------- --against ----------
type Pair = { head: Entity; base: Entity; stage: number };
function pairing(base: Snapshot, head: Snapshot): Pair[] {
	const pairs: Pair[] = [];
	const ub = new Set(base.entities), uh = new Set(head.entities);
	const take = (h: Entity, b: Entity, stage: number) => { pairs.push({ head: h, base: b, stage }); uh.delete(h); ub.delete(b); };
	for (const h of [...uh]) { const b = [...ub].find((x) => x.collection === h.collection && x.id === h.id); if (b) take(h, b, 1); }
	for (const h of [...uh]) { const b = [...ub].find((x) => x.collection === h.collection && h.formerIds.includes(x.id)); if (b) take(h, b, 2); }
	// GAP-35: "the same position among that file's unpaired entities of that shape" - position counted in the whole file
	// or among the unpaired ones only? The table says unpaired; implemented so.
	for (const h of [...uh]) {
		if (!h.file || h.collection === 'file') continue;
		const hs = [...uh].filter((x) => x.file === h.file && x.shape === h.shape);
		const bs = [...ub].filter((x) => x.file === h.file && x.shape === h.shape);
		const b = bs[hs.indexOf(h)];
		if (b) take(h, b, 3);
	}
	return pairs;
}

export { pairing };
export function against(head: Snapshot, ref: Snapshot, ancestor: Snapshot | null) {
	const out: (Finding & { baseline: 'new' | 'existing' })[] = [];
	const extra: Finding[] = [];
	const base = ancestor ?? ref;
	// GAP-36: with a common ancestor, is "what the change introduced" judged against the ancestor (what the branch
	// added) or against the ref's head? Chose the ancestor for both pairing and baseline.
	const pairs = pairing(base, head);
	for (const p of pairs) if (p.stage === 3 && p.head.id !== p.base.id)
		extra.push({ ...F(p.head.file!, 'id-changed', 'warning', `#${p.head.id}`, `id changed from ${p.base.id} by hand; record the former id`, { value: p.head.id, other: { file: p.base.file, address: `#${p.base.id}` } }), fixes: [{ kind: 'set', address: `#${p.head.id}.formerly`, value: [p.base.id] }] });
	if (ancestor) {
		const addedHead = head.entities.filter((h) => !pairs.some((p) => p.head === h));
		const refPairs = pairing(ancestor, ref);
		const addedRef = ref.entities.filter((r) => !refPairs.some((p) => p.head === r));
		// GAP-37: an entity added identically on both sides (same file, a cherry-pick) - a collision or one entity?
		// "on entities the stages do not pair": the stages pair base with head, never ref-added with head-added. Collision.
		for (const h of addedHead) for (const r of addedRef) if (h.collection === r.collection && h.id === r.id)
			extra.push(F(h.file!, 'id-collision', 'error', `#${h.id}`, `\`${h.id}\` was also added on the other side, in ${r.file}`, { value: h.id, other: { file: r.file, address: `#${r.id}` } }));
	} else extra.push(F('', 'against-no-ancestor', 'info', '', 'no common ancestor: collisions were not checked', {}));
	// finding identity: id, entity mapped through the pairing, address relative to that entity, rule's scoped id
	const ident = (snap: Snapshot, f: Finding, map?: (e: Entity) => Entity | undefined) => {
		const m = /^#([^.]+)(.*)$/.exec(f.address);
		let e = m ? snap.entities.find((x) => x.file === f.file && x.id === m[1]) : undefined;
		if (e && map) e = map(e);
		// GAP-38: a finding with no entity in its address (a shape file, a mention in a file with no entity, a message-only
		// difference) is "its id, its file (following renames) and its address"; renames of files are not followed here.
		return e ? `${f.id}|${e.collection}:${e.id}|${m![2]}` : `${f.id}|${f.file}|${f.address}`;
	};
	const baseKeys = new Set(base.findings.map((f) => ident(base, f)));
	for (const f of head.findings) {
		const k = ident(head, f, (e) => pairs.find((p) => p.head === e)?.base);
		out.push({ ...f, baseline: baseKeys.has(k) ? 'existing' : 'new' });
	}
	for (const f of extra) out.push({ ...f, baseline: 'new' });
	return out;
}
