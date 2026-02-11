import Markdoc, { Node, RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { splitLayout } from '../layouts/index.js';
import { CommaSeparatedList, SpaceSeparatedNumberList } from '../attributes.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { pageSectionProperties } from './common.js';
import { MusicRecordingNode } from './music-recording.js';

class MusicPlaylistModel extends Model {
  @attribute({ type: CommaSeparatedList, required: false })
  trackFields: string[];

  @attribute({ type: String, required: false })
  audio: string;

  @attribute({ type: SpaceSeparatedNumberList, required: false })
  split: number[];

  @attribute({ type: Boolean, required: false })
  mirror: boolean = false;

  @group({ section: 0, include: ['heading', 'paragraph'] })
  header: NodeStream;

  @group({ include: [{ node: 'tag' }] })
  tracks: NodeStream;

  processChildren(nodes: Node[]): Node[] {
    const listIndex = nodes.findIndex(n => n.type === 'list');

    return super.processChildren([
      ...nodes.slice(0, listIndex),
      ...nodes[listIndex].children.map(item => MusicRecordingNode.fromItem(item, this.trackFields)),
      ...nodes.slice(listIndex + 1),
    ]);
  }

  transform(): RenderableTreeNodes {
    const header = this.header
      .useNode('paragraph', node => {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        return Markdoc.transform(img ? img : node, this.config);
      })
      .transform();

    const tracks = this.tracks.transform();

    return createComponentRenderable(schema.MusicPlaylist, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(header),
        track: tracks.tag('li').typeof('MusicRecording'),
      },
      children: splitLayout({
        split: this.split,
        mirror: this.mirror,
        main: header.toArray(),
        side: tracks.wrap('ol').toArray(),
      }).next()
    });
  }
}

export const musicPlaylist = createSchema(MusicPlaylistModel);
