import Markdoc from '@markdoc/markdoc';
const src = `{% hero align="start" %}
# Ship docs *today*

- [Get started](/docs) and more
- [View on GitHub](https://github.com/acme/docs "Repo")
{% /hero %}
`;
const ast = Markdoc.parse(src);
const walk = (n: any, d = 0) => {
	console.log(
		' '.repeat(d) + n.type + (n.tag ? ':' + n.tag : ''),
		JSON.stringify(n.location ?? null),
		JSON.stringify(n.lines ?? null),
		n.attributes?.href ?? '',
	);
	for (const c of n.children ?? []) walk(c, d + 2);
};
walk(ast);
