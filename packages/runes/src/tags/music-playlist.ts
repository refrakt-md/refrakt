import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
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

    const mainContent = header.wrap('div', { 'data-name': 'main' });
    const sideContent = tracks.wrap('ol').wrap('div', { 'data-name': 'showcase' });

    const splitMeta = this.split.length > 0
      ? new Tag('meta', { property: 'split', content: this.split.join(' ') })
      : null;
    const mirrorMeta = this.mirror
      ? new Tag('meta', { property: 'mirror', content: 'true' })
      : null;

    const children = [
      splitMeta,
      mirrorMeta,
      mainContent.next(),
      sideContent.next(),
    ].filter(Boolean);

    return createComponentRenderable(schema.MusicPlaylist, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(header),
        track: tracks.tag('li').typeof('MusicRecording'),
      },
      children,
    });
  }
}

export const musicPlaylist = createSchema(MusicPlaylistModel);
