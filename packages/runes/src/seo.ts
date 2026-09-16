import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { toKebabCase } from '@refrakt-md/transform';

// ─── Output types ───

export interface PageSeo {
	jsonLd: object[];
	og: OgMeta;
}

export interface OgMeta {
	title?: string;
	description?: string;
	image?: string;
	type?: string;
	url?: string;
}

// ─── Tree traversal helpers ───

/** Extract all text content from a tag tree */
export function textContent(tag: Tag): string {
	const parts: string[] = [];
	for (const child of tag.children) {
		if (typeof child === 'string') {
			parts.push(child);
		} else if (Markdoc.Tag.isTag(child)) {
			parts.push(textContent(child));
		}
	}
	return parts.join('').trim();
}

function findFirst(tree: RenderableTreeNodes, predicate: (tag: Tag) => boolean): Tag | undefined {
	if (Array.isArray(tree)) {
		for (const node of tree) {
			const found = findFirst(node as RenderableTreeNodes, predicate);
			if (found) return found;
		}
		return undefined;
	}
	if (!Markdoc.Tag.isTag(tree)) return undefined;
	if (predicate(tree)) return tree;
	for (const child of tree.children) {
		const found = findFirst(child as RenderableTreeNodes, predicate);
		if (found) return found;
	}
	return undefined;
}

/** Find a child tag with a given data-field attribute (auto-kebab-cases the lookup key) */
function findProperty(tag: Tag, propertyName: string): Tag | undefined {
	const kebab = toKebabCase(propertyName);
	for (const child of tag.children) {
		if (Markdoc.Tag.isTag(child) && child.attributes['data-field'] === kebab) {
			return child;
		}
	}
	// Search one level deeper (properties can be wrapped in containers)
	for (const child of tag.children) {
		if (Markdoc.Tag.isTag(child)) {
			for (const grandchild of child.children) {
				if (Markdoc.Tag.isTag(grandchild) && grandchild.attributes['data-field'] === kebab) {
					return grandchild;
				}
			}
		}
	}
	return undefined;
}

// ─── Generic RDFa collector ───

/**
 * Walk the renderable tree and collect JSON-LD from RDFa annotations
 * (`typeof` and `property` attributes). Handles nesting, arrays, and
 * value extraction from meta/img/a/text nodes.
 */
export function collectJsonLd(tree: RenderableTreeNodes): object[] {
	const results: object[] = [];
	walkForTypeof(tree, null, results);
	return results;
}

function walkForTypeof(
	node: RenderableTreeNodes,
	parent: Record<string, any> | null,
	topLevel: object[],
): void {
	if (Array.isArray(node)) {
		for (const child of node) walkForTypeof(child as RenderableTreeNodes, parent, topLevel);
		return;
	}
	if (!Markdoc.Tag.isTag(node)) return;

	const typeofValue = node.attributes?.['typeof'];
	const propertyValue = node.attributes?.['property'];

	if (typeofValue) {
		const obj: Record<string, any> = { '@type': typeofValue };

		// Collect property values from direct and nested children
		collectProperties(node, obj);

		if (parent && propertyValue) {
			// Nested typed entity (e.g., Offer inside Product)
			appendToProperty(parent, propertyValue, obj);
		} else {
			// Top-level entity
			obj['@context'] = 'https://schema.org';
			topLevel.push(obj);
		}

		// Recurse into children to find further top-level typeof nodes
		// (but nested typed children with `property` are already handled above)
		for (const child of node.children) {
			walkForTypeof(child as RenderableTreeNodes, obj, topLevel);
		}

		// SPEC-130 D6 / WORK-565 — properties a rune's schema table declares a
		// list always serialise as an array.
		//
		// `appendToProperty` stores the first value as a scalar and only promotes
		// on the second, so a one-track playlist emitted `"track": {…}` and a
		// two-track one `"track": [{…}]` — the *shape* of the output varying with
		// the amount of content, which every consumer then has to handle twice.
		//
		// **After the recursion, not before it.** Nested children are appended to
		// `obj` by the walk above, so running this first would find the property
		// absent and promote nothing — which is exactly how it failed the first
		// time it was written.
		forceDeclaredLists(node, obj);
	} else {
		// Pass through — look deeper for typeof nodes
		for (const child of node.children) {
			walkForTypeof(child as RenderableTreeNodes, parent, topLevel);
		}
	}
}

/**
 * Collect `property`-annotated descendants within a `typeof` scope.
 * Stops at nested `typeof` boundaries (those are handled by walkForTypeof).
 */
