import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { createTransform, renderToHtml } from '@refrakt-md/transform';
import type { RendererNode } from '@refrakt-md/types';
import { tags, nodes, serializeTree } from '../src/index.js';
import { baseConfig } from '../src/config.js';

/**
 * SPEC-160 D2 / WORK-652 — `section` gains the media split, cover and a media
 * kind. Zoning is opt-in: without `media-position` a section is exactly what it
 * was, and a `---` stays body content.
 */

function html(source: string): string {
	const tree = Markdoc.transform(Markdoc.parse(source), {
		tags,
		nodes,
		variables: { generatedIds: new Set<string>() },
	} as never);
	const engine = createTransform(baseConfig);
	return renderToHtml(engine(serializeTree(tree) as RendererNode) as RendererNode);
}

const zoned = (attrs: string, body = '![A view](view.png)\n\n---\n\n## Heading\n\nThe blurb.') =>
	html(`{% section ${attrs} %}\n${body}\n{% /section %}`);

describe('section without media-position', () => {
	it('keeps a `---` in the body and adds no zones', () => {
		const out = html('{% section %}\n## Heading\n\nOne.\n\n---\n\nTwo.\n{% /section %}');
		expect(out).toContain('<hr />');
		expect(out).not.toContain('data-name="media"');
		expect(out).not.toContain('data-name="content"');
		expect(out).not.toContain('data-media-position');
	});
});

describe('section with media-position', () => {
	it('reads media, body and footer zones by card’s rule', () => {
		const out = zoned(
			'media-position="top"',
			'![A view](view.png)\n\n---\n\n## Heading\n\nThe blurb.\n\nBody.\n\n---\n\nThe footer.',
		);
		expect(out).toMatch(
			/<section class="rf-section rf-section--start" data-align="start" data-media-position="top" data-rune="section"/,
		);
		expect(out).toMatch(
			/<div data-name="media" class="rf-section__media" data-section="media" data-guest-fit="clip"><img src="view.png" alt="A view" \/><\/div>/,
		);
		expect(out).toMatch(
			/<footer data-name="footer" class="rf-section__footer"><p>The footer\.<\/p><\/footer>/,
		);
		expect(out).not.toContain('<hr');
	});

	it('keeps its header anatomy in the content column', () => {
		const out = zoned('media-position="start"');
		expect(out).toMatch(
			/<div data-name="content" class="rf-section__content"><header data-name="preamble"[^>]*><h2 id="heading" data-name="headline"[^>]*>Heading<\/h2><p data-name="blurb"/,
		);
	});

	it('omits the media element for an empty leading zone', () => {
		const out = zoned('media-position="top"', '---\n\n## Heading\n\nThe blurb.');
		expect(out).not.toContain('data-name="media"');
		expect(out).toContain('data-name="content"');
	});

	it('reads one zone as the body', () => {
		const out = zoned('media-position="top"', '## Heading\n\nThe blurb.');
		expect(out).not.toContain('data-name="media"');
		expect(out).toContain('data-name="headline"');
	});

	it('emits ratio and valign only beside the content', () => {
		const beside = zoned('media-position="end" media-ratio="1/3" valign="center"');
		expect(beside).toContain('data-media-ratio="1/3"');
		expect(beside).toContain('--split-valign: center');
		const stacked = zoned('media-position="top" media-ratio="1/3"');
		expect(stacked).not.toContain('data-media-ratio');
	});
});

describe('section media kind', () => {
	it('stamps data-media on the media zone', () => {
		const out = zoned('media-position="top" media="portrait"');
		expect(out).toMatch(/<div data-media="portrait" data-name="media"[^>]*data-section="media"/);
	});

	it('leaves the zone without a kind when media is not given', () => {
		expect(zoned('media-position="top"')).not.toContain('data-media=');
	});
});

describe('section cover', () => {
	it('is the full-scope cover variant, as on card', () => {
		const out = zoned('media-position="cover" content-place="end start" height="lg"');
		expect(out).toContain('rf-section--cover');
		expect(out).toContain('data-cover-scope="full"');
		expect(out).toContain('data-content-place="end start"');
		expect(out).toContain('data-height="lg"');
	});
});
