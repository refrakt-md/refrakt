import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, headingsToList, pageSectionProperties } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

// Parse "9:00 AM — Narita Airport" or "Morning - Meiji Shrine"
const TIME_LOCATION_PATTERN = /^(.+?)\s*[-–—]\s*(.+)$/;

function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
}

class ItineraryStopModel extends Model {
	@attribute({ type: String, required: false })
	time: string = '';

	@attribute({ type: String, required: false })
	location: string = '';

	@attribute({ type: String, required: false })
	duration: string = '';

	@attribute({ type: String, required: false })
	activity: string = '';

	@attribute({ type: String, required: false })
	lat: string = '';

	@attribute({ type: String, required: false })
	lng: string = '';

	transform(): RenderableTreeNodes {
		const timeTag = new Tag('time', {}, [this.time]);
		const locationTag = new Tag('span', {}, [this.location]);
		const durationMeta = new Tag('meta', { content: this.duration });
		const activityMeta = new Tag('meta', { content: this.activity });
		const latMeta = new Tag('meta', { content: this.lat });
		const lngMeta = new Tag('meta', { content: this.lng });
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.ItineraryStop, {
			tag: 'li',
			properties: {
				time: timeTag,
				location: locationTag,
				duration: durationMeta,
				activity: activityMeta,
				lat: latMeta,
				lng: lngMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [timeTag, locationTag, durationMeta, activityMeta, latMeta, lngMeta, body.next()],
		});
	}
}

class ItineraryDayModel extends Model {
	@attribute({ type: String, required: false })
	label: string = '';

	@attribute({ type: String, required: false })
	date: string = '';

	transform(): RenderableTreeNodes {
		const allChildren = this.transformChildren();

		// Separate header paragraphs from stop tags
		const headerNodes = allChildren.tag('p');
		const stopsStream = allChildren.tag('li').typeof('ItineraryStop');

		const labelTag = new Tag('h3', {}, [this.label]);
		const dateMeta = new Tag('meta', { content: this.date });

		const stopsList = new Tag('ol', {}, stopsStream.toArray());

		const children: any[] = [labelTag, dateMeta];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('div').next());
		}
		children.push(stopsList);

		return createComponentRenderable(schema.ItineraryDay, {
			tag: 'article',
			properties: {
				label: labelTag,
				date: dateMeta,
				stop: stopsStream,
			},
			refs: {
				stops: stopsList,
			},
			children,
		});
	}
}

// Convert headings at a given level into stop tags with time/location parsing
function convertStops(nodes: Node[], headingLevel?: number): Node[] {
	const level = headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
	if (!level) return nodes;

	const grouped = headingsToList({ level })(nodes);
	const result: Node[] = [];

	for (const node of grouped) {
		if (node.type === 'list') {
			for (const item of node.children) {
				const heading = item.children[0];
				const headingText = extractText(heading);

				const match = headingText.match(TIME_LOCATION_PATTERN);
				const time = match ? match[1].trim() : '';
				const location = match ? match[2].trim() : headingText;

				result.push(new Ast.Node('tag', { time, location }, item.children.slice(1), 'itinerary-stop'));
			}
		} else {
			result.push(node);
		}
	}

	return result;
}

// Two-mode conversion: day-by-day (h2 present) or flat
function convertItineraryChildren(nodes: unknown[], attributes: Record<string, unknown>): unknown[] {
	const headingLevel = attributes.headingLevel as number | undefined;
	const nodeArr = nodes as Node[];
	const hasH2 = nodeArr.some(n => n.type === 'heading' && n.attributes.level === 2);

	if (hasH2) {
		// Day-by-day mode: h2 headings become days, nested headings become stops
		const grouped = headingsToList({ level: 2 })(nodeArr);
		const result: Node[] = [];

		for (const node of grouped) {
			if (node.type === 'list') {
				for (const item of node.children) {
					const heading = item.children[0];
					const headingText = extractText(heading);

					// Convert h3s within this day to stop tags
					const dayChildren = convertStops(item.children.slice(1), headingLevel);

					result.push(new Ast.Node('tag', { label: headingText }, dayChildren, 'itinerary-day'));
				}
			} else {
				result.push(node);
			}
		}

		return result;
	}

	// Flat mode: create a single implicit day wrapping all stops
	const stops = convertStops(nodeArr, headingLevel);
	const headingNodes = stops.filter(n => n.type === 'heading' || n.type === 'paragraph');
	const tagNodes = stops.filter(n => n.type === 'tag');

	if (tagNodes.length === 0) return stops;

	return [...headingNodes, new Ast.Node('tag', { label: '' }, tagNodes, 'itinerary-day')];
}

export const itineraryStop = createSchema(ItineraryStopModel);
export const itineraryDay = createSchema(ItineraryDayModel);

export const itinerary = createContentModelSchema({
	attributes: {
		headingLevel: { type: Number, required: false },
		variant: { type: String, required: false },
		direction: { type: String, required: false },
	},
	contentModel: {
		type: 'custom',
		processChildren: convertItineraryChildren,
		description: 'Two-mode itinerary parser. When h2 headings are present, creates day groups with stops. '
			+ 'Otherwise creates a flat list of stops from heading-based time/location parsing.',
	},
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		// Separate header content from day tags
		const headerAst: Node[] = [];
		const bodyAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag') {
				bodyAst.push(child);
			} else if (child.type === 'heading' || child.type === 'paragraph') {
				headerAst.push(child);
			}
		}

		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAst, config) as RenderableTreeNode[],
		);
		const bodyStream = new RenderableNodeCursor(
			Markdoc.transform(bodyAst, config) as RenderableTreeNode[],
		);

		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'day-by-day' });
		const directionMeta = new Tag('meta', { content: attrs.direction ?? 'vertical' });

		const days = bodyStream.tag('article').typeof('ItineraryDay');
		const daysContainer = new Tag('div', {}, days.toArray());

		const children: any[] = [variantMeta, directionMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(daysContainer);

		return createComponentRenderable(schema.Itinerary, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				variant: variantMeta,
				direction: directionMeta,
				day: days,
			},
			refs: { days: daysContainer },
			children,
		});
	},
});