function collectProperties(node: Tag, obj: Record<string, any>): void {
	for (const child of node.children) {
		if (!Markdoc.Tag.isTag(child)) continue;

		const prop = child.attributes?.['property'];
		const childTypeof = child.attributes?.['typeof'];

		if (prop && !childTypeof) {
			// Simple property — extract value
			const value = extractPropertyValue(child);
			if (value !== undefined) {
				appendToProperty(obj, prop, value);
			}
		}

		// Recurse into non-typeof children to find deeper properties
		if (!childTypeof) {
			collectProperties(child, obj);
		}
	}
}

/** Extract a value from a property-annotated tag */
function extractPropertyValue(tag: Tag): string | number | undefined {
	// Tags with explicit content attribute (meta, spans with machine-readable values)
	if (tag.attributes.content !== undefined) {
		return tag.attributes.content;
	}
	// Links: use href
	if (tag.name === 'a' && tag.attributes.href) {
		return tag.attributes.href;
	}
	// Images: use src
	if (tag.name === 'img' && tag.attributes.src) {
		return tag.attributes.src;
	}
	// Everything else: text content
	return textContent(tag) || undefined;
}

/**
 * The attribute a schema table's `lists:` declaration travels on.
 *
 * A `data-*` attribute rather than a side channel because `collectJsonLd` reads
 * the transformed tree and nothing else — the same reason the whole mechanism
 * runs at transform time. It sits beside `data-rune-fields`, which already
 * carries a JSON blob on the rune root for the same kind of reason.
 */
export const SCHEMA_LISTS_ATTR = 'data-schema-lists';

/** Promote every property the node declares a list to an array, in place. */
function forceDeclaredLists(node: Tag, obj: Record<string, any>): void {
	const raw = node.attributes?.[SCHEMA_LISTS_ATTR];
	if (typeof raw !== 'string') return;
	let names: unknown;
	try {
		names = JSON.parse(raw);
	} catch {
		return;
	}
	if (!Array.isArray(names)) return;
	for (const name of names) {
		if (typeof name !== 'string') continue;
		// Declared a list, so an absent value is an empty collection rather than a
		// missing one — but emitting `[]` would assert "this has no tracks", which
		// is not the same claim as saying nothing. Only promote what is present.
		if (obj[name] === undefined) continue;
		if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
	}
}

/** Append a value to an object property, creating arrays for duplicates */
function appendToProperty(obj: Record<string, any>, prop: string, value: any): void {
	if (obj[prop] === undefined) {
		obj[prop] = value;
	} else if (Array.isArray(obj[prop])) {
		obj[prop].push(value);
	} else {
		obj[prop] = [obj[prop], value];
	}
}

// ─── Main extraction function ───

export function extractSeo(
	tree: RenderableTreeNodes,
	frontmatter: { title?: string; description?: string; image?: string; [key: string]: unknown },
	url: string,
): PageSeo {
	const jsonLd = collectJsonLd(tree);
	const og = extractOgMeta(tree, frontmatter, url);
	return { jsonLd, og };
}

// ─── OG Meta extraction ───

function extractOgMeta(
	tree: RenderableTreeNodes,
	frontmatter: { title?: string; description?: string; image?: string; [key: string]: unknown },
	url: string,
): OgMeta {
	const og: OgMeta = { url, type: 'website' };

	// Priority 1: Frontmatter
	if (frontmatter.title) og.title = frontmatter.title;
	if (frontmatter.description) og.description = frontmatter.description;
	if (frontmatter.image) og.image = frontmatter.image as string;

	// Priority 2: Hero rune
	const hero = findFirst(tree, (tag) => tag.attributes?.['data-rune'] === 'hero');
	if (hero) {
		if (!og.title) {
			const headline = findProperty(hero, 'headline');
			if (headline) og.title = textContent(headline);
		}
		if (!og.description) {
			const blurb = findProperty(hero, 'blurb');
			if (blurb) og.description = textContent(blurb).slice(0, 200);
		}
	}

	// Priority 3: First content elements
	if (!og.title) {
		const h1 = findFirst(tree, (tag) => tag.name === 'h1');
		if (h1) og.title = textContent(h1);
	}
	if (!og.description) {
		const p = findFirst(tree, (tag) => tag.name === 'p' && !tag.attributes['data-field']);
		if (p) og.description = textContent(p).slice(0, 200);
	}
	if (!og.image) {
		const img = findFirst(tree, (tag) => tag.name === 'img');
		if (img) og.image = img.attributes.src;
	}

	return og;
}
