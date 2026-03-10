import type { SerializedTag, RendererNode } from '@refrakt-md/types';

/** Convert PascalCase or camelCase to kebab-case */
export function toKebabCase(s: string): string {
	return s
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

/** Type guard: is this node a serialized tag? */
export function isTag(node: RendererNode): node is SerializedTag {
	return typeof node === 'object' && node !== null && !Array.isArray(node) && (node as any).$$mdtype === 'Tag';
}

/** Create a serialized tag node */
export function makeTag(name: string, attributes: Record<string, any> = {}, children: RendererNode[] = []): SerializedTag {
	return { $$mdtype: 'Tag', name, attributes, children };
}

/** Find a meta tag child by its data-field attribute (auto-kebab-cases the lookup key) */
export function findMeta(tag: SerializedTag, property: string): SerializedTag | undefined {
	const kebab = toKebabCase(property);
	return tag.children.find(
		(c): c is SerializedTag => isTag(c) && c.name === 'meta' && c.attributes['data-field'] === kebab
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

/** Named offset presets → CSS spacing token values */
const OFFSET_PRESETS: Record<string, string> = {
	sm: 'var(--rf-spacing-sm)',
	md: 'var(--rf-spacing-md)',
	lg: 'var(--rf-spacing-lg)',
};

/** Resolve an offset preset name to its CSS value. Raw CSS values pass through. */
export function resolveOffset(value: string): string {
	return OFFSET_PRESETS[value] ?? value;
}

/** Map spatial valign values (top/center/bottom) to CSS align-items values */
const VALIGN_MAP: Record<string, string> = {
	top: 'start',
	center: 'center',
	bottom: 'end',
	stretch: 'stretch',
	baseline: 'baseline',
};

/** Resolve a spatial valign value to its CSS equivalent. */
export function resolveValign(value: string): string {
	return VALIGN_MAP[value] ?? value;
}

/** Map spatial place values to CSS justify-self / align-self pairs */
const PLACE_MAP: Record<string, { x: string; y: string }> = {
	'left':           { x: 'start',  y: 'center' },
	'center':         { x: 'center', y: 'center' },
	'right':          { x: 'end',    y: 'center' },
	'top':            { x: 'center', y: 'start' },
	'bottom':         { x: 'center', y: 'end' },
	'top left':       { x: 'start',  y: 'start' },
	'top center':     { x: 'center', y: 'start' },
	'top right':      { x: 'end',    y: 'start' },
	'bottom left':    { x: 'start',  y: 'end' },
	'bottom center':  { x: 'center', y: 'end' },
	'bottom right':   { x: 'end',    y: 'end' },
};

/** Parse a spatial place value into CSS justify-self (x) and align-self (y) values. */
export function parsePlacement(value: string): { x: string; y: string } {
	return PLACE_MAP[value] ?? { x: 'center', y: 'center' };
}
