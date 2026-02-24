const ICON_OVERRIDES_START = '/* icon-overrides-start */';
const ICON_OVERRIDES_END = '/* icon-overrides-end */';

/**
 * Convert a raw SVG string to a CSS mask-image data URI.
 * The SVG is encoded for use with `mask-image`, where
 * the alpha channel of the SVG defines the mask shape and
 * `background-color` provides the visible color.
 */
export function svgToDataUri(svg: string): string {
	// Replace double quotes with single quotes for URI safety
	let encoded = svg.replace(/"/g, "'");
	// URL-encode special characters
	encoded = encoded
		.replace(/%/g, '%25')
		.replace(/#/g, '%23')
		.replace(/</g, '%3C')
		.replace(/>/g, '%3E');
	// Replace stroke="currentColor" with black for mask alpha (after encoding)
	encoded = encoded.replace(/stroke='currentColor'/g, "stroke='%23000'");
	return `url("data:image/svg+xml,${encoded}")`;
}

/**
 * Generate CSS mask-image rules for overridden hint icon variants.
 * Returns a CSS string with rules for each variant.
 */
export function generateHintIconCss(overrides: Record<string, string>): string {
	const rules: string[] = [];
	for (const [variant, svg] of Object.entries(overrides)) {
		if (!svg.trim()) continue;
		const uri = svgToDataUri(svg);
		rules.push(
			`.rf-hint--${variant} .rf-hint__icon::before {\n` +
				`\t-webkit-mask-image: ${uri};\n` +
				`\tmask-image: ${uri};\n` +
				`}`,
		);
	}
	return rules.join('\n\n');
}

/**
 * Merge generated icon CSS into an existing rune override string.
 * Uses comment markers to delimit the icon section so hand-written
 * CSS outside the markers is preserved.
 */
export function mergeIconCssIntoRuneOverride(
	existingCss: string,
	iconCss: string,
): string {
	const startIdx = existingCss.indexOf(ICON_OVERRIDES_START);
	const endIdx = existingCss.indexOf(ICON_OVERRIDES_END);

	const wrappedIcon = iconCss.trim()
		? `${ICON_OVERRIDES_START}\n${iconCss}\n${ICON_OVERRIDES_END}`
		: '';

	// If markers exist, replace the section between them
	if (startIdx !== -1 && endIdx !== -1) {
		const before = existingCss.slice(0, startIdx).trimEnd();
		const after = existingCss.slice(endIdx + ICON_OVERRIDES_END.length).trimStart();
		const parts = [before, wrappedIcon, after].filter(Boolean);
		return parts.join('\n\n');
	}

	// No existing markers — append icon section
	const trimmed = existingCss.trim();
	if (!trimmed && !wrappedIcon) return '';
	if (!trimmed) return wrappedIcon;
	if (!wrappedIcon) return trimmed;
	return `${trimmed}\n\n${wrappedIcon}`;
}

/**
 * Strip the icon-overrides marker section from CSS.
 * Returns the CSS without the delimited icon block.
 */
export function stripIconCssFromOverride(css: string): string {
	const startIdx = css.indexOf(ICON_OVERRIDES_START);
	const endIdx = css.indexOf(ICON_OVERRIDES_END);
	if (startIdx === -1 || endIdx === -1) return css;
	const before = css.slice(0, startIdx).trimEnd();
	const after = css.slice(endIdx + ICON_OVERRIDES_END.length).trimStart();
	return [before, after].filter(Boolean).join('\n\n');
}

export interface SvgValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Validate an uploaded SVG string for use as a mask-image icon.
 */
export function validateSvg(svg: string): SvgValidationResult {
	const errors: string[] = [];

	if (!svg.trim()) {
		return { valid: false, errors: ['SVG content is empty'] };
	}

	// Must have <svg root element
	if (!/<svg[\s>]/i.test(svg)) {
		errors.push('Missing <svg> root element');
	}

	// Must have viewBox for scalability
	if (!/viewBox\s*=/i.test(svg)) {
		errors.push('Missing viewBox attribute — required for scalable icons');
	}

	// Security: no script tags or event handlers
	if (/<script/i.test(svg)) {
		errors.push('Script tags are not allowed');
	}
	if (/\bon\w+\s*=/i.test(svg)) {
		errors.push('Event handler attributes are not allowed');
	}

	// Size check
	if (new Blob([svg]).size > 10240) {
		errors.push('SVG exceeds 10KB — icons should be lightweight');
	}

	return { valid: errors.length === 0, errors };
}
