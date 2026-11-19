import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdc from 'remark-mdc';
const src = `::hero{align="start"}
# Ship docs *today*

- [View on GitHub](https://github.com/acme/docs "Repo")

#headline
Explicit *slot*
::
`;
const tree = unified().use(remarkParse).use(remarkMdc).parse(src);
const walk = (n: any, d = 0) => {
	const p = n.position;
	console.log(
		' '.repeat(d) + n.type + (n.name ? ':' + n.name : ''),
		p
			? `${p.start.offset}-${p.end.offset} ${JSON.stringify(src.slice(p.start.offset, p.end.offset)).slice(0, 50)}`
			: '-',
		n.attributes ? JSON.stringify(n.attributes) : '',
		n.url ?? '',
	);
	for (const c of n.children ?? []) walk(c, d + 2);
};
walk(tree);
