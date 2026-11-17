// Write templates for compact forms, written in a shape file's body (notes section 18, "Writing
// forms"): which Markdoc constructs survive inside the positions a template needs.
import Markdoc from '@markdoc/markdoc';

type Node = ReturnType<typeof Markdoc.parse>;

function show(node: Node, depth = 0): void {
	const attrs =
		node.attributes && Object.keys(node.attributes).length
			? ` ${JSON.stringify(node.attributes)}`
			: '';
	console.log(`${' '.repeat(depth)}${node.type}${node.tag ? `:${node.tag}` : ''}${attrs}`);
	for (const child of node.children) show(child, depth + 2);
}

const cases: [string, string][] = [
	[
		'a placement tag and an optional wrapper, inline',
		'- **{% place "name" /%}**{% optional %} ({% place "duration" /%}){% /optional %} [listen]({% place "src" /%})',
	],
	['a tag inside a link destination', '[listen]({% place "src" /%})'],
	['a variable inside a link destination', '[listen]({% $src %})'],
	['a variable inside an angle-bracket destination', '[listen](<{% $src %}>)'],
	['a $field sentinel as a link destination', '[listen]($src)'],
	['a tag in alt text, a sentinel as image source', '![{% place "alt" /%}]($image)'],
	[
		'built-in Markdoc only: variables, if, a sentinel',
		'- **{% $name %}**{% if $artist %} *{% $artist %}*{% /if %} [listen]($src)',
	],
];

for (const [title, source] of cases) {
	console.log(`\n--- ${title}\n    ${source}`);
	show(Markdoc.parse(source));
}
