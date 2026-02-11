import { AbstractElementWrapper } from '@refract-md/types';
import { Tag } from '@markdoc/markdoc';

export class TagWrapper extends AbstractElementWrapper<Tag> {
  get children(): AbstractElementWrapper<Tag>[] {
    return this.elem.children.filter(c => Tag.isTag(c)).map(t => new TagWrapper(t));
  }

  get attributes() {
    return this.elem.attributes;
  }

  get text() {
    return this.elem.children.filter(c => !Tag.isTag(c)).join(' ');
  }
}
