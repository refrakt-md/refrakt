/**
 * Expand pipeline (SPEC-066, WORK-260).
 *
 * Post-process resolver that finds `{% expand %}` placeholder tags
 * (`data-rune="expand-pending"`) in a page's renderable tree, looks
 * each up in the registry, reads + parses the entity's `sourceFile`
 * (cached per build), calls the plugin's `extract()` to grab the
 * embeddable AST subtree, optionally shifts heading levels, transforms
 * the subtree using the build's full tags+nodes config, and substitutes
 * the result in place wrapped in `<section class="rf-expand"
 * data-rune="expand" data-outline-scope="${id}">`.
 *
 * The wrapper's `data-outline-scope` attribute is picked up by the
 * WORK-259 walkers — heading IDs inside get prefixed, TOC items
 * pointing at them get dropped — without expand needing to coordinate.
 *
 * Per-build caches:
 *   - `sourceFile → parsedAst` (one parse per file regardless of how
 *     many pages embed it)
 *
 * Per-page state:
 *   - resolution stack (`(type, id)` tuples) for cycle detection
 */

import { readFileSync } from 'node:fs';
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { EXPAND_PLACEHOLDER_MARKER } from './tags/expand.js';
import { resolveSnippetPath, SnippetSandboxError } from './lib/read-file.js';
import type { CompiledXrefPattern } from './xref-patterns.js';

const { Tag } = Markdoc;

export interface ExpandResolveContext {
	pageUrl: string;
	registry: Readonly<EntityRegistry>;
	patterns: CompiledXrefPattern[];
	embedConfig?: {
		tags: Record<string, unknown>;
		nodes: Record<string, unknown>;
		projectRoot?: string;
	};
	ctx: PipelineContext;
	/** Per-build source-file cache. Shared across calls within one build,
	 *  so a file embedded on twenty pages is parsed once. */
	parseCache: Map<string, Node>;
}

/** Per-build source-file parse cache. Lives outside the resolve context
 *  so a single build's runs reuse the same instance — the resolver is
 *  invoked per page, but the cache is per build. */
const buildParseCache = new Map<string, Node>();

/** Reset the per-build cache. Tests call this between cases; production
 *  builds rely on the cache living for the build's lifetime (each build
 *  starts fresh because the runes package is imported anew). */
export function __resetExpandCache(): void {
	buildParseCache.clear();
}

/**
 * Walk a renderable tree, replace every `expand-pending` placeholder
 * with the substituted entity content. Returns the same renderable
 * reference when no placeholders were found.
 */
export function resolveExpands(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry>,
	patterns: CompiledXrefPattern[],
	embedConfig: ExpandResolveContext['embedConfig'],
	ctx: PipelineContext,
): unknown {
	const rc: ExpandResolveContext = {
		pageUrl,
		registry,
		patterns,
		embedConfig,
		ctx,
		parseCache: buildParseCache,
	};
	return walk(renderable, rc, []);
}

function walk(node: unknown, rc: ExpandResolveContext, stack: Array<{ type: string; id: string }>): unknown {
	if (Array.isArray(node)) {
		let mutated = false;
		const next = node.map((c) => {
			const w = walk(c, rc, stack);
			if (w !== c) mutated = true;
			return w;
		});
		return mutated ? next : node;
	}
	if (!Tag.isTag(node as never)) return node;
	const tag = node as InstanceType<typeof Tag>;

	const dataRune = (tag.attributes as Record<string, unknown> | undefined)?.['data-rune'];
	if (dataRune === EXPAND_PLACEHOLDER_MARKER) {
		return resolveOnePlaceholder(tag, rc, stack);
	}

	if (!tag.children || tag.children.length === 0) return tag;
	let mutated = false;
	const newChildren = tag.children.map((c) => {
		const w = walk(c, rc, stack);
		if (w !== c) mutated = true;
		return w;
	});
	if (!mutated) return tag;
	return new Tag(tag.name, tag.attributes, newChildren as never[]);
}

