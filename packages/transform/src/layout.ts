import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import type {
	LayoutConfig,
	LayoutSlot,
	LayoutStructureEntry,
	LayoutPageData,
	ComputedContent,
} from './types.js';
import { isTag, makeTag } from './helpers.js';
import { buildBreadcrumb, buildToc, buildPrevNext } from './computed.js';

/**
 * Transform a declarative layout config + page data into a SerializedTag tree.
 *
 * The returned tree represents the full page layout — header, sidebar, content,
 * panels, toolbar, etc. — ready for any renderer to walk.
 */
export function layoutTransform(
	config: LayoutConfig,
	page: LayoutPageData,
	prefix: string,
): SerializedTag {
	// 1. Pre-resolve all computed content
	const computed = resolveComputed(config.computed ?? {}, page, prefix);

	// 2. Resolve slots into children
	const children: RendererNode[] = [];
	for (const [, slot] of Object.entries(config.slots)) {
		const result = resolveSlot(slot, config, page, computed, prefix);
		if (result !== null) {
			children.push(result);
		}
	}

	// 3. Wrap in root element
	const rootTag = config.tag ?? 'div';
	const rootAttrs: Record<string, any> = {
		'data-layout': config.block,
		class: `${prefix}-layout-${config.block}`,
	};

	if (config.behaviors?.length) {
		rootAttrs['data-layout-behaviors'] = config.behaviors.join(' ');
	}

	let result = makeTag(rootTag, rootAttrs, children);

	// 4. Optional post-transform escape hatch
	if (config.postTransform) {
		result = config.postTransform(result, page);
	}

	return result;
}

// ─── Computed Content Resolution ──────────────────────────────────────

function resolveComputed(
	defs: Record<string, ComputedContent>,
	page: LayoutPageData,
	prefix: string,
): Record<string, SerializedTag | null> {
	const results: Record<string, SerializedTag | null> = {};

	for (const [name, def] of Object.entries(defs)) {
		// Check frontmatter toggle
		if (def.visibility?.frontmatterToggle) {
			if (page.frontmatter[def.visibility.frontmatterToggle] === false) {
				results[name] = null;
				continue;
			}
		}

		let result: SerializedTag | null = null;

		switch (def.type) {
			case 'breadcrumb': {
				const regionName = def.source.replace('region:', '');
				const region = page.regions[regionName];
				if (region) {
					result = buildBreadcrumb(region.content, page.url, page.title, prefix);
				}
				break;
			}
			case 'toc': {
				const headings = page.headings ?? [];
				const minLevel = def.options?.minLevel ?? 2;
				const maxLevel = def.options?.maxLevel ?? 3;

				// Check minCount before building
				const filtered = headings.filter(h => h.level >= minLevel && h.level <= maxLevel);
				if (def.visibility?.minCount && filtered.length < def.visibility.minCount) {
					result = null;
				} else {
					result = buildToc(headings, prefix, { minLevel, maxLevel });
				}
				break;
			}
			case 'prev-next': {
				const regionName = def.source.replace('region:', '');
				const region = page.regions[regionName];
				if (region) {
					result = buildPrevNext(region.content, page.url, page.pages, prefix);
				}
				break;
			}
		}

		results[name] = result;
	}

	return results;
}

// ─── Slot Resolution ──────────────────────────────────────────────────

