import { markdocEvents, locatorEvents, readMarkdoc } from '../src/normalize.ts';
const src = `{% section %}\n\t{% slot name="sections" each %}\n\t\t{% slot /%}\n\t{% /slot %}\n{% /section %}\n`;
console.log('md :', markdocEvents(src).join(' | '));
console.log('loc:', locatorEvents(src).join(' | '));
const show = (n: any, d = 0) => { console.log('  '.repeat(d) + n.type + (n.tag ? ':' + n.tag : '') + (n.errors?.length ? ' ERR ' + n.errors[0].message : '')); for (const c of n.children ?? []) show(c, d + 1); };
show(readMarkdoc(src));
