import { markdocEvents, locatorEvents } from '../src/normalize.ts';
const src = 'A [first](/a\\)b "Title") and [second](</with space>).\n';
console.log('md :', markdocEvents(src).join(' | '));
console.log('loc:', locatorEvents(src).join(' | '));
