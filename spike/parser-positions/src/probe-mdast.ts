import { fromMarkdown } from 'mdast-util-from-markdown';
import { directive } from 'micromark-extension-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';
const src = `:::hero{align="start"}
# Ship docs *today*

- [Get started](/docs) and more
- [View on GitHub](https://github.com/acme/docs "Repo")
:::
`;
const tree = fromMarkdown(src, {
	extensions: [directive()],
	mdastExtensions: [directiveFromMarkdown()],
});
const fmt = (p: any) =>
	p
		? `${p.start.line}:${p.start.column}(${p.start.offset})-${p.end.line}:${p.end.column}(${p.end.offset})`
		: '-';
const walk = (n: any, d = 0) => {
	const slice = n.position
		? JSON.stringify(src.slice(n.position.start.offset, n.position.end.offset)).slice(0, 60)
		: '';
	console.log(
		' '.repeat(d) + n.type + (n.name ? ':' + n.name : ''),
		fmt(n.position),
		slice,
		n.url ?? '',
		n.attributes ? JSON.stringify(n.attributes) : '',
	);
	for (const c of n.children ?? []) walk(c, d + 2);
};
walk(tree);
