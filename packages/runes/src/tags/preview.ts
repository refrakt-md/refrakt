import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class PreviewModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false, matches: ['auto', 'light', 'dark'] })
	theme: string = 'auto';

	@attribute({ type: String, required: false, matches: ['narrow', 'medium', 'wide', 'full'] })
	width: string = 'wide';

	transform() {
		// Extract first direct fence child as source for code/preview toggle
		const fenceIdx = this.node.children.findIndex(c => c.type === 'fence');
		let sourcePre: Markdoc.Tag<'pre'> | undefined;
		if (fenceIdx !== -1) {
			const fence = this.node.children.splice(fenceIdx, 1)[0];
			const lang = fence.attributes.language || 'shell';
			sourcePre = new Tag('pre', { 'data-language': lang }, [
				new Tag('code', { 'data-language': lang }, [fence.attributes.content])
			]) as Markdoc.Tag<'pre'>;
		}

		const children = this.transformChildren();

		const titleMeta = this.title ? new Tag('meta', { content: this.title }) : undefined;
		const themeMeta = new Tag('meta', { content: this.theme });
		const widthMeta = new Tag('meta', { content: this.width });

		const childNodes = [
			...(titleMeta ? [titleMeta] : []),
			themeMeta,
			widthMeta,
			...(sourcePre ? [sourcePre] : []),
			...children.toArray(),
		];

		return createComponentRenderable(schema.Preview, {
			tag: 'div',
			properties: {
				...(titleMeta ? { title: titleMeta } : {}),
				theme: themeMeta,
				width: widthMeta,
				...(sourcePre ? { source: sourcePre } : {}),
			},
			children: childNodes,
		});
	}
}

export const preview = createSchema(PreviewModel);
