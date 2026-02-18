import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

/** Strip common leading whitespace from all lines. */
function dedent(text: string): string {
	const lines = text.split('\n');
	const indents = lines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)?.[0].length ?? 0);
	const min = indents.length > 0 ? Math.min(...indents) : 0;
	return min > 0 ? lines.map(l => l.slice(min)).join('\n') : text;
}

class PreviewModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false, matches: ['auto', 'light', 'dark'] })
	theme: string = 'auto';

	@attribute({ type: String, required: false, matches: ['narrow', 'medium', 'wide', 'full'] })
	width: string = 'wide';

	@attribute({ type: Boolean, required: false })
	source: boolean = false;

	@attribute({ type: String, required: false })
	responsive: string = '';

	transform() {
		// 1. Extract first direct fence child as source (fence always wins)
		const fenceIdx = this.node.children.findIndex(c => c.type === 'fence');
		let sourcePre: Markdoc.Tag<'pre'> | undefined;
		if (fenceIdx !== -1) {
			const fence = this.node.children.splice(fenceIdx, 1)[0];
			const lang = fence.attributes.language || 'shell';
			sourcePre = new Tag('pre', { 'data-language': lang }, [
				new Tag('code', { 'data-language': lang }, [fence.attributes.content])
			]) as Markdoc.Tag<'pre'>;
		}

		// 2. Auto-infer from children source (fallback when no fence)
		if (!sourcePre && this.source) {
			const raw = this.config.variables?.__source;
			if (typeof raw === 'string' && this.node.lines?.length >= 2) {
				const allLines = raw.split('\n');
				const start = this.node.lines[0] + 1;
				const end = this.node.lines[this.node.lines.length - 1] - 1;
				const childSource = dedent(allLines.slice(start, end).join('\n').trim());
				if (childSource) {
					sourcePre = new Tag('pre', { 'data-language': 'markdoc' }, [
						new Tag('code', { 'data-language': 'markdoc' }, [childSource])
					]) as Markdoc.Tag<'pre'>;
				}
			}
		}

		const children = this.transformChildren();

		const titleMeta = this.title ? new Tag('meta', { content: this.title }) : undefined;
		const themeMeta = new Tag('meta', { content: this.theme });
		const widthMeta = new Tag('meta', { content: this.width });
		const responsiveMeta = this.responsive ? new Tag('meta', { content: this.responsive }) : undefined;

		const childNodes = [
			...(titleMeta ? [titleMeta] : []),
			themeMeta,
			widthMeta,
			...(responsiveMeta ? [responsiveMeta] : []),
			...(sourcePre ? [sourcePre] : []),
			...children.toArray(),
		];

		return createComponentRenderable(schema.Preview, {
			tag: 'div',
			properties: {
				...(titleMeta ? { title: titleMeta } : {}),
				theme: themeMeta,
				width: widthMeta,
				...(responsiveMeta ? { responsive: responsiveMeta } : {}),
				...(sourcePre ? { source: sourcePre } : {}),
			},
			children: childNodes,
		});
	}
}

export const preview = createSchema(PreviewModel);
