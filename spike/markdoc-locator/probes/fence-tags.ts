import { readMarkdoc } from '../src/normalize.ts';
import Markdoc from '@markdoc/markdoc';
const src = "Intro.\n\n```markdoc\n{% accordion schema=\"none\" %}\n```\n\nAfter the fence.\n\n## Heading\n";
const ast = readMarkdoc(src);
const show = (n: any, d = 0) => { console.log('  '.repeat(d) + n.type + (n.tag ? ':' + n.tag : '') + (n.attributes?.content && typeof n.attributes.content==='string' ? ' ' + JSON.stringify(n.attributes.content.slice(0,30)) : '')); for (const c of n.children ?? []) show(c, d + 1); };
show(ast);
console.log('---rendered:');
console.log(Markdoc.renderers.html(Markdoc.transform(ast)));
