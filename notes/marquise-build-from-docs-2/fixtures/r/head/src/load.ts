import { read } from './read';

/** Build every page. */
export function build(pages: string[]): number {
    let n = 0;
    for (const p of pages) {   n += read(p).length;   }

    return n;
}
