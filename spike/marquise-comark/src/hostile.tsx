import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { parseMarkdown } from 'comark';
import security from 'comark/plugins/security';
import { MarkdownDocument } from '@comark/react';
import { renderHtmlFromDocument } from '@comark/html';
import { loadShapes } from './shapes.ts';
import { marquise, type Finding } from './plugin.ts';

const hostile = `<script>alert('script')</script>

<img src="x" onerror="alert('onerror')">

[click me](javascript:alert('link'))

::hero
# Hello

- [Get started](javascript:alert('item-href'))
::
`;
const shapes = loadShapes('shapes');
const Hero = ({ actions }: any) =>
	createElement(
		'div',
		null,
		...(actions ?? []).map((a: any) => createElement('a', { href: a.href }, a.label)),
	);
for (const withSecurity of [false, true]) {
	const findings: Finding[] = [];
	const plugins = [...(withSecurity ? [security()] : []), marquise(shapes, findings)()];
	const doc = await parseMarkdown(hostile, { plugins } as any);
	console.log(`\n===== security plugin: ${withSecurity}`);
	console.log('tree:', JSON.stringify(doc.nodes).slice(0, 420));
	console.log(
		'react:',
		renderToString(
			createElement(MarkdownDocument, { value: doc, components: { hero: Hero } } as any),
		),
	);
	console.log('html :', await renderHtmlFromDocument(doc));
}
