import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { tags, nodes } from '../src/index.js';
import { resolveExpands, __resetExpandCache } from '../src/expand-pipeline.js';
import { applyOutlineScopeWalkers } from '../src/outline-scope.js';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import type { PipelineContext, EntityRegistration } from '@refrakt-md/types';
import type { Node } from '@markdoc/markdoc';
import { parse, findTag, findAllTags } from './helpers.js';

let projectRoot: string;

function makeCtx() {
	const messages: Array<{ severity: string; message: string; url?: string }> = [];
	const ctx: PipelineContext = {
		info: (message: string, url?: string) => messages.push({ severity: 'info', message, url }),
		warn: (message: string, url?: string) => messages.push({ severity: 'warning', message, url }),
		error: (message: string, url?: string) => messages.push({ severity: 'error', message, url }),
	};
	return { ctx, messages };
}

function writeSourceFile(relative: string, content: string): void {
	const abs = join(projectRoot, relative);
	mkdirSync(join(projectRoot, ...relative.split('/').slice(0, -1)), { recursive: true });
	writeFileSync(abs, content, 'utf-8');
}

function makeSpecEntity(id: string, sourceFile: string, runeType: string = 'spec'): EntityRegistration {
	return {
		type: runeType,
		id,
		sourceFile,
		data: { title: `Title of ${id}` },
		extract: (parsedSource: Node) => {
			for (const child of parsedSource.children) {
				if (child.type === 'tag' && child.tag === runeType) {
					if (String(child.attributes.id ?? '') === id) return child;
				}
			}
			return null;
		},
	};
}

function embedConfig() {
	return {
		tags: tags as Record<string, unknown>,
		nodes: nodes as Record<string, unknown>,
		projectRoot,
	};
}

