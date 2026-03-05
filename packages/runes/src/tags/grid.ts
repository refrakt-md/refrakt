import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import type { RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { attribute, groupList, Model } from '../lib/index.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { SpaceSeparatedList } from '../attributes.js';
import { flow, GridFlow, gridItems, gridLayout } from '../layouts/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

class GridModel extends Model {
  @attribute({ type: Number, required: false })
  columns: number | undefined;

  @attribute({ type: Number, required: false })
  rows: number | undefined;

  @attribute({ type: String, required: false, matches: flow.slice() })
  flow: GridFlow;

  @attribute({ type: SpaceSeparatedList, required: false })
  spans: string[];

  @attribute({ type: String, required: false })
  ratio: string | undefined = undefined;

  @attribute({ type: String, required: false, matches: ['none', 'tight', 'default', 'loose'] })
  gap: string | undefined = undefined;

  @attribute({ type: String, required: false, matches: ['start', 'center', 'end'] })
  align: string | undefined = undefined;

  @attribute({ type: String, required: false, matches: ['sm', 'md', 'lg', 'never'] })
  collapse: string | undefined = undefined;

  @groupList({ delimiter: 'hr' })
  tiles: NodeStream[];

  transform(): RenderableTreeNodes {
    const tiles = this.tiles.map(t => t.transform());

    const layout = gridLayout({
      items: gridItems(this.spans, tiles),
      rows: this.rows,
      columns: this.columns,
      flow: this.flow
    })

    const ratioMeta = this.ratio ? new Tag('meta', { content: this.ratio }) : undefined;
    const gapMeta = this.gap && this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;
    const alignMeta = this.align ? new Tag('meta', { content: this.align }) : undefined;
    const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;

    return createComponentRenderable(schema.Grid, {
      tag: 'section',
      children: layout,
      properties: {
        ratio: ratioMeta,
        gap: gapMeta,
        align: alignMeta,
        collapse: collapseMeta,
      },
      refs: {
        cell: new RenderableNodeCursor(layout.children).tag('div'),
      }
    })
  }
}

export const grid = createSchema(GridModel, {
  layout: { newName: 'spans' },
});
