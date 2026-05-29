import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export const conversationMessage = createContentModelSchema({
	attributes: {
		speaker: { type: String, required: false },
		align: { type: String, required: false, matches: ['left', 'right'] },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const speakerTag = new Tag('span', {}, [attrs.speaker ?? '']);
		const alignMeta = new Tag('meta', { content: attrs.align ?? 'left' });
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable({ rune: 'conversation-message',
			tag: 'div',
			properties: {
				speaker: speakerTag,
				align: alignMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [speakerTag, alignMeta, body.next()],
		});
	},
});

function convertConversationChildren(nodes: Node[], attrs: Record<string, unknown>): Node[] {
	const speakerList = attrs.speakers
		? String(attrs.speakers).split(',').map(s => s.trim())
		: [];

	const converted: Node[] = [];
	let messageIndex = 0;

	for (const node of nodes) {
		if (node.type === 'blockquote') {
			let speaker = '';
			const children = [...node.children];

			// Markdoc wraps a paragraph's inline content in an `inline` node, so
			// the first paragraph's *content* is `firstPara.children[0].children`
			// (when an inline wrapper is present) rather than `firstPara.children`
			// directly. Both forms are handled.
			const firstPara = children.length > 0 && children[0].type === 'paragraph'
				? children[0]
				: null;
			const inlineHost = firstPara && firstPara.children[0]?.type === 'inline'
				? firstPara.children[0]
				: firstPara;

			// Try to extract speaker from first paragraph's bold text: **Name:** ...
			if (inlineHost) {
				const firstInline = inlineHost.children[0];
				if (firstInline && firstInline.type === 'strong') {
					const nameText = Array.from(firstInline.walk())
						.filter(n => n.type === 'text')
						.map(n => n.attributes.content)
						.join('')
						.replace(/:\s*$/, '');
					speaker = nameText;
				}
			}

			// Fall back to alternating from speakers list. Inject a bold
			// `**Name:**` prefix at the start of the first paragraph so the
			// rendering matches the explicit `> **Name**:` form — name reads as
			// bold-inline inside the bubble rather than as a separate label
			// above it.
			if (!speaker && speakerList.length > 0) {
				speaker = speakerList[messageIndex % speakerList.length];

				if (inlineHost) {
					const strongTag = new Ast.Node('strong', {}, [
						new Ast.Node('text', { content: `${speaker}:` }, []),
					]);
					const spaceText = new Ast.Node('text', { content: ' ' }, []);
					inlineHost.children = [strongTag, spaceText, ...inlineHost.children];
				}
			}

			const align = messageIndex % 2 === 0 ? 'left' : 'right';

			converted.push(new Ast.Node('tag', {
				speaker,
				align,
			}, node.children, 'conversation-message'));

			messageIndex++;
		} else {
			converted.push(node);
		}
	}

	return converted;
}

export const conversation = createContentModelSchema({
	attributes: {
		speakers: { type: String, required: false, description: 'Comma-separated speaker names for alternating messages' },
	},
	contentModel: {
		type: 'custom',
		processChildren: (nodes, attrs) => convertConversationChildren(nodes as Node[], attrs),
		description: 'Converts blockquotes to conversation messages with alternating left/right alignment. '
			+ 'Extracts speaker name from bold text in first paragraph, falls back to speakers list.',
	},
	transform(resolved, attrs, config) {
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.children), config) as import('@markdoc/markdoc').RenderableTreeNode[],
		);

		const messages = body.tag('div').typeof('ConversationMessage');
		const messagesContainer = messages.wrap('div');

		return createComponentRenderable({ rune: 'conversation',
			tag: 'div',
			properties: {
				message: messages,
			},
			refs: { messages: messagesContainer },
			children: [messagesContainer.next()],
		});
	},
});
