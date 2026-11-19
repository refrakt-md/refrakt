import { parseMarkdown, defineComarkPlugin } from 'comark';
const src = `::hero{align="start"}
# Ship docs *today*

- [Get started](/docs) and more
- [View on GitHub](https://github.com/acme/docs "Repo")
::
`;
const probe = defineComarkPlugin(() => ({
	name: 'probe',
	post(state: any) {
		const dump = (toks: any[], d = 0) => {
			for (const t of toks) {
				const pos = Object.keys(t)
					.filter((k) => /pos|offset|start|end|loc/i.test(k))
					.map((k) => `${k}=${JSON.stringify(t[k])}`)
					.join(' ');
				console.log(
					' '.repeat(d) + t.type,
					'map=' + JSON.stringify(t.map),
					pos,
					t.type === 'link_open' ? JSON.stringify(t.attrs) : '',
				);
				if (t.children) dump(t.children, d + 2);
			}
		};
		dump(state.tokens);
		console.log('tree:', JSON.stringify(state.tree.nodes).slice(0, 300));
	},
}));
await parseMarkdown(src, { plugins: [probe()] });
