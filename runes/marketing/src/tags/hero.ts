import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, group, Model, createComponentRenderable, createSchema, NodeStream, RenderableNodeCursor, linkItem, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

const alignType = ['left', 'center', 'right'] as const;

class HeroModel extends Model {
	@attribute({ type: String, required: false })
	background: string = '';

	@attribute({ type: String, required: false })
	backgroundImage: string = '';

	@attribute({ type: String, required: false, matches: alignType.slice() })
	align: typeof alignType[number] = 'center';

	@group({ section: 0, include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ section: 0, include: ['list', 'fence'] })
	actions: NodeStream;

	@group({ section: 1 })
	showcase: NodeStream;

	transform() {
		const header = this.header.transform();
		const actions = this.actions
			.useNode('item', linkItem)
			.useNode('fence', node => {
				const output = new RenderableNodeCursor([Markdoc.transform(node, this.config)]);

				return createComponentRenderable(schema.Command, {
					tag: 'div',
					properties: {
						code: output.flatten().tag('code'),
					},
					children: output.next(),
				});
			})
			.transform();

		const side = this.showcase.transform();

		const backgroundMeta = new Tag('meta', { content: this.background });
		const backgroundImageMeta = new Tag('meta', { content: this.backgroundImage });
		const alignMeta = new Tag('meta', { content: this.align });

		const actionsDiv = actions.wrap('div');
		const showcaseDiv = side.wrap('div');

		return createComponentRenderable(schema.Hero, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				background: backgroundMeta,
				backgroundImage: backgroundImageMeta,
				align: alignMeta,
				action: actions.flatten().tags('li', 'div'),
			},
			refs: {
				actions: actionsDiv,
				body: header.wrap('div'),
				showcase: showcaseDiv,
			},
			children: [
				backgroundMeta,
				backgroundImageMeta,
				alignMeta,
				header.wrap('header').next(),
				actionsDiv.next(),
				...(side.toArray().length > 0 ? [showcaseDiv.next()] : []),
			],
		});
	}
}

export const hero = createSchema(HeroModel);