function resolveSlot(
	slot: LayoutSlot,
	config: LayoutConfig,
	page: LayoutPageData,
	computed: Record<string, SerializedTag | null>,
	prefix: string,
): SerializedTag | null {
	// 1. Frontmatter condition
	if (slot.frontmatterCondition && !page.frontmatter[slot.frontmatterCondition]) {
		return null;
	}

	// 2. Region existence condition
	if (slot.conditionalRegion && !page.regions[slot.conditionalRegion]) {
		return null;
	}

	// 3. Resolve source content
	let content: RendererNode[] = [];
	if (slot.source) {
		content = resolveSource(slot.source, config, page, computed, prefix);
		// Skip conditional slots with empty content
		if (slot.conditional && content.length === 0) {
			return null;
		}
	}

	// 4. Resolve children (recursive)
	if (slot.children) {
		for (const child of slot.children) {
			if (typeof child === 'string') {
				if (child.startsWith('chrome:')) {
					const chromeName = child.slice(7);
					const chromeEntry = config.chrome?.[chromeName];
					if (chromeEntry) {
						const built = buildLayoutChrome(chromeEntry, chromeEntry.ref ?? chromeName, page, prefix);
						if (built) content.push(built);
					}
				} else {
					content.push(child);
				}
			} else if (isLayoutSlot(child)) {
				const resolved = resolveSlot(child as LayoutSlot, config, page, computed, prefix);
				if (resolved) content.push(resolved);
			} else {
				const entry = child as LayoutStructureEntry;
				const built = buildLayoutChrome(entry, entry.ref ?? '', page, prefix);
				if (built) content.push(built);
			}
		}
	}

	// 5. Build class string
	let className = slot.class ?? '';

	// 6. Conditional modifier (add BEM modifier when region exists)
	if (slot.conditionalModifier) {
		const { region, modifier } = slot.conditionalModifier;
		if (page.regions[region] && className) {
			className = `${className} ${className}--${modifier}`;
		}
	}

	// 7. Wrap content if wrapper specified
	let finalChildren: RendererNode[] = content;
	if (slot.wrapper) {
		let wrapperClass = slot.wrapper.class;
		if (slot.wrapper.conditionalModifier) {
			const { computed: computedName, modifier } = slot.wrapper.conditionalModifier;
			if (computed[computedName]) {
				wrapperClass = `${wrapperClass} ${wrapperClass}--${modifier}`;
			}
		}
		finalChildren = [makeTag(slot.wrapper.tag, { class: wrapperClass }, content)];
	}

	// 8. Build the slot element
	const attrs: Record<string, any> = {};
	if (className) attrs.class = className;
	if (slot.attrs) {
		for (const [key, val] of Object.entries(slot.attrs)) {
			attrs[key] = val;
		}
	}

	return makeTag(slot.tag, attrs, finalChildren);
}

/** Distinguish a LayoutSlot from a LayoutStructureEntry in children arrays */
function isLayoutSlot(obj: any): boolean {
	if (typeof obj !== 'object' || obj === null) return false;
	// LayoutSlot has 'source' or uses 'children' with 'tag' but no StructureEntry-specific fields
	// StructureEntry has 'ref', 'svg', 'pageText', 'icon', 'metaText', etc.
	if (obj.svg || obj.pageText || obj.icon || obj.metaText || obj.pageCondition || obj.iterate) {
		return false;
	}
	// If it has 'source' or 'conditionalRegion' or 'conditionalModifier' or 'wrapper', it's a slot
	if (obj.source || obj.conditionalRegion || obj.conditionalModifier || obj.wrapper || obj.frontmatterCondition) {
		return true;
	}
	// If it has children that are strings starting with 'chrome:', it's a slot
	if (obj.children && Array.isArray(obj.children)) {
		for (const c of obj.children) {
			if (typeof c === 'string' && c.startsWith('chrome:')) return true;
			if (typeof c === 'object' && c !== null) return true; // nested children = slot
		}
	}
	// Default: if it has a 'class' and no 'ref', treat as slot
	if (obj.class && !obj.ref) return true;
	return false;
}

// ─── Source Resolution ────────────────────────────────────────────────

