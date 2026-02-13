import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const styleType = ['margin', 'tooltip', 'inline'] as const;

class AnnotateNoteModel extends Model {
	transform(): RenderableTreeNodes {
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.AnnotateNote, {
			tag: 'aside',
			properties: {},
			refs: {
				body: body.tag('div'),
			},
			children: [body.next()],
		});
	}
}

class AnnotateModel extends Model {
	@attribute({ type: String, required: false, matches: styleType.slice() })
	style: typeof styleType[number] = 'margin';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();
		const styleMeta = new Tag('meta', { content: this.style });

		const notes = children.tag('aside').typeof('AnnotateNote');
		const body = children.wrap('div');

		return createComponentRenderable(schema.Annotate, {
			tag: 'div',
			properties: {
				note: notes,
				style: styleMeta,
			},
			refs: { body: body.tag('div') },
			children: [styleMeta, body.next()],
		});
	}
}

export const annotateNote = createSchema(AnnotateNoteModel);
export const annotate = createSchema(AnnotateModel);
