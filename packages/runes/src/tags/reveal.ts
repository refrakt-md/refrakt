import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

const modeType = ['click', 'scroll', 'auto'] as const;

class RevealStepModel extends Model {
	@attribute({ type: String, required: true })
	name: string;

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.RevealStep, {
			tag: 'div',
			properties: {
				name: nameTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, body.next()],
		});
	}
}

class RevealModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: String, required: false, matches: modeType.slice() })
	mode: typeof modeType[number] = 'click';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	stepgroup: NodeStream;

	convertHeadings(nodes: Node[]) {
		const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
		if (!level) return nodes;
		const converted = headingsToList({ level })(nodes);
		const n = converted.length - 1;
		const tags = converted[n].children.map(item => {
			const heading = item.children[0];
			const name = Array.from(heading.walk()).filter(n => n.type === 'text').map(t => t.attributes.content).join(' ');
			return new Ast.Node('tag', { name }, item.children.slice(1), 'reveal-step');
		});

		converted.splice(n, 1, ...tags);
		return converted;
	}

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const stepStream = this.stepgroup.transform();
		const modeMeta = new Tag('meta', { content: this.mode });

		const steps = stepStream.tag('div').typeof('RevealStep');
		const stepsContainer = steps.wrap('div');

		const children = header.count() > 0
			? [header.wrap('header').next(), modeMeta, stepsContainer.next()]
			: [modeMeta, stepsContainer.next()];

		return createComponentRenderable(schema.Reveal, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				step: steps,
			},
			refs: { steps: stepsContainer },
			children,
		});
	}
}

export const revealStep = createSchema(RevealStepModel);

export const reveal = createSchema(RevealModel);
