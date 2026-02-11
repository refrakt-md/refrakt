import Markdoc from '@markdoc/markdoc';
import type { Tag, Node, RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { NodeType } from '@refract-md/types';
import { TypedNode } from '../interfaces.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import * as Duration from 'iso8601-duration';

class MusicRecordingModel extends Model {
  @attribute({ type: Boolean, required: false })
  listItem: boolean = false;

  @attribute({ type: String, required: false })
  byArtist: string | undefined;

  @attribute({ type: Number, required: false })
  copyrightYear: number | undefined;

  @attribute({ type: String, required: false })
  duration: string | undefined;

  @group({ include: ['heading'] })
  title: NodeStream;

  private formatDuration(d: Duration.Duration): string {
    const s = d.seconds?.toString().padStart(2, '0');
    return `${d.minutes}:${s}`;
  }

  private transformDuration() {
    if (this.duration) {
      return new RenderableNodeCursor([
        new Markdoc.Tag('span', { content: this.duration }, [this.formatDuration(Duration.parse(this.duration))])
      ]);
    }
    return new RenderableNodeCursor<Tag<'span'>>([]);
  }

  transform(): RenderableTreeNodes {
    const tagName = this.listItem ? 'li' : 'div';

    const children = this.title.transform();

    const name = children.tag('h1');
    const byArtist = RenderableNodeCursor.fromData(this.byArtist, 'span');
    const copyrightYear = RenderableNodeCursor.fromData(this.copyrightYear, 'span');
    const duration = this.transformDuration();

    return createComponentRenderable(schema.MusicRecording, {
      tag: tagName,
      properties: {
        name,
        byArtist,
        copyrightYear,
        duration,
      },
      children: children.concat(byArtist, copyrightYear, duration).toArray(),
    });
  }
}

export const musicRecording = createSchema(MusicRecordingModel);

export class MusicRecordingNode<T extends 'div' | 'li'> extends TypedNode<'tag', T> {
  constructor(attributes: MusicRecordingAttributes = {}, children: Node[] = []) {
    super('tag', attributes, children, 'music-recording');
  }

  static parseProperty(name: string, value: string) {
    switch (name) {
      case 'copyrightYear': return parseInt(value);
      default: return value;
    }
  }

  static fromItem(item: Node, fieldNames: string[]) {
    const inline = item.children.find(n => n.type === 'inline');
    const text = inline ? inline.children[0] : undefined;
    const attr: Record<string, any> = {
      listItem: true,
    };

    if (text) {
      const fields = (text.attributes.content as string).split('|').map(f => f.trim());
      fieldNames.forEach((key, index) => {
        attr[key] = MusicRecordingNode.parseProperty(key, fields[index]);
      });
    }
    return new MusicRecordingNode<'li'>(attr, item.children.filter(c => c.type === 'heading'))
  }
}

interface MusicRecordingAttributes {
  listItem?: boolean;
  byArtist?: string;
  copyrightYear?: number;
  duration?: string;
}
