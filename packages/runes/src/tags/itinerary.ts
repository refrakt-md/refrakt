import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

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

	@group({ include: ['paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	stops: NodeStream;

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const stopsStream = this.stops.transform();

		const labelTag = new Tag('h3', {}, [this.label]);
		const dateMeta = new Tag('meta', { content: this.date });

		const stopItems = stopsStream.tag('li').typeof('ItineraryStop');
		const stopsList = new Tag('ol', {}, stopItems.toArray());

		const children: any[] = [labelTag, dateMeta];
		if (header.count() > 0) {
			children.push(header.wrap('div').next());
		}
		children.push(stopsList);

		return createComponentRenderable(schema.ItineraryDay, {
			tag: 'article',
			properties: {
				label: labelTag,
				date: dateMeta,
				stop: stopItems,
			},
			refs: {
				stops: stopsList,
			},
			children,
		});
	}
}

class ItineraryModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: String, required: false })
	style: string = 'day-by-day';

	@attribute({ type: String, required: false })
	direction: string = 'vertical';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertToItems(nodes));
	}

	convertToItems(nodes: Node[]): Node[] {
		const hasH2 = nodes.some(n => n.type === 'heading' && n.attributes.level === 2);

		if (hasH2) {
			return this.convertWithDays(nodes);
		}
		return this.convertFlat(nodes);
	}

	convertWithDays(nodes: Node[]): Node[] {
		const grouped = headingsToList({ level: 2 })(nodes);
		const result: Node[] = [];

		for (const node of grouped) {
			if (node.type === 'list') {
				for (const item of node.children) {
					const heading = item.children[0];
					const headingText = extractText(heading);

					// Convert h3s within this day to stop tags
					const dayChildren = this.convertStops(item.children.slice(1));

					result.push(new Ast.Node('tag', { label: headingText }, dayChildren, 'itinerary-day'));
				}
			} else {
				result.push(node);
			}
		}

		return result;
	}

	convertFlat(nodes: Node[]): Node[] {
		// Create a single implicit day wrapping all stops
		const stops = this.convertStops(nodes);
		const headingNodes = stops.filter(n => n.type === 'heading' || n.type === 'paragraph');
		const tagNodes = stops.filter(n => n.type === 'tag');

		if (tagNodes.length === 0) return stops;

		return [...headingNodes, new Ast.Node('tag', { label: '' }, tagNodes, 'itinerary-day')];
	}

	convertStops(nodes: Node[]): Node[] {
		const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
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

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const bodyStream = this.body.transform();

		const styleMeta = new Tag('meta', { content: this.style });
		const directionMeta = new Tag('meta', { content: this.direction });

		const days = bodyStream.tag('article').typeof('ItineraryDay');
		const daysContainer = new Tag('div', {}, days.toArray());

		const children: any[] = [styleMeta, directionMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(daysContainer);

		return createComponentRenderable(schema.Itinerary, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				style: styleMeta,
				direction: directionMeta,
				day: days,
			},
			refs: { days: daysContainer },
			children,
		});
	}
}

export const itineraryStop = createSchema(ItineraryStopModel);

export const itineraryDay = createSchema(ItineraryDayModel);

export const itinerary = createSchema(ItineraryModel);
