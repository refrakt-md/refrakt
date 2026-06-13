import Markdoc from '@markdoc/markdoc';
import type { Config } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { parseSvgToTags } from './svg.js';

export interface IconResolveOptions {
	/** CSS size override, applied to width + height. */
	size?: string;
	/** Accessible label — adds `role="img"` + `aria-label` when set. */
	label?: string;
}

export interface ResolvedIcon {
	tag: InstanceType<typeof Tag>;
	/** False when the name wasn't in the registry (fallback returned). */
	found: boolean;
}

/** Split an icon name into `group` + `name` (default group `global`). */
export function splitIconName(name: string): { group: string; name: string } {
	const slash = name.indexOf('/');
	if (slash === -1) return { group: 'global', name };
	return { group: name.substring(0, slash), name: name.substring(slash + 1) };
}

/**
 * Resolve an icon name to an inline SVG Tag using the theme icon registry
 * (`config.variables.__icons`). Shared by the `{% icon %}` rune and the
 * `icon:` image-src scheme so both draw from exactly the same icon source.
 *
 * Names may be group-qualified (`hint/warning`); a bare name resolves against
 * the `global` group. Unknown names yield a graceful `<span class="rf-icon">`
 * fallback with `found: false` so callers can decide whether to warn.
 */
export function resolveIcon(
	name: string,
	config: Config,
	opts: IconResolveOptions = {},
): ResolvedIcon {
	const { group, name: iconName } = splitIconName(name);
	const icons = config.variables?.__icons as
		| Record<string, Record<string, string>>
		| undefined;
	const svgString = icons?.[group]?.[iconName];

	if (svgString) {
		const tag = parseSvgToTags(svgString, name);
		if (opts.size) {
			tag.attributes.width = opts.size;
			tag.attributes.height = opts.size;
		}
		if (opts.label) {
			tag.attributes.role = 'img';
			tag.attributes['aria-label'] = opts.label;
		}
		return { tag, found: true };
	}

	const attrs: Record<string, string> = { class: 'rf-icon', 'data-icon': name };
	if (opts.size) attrs.style = `width:${opts.size};height:${opts.size}`;
	if (opts.label) {
		attrs.role = 'img';
		attrs['aria-label'] = opts.label;
	}
	return { tag: new Tag('span', attrs), found: false };
}
