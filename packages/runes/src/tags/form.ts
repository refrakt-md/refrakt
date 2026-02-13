import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const styleType = ['stacked', 'inline', 'compact'] as const;
const methodType = ['GET', 'POST'] as const;

// Type inference: field name keywords → HTML input type
const typeInference: [string[], string][] = [
	[['email', 'e-mail'], 'email'],
	[['phone', 'telephone', 'mobile', 'cell'], 'tel'],
	[['website', 'url', 'homepage', 'link'], 'url'],
	[['date', 'birthday', 'dob'], 'date'],
	[['number', 'amount', 'quantity', 'age', 'count'], 'number'],
	[['password', 'pin', 'passcode'], 'password'],
	[['message', 'comments', 'description', 'feedback', 'notes', 'bio', 'about'], 'textarea'],
	[['file', 'upload', 'attachment', 'resume', 'document', 'cv'], 'file'],
];

function inferFieldType(name: string): string {
	const lower = name.toLowerCase();
	for (const [keywords, type] of typeInference) {
		if (keywords.some(k => lower.includes(k))) {
			return type;
		}
	}
	return 'text';
}

// Parse modifiers from parenthetical text: "Email (optional, placeholder: 'you@example.com')"
function parseFieldText(text: string): { name: string; optional: boolean; placeholder: string } {
	const match = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (!match) {
		return { name: text.trim(), optional: false, placeholder: '' };
	}

	const name = match[1].trim();
	const modifiers = match[2];

	const optional = /\boptional\b/i.test(modifiers);
	const placeholderMatch = modifiers.match(/placeholder:\s*["']?([^"',]+)["']?/i);
	const placeholder = placeholderMatch ? placeholderMatch[1].trim() : '';

	return { name, optional, placeholder };
}

// Extract plain text from an AST node
function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
}

// Check if a paragraph contains only bold text (submit button pattern)
function isBoldOnlyParagraph(node: Node): boolean {
	if (node.type !== 'paragraph') return false;
	const significantChildren = node.children.filter(
		c => !(c.type === 'text' && c.attributes.content.trim() === '')
	);
	return significantChildren.length === 1 && significantChildren[0].type === 'strong';
}

// Parse blockquote text for selection modifiers
function parseBlockquoteModifiers(text: string): { label: string; multiple: boolean; radio: boolean; optional: boolean } {
	const multiple = /\(multiple\)/i.test(text) || /select all/i.test(text);
	const radio = /\(radio\)/i.test(text);
	const optional = /\(optional\)/i.test(text);
	const label = text
		.replace(/\s*\(multiple\)/gi, '')
		.replace(/\s*\(radio\)/gi, '')
		.replace(/\s*\(optional\)/gi, '')
		.trim();
	return { label, multiple, radio, optional };
}

class FormFieldModel extends Model {
	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: String, required: false })
	fieldType: string = 'text';

	@attribute({ type: String, required: false })
	required: string = 'true';

	@attribute({ type: String, required: false })
	placeholder: string = '';

	@attribute({ type: String, required: false })
	options: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const fieldTypeMeta = new Tag('meta', { content: this.fieldType });
		const requiredMeta = new Tag('meta', { content: this.required });
		const placeholderMeta = new Tag('meta', { content: this.placeholder });
		const optionsMeta = new Tag('meta', { content: this.options });
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.FormField, {
			tag: 'div',
			properties: {
				name: nameTag,
				fieldType: fieldTypeMeta,
				required: requiredMeta,
				placeholder: placeholderMeta,
				options: optionsMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, fieldTypeMeta, requiredMeta, placeholderMeta, optionsMeta, body.next()],
		});
	}
}

class FormModel extends Model {
	@attribute({ type: String, required: true })
	action: string = '';

	@attribute({ type: String, required: false, matches: methodType.slice() })
	method: typeof methodType[number] = 'POST';

	@attribute({ type: String, required: false })
	success: string = '';

	@attribute({ type: String, required: false })
	error: string = '';

