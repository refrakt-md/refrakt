import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

const orgType = ['Organization', 'LocalBusiness', 'Corporation', 'EducationalOrganization', 'GovernmentOrganization', 'NonProfit'] as const;

class OrganizationModel extends Model {
	@attribute({ type: String, required: false, matches: orgType.slice() })
	type: typeof orgType[number] = 'Organization';

	@group({ include: ['heading', 'paragraph', 'image'] })
	header: NodeStream;

	@group({ include: ['list', 'blockquote', 'tag'] })
	body: NodeStream;

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const body = this.body.transform();
		const typeMeta = new Tag('meta', { content: this.type });

		const bodyDiv = body.wrap('div');

		return createComponentRenderable(schema.Organization, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				type: typeMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [
				typeMeta,
				header.wrap('header').next(),
				bodyDiv.next(),
			],
		});
	}
}

export const organization = createSchema(OrganizationModel);