describe('expand pipeline (SPEC-066, WORK-260)', () => {
	beforeEach(() => {
		projectRoot = join(tmpdir(), `refrakt-expand-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
		mkdirSync(projectRoot, { recursive: true });
		__resetExpandCache();
	});

	describe('basic resolution', () => {
		it('substitutes the entity content inline', () => {
			// Use a hint rune for the test fixture — the core runes package
			// owns `hint` so the embedded transform succeeds without needing
			// to load plugin schemas. (Real usage embeds plan runes which the
			// plan plugin contributes through its own schema export.)
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% hint type="note" %}

Body content.

{% /hint %}
`);

			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'spec',
				id: 'SPEC-001',
				sourceFile: 'plan/specs/SPEC-001-foo.md',
				data: { title: 'Foo' },
				extract: (parsedSource: Node) => {
					for (const child of parsedSource.children) {
						if (child.type === 'tag' && child.tag === 'hint') return child;
					}
					return null;
				},
			});

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);

			const wrapper = findTag(resolved as any, t => t.attributes['data-rune'] === 'expand');
			expect(wrapper).toBeDefined();
			expect(wrapper!.attributes['data-entity-id']).toBe('SPEC-001');
			expect(wrapper!.attributes['data-entity-type']).toBe('spec');
			expect(wrapper!.attributes['data-outline-scope']).toBe('SPEC-001');
			// The wrapper has the embedded hint rune inside.
			const hint = findTag(wrapper!, t => t.attributes['data-rune'] === 'hint');
			expect(hint).toBeDefined();
		});

		it('embeds via embed() without a source file (SPEC-069)', () => {
			const embedNode = Markdoc.parse(`{% hint type="note" %}\n\nIn-memory body.\n\n{% /hint %}\n`).children[0];
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'ticket',
				id: 'JIRA-1',
				sourceUrl: '',
				data: { title: 'Live ticket' },
				embed: () => embedNode,
			});

			const placeholder = parse(`{% expand "JIRA-1" /%}`);
			const { ctx, messages } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);

			expect(messages.filter((m) => m.severity === 'error')).toHaveLength(0);
			const wrapper = findTag(resolved as any, (t) => t.attributes['data-rune'] === 'expand');
			expect(wrapper!.attributes['data-entity-id']).toBe('JIRA-1');
			const hint = findTag(wrapper!, (t) => t.attributes['data-rune'] === 'hint');
			expect(hint).toBeDefined();
		});

		it('errors when the entity is not in the registry', () => {
			const placeholder = parse(`{% expand "UNKNOWN" /%}`);
			const registry = new EntityRegistryImpl();
			const { ctx, messages } = makeCtx();
			resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const errors = messages.filter(m => m.severity === 'error');
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0].message).toContain('UNKNOWN');
			expect(errors[0].message).toMatch(/not found/i);
		});

		it('errors when the entity exists but cannot be embedded (no sourceFile/extract)', () => {
			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'spec',
				id: 'SPEC-001',
				data: { title: 'Foo' },
			});
			const { ctx, messages } = makeCtx();
			resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const errors = messages.filter(m => m.severity === 'error');
			expect(errors[0].message).toMatch(/does not support embedding/);
		});

		it('errors when the source file cannot be read', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `placeholder`); // wrong content, no spec tag
			const registry = new EntityRegistryImpl();
			registry.register(makeSpecEntity('SPEC-001', 'plan/specs/missing.md')); // pointing at non-existent file

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx, messages } = makeCtx();
			resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const errors = messages.filter(m => m.severity === 'error');
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0].message).toMatch(/failed to read source file/);
		});

		it('errors when the extractor returns null', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `Just text, no spec rune.`);
			const registry = new EntityRegistryImpl();
			registry.register(makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'));

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx, messages } = makeCtx();
			resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const errors = messages.filter(m => m.severity === 'error');
			expect(errors[0].message).toMatch(/extractor returned no content/);
		});
	});

	describe('outline-scope integration', () => {
		it('sets data-outline-scope to the entity id by default (peer-document mode)', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}

# Foo

{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register(makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'));
			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const wrapper = findTag(resolved as any, t => t.attributes['data-rune'] === 'expand');
			expect(wrapper!.attributes['data-outline-scope']).toBe('SPEC-001');
		});

		it('omits data-outline-scope when level= is set (sub-section mode)', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}

# Foo

{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register(makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'));
			const placeholder = parse(`{% expand "SPEC-001" level=2 /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const wrapper = findTag(resolved as any, t => t.attributes['data-rune'] === 'expand');
			expect(wrapper!.attributes['data-outline-scope']).toBeUndefined();
		});

		it('heading-ID walker prefixes embedded heading IDs with the entity id', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `# Embedded heading

Some body.
`);
			// Use a minimal "spec" extractor that returns the whole parsed doc
			// so the embedded heading shows up directly. (Real plan plugins use
			// a rune-wrapped extractor; this keeps the test focused on the
			// outline-scope wiring.)
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'spec',
				id: 'SPEC-001',
				sourceFile: 'plan/specs/SPEC-001-foo.md',
				data: { title: 'Foo' },
				extract: (p: Node) => p,
			});

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			applyOutlineScopeWalkers(resolved);

			const heading = findTag(resolved as any, t => t.name === 'h1');
			expect(heading!.attributes.id).toBe('SPEC-001--embedded-heading');
		});
	});

	describe('heading-level demotion', () => {
		it('shifts embedded headings by (level - 1) when level= is set', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `# Top

## Sub
`);
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'spec',
				id: 'SPEC-001',
				sourceFile: 'plan/specs/SPEC-001-foo.md',
				data: { title: 'Foo' },
				extract: (p: Node) => p,
			});

			const placeholder = parse(`{% expand "SPEC-001" level=3 /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const top = findTag(resolved as any, t => t.name === 'h3');
			const sub = findTag(resolved as any, t => t.name === 'h4');
			expect(top).toBeDefined();
			expect(sub).toBeDefined();
		});

		it('clamps headings past H6 and warns', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `#### Deep heading
`);
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'spec',
				id: 'SPEC-001',
				sourceFile: 'plan/specs/SPEC-001-foo.md',
				data: { title: 'Foo' },
				extract: (p: Node) => p,
			});

			const placeholder = parse(`{% expand "SPEC-001" level=4 /%}`);
			const { ctx, messages } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const h6 = findTag(resolved as any, t => t.name === 'h6');
			expect(h6).toBeDefined();
			const warnings = messages.filter(m => m.severity === 'warning');
			expect(warnings.length).toBeGreaterThan(0);
			expect(warnings[0].message).toContain('Clamped to H6');
		});

		it('does not shift headings when level= is unset', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `# Top
`);
			const registry = new EntityRegistryImpl();
			registry.register({
				type: 'spec',
				id: 'SPEC-001',
				sourceFile: 'plan/specs/SPEC-001-foo.md',
				data: { title: 'Foo' },
				extract: (p: Node) => p,
			});

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			expect(findTag(resolved as any, t => t.name === 'h1')).toBeDefined();
		});
	});

	describe('canonical-link affordance', () => {
		it('populates data-canonical-href from the entity\'s sourceUrl', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}
{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register({
				...makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'),
				sourceUrl: '/plan/specs/SPEC-001-foo/',
			});

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const wrapper = findTag(resolved as any, t => t.attributes['data-rune'] === 'expand');
			expect(wrapper!.attributes['data-canonical-href']).toBe('/plan/specs/SPEC-001-foo/');
		});

		it('renders a visible link when canonical=true', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}
{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register({
				...makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'),
				sourceUrl: '/plan/specs/SPEC-001-foo/',
			});

			const placeholder = parse(`{% expand "SPEC-001" canonical=true /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const link = findTag(resolved as any, t =>
				t.name === 'a' && (t.attributes.class as string | undefined)?.includes('rf-expand__canonical-link')
			);
			expect(link).toBeDefined();
			expect(link!.attributes.href).toBe('/plan/specs/SPEC-001-foo/');
		});

		it('omits the visible link when canonical=false (default)', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}
{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register({
				...makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'),
				sourceUrl: '/plan/specs/SPEC-001-foo/',
			});

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const link = findTag(resolved as any, t =>
				t.name === 'a' && (t.attributes.class as string | undefined)?.includes('rf-expand__canonical-link')
			);
			expect(link).toBeUndefined();
		});

		it('uses the author-supplied label when canonical=true and label= is set', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}
{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register({
				...makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'),
				sourceUrl: '/plan/specs/SPEC-001-foo/',
			});

			const placeholder = parse(`{% expand "SPEC-001" canonical=true label="Read the full spec" /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const link = findTag(resolved as any, t =>
				t.name === 'a' && (t.attributes.class as string | undefined)?.includes('rf-expand__canonical-link')
			);
			expect(link!.children[0]).toBe('Read the full spec');
		});

		it('marks the link as unresolved when no canonical URL is available', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}
{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register(makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'));
				// no sourceUrl

			const placeholder = parse(`{% expand "SPEC-001" canonical=true /%}`);
			const { ctx } = makeCtx();
			const resolved = resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const link = findTag(resolved as any, t =>
				t.name === 'a' && (t.attributes.class as string | undefined)?.includes('rf-expand__canonical-link')
			);
			expect(link).toBeDefined();
			expect(link!.attributes.class).toContain('rf-xref--unresolved');
		});
	});

	describe('cycle detection', () => {
		it('errors when an entity expands itself transitively', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}

{% expand "SPEC-001" /%}

{% /spec %}
`);
			const registry = new EntityRegistryImpl();
			registry.register(makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'));

			const placeholder = parse(`{% expand "SPEC-001" /%}`);
			const { ctx, messages } = makeCtx();
			resolveExpands(placeholder, '/page/', registry, [], embedConfig(), ctx);
			const cycleErr = messages.find(m => m.message.includes('cycle'));
			expect(cycleErr).toBeDefined();
			expect(cycleErr!.message).toContain('SPEC-001');
		});
	});

	describe('caching', () => {
		it('parses a source file once even when expanded twice', () => {
			writeSourceFile('plan/specs/SPEC-001-foo.md', `{% spec id="SPEC-001" status="draft" %}
# Foo
{% /spec %}
`);
			let parseCount = 0;
			const originalParse = Markdoc.parse;
			Markdoc.parse = (src: string) => {
				parseCount++;
				return originalParse.call(Markdoc, src);
			};
			try {
				const registry = new EntityRegistryImpl();
				registry.register(makeSpecEntity('SPEC-001', 'plan/specs/SPEC-001-foo.md'));

				const placeholder1 = parse(`{% expand "SPEC-001" /%}`);
				const placeholder2 = parse(`{% expand "SPEC-001" /%}`);
				const { ctx } = makeCtx();
				const beforeExpand = parseCount;
				resolveExpands(placeholder1, '/page1/', registry, [], embedConfig(), ctx);
				resolveExpands(placeholder2, '/page2/', registry, [], embedConfig(), ctx);
				// One parse for SPEC-001-foo.md across both resolutions.
				expect(parseCount - beforeExpand).toBe(1);
			} finally {
				Markdoc.parse = originalParse;
			}
		});
	});
});
