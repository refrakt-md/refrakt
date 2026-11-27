import Markdoc from '@markdoc/markdoc';
const src = `{% group #g1 %}
Intro *text*.

\`\`\`js label="Server"
const a = 1;
\`\`\`

- **Ada** — Engineer
- [x] task \`code\` [l](../src/a.ts#build){% reviewed "aaaa:bbbb" /%}
{% /group %}
`;
const ast = Markdoc.parse(src);
const strip = (n, d=0) => { console.log(' '.repeat(d*2)+n.type, n.tag||'', JSON.stringify(n.attributes), JSON.stringify(n.lines), n.annotations?.length||''); n.children.forEach(c=>strip(c,d+1)); };
strip(ast);
