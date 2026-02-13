import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { NodeStream } from '../lib/node.js';

class ConversationMessageModel extends Model {
	@attribute({ type: String, required: false })
	speaker: string = '';

	@attribute({ type: String, required: false })
	alignment: string = 'left';

	transform(): RenderableTreeNodes {
		const speakerTag = new Tag('span', {}, [this.speaker]);
		const alignmentMeta = new Tag('meta', { content: this.alignment });
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.ConversationMessage, {
			tag: 'div',
			properties: {
				speaker: speakerTag,
				alignment: alignmentMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [speakerTag, alignmentMeta, body.next()],
		});
	}
}

class ConversationModel extends Model {
	@attribute({ type: String, required: false })
	speakers: string = '';

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		const speakerList = this.speakers
			? this.speakers.split(',').map(s => s.trim())
			: [];

		const converted: Node[] = [];
		let messageIndex = 0;

		for (const node of nodes) {
			if (node.type === 'blockquote') {
				let speaker = '';
				const children = [...node.children];

				// Try to extract speaker from first paragraph's bold text: **Name:** ...
				if (children.length > 0 && children[0].type === 'paragraph') {
					const firstPara = children[0];
					const firstChild = firstPara.children[0];
					if (firstChild && firstChild.type === 'strong') {
						const nameText = Array.from(firstChild.walk())
							.filter(n => n.type === 'text')
							.map(n => n.attributes.content)
							.join('')
							.replace(/:\s*$/, '');
						speaker = nameText;
					}
				}

				// Fall back to alternating from speakers list
				if (!speaker && speakerList.length > 0) {
					speaker = speakerList[messageIndex % speakerList.length];
				}

				const alignment = messageIndex % 2 === 0 ? 'left' : 'right';

				converted.push(new Ast.Node('tag', {
					speaker,
					alignment,
				}, node.children, 'conversation-message'));

				messageIndex++;
			} else {
				converted.push(node);
			}
		}

		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const body = this.body.transform();

		const messages = body.tag('div').typeof('ConversationMessage');
		const messagesContainer = messages.wrap('div');

		return createComponentRenderable(schema.Conversation, {
			tag: 'div',
			properties: {
				message: messages,
			},
			refs: { messages: messagesContainer },
			children: [messagesContainer.next()],
		});
	}
}

export const conversationMessage = createSchema(ConversationMessageModel);
export const conversation = createSchema(ConversationModel);