function resolveOnePlaceholder(
	tag: InstanceType<typeof Tag>,
	rc: ExpandResolveContext,
	stack: Array<{ type: string; id: string }>,
): unknown {
	const attrs = tag.attributes as Record<string, unknown>;
	const id = String(attrs['data-expand-id'] ?? '');
	const typeHint = attrs['data-expand-type'] as string | undefined;
	const levelAttr = attrs['data-expand-level'] as string | undefined;
	const canonical = attrs['data-expand-canonical'] === 'true';
	const authoredLabel = attrs['data-expand-label'] as string | undefined;

	if (!id) {
		rc.ctx.error(`expand placeholder is missing \`primary\`/id attribute on ${rc.pageUrl}`, rc.pageUrl);
		return errorNode(id, 'missing id attribute');
	}

	const level = levelAttr !== undefined ? Number(levelAttr) : undefined;

	const entity = findEmbeddableEntity(rc.registry, id, rc.pageUrl, typeHint);
	if (!entity) {
		rc.ctx.error(`expand "${id}" on ${rc.pageUrl} — entity not found`, rc.pageUrl);
		return errorNode(id, 'entity not found');
	}

	if (!entity.sourceFile || !entity.extract) {
		rc.ctx.error(
			`expand "${id}" on ${rc.pageUrl} — entity type "${entity.type}" does not support embedding (no sourceFile/extract)`,
			rc.pageUrl,
		);
		return errorNode(id, `entity type "${entity.type}" does not support embedding`);
	}

	// Cycle detection. The stack is per-page-render — embedding the same
	// entity on two different pages is fine; embedding it inside itself
	// transitively is the bug we catch.
	if (stack.some(s => s.type === entity.type && s.id === entity.id)) {
		const cyclePath = [...stack, { type: entity.type, id: entity.id }]
			.map(s => `${s.id} (${s.type})`)
			.join(' → ');
		rc.ctx.error(`expand cycle detected on ${rc.pageUrl}. Cycle: ${cyclePath}`, rc.pageUrl);
		return errorNode(id, 'cycle detected');
	}

	const projectRoot = rc.embedConfig?.projectRoot;
	if (!projectRoot) {
		rc.ctx.error(`expand "${id}" — no project root configured (embedConfig.projectRoot is unset)`, rc.pageUrl);
		return errorNode(id, 'no project root configured');
	}

	let parsed: Node;
	try {
		parsed = parseSourceFile(entity.sourceFile, projectRoot, rc.parseCache);
	} catch (err) {
		const msg = err instanceof SnippetSandboxError ? err.message : (err as Error).message;
		rc.ctx.error(`expand "${id}" — failed to read source file "${entity.sourceFile}": ${msg}`, rc.pageUrl);
		return errorNode(id, msg);
	}

	const extracted = entity.extract(parsed);
	if (!extracted) {
		rc.ctx.error(
			`expand "${id}" — extractor returned no content; "${entity.sourceFile}" may have been edited out-of-sync with the registry`,
			rc.pageUrl,
		);
		return errorNode(id, 'extractor returned no content');
	}

	// Heading processing — `level=N` shifts headings by `N - 1`. Without
	// `level=` the embed stays in peer-document mode; the outline-scope
	// walkers (WORK-259) handle ID namespacing + TOC isolation downstream.
	let processed: Node = extracted;
	if (level !== undefined && level !== 1) {
		const shift = level - 1;
		const clampedHeadings: string[] = [];
		processed = shiftHeadings(extracted, shift, clampedHeadings);
		if (clampedHeadings.length > 0) {
			rc.ctx.warn(
				`expand "${id}" at ${rc.pageUrl} — heading demotion (level=${level}) would push ${clampedHeadings.length} heading(s) past H6. Clamped to H6: ${clampedHeadings.map(t => `"${t}"`).join(', ')}`,
				rc.pageUrl,
			);
		}
	}

	if (!rc.embedConfig) {
		rc.ctx.error(`expand "${id}" — no embedConfig threaded through the pipeline`, rc.pageUrl);
		return errorNode(id, 'no embed transform config');
	}

	// Transform the extracted subtree using the build's full tags+nodes
	// config so embedded plan runes (or any other plugin-contributed
	// schemas) execute normally. A nested walk handles any expand placeholders
	// inside the embedded content (e.g. an embedded spec that references
	// other specs).
	const childStack = [...stack, { type: entity.type, id: entity.id }];
	const transformed = Markdoc.transform(processed, rc.embedConfig as never);
	const recursivelyResolved = walk(transformed, rc, childStack);

	// Canonical-link affordance — resolve via the same chain xref uses.
	const canonicalHref = resolveCanonicalHref(entity, rc.patterns);

	// The engine's identity transform adds `class="rf-expand"` from the
	// `Expand: { block: 'expand' }` config entry; don't set it here or it
	// renders duplicated.
	const wrapperAttrs: Record<string, unknown> = {
		'data-rune': 'expand',
		'data-entity-id': entity.id,
		'data-entity-type': entity.type,
		'data-source': 'registry',
	};
	// Outline-scope marker only when `level=` is unset (peer-document mode).
	if (level === undefined) {
		wrapperAttrs['data-outline-scope'] = entity.id;
	}
	if (canonicalHref) {
		wrapperAttrs['data-canonical-href'] = canonicalHref;
	}

	const children: unknown[] = [];
	if (Array.isArray(recursivelyResolved)) {
		children.push(...recursivelyResolved);
	} else {
		children.push(recursivelyResolved);
	}

	if (canonical) {
		const label = authoredLabel || canonicalLinkDefault(entity);
		const linkAttrs: Record<string, unknown> = {
			class: canonicalHref
				? 'rf-expand__canonical-link'
				: 'rf-expand__canonical-link rf-xref--unresolved',
		};
		if (canonicalHref) linkAttrs.href = canonicalHref;
		children.push(new Tag('a', linkAttrs, [label]));
	}

	return new Tag('section', wrapperAttrs, children as never[]);
}

