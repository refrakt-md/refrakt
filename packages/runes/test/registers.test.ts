import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { PipelineContext, TransformedPage } from '@refrakt-md/types';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import {
	createContentModelSchema,
	createComponentRenderable,
	bodyOnly,
	renderNodes,
	registersFor,
	validateRegistersDeclaration,
	createRegistersHooks,
	composeRegistersHooks,
	collectRegistrations,
	auditRegistersSources,
	type RegistersDeclaration,
} from '../src/index.js';

const { Tag } = Markdoc;

// SPEC-144 / WORK-611 — declarative entity and edge registration.

/** A small rune: `name` is a ref, `role` / `aliases` / `blob` land in the bag. */
function person(registers: RegistersDeclaration) {
	return createContentModelSchema({
		registers,
		attributes: {
			name: { type: String, required: true },
			role: { type: String, required: false },
			aliases: { type: String, required: false },
			blob: { type: String, required: false },
		},
		contentModel: bodyOnly(),
		transform(resolved, attrs, config) {
			const nameTag = new Tag('span', {}, [attrs.name ?? '']);
			const body = renderNodes(resolved.body, config).wrap('div');
			return createComponentRenderable({
				rune: 'person',
				tag: 'div',
				properties: {
					role: new Tag('meta', { content: attrs.role ?? '' }),
					aliases: new Tag('meta', { content: attrs.aliases ?? '' }),
					...(attrs.blob ? { blob: new Tag('meta', { content: attrs.blob }) } : {}),
				},
				refs: { name: nameTag, body: body.tag('div') },
				children: [nameTag, body.next()],
			});
		},
	});
}

/** An edge rune: `from` / `to` refs, `kind` / `both` in the bag. */
const link = createContentModelSchema({
	registers: {
		edge: {
			from: 'from',
			to: 'to',
			kind: { field: 'kind' },
			bidirectional: { field: 'both' },
			data: ['kind', 'both'],
		},
	},
	attributes: {
		from: { type: String, required: true },
		to: { type: String, required: true },
		kind: { type: String, required: false },
		both: { type: Boolean, required: false },
	},
	contentModel: bodyOnly(),
	transform(_resolved, attrs) {
		const from = new Tag('span', {}, [attrs.from ?? '']);
		const to = new Tag('span', {}, [attrs.to ?? '']);
		return createComponentRenderable({
			rune: 'link',
			tag: 'div',
			properties: {
				kind: new Tag('meta', { content: attrs.kind ?? '' }),
				both: new Tag('meta', { content: String(attrs.both ?? false) }),
			},
			refs: { from, to },
			children: [from, to],
		});
	},
});

const personSchema = person({
	entity: {
		idFrom: 'name',
		data: ['role', 'aliases', { title: 'name' }],
		aliases: { from: 'aliases' },
	},
});

const tags = { person: personSchema, link };
/** The rune record shape `collectRegistrations` reads (`Plugin.runes`). */
const runeRecord = { person: { transform: personSchema }, link: { transform: link } };

function page(url: string, source: string): TransformedPage {
	const ast = Markdoc.parse(source);
	const renderable = Markdoc.transform(ast, { tags, variables: { generatedIds: new Set() } });
	return { url, title: '', headings: [], frontmatter: {}, renderable };
}

function ctx() {
	const warnings: string[] = [];
	const c: PipelineContext = {
		info() {},
		warn: (m, url) => void warnings.push(`${url ?? ''}: ${m}`),
		error() {},
	};
	return { c, warnings };
}

function run(
	pages: TransformedPage[],
	hooks = createRegistersHooks(collectRegistrations(runeRecord)),
) {
	const registry = new EntityRegistryImpl();
	const { c, warnings } = ctx();
	hooks.register!(pages, registry, c);
	const aggregated = hooks.aggregate!(registry, c) as { entityByName: Map<string, unknown> };
	return { registry, aggregated, warnings };
}