function resolveSource(
	source: string,
	config: LayoutConfig,
	page: LayoutPageData,
	computed: Record<string, SerializedTag | null>,
	prefix: string,
): RendererNode[] {
	if (source === 'content') {
		return page.renderable ? [page.renderable] : [];
	}

	if (source.startsWith('region:')) {
		const name = source.slice(7);
		const region = page.regions[name];
		return region ? [...region.content] : [];
	}

	if (source.startsWith('clone:region:')) {
		const name = source.slice(13);
		const region = page.regions[name];
		if (!region) return [];
		// Deep clone — use structuredClone to handle potential circular references
		return structuredClone(region.content);
	}

	if (source.startsWith('computed:')) {
		const name = source.slice(9);
		const result = computed[name];
		return result ? [result] : [];
	}

	if (source.startsWith('chrome:')) {
		const name = source.slice(7);
		const entry = config.chrome?.[name];
		if (!entry) return [];
		const built = buildLayoutChrome(entry, entry.ref ?? name, page, prefix);
		return built ? [built] : [];
	}

	return [];
}

// ─── Chrome Building ──────────────────────────────────────────────────

/** Resolve a dot-path on page data (e.g. 'title', 'frontmatter.date') */
function resolvePagePath(page: LayoutPageData, path: string): unknown {
	const parts = path.split('.');
	let current: any = page;
	for (const part of parts) {
		if (current == null) return undefined;
		current = current[part];
	}
	return current;
}

/**
 * Build a layout chrome element from a LayoutStructureEntry.
 * Extends the rune engine's buildStructureElement with page data access.
 */
function buildLayoutChrome(
	entry: LayoutStructureEntry,
	name: string,
	page: LayoutPageData,
	prefix: string,
): SerializedTag | null {
	// Page data condition
	if (entry.pageCondition) {
		const val = resolvePagePath(page, entry.pageCondition);
		if (!val) return null;
	}

	// Standard condition (from StructureEntry)
	if (entry.condition) return null; // No modifier context in layouts

	// Resolve attributes
	const resolvedAttrs: Record<string, string> = {};
	if (name) resolvedAttrs['data-name'] = name;

	if (entry.attrs) {
		for (const [key, val] of Object.entries(entry.attrs)) {
			if (typeof val === 'string') {
				resolvedAttrs[key] = val;
			} else if ('fromPageData' in val) {
				resolvedAttrs[key] = String(resolvePagePath(page, val.fromPageData) ?? '');
			}
		}
	}

	// SVG content — mark for raw HTML rendering
	if (entry.svg) {
		resolvedAttrs['data-raw-html'] = 'true';
		return makeTag(entry.tag, resolvedAttrs, [entry.svg]);
	}

	// Page text injection
	if (entry.pageText) {
		let text = String(resolvePagePath(page, entry.pageText) ?? '');
		if (entry.dateFormat && text) {
			const d = new Date(text + 'T00:00:00');
			text = d.toLocaleDateString('en-US', entry.dateFormat);
		}
		if (entry.textPrefix) text = entry.textPrefix + text;
		if (entry.textSuffix) text = text + entry.textSuffix;
		return makeTag(entry.tag, resolvedAttrs, [text]);
	}

	// Iterate (e.g. tags array)
	if (entry.iterate) {
		const items = resolvePagePath(page, entry.iterate.source) as any[] | undefined;
		if (!items || !Array.isArray(items)) return makeTag(entry.tag, resolvedAttrs, []);
		const itemChildren = items.map(item =>
			makeTag(entry.iterate!.tag, {
				class: entry.iterate!.class ?? undefined,
			}, [String(item)])
		);
		return makeTag(entry.tag, resolvedAttrs, itemChildren);
	}

	// Process children recursively
	const elementChildren: RendererNode[] = [];
	if (entry.children) {
		for (const child of entry.children) {
			if (typeof child === 'string') {
				elementChildren.push(child);
			} else {
				const childEntry = child as LayoutStructureEntry;
				const built = buildLayoutChrome(childEntry, childEntry.ref ?? '', page, prefix);
				if (built) elementChildren.push(built);
			}
		}
	}

	return makeTag(entry.tag, resolvedAttrs, elementChildren);
}
