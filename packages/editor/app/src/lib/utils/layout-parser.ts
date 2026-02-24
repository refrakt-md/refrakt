// ── Types ────────────────────────────────────────────────────────────────

export interface ParsedRegion {
	name: string;
	mode: 'replace' | 'prepend' | 'append';
	content: string;
}

export interface ParsedLayout {
	regions: ParsedRegion[];
}

export interface NavGroup {
	title: string;
	items: string[];
}

export interface ParsedNav {
	groups: NavGroup[];
	ungrouped: string[];
}

// ── Layout Parsing ───────────────────────────────────────────────────────

const REGION_RE = /\{%\s*region\s+([^%]*?)%\}([\s\S]*?)\{%\s*\/region\s*%\}/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;

/**
 * Parse raw `_layout.md` content into structured regions.
 * Extracts `{% region name="..." mode="..." %}...{% /region %}` blocks.
 */
export function parseLayoutClient(raw: string): ParsedLayout {
	const regions: ParsedRegion[] = [];

	let match: RegExpExecArray | null;
	REGION_RE.lastIndex = 0;

	while ((match = REGION_RE.exec(raw)) !== null) {
		const attrsStr = match[1];
		const content = match[2];

		const attrs: Record<string, string> = {};
		let attrMatch: RegExpExecArray | null;
		ATTR_RE.lastIndex = 0;
		while ((attrMatch = ATTR_RE.exec(attrsStr)) !== null) {
			attrs[attrMatch[1]] = attrMatch[2];
		}

		const name = attrs.name || '';
		const mode = (attrs.mode as ParsedRegion['mode']) || 'replace';

		// Trim one leading and one trailing newline from content
		let trimmed = content;
		if (trimmed.startsWith('\n')) trimmed = trimmed.slice(1);
		if (trimmed.endsWith('\n')) trimmed = trimmed.slice(0, -1);

		regions.push({ name, mode, content: trimmed });
	}

	return { regions };
}

/**
 * Serialize a `ParsedLayout` back to `_layout.md` format.
 */
export function serializeLayout(layout: ParsedLayout): string {
	const parts: string[] = ['{% layout %}'];

	for (const region of layout.regions) {
		const modeAttr = region.mode !== 'replace' ? ` mode="${region.mode}"` : '';
		parts.push(`{% region name="${region.name}"${modeAttr} %}`);
		parts.push(region.content);
		parts.push('{% /region %}');
		parts.push('');
	}

	parts.push('{% /layout %}');

	return parts.join('\n');
}

// ── Nav Parsing ──────────────────────────────────────────────────────────

const NAV_OPEN_RE = /\{%\s*nav\s*%\}/;
const NAV_CLOSE_RE = /\{%\s*\/nav\s*%\}/;

/**
 * Check if a string contains a `{% nav %}` block.
 */
export function containsNav(content: string): boolean {
	return NAV_OPEN_RE.test(content);
}

/**
 * Extract the content inside `{% nav %}...{% /nav %}` tags.
 * Returns the inner content, or null if no nav block found.
 */
export function extractNavContent(content: string): string | null {
	const openMatch = NAV_OPEN_RE.exec(content);
	if (!openMatch) return null;

	const afterOpen = openMatch.index + openMatch[0].length;
	const closeMatch = NAV_CLOSE_RE.exec(content.slice(afterOpen));
	if (!closeMatch) return null;

	let inner = content.slice(afterOpen, afterOpen + closeMatch.index);
	if (inner.startsWith('\n')) inner = inner.slice(1);
	if (inner.endsWith('\n')) inner = inner.slice(0, -1);
	return inner;
}

/**
 * Replace the content inside `{% nav %}...{% /nav %}` with new content.
 */
export function replaceNavContent(regionContent: string, newNavContent: string): string {
	const openMatch = NAV_OPEN_RE.exec(regionContent);
	if (!openMatch) return regionContent;

	const afterOpen = openMatch.index + openMatch[0].length;
	const closeMatch = NAV_CLOSE_RE.exec(regionContent.slice(afterOpen));
	if (!closeMatch) return regionContent;

	const before = regionContent.slice(0, afterOpen);
	const after = regionContent.slice(afterOpen + closeMatch.index);

	return `${before}\n${newNavContent}\n${after}`;
}

/**
 * Parse the inner content of a `{% nav %}` block into groups + items.
 * Groups are delimited by `## Heading` lines.
 * Items are `- slug` list items.
 */
export function parseNavContent(content: string): ParsedNav {
	const lines = content.split('\n');
	const groups: NavGroup[] = [];
	const ungrouped: string[] = [];

	let currentGroup: NavGroup | null = null;

	for (const line of lines) {
		const trimmed = line.trim();

		// Heading = new group
		const headingMatch = trimmed.match(/^##\s+(.+)$/);
		if (headingMatch) {
			currentGroup = { title: headingMatch[1], items: [] };
			groups.push(currentGroup);
			continue;
		}

		// List item = nav item
		const itemMatch = trimmed.match(/^-\s+(.+)$/);
		if (itemMatch) {
			const slug = itemMatch[1].trim();
			if (currentGroup) {
				currentGroup.items.push(slug);
			} else {
				ungrouped.push(slug);
			}
			continue;
		}

		// Skip blank lines and anything else
	}

	return { groups, ungrouped };
}

/**
 * Serialize a `ParsedNav` back to nav content markdown.
 */
export function serializeNavContent(nav: ParsedNav): string {
	const parts: string[] = [];

	for (const slug of nav.ungrouped) {
		parts.push(`- ${slug}`);
	}

	if (nav.ungrouped.length > 0 && nav.groups.length > 0) {
		parts.push('');
	}

	for (let i = 0; i < nav.groups.length; i++) {
		const group = nav.groups[i];
		parts.push(`## ${group.title}`);
		parts.push('');
		for (const slug of group.items) {
			parts.push(`- ${slug}`);
		}
		if (i < nav.groups.length - 1) {
			parts.push('');
		}
	}

	return parts.join('\n');
}
