import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, group, createComponentRenderable, createSchema, NodeStream, RenderableNodeCursor, SplitLayoutModel, linkItem, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

const alignType = ['left', 'center', 'right'] as const;

class HeroModel extends SplitLayoutModel {
	@attribute({ type: String, required: false, matches: alignType.slice() })
	align: typeof alignType[number] = 'center';

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

		const alignMeta = new Tag('meta', { content: this.align });
		const layoutMeta = new Tag('meta', { content: this.layout });
		const ratioMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.ratio }) : undefined;
		const valignMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.valign }) : undefined;
		const gapMeta = this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;
		const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;

		const actionsDiv = actions.wrap('div');
		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const mainContent = new RenderableNodeCursor([...headerContent, ...(actions.count() > 0 ? [actionsDiv.next()] : [])]).wrap('div');
		const mediaDiv = side.wrap('div');

		return createComponentRenderable(schema.Hero, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				align: alignMeta,
				layout: layoutMeta,
				ratio: ratioMeta,
				valign: valignMeta,
				gap: gapMeta,
				collapse: collapseMeta,
				action: actions.flatten().tags('li', 'div'),
			},
			refs: {
				actions: actionsDiv,
				content: mainContent,
				media: mediaDiv,
			},
			children: [
				alignMeta,
				layoutMeta,
				...(ratioMeta ? [ratioMeta] : []),
				...(valignMeta ? [valignMeta] : []),
				...(gapMeta ? [gapMeta] : []),
				...(collapseMeta ? [collapseMeta] : []),
				mainContent.next(),
				...(side.toArray().length > 0 ? [mediaDiv.next()] : []),
			],
		});
	}
}

export const hero = createSchema(HeroModel, {
	justify: { newName: 'align' },
});
