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

/** Minimal structural shape shared by Markdoc `Tag` instances and serialized
 *  `{$$mdtype:'Tag'}` POJOs — both carry `attributes` + `children`. */
type FieldHost = { attributes?: Record<string, unknown>; children?: unknown[] };

/** Parse the SPEC-082 `data-rune-fields` channel (a JSON object) off a node.
 *  Malformed / absent → empty. Pass the parsed result to {@link readField} to
 *  avoid re-parsing when reading several fields from the same node. */
export function parseFields(tag: FieldHost): Record<string, unknown> {
	const raw = tag.attributes?.['data-rune-fields'];
	if (typeof raw !== 'string' || raw.length === 0) return {};
	try {
		const v = JSON.parse(raw);
		return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
	} catch {
		return {};
	}
}

/** Read a field value off a rune node: prefer the typed `data-rune-fields` bag
 *  (camelCase key), falling back to the legacy `<meta data-field>` child (kebab
 *  match). Works on both Markdoc `Tag` instances and serialized POJOs. Used by
 *  pre-engine consumers (plugin register hooks) so they read the same channel
 *  the engine does. Scalars are returned as strings (matching the meta's
 *  `content`); non-scalar / absent → the meta fallback. */
export function readField(tag: FieldHost, name: string, fields?: Record<string, unknown>): string | undefined {
	const bag = fields ?? parseFields(tag);
	const v = bag[name];
	if (v !== undefined && v !== null && typeof v !== 'object') {
		return typeof v === 'string' ? v : String(v);
	}
	const kebab = toKebabCase(name);
	const child = (tag.children ?? []).find(
		(c): c is { attributes: Record<string, unknown> } =>
			!!c && typeof c === 'object'
			&& (c as { $$mdtype?: string }).$$mdtype === 'Tag'
			&& (c as { name?: string }).name === 'meta'
			&& (c as { attributes?: Record<string, unknown> }).attributes?.['data-field'] === kebab,
	);
	return child ? (child.attributes.content as string | undefined) : undefined;
}

/** Convert kebab-case to camelCase: "prep-time" → "prepTime" */
export function fromKebabCase(s: string): string {
	return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Result of extracting the component interface from a serialized tag.
 *
 * - `properties` — scalar values keyed by camelCase property name (from meta children with `data-field`)
 * - `refs` — named content regions keyed by `data-name` (top-level children only; nested refs stay inside their parent)
 * - `children` — anonymous content (everything that is neither a property meta tag nor a named ref)
 */
export interface ComponentInterface {
	properties: Record<string, string>;
	refs: Record<string, SerializedTag[]>;
	children: RendererNode[];
}

/**
 * Partition a serialized tag's children into properties, named refs, and anonymous content.
 *
 * - **Properties**: `<meta>` children with a `data-field` attribute. Key is the camelCased
 *   field name, value is the `content` attribute.
 * - **Refs**: Top-level children with a `data-name` attribute. Only direct children are
 *   extracted — nested refs (children inside another ref) remain inside their parent.
 * - **Children**: Everything else — neither a property meta tag nor a named ref.
 */
export function extractComponentInterface(tag: SerializedTag): ComponentInterface {
	const properties: Record<string, string> = {};
	const refs: Record<string, SerializedTag[]> = {};
	const children: RendererNode[] = [];

	for (const child of tag.children) {
		if (isTag(child)) {
			if (child.name === 'meta' && child.attributes['data-field']) {
				const key = fromKebabCase(child.attributes['data-field']);
				properties[key] = child.attributes.content ?? '';
				continue;
			}
			if (child.attributes['data-name']) {
				const name = child.attributes['data-name'];
				if (!refs[name]) refs[name] = [];
				refs[name].push(child);
				continue;
			}
		}
		children.push(child);
	}

	return { properties, refs, children };
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

/** Named offset presets → CSS spacing token values (SPEC-086 named scale).
 *
 *  Non-linear ramp by design: `sm`–`xl` ride the block-spacing tokens (0.5rem
 *  through 3rem — used for peek displacements inside a card or bento cell),
 *  and `2xl`+ step up to the section-spacing tokens so `bleed`-mode
 *  displacements can clear a section's padding-block (typically
 *  `--rf-spacing-section` = 4rem) and still have visible overhang. */
const OFFSET_PRESETS: Record<string, string> = {
	none: '0',
	sm: 'var(--rf-spacing-sm)',                  // 0.5rem
	md: 'var(--rf-spacing-md)',                  // 1.5rem
	lg: 'var(--rf-spacing-lg)',                  // 2rem
	xl: 'var(--rf-spacing-xl)',                  // 3rem
	'2xl': 'var(--rf-spacing-section)',          // 4rem — matches a tight section's padding-block
	'3xl': 'var(--rf-spacing-section-loose)',    // 6rem — comfortably past a section edge
	'4xl': 'var(--rf-spacing-section-breathe)',  // 8rem — definitive bleed past any section
};

/** Resolve an offset preset name to its CSS value. SPEC-086 closed the raw-value
 *  fallthrough: `offset` is a named scale (none|sm|md|lg|xl), so an unknown value
 *  warns and collapses to `none` rather than passing a raw length through. */
export function resolveOffset(value: string): string {
	const resolved = OFFSET_PRESETS[value];
	if (resolved === undefined) {
		console.warn(`[refrakt] Unknown offset "${value}" — expected one of ${Object.keys(OFFSET_PRESETS).join(', ')}. Falling back to "none".`);
		return OFFSET_PRESETS.none;
	}
	return resolved;
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
