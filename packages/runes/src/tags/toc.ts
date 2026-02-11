import { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import type { HeadingInfo } from '../util.js';

class TocModel extends Model {
	@attribute({ type: Number, required: false })
	depth: number = 3;

	@attribute({ type: Boolean, required: false })
	ordered: boolean = false;

	transform(): RenderableTreeNodes {
		const headings: HeadingInfo[] = this.config.variables?.headings || [];

		// Filter to h2..h{depth+1}
		const maxLevel = this.depth + 1;
		const filtered = headings.filter(h => h.level >= 2 && h.level <= maxLevel);

		const items = filtered.map(h =>
			new Tag('li', { 'data-level': h.level }, [
				new Tag('a', { href: `#${h.id}` }, [h.text]),
			])
		);

		const list = new Tag('ul', {}, items);
		const depthMeta = new Tag('meta', { content: this.depth });
		const orderedMeta = new Tag('meta', { content: this.ordered });

		return createComponentRenderable(schema.TableOfContents, {
			tag: 'nav',
			properties: {
				depth: depthMeta,
				ordered: orderedMeta,
			},
			refs: {
				list,
			},
			children: [depthMeta, orderedMeta, list],
		});
	}
}

export const toc = createSchema(TocModel);