	@attribute({ type: String, required: false, matches: styleType.slice() })
	style: typeof styleType[number] = 'stacked';

	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: Boolean, required: false })
	honeypot: boolean = true;

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		const converted: Node[] = [];
		let pendingBlockquote: Node | null = null;

		// Find the last bold-only paragraph (submit button)
		let lastBoldParaIndex = -1;
		for (let i = nodes.length - 1; i >= 0; i--) {
			if (isBoldOnlyParagraph(nodes[i])) {
				lastBoldParaIndex = i;
				break;
			}
		}

		const flushBlockquote = () => {
			if (pendingBlockquote) {
				const helpText = extractText(pendingBlockquote);
				converted.push(new Ast.Node('tag', {
					name: helpText,
					fieldType: 'help',
					required: 'false',
					placeholder: '',
					options: '',
				}, [], 'form-field'));
				pendingBlockquote = null;
			}
		};

		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];

			if (node.type === 'heading') {
				flushBlockquote();
				const headingText = extractText(node);
				converted.push(new Ast.Node('tag', {
					name: headingText,
					fieldType: 'group',
					required: 'false',
					placeholder: '',
					options: '',
				}, [], 'form-field'));
			} else if (node.type === 'list' && pendingBlockquote) {
				// Blockquote + list = selection field
				const blockquoteText = extractText(pendingBlockquote);
				const mods = parseBlockquoteModifiers(blockquoteText);

				const optionTexts: string[] = [];
				for (const item of node.children) {
					if (item.type === 'item') {
						optionTexts.push(extractText(item));
					}
				}

				let fieldType: string;
				if (mods.multiple) {
					fieldType = 'checkbox';
				} else if (mods.radio || optionTexts.length <= 4) {
					fieldType = 'radio';
				} else {
					fieldType = 'select';
				}

				converted.push(new Ast.Node('tag', {
					name: mods.label,
					fieldType,
					required: mods.optional ? 'false' : 'true',
					placeholder: '',
					options: optionTexts.join(','),
				}, [], 'form-field'));

				pendingBlockquote = null;
			} else if (node.type === 'list') {
				flushBlockquote();
				// Standalone list = text input fields
				for (const item of node.children) {
					if (item.type === 'item') {
						const itemText = extractText(item);
						const parsed = parseFieldText(itemText);
						const fieldType = inferFieldType(parsed.name);

						converted.push(new Ast.Node('tag', {
							name: parsed.name,
							fieldType,
							required: parsed.optional ? 'false' : 'true',
							placeholder: parsed.placeholder,
							options: '',
						}, [], 'form-field'));
					}
				}
			} else if (node.type === 'blockquote') {
				flushBlockquote();
				pendingBlockquote = node;
			} else if (i === lastBoldParaIndex) {
				flushBlockquote();
				const buttonText = extractText(node);
				converted.push(new Ast.Node('tag', {
					name: buttonText,
					fieldType: 'submit',
					required: 'false',
					placeholder: '',
					options: '',
				}, [], 'form-field'));
			} else if (node.type === 'hr') {
				flushBlockquote();
				converted.push(new Ast.Node('tag', {
					name: '',
					fieldType: 'separator',
					required: 'false',
					placeholder: '',
					options: '',
				}, [], 'form-field'));
			} else if (node.type === 'paragraph') {
				flushBlockquote();
				const text = extractText(node);
				converted.push(new Ast.Node('tag', {
					name: text,
					fieldType: 'description',
					required: 'false',
					placeholder: '',
					options: '',
				}, [], 'form-field'));
			} else {
				flushBlockquote();
				converted.push(node);
			}
		}

		flushBlockquote();
		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const body = this.body.transform();

		const actionMeta = new Tag('meta', { content: this.action });
		const methodMeta = new Tag('meta', { content: this.method });
		const successMeta = new Tag('meta', { content: this.success });
		const errorMeta = new Tag('meta', { content: this.error });
		const styleMeta = new Tag('meta', { content: this.style });
		const honeypotMeta = new Tag('meta', { content: String(this.honeypot) });

		const fields = body.tag('div').typeof('FormField');
		const fieldsContainer = fields.wrap('div');

		return createComponentRenderable(schema.Form, {
			tag: 'div',
			properties: {
				action: actionMeta,
				method: methodMeta,
				success: successMeta,
				error: errorMeta,
				style: styleMeta,
				honeypot: honeypotMeta,
				field: fields,
			},
			refs: { body: fieldsContainer },
			children: [actionMeta, methodMeta, successMeta, errorMeta, styleMeta, honeypotMeta, fieldsContainer.next()],
		});
	}
}

export const formField = createSchema(FormFieldModel);
export const form = createSchema(FormModel);
