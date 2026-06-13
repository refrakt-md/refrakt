import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;

interface ShapeSpec {
	/** viewBox width. */
	w: number;
	/** viewBox height. */
	h: number;
	/** Round (avatar) treatment instead of the framed-scene treatment. */
	round?: boolean;
}

/**
 * Named placeholder shapes → viewBox aspect. Dimensions are arbitrary units
 * (the SVG scales to its container); only the ratio matters.
 */
const SHAPES: Record<string, ShapeSpec> = {
	cover: { w: 1600, h: 900 }, // 16:9
	square: { w: 1000, h: 1000 }, // 1:1
	portrait: { w: 750, h: 1000 }, // 3:4
	wide: { w: 2400, h: 1000 }, // 12:5
	banner: { w: 1800, h: 600 }, // 3:1
	avatar: { w: 1000, h: 1000, round: true }, // round 1:1
	thumbnail: { w: 800, h: 600 }, // 4:3
};

export const PLACEHOLDER_SHAPES = Object.keys(SHAPES);
export const DEFAULT_PLACEHOLDER_SHAPE = 'cover';

export interface PlaceholderOptions {
	/** Accessible label (the image `alt`). Empty → decorative (aria-hidden). */
	label?: string;
}

/** Round to keep generated path/coordinate strings deterministic + compact. */
const r = (n: number): number => Math.round(n);

/**
 * Build a deterministic, theme-token-tinted inline SVG placeholder for a named
 * shape. Backs the `placeholder:<shape>` image-src scheme. Colours reference
 * `--rf-color-surface` / `--rf-color-muted` / `--rf-color-border`, so the
 * placeholder tracks the active theme tint and dark mode automatically.
 *
 * Unknown shapes fall back to `cover` (callers may warn).
 */
export function placeholderSvg(
	shape: string,
	opts: PlaceholderOptions = {},
): InstanceType<typeof Tag> {
	const key = SHAPES[shape] ? shape : DEFAULT_PLACEHOLDER_SHAPE;
	const spec = SHAPES[key];
	const { w, h } = spec;

	const children = spec.round
		? avatarScene(w, h)
		: framedScene(w, h);

	const attrs: Record<string, unknown> = {
		class: 'rf-placeholder',
		'data-shape': key,
		viewBox: `0 0 ${w} ${h}`,
		preserveAspectRatio: 'xMidYMid slice',
		width: '100%',
		fill: 'none',
	};
	if (opts.label) {
		attrs.role = 'img';
		attrs['aria-label'] = opts.label;
	} else {
		attrs['aria-hidden'] = 'true';
	}

	return new Tag('svg', attrs, children);
}

/** Neutral horizon scene: surface ground, a hill silhouette, a sun, a frame. */
function framedScene(w: number, h: number): InstanceType<typeof Tag>[] {
	const stroke = r(Math.min(w, h) * 0.008);
	const sunR = r(Math.min(w, h) * 0.1);
	const hill = `M0 ${r(h * 0.72)} `
		+ `Q ${r(w * 0.28)} ${r(h * 0.55)} ${r(w * 0.5)} ${r(h * 0.7)} `
		+ `T ${w} ${r(h * 0.64)} `
		+ `L ${w} ${h} L 0 ${h} Z`;

	return [
		new Tag('rect', { x: 0, y: 0, width: w, height: h, fill: 'var(--rf-color-surface)' }),
		new Tag('circle', { cx: r(w * 0.76), cy: r(h * 0.3), r: sunR, fill: 'var(--rf-color-border)' }),
		new Tag('path', { d: hill, fill: 'var(--rf-color-muted)' }),
		new Tag('rect', {
			x: r(stroke / 2),
			y: r(stroke / 2),
			width: r(w - stroke),
			height: r(h - stroke),
			fill: 'none',
			stroke: 'var(--rf-color-border)',
			'stroke-width': stroke,
		}),
	];
}

/** Neutral avatar: round surface field with a person silhouette + ring. */
function avatarScene(w: number, h: number): InstanceType<typeof Tag>[] {
	const cx = r(w / 2);
	const cy = r(h / 2);
	const stroke = r(Math.min(w, h) * 0.02);
	const ringR = r(w / 2 - stroke);
	const headR = r(w * 0.16);
	const headCy = r(h * 0.42);
	const shoulders = `M ${r(w * 0.24)} ${h} `
		+ `Q ${cx} ${r(h * 0.6)} ${r(w * 0.76)} ${h} Z`;

	return [
		new Tag('circle', { cx, cy, r: r(w / 2), fill: 'var(--rf-color-surface)' }),
		new Tag('path', { d: shoulders, fill: 'var(--rf-color-muted)' }),
		new Tag('circle', { cx, cy: headCy, r: headR, fill: 'var(--rf-color-muted)' }),
		new Tag('circle', {
			cx,
			cy,
			r: ringR,
			fill: 'none',
			stroke: 'var(--rf-color-border)',
			'stroke-width': stroke,
		}),
	];
}
