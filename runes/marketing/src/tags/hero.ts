import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema, attribute, group, Model, createComponentRenderable, createSchema, NodeStream, RenderableNodeCursor, linkItem, pageSectionProperties } from '@refrakt-md/runes';

const alignType = ['left', 'center', 'right'] as const;

class HeroModel extends Model {
	@attribute({ type: String, required: false })
	background: string = '';

	@attribute({ type: String, required: false })
	backgroundImage: string = '';

	@attribute({ type: String, required: false, matches: alignType.slice() })
	align: typeof alignType[number] = 'center';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['list', 'fence'] })
	actions: NodeStream;

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

		const backgroundMeta = new Tag('meta', { content: this.background });
		const backgroundImageMeta = new Tag('meta', { content: this.backgroundImage });
		const alignMeta = new Tag('meta', { content: this.align });

		const actionsDiv = actions.wrap('div');

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
			},
			children: [
				backgroundMeta,
				backgroundImageMeta,
				alignMeta,
				header.wrap('header').next(),
				actionsDiv.next(),
			],
		});
	}
}

export const hero = createSchema(HeroModel);
