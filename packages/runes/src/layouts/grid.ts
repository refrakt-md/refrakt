import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { RenderableNodeCursor } from '../lib/renderable.js';

export const flow = ['row', 'column', 'dense', 'row dense', 'column dense'] as const;

export type GridFlow = typeof flow[number];

export interface GridItem {
  colspan?: number;
  rowspan?: number;
  children: RenderableNodeCursor;
}

export interface GridLayoutOptions {
  items: GridItem[];
  columns?: number;
  rows?: number;
  flow?: GridFlow;
}

export function gridItems(layout: string[], content: RenderableNodeCursor[]): GridItem[] {
  return layout
    .map((e, i) => {
      const [c, r] = e.split(':');
      return {
        colspan: parseInt(c),
        rowspan: r ? parseInt(r) : undefined ,
        children: content[i],
      }
    })
    .filter(item => item.children !== undefined);
}

export function gridLayout(options: GridLayoutOptions) {
  const items = options.items
    .map(({ children, colspan, rowspan }) => children
      .wrap('div', { 'data-colspan': colspan, 'data-rowspan': rowspan })
      .toArray()
    )
    .flat()

  const attr = {
    'data-layout':
    'grid',
    'data-columns': options.columns,
    'data-rows': options.rows,
    'data-flow': options.flow,
  };

  return new Tag('div', attr, items);
}
