import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNode } from '@markdoc/markdoc';
import { RenderableNodeCursor } from '../lib/renderable.js';

export { GridFlow, gridLayout, gridItems, flow } from './grid.js';

export interface SplitLayoutOptions {
  split: number[],
  mirror: boolean,
  main: RenderableTreeNode[],
  side: RenderableTreeNode[],
}

export class GridLayoutCursor extends RenderableNodeCursor<Tag<'div'>> {
  gridItem(index: number) {
    return new RenderableNodeCursor([this.nodes[0].children[index]]).tag('div');
  }
}

export function splitLayout(options: SplitLayoutOptions) {
  const { main, side, split, mirror } = options;
  const columns = split.reduce((cols, c) => cols + c, 0);

  function createCursor(layout: Tag<'div'>) {
    return new GridLayoutCursor([layout]);
  }

  if (split && split.length === 2) {
    return createCursor(new Markdoc.Tag('div', { 'data-name': 'layout', 'data-layout': 'grid', 'data-columns': columns }, [
      new Markdoc.Tag('div', { 'data-colspan': split[mirror ? 1 : 0] }, mirror ? side : main),
      new Markdoc.Tag('div', { 'data-colspan': split[mirror ? 0 : 1] }, mirror ? main : side),
    ]))
  }
  return createCursor(new Markdoc.Tag('div', { 'data-name': 'layout', 'data-layout': 'grid', 'data-columns': columns }, [
    new Markdoc.Tag('div', { 'data-colspan': 12 }, main),
    new Markdoc.Tag('div', { 'data-colspan': 12 }, side),
  ]));
}
