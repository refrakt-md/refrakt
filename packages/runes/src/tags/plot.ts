import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

// Parse status marker from list item text: [x]=complete, [>]=active, [ ]=planned, [-]=abandoned
const MARKER_PATTERN = /^\[(x|>|\s|-)\]\s*/;

class BeatModel extends Model {
	@attribute({ type: String, required: true })
	label: string = '';

	@attribute({ type: String, required: false })
	status: string = 'planned';

	@attribute({ type: String, required: false })
	id: string = '';

	@attribute({ type: String, required: false })
	track: string = '';

	@attribute({ type: String, required: false })
	follows: string = '';

	transform(): RenderableTreeNodes {
		const labelTag = new Tag('span', {}, [this.label]);
		const statusMeta = new Tag('meta', { content: this.status });
		const idMeta = new Tag('meta', { content: this.id });
		const trackMeta = new Tag('meta', { content: this.track });
		const followsMeta = new Tag('meta', { content: this.follows });
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.Beat, {
			tag: 'li',
			properties: {
				label: labelTag,
				status: statusMeta,
				id: idMeta,
				track: trackMeta,
				follows: followsMeta,
			},
			refs: { body: body.tag('div') },
			children: [labelTag, statusMeta, idMeta, trackMeta, followsMeta, body.next()],
		});
	}
}

const plotType = ['arc', 'quest', 'subplot', 'campaign', 'episode', 'act', 'chapter'] as const;
const structureType = ['linear', 'parallel', 'branching', 'web'] as const;

class PlotModel extends Model {
	@attribute({ type: String, required: true })
	title: string = '';

	@attribute({ type: String, required: false, matches: plotType.slice() })
	type: typeof plotType[number] = 'arc';

	@attribute({ type: String, required: false, matches: structureType.slice() })
	structure: typeof structureType[number] = 'linear';

	@attribute({ type: String, required: false })
	tags: string = '';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	itemgroup: NodeStream;

	processChildren(nodes: Node[]) {
		const converted: Node[] = [];

		for (const node of nodes) {
			if (node.type === 'list') {
				for (const item of node.children) {
					// Extract text content to find marker and label
					const firstParagraph = item.children[0];
					if (!firstParagraph) continue;

					const textParts: string[] = [];
					for (const child of firstParagraph.walk()) {
						if (child.type === 'text' && child.attributes.content) {
							textParts.push(child.attributes.content);
						}
					}
					const text = textParts.join('').trim();

					// Parse status marker
					let status = 'planned';
					const markerMatch = text.match(MARKER_PATTERN);
					if (markerMatch) {
						const marker = markerMatch[1];
						status = marker === 'x' ? 'complete'
							: marker === '>' ? 'active'
							: marker === '-' ? 'abandoned'
							: 'planned';
					}

					// Extract label from first strong node, or fall back to text
					let label = '';
					for (const child of firstParagraph.walk()) {
						if (child.type === 'strong') {
							const strongParts: string[] = [];
							for (const sc of child.walk()) {
								if (sc.type === 'text' && sc.attributes.content) {
									strongParts.push(sc.attributes.content);
								}
							}
							label = strongParts.join('').trim();
							break;
						}
					}
					if (!label) {
						// No bold label — use full text minus marker
						label = markerMatch ? text.slice(markerMatch[0].length).trim() : text;
						// Strip leading dash separator if present
						label = label.replace(/^[-–—]\s*/, '');
					}

					converted.push(new Ast.Node('tag', {
						label,
						status,
					}, item.children.slice(1), 'beat'));
				}
			} else {
				converted.push(node);
			}
		}

		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const itemStream = this.itemgroup.transform();

		const titleTag = new Tag('span', {}, [this.title]);
		const plotTypeMeta = new Tag('meta', { content: this.type });
		const structureMeta = new Tag('meta', { content: this.structure });
		const tagsMeta = new Tag('meta', { content: this.tags });

		const beats = itemStream.tag('li').typeof('Beat');
		const beatsList = new Tag('ol', {}, beats.toArray());

		const children: any[] = [titleTag, plotTypeMeta, structureMeta, tagsMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(beatsList);

		return createComponentRenderable(schema.Plot, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				title: titleTag,
				plotType: plotTypeMeta,
				structure: structureMeta,
				tags: tagsMeta,
				beat: beats,
			},
			refs: { beats: beatsList },
			children,
		});
	}
}

export const beat = createSchema(BeatModel);
export const plot = createSchema(PlotModel);
