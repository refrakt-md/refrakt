import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

// Parse "2023 - Company founded" or "2020-2023: Growth phase"
const DATE_LABEL_PATTERN = /^(.+?)\s*[-–—:]\s*(.+)$/;

class TimelineEntryModel extends Model {
	@attribute({ type: String, required: false })
	date: string = '';

	@attribute({ type: String, required: false })
	label: string = '';

	transform(): RenderableTreeNodes {
		const dateTag = new Tag('time', {}, [this.date]);
		const labelTag = new Tag('span', {}, [this.label]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.TimelineEntry, {
			tag: 'li',
			properties: {
				date: dateTag,
				label: labelTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [dateTag, labelTag, body.next()],
		});
	}
}

class TimelineModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: String, required: false })
	direction: string = 'vertical';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	itemgroup: NodeStream;

	convertHeadings(nodes: Node[]) {
		// Auto-detect heading level from first heading if not specified
		const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
		if (!level) return nodes;

		const converted = headingsToList({ level })(nodes);
		const n = converted.length - 1;
		if (!converted[n] || converted[n].type !== 'list') return nodes;

		const tags = converted[n].children.map(item => {
			const heading = item.children[0];
			const headingText = Array.from(heading.walk())
				.filter(n => n.type === 'text')
				.map(t => t.attributes.content)
				.join(' ');

			// Parse date and label from heading text
			const match = headingText.match(DATE_LABEL_PATTERN);
			const date = match ? match[1].trim() : '';
			const label = match ? match[2].trim() : headingText;

			return new Ast.Node('tag', { date, label }, item.children.slice(1), 'timeline-entry');
		});

		converted.splice(n, 1, ...tags);
		return converted;
	}

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const itemStream = this.itemgroup.transform();
		const directionMeta = new Tag('meta', { content: this.direction });

		const items = itemStream.tag('li').typeof('TimelineEntry');
		const entriesList = new Tag('ol', {}, items.toArray());

		const children: any[] = [directionMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(entriesList);

		return createComponentRenderable(schema.Timeline, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				direction: directionMeta,
				entry: items,
			},
			refs: { entries: entriesList },
			children,
		});
	}
}

export const timelineEntry = createSchema(TimelineEntryModel);

export const timeline = createSchema(TimelineModel);