describe('the registers declaration', () => {
	it('is recorded on the schema and round-trips through JSON', () => {
		const decl = registersFor(personSchema)!;
		expect(decl).toBeDefined();
		expect(JSON.parse(JSON.stringify(decl))).toEqual(decl);
	});

	it.each([
		['a function value', { entity: { idFrom: 'name', data: [() => 'x'] } }, /function/],
		['an unknown key', { entity: { idFrom: 'name', when: 'x' } }, /unknown key "when"/],
		[
			'both entity and edge',
			{ entity: { idFrom: 'a' }, edge: { from: 'a', to: 'b', kind: 'k' } },
			/exactly one/,
		],
		['neither', {}, /exactly one/],
		['a bad scope', { entity: { idFrom: 'a', scope: 'global' } }, /scope/],
		[
			'aliases outside the bag',
			{ entity: { idFrom: 'a', aliases: { from: 'aka' } } },
			/must name a key/,
		],
		[
			'a kind field outside the bag',
			{ edge: { from: 'a', to: 'b', kind: { field: 'k' } } },
			/must name a key/,
		],
		['a duplicate data key', { entity: { idFrom: 'a', data: ['x', { x: 'y' }] } }, /twice/],
		['a multi-key rename', { entity: { idFrom: 'a', data: [{ x: 'y', z: 'w' }] } }, /single/],
		['a class instance', { entity: { idFrom: 'a', data: [new Date()] } }, /plain objects/],
	])('rejects %s at construction', (_label, decl, error) => {
		expect(() => validateRegistersDeclaration(decl)).toThrow(error);
		expect(() =>
			createContentModelSchema({
				registers: decl as RegistersDeclaration,
				contentModel: bodyOnly(),
				transform: () => [],
			}),
		).toThrow(error);
	});
});

describe('the core registers participant', () => {
	it('registers an entity with its declared bag, in declared key order', () => {
		const { registry } = run([
			page('/a', '{% person name="Ada" role="engineer" aliases="Countess" %}x{% /person %}'),
		]);
		const [ada] = registry.getAll('person');
		expect(JSON.stringify(ada)).toBe(
			JSON.stringify({
				type: 'person',
				id: 'Ada',
				sourceUrl: '/a',
				data: { role: 'engineer', aliases: 'Countess', title: 'Ada' },
			}),
		);
	});

	it('registers page-scoped entities under their page', () => {
		const scoped = person({ entity: { idFrom: 'name', scope: 'page' } });
		const hooks = createRegistersHooks([{ rune: 'person', registers: registersFor(scoped)! }]);
		const { registry } = run(
			[page('/a', '{% person name="Ada" /%}'), page('/b', '{% person name="Ada" /%}')],
			hooks,
		);
		expect(registry.getAll('person').map((e) => [e.scope, e.sourceUrl])).toEqual([
			['page', '/a'],
			['page', '/b'],
		]);
	});

	it('warns and registers nothing when the id is empty', () => {
		const typo = person({ entity: { idFrom: 'blob' } });
		const hooks = createRegistersHooks([{ rune: 'person', registers: registersFor(typo)! }]);
		const { registry, warnings } = run([page('/a', '{% person name="Ada" /%}')], hooks);
		expect(registry.getAll('person')).toEqual([]);
		expect(warnings).toEqual(['/a: Person missing blob: nothing registered']);
	});

	it('reads a JSON data source as the whole bag, and warns on bad JSON', () => {
		const json = person({ entity: { idFrom: 'name', data: { json: 'blob' } } });
		const hooks = createRegistersHooks([{ rune: 'person', registers: registersFor(json)! }]);
		const { registry, warnings } = run(
			[
				page('/a', `{% person name="Ada" blob="{\\"x\\":1}" /%}`),
				page('/b', '{% person name="Bad" blob="{nope" /%}'),
				page('/c', '{% person name="None" /%}'),
			],
			hooks,
		);
		expect(registry.getAll('person').map((e) => [e.id, e.data])).toEqual([['Ada', { x: 1 }]]);
		expect(warnings).toEqual(['/b: Failed to parse person blob as JSON']);
	});

	it('indexes ids then aliases, and the first owner of an alias keeps it', () => {
		const { aggregated } = run([
			page('/a', '{% person name="Ada" aliases="Countess, Lady" /%}'),
			page('/b', '{% person name="Grace" aliases="Lady, Amazing Grace" /%}'),
			page('/c', '{% person name="Countess" /%}'),
		]);
		const index = [...aggregated.entityByName].map(([k, e]) => [k, (e as { id: string }).id]);
		expect(index).toEqual([
			['Ada', 'Ada'],
			// An id is not an alias: it replaces whatever held the name, in place.
			['Countess', 'Countess'],
			['Lady', 'Ada'],
			['Grace', 'Grace'],
			['Amazing Grace', 'Grace'],
		]);
	});

	it('registers an edge and contributes it to the relationship graph', () => {
		const { registry, warnings } = run([
			page('/a', '{% person name="Ada" aliases="Countess" /%}'),
			page('/b', '{% person name="Charles" /%}'),
			page('/c', '{% link from="Countess" to="Charles" kind="colleague" both=true /%}'),
			page('/d', '{% link from="Ada" to="Charles" /%}'),
			page('/e', '{% link from="Ada" to="Nobody" kind="ghost" /%}'),
		]);
		expect(registry.getAll('link').map((e) => [e.id, e.data])).toEqual([
			[
				'Countess→Charles',
				{
					from: 'Countess',
					to: 'Charles',
					kind: 'colleague',
					both: 'true',
					name: 'Countess → Charles',
				},
			],
			[
				'Ada→Charles',
				{ from: 'Ada', to: 'Charles', kind: '', both: 'false', name: 'Ada → Charles' },
			],
			[
				'Ada→Nobody',
				{ from: 'Ada', to: 'Nobody', kind: 'ghost', both: 'false', name: 'Ada → Nobody' },
			],
		]);
		// The alias endpoint lands on Ada's id; an empty kind falls back to the type.
		expect(registry.getRelated('Ada').map((e) => [e.kind, e.target.id])).toEqual([
			['colleague', 'Charles'],
			['link', 'Charles'],
		]);
		expect(registry.getRelated('Charles').map((e) => [e.kind, e.target.id])).toEqual([
			['colleague', 'Ada'],
		]);
		expect(warnings).toEqual(['/e: Link references unknown entity "Nobody"']);
	});

	it('warns when an edge is missing an endpoint', () => {
		const { registry, warnings } = run([page('/a', '{% link from="Ada" to="" /%}')]);
		expect(registry.getAll('link')).toEqual([]);
		expect(warnings).toEqual(['/a: Link missing from or to attribute']);
	});
});

