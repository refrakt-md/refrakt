import type { SerializedTag, RendererNode } from '@refrakt-md/types';

/** Type guard: is this node a serialized tag? */
export function isTag(node: RendererNode): node is SerializedTag {
	return typeof node === 'object' && node !== null && !Array.isArray(node) && (node as any).$$mdtype === 'Tag';
}

/** Create a serialized tag node */
export function makeTag(name: string, attributes: Record<string, any> = {}, children: RendererNode[] = []): SerializedTag {
	return { $$mdtype: 'Tag', name, attributes, children };
}

/** Find a meta tag child by its property attribute */
export function findMeta(tag: SerializedTag, property: string): SerializedTag | undefined {
	return tag.children.find(
		(c): c is SerializedTag => isTag(c) && c.name === 'meta' && c.attributes.property === property
	);
}

/** Find a child tag by its data-name attribute */
export function findByDataName(tag: SerializedTag, name: string): SerializedTag | undefined {
	return tag.children.find(
		(c): c is SerializedTag => isTag(c) && c.attributes['data-name'] === name
	);
}

/** Get all children that are NOT meta tags */
export function nonMetaChildren(tag: SerializedTag): RendererNode[] {
	return tag.children.filter(c => !(isTag(c) && c.name === 'meta'));
}

/** Read a meta tag's content value, with optional default */
export function readMeta(tag: SerializedTag, property: string, defaultValue?: string): string | undefined {
	const meta = findMeta(tag, property);
	return meta?.attributes.content ?? defaultValue;
}

// ─── Layout Transform Helpers ─────────────────────────────────────────

/** Named gap presets → CSS values */
const GAP_PRESETS: Record<string, string> = {
	none: '0',
	tight: 'var(--rf-spacing-sm)',
	default: 'var(--rf-spacing-md)',
	loose: 'var(--rf-spacing-xl)',
};

/** Resolve a gap preset name to its CSS value. Raw CSS values pass through. */
export function resolveGap(value: string): string {
	return GAP_PRESETS[value] ?? value;
}

/** Convert space-separated ratio numbers to CSS fr units: "2 1" → "2fr 1fr" */
export function ratioToFr(value: string): string {
	return value.split(/\s+/).map(n => `${n}fr`).join(' ');
}
