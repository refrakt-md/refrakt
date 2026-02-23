import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;

/**
 * Parse an SVG string (like a Lucide icon) into a Markdoc Tag tree.
 *
 * Supports common SVG child elements: path, circle, line, polyline, rect, polygon, ellipse.
 */
export function parseSvgToTags(svg: string, iconName: string): InstanceType<typeof Tag> {
	// Extract root <svg ...> attributes
	const svgMatch = svg.match(/^<svg\s([^>]*)>/);
	if (!svgMatch) {
		return new Tag('span', { class: 'rf-icon', 'data-icon': iconName });
	}

	const rootAttrs = parseAttributes(svgMatch[1]);

	// Override/add our standard attributes
	const attrs: Record<string, string> = {
		...rootAttrs,
		class: 'rf-icon',
		'data-icon': iconName,
	};

	// Extract child elements
	const children: InstanceType<typeof Tag>[] = [];
	const childTags = ['path', 'circle', 'line', 'polyline', 'rect', 'polygon', 'ellipse'];
	const childPattern = new RegExp(
		`<(${childTags.join('|')})\\s([^>]*?)\\s*/?>`,
		'g',
	);

	let match;
	while ((match = childPattern.exec(svg)) !== null) {
		const tagName = match[1];
		const childAttrs = parseAttributes(match[2]);
		children.push(new Tag(tagName, childAttrs));
	}

	return new Tag('svg', attrs, children);
}

/** Parse HTML/XML attributes from a string into a record. */
function parseAttributes(attrString: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const attrPattern = /([\w-]+)="([^"]*)"/g;
	let match;
	while ((match = attrPattern.exec(attrString)) !== null) {
		attrs[match[1]] = match[2];
	}
	return attrs;
}