describe('composeRegistersHooks', () => {
	const declared = collectRegistrations(runeRecord);

	it('leaves a package that declares nothing alone', () => {
		const own = { postProcess: (p: TransformedPage) => p };
		expect(composeRegistersHooks(own, [])).toBe(own);
		expect(composeRegistersHooks(undefined, [])).toBeUndefined();
	});

	it('runs beside the package hooks, and its own aggregate keeps the slot', () => {
		const calls: string[] = [];
		const composed = composeRegistersHooks(
			{
				register: () => void calls.push('own register'),
				aggregate: (registry) => {
					calls.push(`own aggregate saw ${registry.getAll('person').length}`);
					return 'own';
				},
			},
			declared,
		)!;
		const registry = new EntityRegistryImpl();
		const { c } = ctx();
		composed.register!([page('/a', '{% person name="Ada" /%}')], registry, c);
		expect(composed.aggregate!(registry, c)).toBe('own');
		expect(calls).toEqual(['own register', 'own aggregate saw 1']);
	});

	it('fills the aggregate slot with the name index when the package writes none', () => {
		const composed = composeRegistersHooks({ postProcess: (p) => p }, declared)!;
		const registry = new EntityRegistryImpl();
		const { c } = ctx();
		composed.register!([page('/a', '{% person name="Ada" /%}')], registry, c);
		const slot = composed.aggregate!(registry, c) as { entityByName: Map<string, unknown> };
		expect([...slot.entityByName.keys()]).toEqual(['Ada']);
		expect(composed.postProcess).toBeDefined();
	});
});

describe('the validate-time source audit', () => {
	const validate = (schema: unknown, source: string) =>
		Markdoc.validate(Markdoc.parse(source), { tags: { person: schema as never } });

	it('reports a source that resolves to nothing, at the rune instance’s line', () => {
		const typo = person({ entity: { idFrom: 'name', data: ['role', 'roel'] } });
		const findings = validate(
			typo,
			'# Title\n\n{% person name="Ada" %}\nx\n{% /person %}\n',
		).filter((f) => f.error.id === 'registers-source-unresolved');
		expect(findings).toHaveLength(1);
		expect(findings[0].error.level).toBe('warning');
		expect(findings[0].error.message).toContain('"roel"');
		expect(findings[0].lines[0]).toBe(2);
	});

	it('accepts declared attributes, refs and bag keys', () => {
		// `title` → `name` is a ref; `role` an attribute; both resolve.
		expect(
			validate(personSchema, '{% person name="Ada" /%}').filter(
				(f) => f.error.id === 'registers-source-unresolved',
			),
		).toEqual([]);
	});

	it('resolves a bag key that is not an attribute', () => {
		const tree = Markdoc.transform(Markdoc.parse('{% link from="a" to="b" /%}'), { tags });
		const decl = { edge: { from: 'from', to: 'to', kind: 'k', data: ['both', 'nope'] } };
		expect(auditRegistersSources(decl, tree)).toEqual([{ source: 'nope', role: 'data.nope' }]);
	});
});