/** Resolve an entity by id and (optional) type hint. Uses the same
 *  registry surface as xref. */
function findEmbeddableEntity(
	registry: Readonly<EntityRegistry>,
	id: string,
	pageUrl: string,
	typeHint: string | undefined,
): EntityRegistration | undefined {
	const types = typeHint ? [typeHint] : registry.getTypes();
	for (const type of types) {
		const e = registry.getById(type, id, pageUrl);
		if (e) return e;
	}
	// Name-match fallback (same algorithm as xref).
	const idLower = id.toLowerCase();
	for (const type of types) {
		for (const e of registry.getAll(type)) {
			const name = (e.data.name as string | undefined) ?? '';
			const title = (e.data.title as string | undefined) ?? '';
			if (name.toLowerCase() === idLower || title.toLowerCase() === idLower) return e;
		}
	}
	return undefined;
}

/** Resolve an entity's canonical URL using the same chain as xref: the
 *  registered `sourceUrl` first, then pattern matching against the id. */
function resolveCanonicalHref(
	entity: EntityRegistration,
	patterns: CompiledXrefPattern[],
): string | undefined {
	const sourceUrl = entity.sourceUrl;
	const dataUrl = (entity.data.url as string | undefined);
	const baseUrl = dataUrl || sourceUrl;
	if (baseUrl) {
		const headingId = entity.data.headingId as string | undefined;
		return headingId ? `${baseUrl}#${headingId}` : baseUrl;
	}
	for (const p of patterns) {
		const m = p.match.exec(entity.id);
		if (!m) continue;
		const groups = (m.groups ?? {}) as Record<string, string | undefined>;
		const PLACEHOLDER_RE = /\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
		return p.template.replace(PLACEHOLDER_RE, (_match: string, name: string) => {
			const value = name === 'id' ? entity.id : (groups[name] ?? '');
			return value.split('/').map(encodeURIComponent).join('/');
		});
	}
	return undefined;
}

function canonicalLinkDefault(entity: EntityRegistration): string {
	const title = entity.data.title as string | undefined;
	const name = entity.data.name as string | undefined;
	if (title) return `View ${entity.type}: ${title}`;
	if (name) return `View ${entity.type}: ${name}`;
	return `View ${entity.type} ${entity.id}`;
}

/** Parse a source file, caching per build. The path is resolved through
 *  the same sandbox as snippet so absolute paths and traversal escapes
 *  are rejected. */
function parseSourceFile(
	sourceFile: string,
	projectRoot: string,
	cache: Map<string, Node>,
): Node {
	const cached = cache.get(sourceFile);
	if (cached) return cached;
	const absolute = resolveSnippetPath(sourceFile, projectRoot);
	const raw = readFileSync(absolute, 'utf-8');
	const ast = Markdoc.parse(raw);
	cache.set(sourceFile, ast);
	return ast;
}

/** Recursively shift heading levels in a Markdoc AST subtree. Tracks
 *  headings that would push past H6 so the caller can warn. */
function shiftHeadings(node: Node, shift: number, clampedHeadings: string[]): Node {
	if (node.type === 'heading') {
		const originalLevel = node.attributes.level as number;
		const newLevel = originalLevel + shift;
		if (newLevel > 6) {
			const text = collectHeadingText(node);
			clampedHeadings.push(text);
			node.attributes.level = 6;
		} else {
			node.attributes.level = newLevel;
		}
	}
	for (const child of node.children ?? []) {
		shiftHeadings(child, shift, clampedHeadings);
	}
	return node;
}

function collectHeadingText(node: Node): string {
	const parts: string[] = [];
	for (const child of node.walk()) {
		if (child.type === 'text' && typeof child.attributes.content === 'string') {
			parts.push(child.attributes.content);
		}
	}
	return parts.join('');
}

/** Build a visible error placeholder for an expand resolution that
 *  failed. The build also surfaces the error via `ctx.error` — the
 *  inline rendering exists so the failure shows up on the page. */
function errorNode(id: string, message: string): InstanceType<typeof Tag> {
	// Engine adds `rf-expand` from the block config. Error variant gets a
	// static modifier via the engine config; we only set the data attrs.
	return new Tag('section', {
		'data-rune': 'expand',
		'data-entity-id': id,
		'data-expand-error': message,
	}, [`expand "${id}" — ${message}`]);
}
