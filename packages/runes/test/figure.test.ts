import { describe, it, expect } from 'vitest';
import { parse, findTag, fields } from './helpers.js';

describe('figure tag', () => {
	it('should transform image with caption attribute', () => {
		const result = parse(`{% figure caption="A sunset" %}
![Sunset](/images/sunset.jpg)
{% /figure %}`);

		const fig = findTag(result as any, (t) => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();
		expect(fig!.name).toBe('figure');

		const caption = findTag(fig!, (t) => t.name === 'figcaption');
		expect(caption).toBeDefined();
		expect(caption!.children).toContain('A sunset');
	});

	it('should use paragraph as caption when no attribute given', () => {
		const result = parse(`{% figure %}
![Sunset](/images/sunset.jpg)

A beautiful sunset over the ocean.
{% /figure %}`);

		const fig = findTag(result as any, (t) => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();

		const caption = findTag(fig!, (t) => t.name === 'figcaption');
		expect(caption).toBeDefined();
	});

	it('should render size and align as meta tags', () => {
		const result = parse(`{% figure size="large" align="center" %}
![Photo](/images/photo.jpg)
{% /figure %}`);

		const fig = findTag(result as any, (t) => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();

		expect(fields(fig).size).toBe('large');
		expect(fields(fig).align).toBe('center');
	});

	// SPEC-106 regression — a `placeholder:`/`icon:` scheme src resolves to an
	// inline <svg>, not <img>; the figure must still keep it as its media.
	it('keeps a scheme-resolved <svg> placeholder as the figure media', () => {
		const result = parse(`{% figure caption="Dashboard overview" %}
![Dashboard](placeholder:cover)
{% /figure %}`);

		const fig = findTag(result as any, (t) => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();
		const svg = findTag(
			fig!,
			(t) => t.name === 'svg' && /rf-placeholder/.test(String(t.attributes.class)),
		);
		expect(svg).toBeDefined();
		expect(svg!.attributes['data-shape']).toBe('cover');
	});
});

// BUG-028 — an image-only figure is the case that worked, and making figure a
// general captioned container must not move it by a byte. These snapshots were
// recorded against the pre-fix transform; the fix commit leaves them untouched.
describe('figure — image-only output is unchanged (BUG-028)', () => {
	const figureOf = (src: string) => {
		const fig = findTag(parse(src) as any, (t) => t.attributes['data-rune'] === 'figure');
		return JSON.parse(JSON.stringify(fig));
	};

	it('caption attribute', () => {
		expect(
			figureOf(`{% figure caption="A sunset" size="large" align="center" %}
![Sunset](/images/sunset.jpg)
{% /figure %}`),
		).toMatchInlineSnapshot(`
			{
			  "$$mdtype": "Tag",
			  "attributes": {
			    "data-rune": "figure",
			    "data-rune-fields": "{"size":"large","align":"center"}",
			    "typeof": "ImageObject",
			  },
			  "children": [
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "alt": "Sunset",
			        "data-name": "image",
			        "property": "contentUrl",
			        "src": "/images/sunset.jpg",
			      },
			      "children": [],
			      "name": "img",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "data-name": "caption",
			        "property": "caption",
			      },
			      "children": [
			        "A sunset",
			      ],
			      "name": "figcaption",
			    },
			  ],
			  "name": "figure",
			}
		`);
	});

	it('paragraph caption, written after the image', () => {
		expect(
			figureOf(`{% figure size="medium" %}
![Hot springs](/images/springs.jpg)

Steam rising from volcanic hot springs.
{% /figure %}`),
		).toMatchInlineSnapshot(`
			{
			  "$$mdtype": "Tag",
			  "attributes": {
			    "data-rune": "figure",
			    "data-rune-fields": "{"size":"medium"}",
			    "typeof": "ImageObject",
			  },
			  "children": [
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "alt": "Hot springs",
			        "data-name": "image",
			        "property": "contentUrl",
			        "src": "/images/springs.jpg",
			      },
			      "children": [],
			      "name": "img",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "data-name": "caption",
			        "property": "caption",
			      },
			      "children": [
			        {
			          "$$mdtype": "Tag",
			          "attributes": {},
			          "children": [
			            "Steam rising from volcanic hot springs.",
			          ],
			          "name": "p",
			        },
			      ],
			      "name": "figcaption",
			    },
			  ],
			  "name": "figure",
			}
		`);
	});

	it('paragraph caption, written before the image', () => {
		expect(
			figureOf(`{% figure %}
Steam rising from volcanic hot springs.

![Hot springs](/images/springs.jpg)
{% /figure %}`),
		).toMatchInlineSnapshot(`
			{
			  "$$mdtype": "Tag",
			  "attributes": {
			    "data-rune": "figure",
			    "typeof": "ImageObject",
			  },
			  "children": [
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "alt": "Hot springs",
			        "data-name": "image",
			        "property": "contentUrl",
			        "src": "/images/springs.jpg",
			      },
			      "children": [],
			      "name": "img",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "data-name": "caption",
			        "property": "caption",
			      },
			      "children": [
			        {
			          "$$mdtype": "Tag",
			          "attributes": {},
			          "children": [
			            "Steam rising from volcanic hot springs.",
			          ],
			          "name": "p",
			        },
			      ],
			      "name": "figcaption",
			    },
			  ],
			  "name": "figure",
			}
		`);
	});

	it('two images, one per paragraph and two in one paragraph', () => {
		expect(
			figureOf(`{% figure caption="Three views" %}
![One](/images/1.jpg)

![Two](/images/2.jpg)
![Three](/images/3.jpg)
{% /figure %}`),
		).toMatchInlineSnapshot(`
			{
			  "$$mdtype": "Tag",
			  "attributes": {
			    "data-rune": "figure",
			    "typeof": "ImageObject",
			  },
			  "children": [
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "alt": "One",
			        "data-name": "image",
			        "property": "contentUrl",
			        "src": "/images/1.jpg",
			      },
			      "children": [],
			      "name": "img",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "alt": "Two",
			        "src": "/images/2.jpg",
			      },
			      "children": [],
			      "name": "img",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "alt": "Three",
			        "src": "/images/3.jpg",
			      },
			      "children": [],
			      "name": "img",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "data-name": "caption",
			        "property": "caption",
			      },
			      "children": [
			        "Three views",
			      ],
			      "name": "figcaption",
			    },
			  ],
			  "name": "figure",
			}
		`);
	});

	it('scheme-resolved placeholder', () => {
		expect(
			figureOf(`{% figure caption="Dashboard overview" %}
![Dashboard](placeholder:cover)
{% /figure %}`),
		).toMatchInlineSnapshot(`
			{
			  "$$mdtype": "Tag",
			  "attributes": {
			    "data-rune": "figure",
			    "typeof": "ImageObject",
			  },
			  "children": [
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "aria-label": "Dashboard",
			        "class": "rf-placeholder",
			        "data-name": "image",
			        "data-shape": "cover",
			        "fill": "none",
			        "preserveAspectRatio": "xMidYMid slice",
			        "property": "contentUrl",
			        "role": "img",
			        "viewBox": "0 0 1600 900",
			        "width": "100%",
			      },
			      "children": [
			        {
			          "$$mdtype": "Tag",
			          "attributes": {
			            "fill": "var(--rf-color-surface)",
			            "height": 900,
			            "width": 1600,
			            "x": 0,
			            "y": 0,
			          },
			          "children": [],
			          "name": "rect",
			        },
			        {
			          "$$mdtype": "Tag",
			          "attributes": {
			            "cx": 1216,
			            "cy": 270,
			            "fill": "var(--rf-color-border)",
			            "r": 90,
			          },
			          "children": [],
			          "name": "circle",
			        },
			        {
			          "$$mdtype": "Tag",
			          "attributes": {
			            "d": "M0 648 Q 448 495 800 630 T 1600 576 L 1600 900 L 0 900 Z",
			            "fill": "var(--rf-color-muted)",
			          },
			          "children": [],
			          "name": "path",
			        },
			        {
			          "$$mdtype": "Tag",
			          "attributes": {
			            "fill": "none",
			            "height": 893,
			            "stroke": "var(--rf-color-border)",
			            "stroke-width": 7,
			            "width": 1593,
			            "x": 4,
			            "y": 4,
			          },
			          "children": [],
			          "name": "rect",
			        },
			      ],
			      "name": "svg",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "data-name": "caption",
			        "property": "caption",
			      },
			      "children": [
			        "Dashboard overview",
			      ],
			      "name": "figcaption",
			    },
			  ],
			  "name": "figure",
			}
		`);
	});

	it('frame-aspect and elevation', () => {
		expect(
			figureOf(`{% figure elevation="floating" frame-aspect="4/3" caption="Framed" %}
![Coral reef](/images/reef.jpg)
{% /figure %}`),
		).toMatchInlineSnapshot(`
			{
			  "$$mdtype": "Tag",
			  "attributes": {
			    "data-rune": "figure",
			    "elevation": "floating",
			    "typeof": "ImageObject",
			  },
			  "children": [
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "alt": "Coral reef",
			        "data-name": "image",
			        "property": "contentUrl",
			        "src": "/images/reef.jpg",
			      },
			      "children": [],
			      "name": "img",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "data-name": "caption",
			        "property": "caption",
			      },
			      "children": [
			        "Framed",
			      ],
			      "name": "figcaption",
			    },
			    {
			      "$$mdtype": "Tag",
			      "attributes": {
			        "content": "4/3",
			        "data-field": "frame-aspect",
			      },
			      "children": [],
			      "name": "meta",
			    },
			  ],
			  "name": "figure",
			}
		`);
	});
});
