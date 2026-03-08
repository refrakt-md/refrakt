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

  @attribute({ type: String, required: false, matches: ['top', 'center', 'bottom', 'stretch', 'baseline'] })
  valign: string | undefined = undefined;

  @attribute({ type: String, required: false, matches: ['sm', 'md', 'lg', 'never'] })
  collapse: string | undefined = undefined;

  @attribute({ type: String, required: false, matches: ['columns', 'auto', 'masonry'] })
  mode: string = 'columns';

  @attribute({ type: String, required: false })
  min: string | undefined = undefined;

  @attribute({ type: String, required: false })
  aspect: string | undefined = undefined;

  @attribute({ type: String, required: false, matches: ['natural', 'reverse'] })
  stack: string | undefined = undefined;

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
    const valignMeta = this.valign ? new Tag('meta', { content: this.valign }) : undefined;
    const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;
    const modeMeta = this.mode && this.mode !== 'columns' ? new Tag('meta', { content: this.mode }) : undefined;
    const minMeta = this.min ? new Tag('meta', { content: this.min }) : undefined;
    const aspectMeta = this.aspect ? new Tag('meta', { content: this.aspect }) : undefined;
    const stackMeta = this.stack ? new Tag('meta', { content: this.stack }) : undefined;

    const metas: any[] = [ratioMeta, gapMeta, valignMeta, collapseMeta, modeMeta, minMeta, aspectMeta, stackMeta].filter(Boolean);

    return createComponentRenderable(schema.Grid, {
      tag: 'section',
      children: [...metas, layout],
      properties: {
        ...(modeMeta ? { mode: modeMeta } : {}),
        ratio: ratioMeta,
        gap: gapMeta,
        valign: valignMeta,
        collapse: collapseMeta,
        ...(minMeta ? { min: minMeta } : {}),
        ...(aspectMeta ? { aspect: aspectMeta } : {}),
        ...(stackMeta ? { stack: stackMeta } : {}),
      },
      refs: {
        cell: new RenderableNodeCursor(layout.children).tag('div'),
      }
    })
  }
}

const GRID_MODES = ['columns', 'auto', 'masonry'];

export const grid = createSchema(GridModel, {
  layout: {
    newName: 'spans',
    transform: (val: any, attrs: Record<string, any>) => {
      if (typeof val === 'string' && GRID_MODES.includes(val)) {
        attrs.mode = val;
        return undefined;
      }
      return val;
    },
  },
});
