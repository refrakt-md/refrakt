import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, group, createComponentRenderable, createSchema, NodeStream, RenderableNodeCursor, SplitLayoutModel, linkItem, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

const justifyType = ['left', 'center', 'right'] as const;

class HeroModel extends SplitLayoutModel {
	@attribute({ type: String, required: false })
	background: string = '';

	@attribute({ type: String, required: false })
	backgroundImage: string = '';

	@attribute({ type: String, required: false, matches: justifyType.slice() })
	justify: typeof justifyType[number] = 'center';

	@group({ section: 0, include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ section: 0, include: ['list', 'fence'] })
	actions: NodeStream;

	@group({ section: 1 })
	media: NodeStream;

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

		const side = this.media.transform();

		const backgroundMeta = new Tag('meta', { content: this.background });
		const backgroundImageMeta = new Tag('meta', { content: this.backgroundImage });
		const justifyMeta = new Tag('meta', { content: this.justify });
		const layoutMeta = new Tag('meta', { content: this.layout });
		const ratioMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.ratio }) : undefined;
		const alignMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.align }) : undefined;
		const gapMeta = this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;
		const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;

		const actionsDiv = actions.wrap('div');
		const mediaDiv = side.wrap('div');

		return createComponentRenderable(schema.Hero, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				background: backgroundMeta,
				backgroundImage: backgroundImageMeta,
				justify: justifyMeta,
				layout: layoutMeta,
				ratio: ratioMeta,
				align: alignMeta,
				gap: gapMeta,
				collapse: collapseMeta,
				action: actions.flatten().tags('li', 'div'),
			},
			refs: {
				actions: actionsDiv,
				content: header.wrap('div'),
				media: mediaDiv,
			},
			children: [
				backgroundMeta,
				backgroundImageMeta,
				justifyMeta,
				layoutMeta,
				...(ratioMeta ? [ratioMeta] : []),
				...(alignMeta ? [alignMeta] : []),
				...(gapMeta ? [gapMeta] : []),
				...(collapseMeta ? [collapseMeta] : []),
				header.wrap('header').next(),
				actionsDiv.next(),
				...(side.toArray().length > 0 ? [mediaDiv.next()] : []),
			],
		});
	}
}

export const hero = createSchema(HeroModel, {
	align: { newName: 'justify' },
});
