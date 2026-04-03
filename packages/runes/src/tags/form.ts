import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const variantType = ['stacked', 'inline', 'compact'] as const;
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
// Uses walk() to handle any AST nesting (e.g. inline wrapper nodes)
function isBoldOnlyParagraph(node: Node): boolean {
	if (node.type !== 'paragraph') return false;
	const allNodes = Array.from(node.walk());
	const hasStrong = allNodes.some(n => n.type === 'strong');
	if (!hasStrong) return false;
	const textContent = allNodes
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
	const strongText = allNodes
		.filter(n => n.type === 'strong')
		.flatMap(s => Array.from(s.walk()).filter(n => n.type === 'text'))
		.map(n => n.attributes.content)
		.join('');
	return textContent.trim() === strongText.trim() && textContent.trim().length > 0;
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

const formField = createContentModelSchema({
	attributes: {
		name: { type: String, required: false },
		fieldType: { type: String, required: false },
		required: { type: Boolean, required: false },
		placeholder: { type: String, required: false },
		options: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(resolved, attrs) {
		const fieldName = attrs.name ?? '';
		const fieldType = attrs.fieldType ?? 'text';
		const isRequired = attrs.required ?? true;
		const placeholder = attrs.placeholder ?? '';
		const options = attrs.options ?? '';

		const fieldId = `field-${fieldName.toLowerCase().replace(/\s+/g, '-')}`;
		const optionsList = options
			? options.split(',').map((o: string) => o.trim()).filter(Boolean)
			: [];

		// --- Special types: return plain tags (no FormField wrapper) ---
		// These get BEM classes from the parent Form block via data-name.

		if (fieldType === 'submit') {
			return new Tag('button', { type: 'submit', 'data-name': 'submit' }, [fieldName]);
		}

		if (fieldType === 'separator') {
			return new Tag('hr', { 'data-name': 'separator' }, []);
		}

		if (fieldType === 'help') {
			return new Tag('p', { 'data-name': 'help' }, [fieldName]);
		}

		if (fieldType === 'description') {
			return new Tag('p', { 'data-name': 'text' }, [fieldName]);
		}

		if (fieldType === 'group') {
			return new Tag('fieldset', { class: 'rf-form-fieldset' }, [
				new Tag('legend', {}, [fieldName]),
			]);
		}

		// --- Choice groups (radio/checkbox): fieldset with typeof for engine BEM ---

		if (fieldType === 'radio' || fieldType === 'checkbox') {
			const labelChildren: any[] = [fieldName];
			if (isRequired) {
				labelChildren.push(
					new Tag('span', { 'data-name': 'required', 'aria-hidden': 'true' }, ['*']),
				);
			}

			const choiceElements = optionsList.map((o: string, i: number) =>
				new Tag('label', { class: 'rf-form-choice' }, [
					new Tag('input', {
						type: fieldType,
						name: fieldId,
						value: o,
						...(isRequired && fieldType === 'radio' && i === 0 ? { required: '' } : {}),
					}, []),
					new Tag('span', {}, [o]),
				]),
			);

			const fieldTypeMeta = new Tag('meta', { 'data-field': 'field-type', content: fieldType });

			return new Tag('fieldset', {
				'data-rune': 'form-field',
				class: 'rf-form-choice-group',
			}, [
				fieldTypeMeta,
				new Tag('legend', {}, labelChildren),
				...choiceElements,
			]);
		}

		// --- Standard fields: label + input wrapped in createComponentRenderable ---

		const labelChildren: any[] = [fieldName];
		if (isRequired) {
			labelChildren.push(
				new Tag('span', { 'data-name': 'required', 'aria-hidden': 'true' }, ['*']),
			);
		}
		const label = new Tag('label', { for: fieldId }, labelChildren);

		let inputElement: InstanceType<typeof Tag>;

		if (fieldType === 'textarea') {
			inputElement = new Tag('textarea', {
				id: fieldId,
				name: fieldId,
				...(placeholder ? { placeholder } : {}),
				...(isRequired ? { required: '' } : {}),
				rows: '4',
			}, []);
		} else if (fieldType === 'select') {
			inputElement = new Tag('select', {
				id: fieldId,
				name: fieldId,
				...(isRequired ? { required: '' } : {}),
			}, [
				new Tag('option', { value: '', disabled: '', selected: '' }, ['Select an option']),
				...optionsList.map((o: string) => new Tag('option', { value: o }, [o])),
			]);
		} else {
			inputElement = new Tag('input', {
				type: fieldType,
				id: fieldId,
				name: fieldId,
				...(placeholder ? { placeholder } : {}),
				...(isRequired ? { required: '' } : {}),
			}, []);
		}

		const body = new Tag('div', {}, [label, inputElement]);
		const fieldTypeMeta = new Tag('meta', { content: fieldType });

		return createComponentRenderable({ rune: 'form-field',
			tag: 'div',
			properties: {
				fieldType: fieldTypeMeta,
			},
			refs: {
				body,
			},
			children: [fieldTypeMeta, body],
		});
	},
});

function convertFormChildren(nodes: Node[]): Node[] {
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
				required: false,
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
				required: false,
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
				required: !mods.optional,
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
						required: !parsed.optional,
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
				required: false,
				placeholder: '',
				options: '',
			}, [], 'form-field'));
		} else if (node.type === 'hr') {
			flushBlockquote();
			converted.push(new Ast.Node('tag', {
				name: '',
				fieldType: 'separator',
				required: false,
				placeholder: '',
				options: '',
			}, [], 'form-field'));
		} else if (node.type === 'paragraph') {
			flushBlockquote();
			const text = extractText(node);
			converted.push(new Ast.Node('tag', {
				name: text,
				fieldType: 'description',
				required: false,
				placeholder: '',
				options: '',
			}, [], 'form-field'));
		} else {
			flushBlockquote();
			converted.push(node);
		}
	}

	flushBlockquote();
	return converted;
}

export { formField };

export const form = createContentModelSchema({
	attributes: {
		action: { type: String, required: true, description: 'URL the form submits to' },
		method: { type: String, required: false, matches: methodType.slice(), description: 'HTTP method for form submission' },
		success: { type: String, required: false, description: 'Message shown after successful submission' },
		error: { type: String, required: false, description: 'Message shown when submission fails' },
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Form layout style' },
		name: { type: String, required: false, description: 'Form name for identification' },
		honeypot: { type: Boolean, required: false, description: 'Include a hidden field to prevent spam' },
	},
	contentModel: {
		type: 'custom',
		processChildren: (nodes) => convertFormChildren(nodes as Node[]),
		description: 'Multi-pass form field parser with type inference and selection detection. '
			+ 'Converts lists to text inputs, blockquote + list to selection fields, '
			+ 'headings to fieldsets, bold paragraphs to submit buttons, and blockquotes to help text.',
	},
	transform(resolved, attrs, config) {
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.children), config) as import('@markdoc/markdoc').RenderableTreeNode[],
		);

		const actionMeta = new Tag('meta', { content: attrs.action ?? '' });
		const methodMeta = new Tag('meta', { content: attrs.method ?? 'POST' });
		const successMeta = new Tag('meta', { content: attrs.success ?? '' });
		const errorMeta = new Tag('meta', { content: attrs.error ?? '' });
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'stacked' });
		const honeypotMeta = new Tag('meta', { content: String(attrs.honeypot ?? true) });

		const fields = body.tag('div').typeof('FormField');
		const bodyContainer = body.wrap('div');

		return createComponentRenderable({ rune: 'form',
			tag: 'form',
			properties: {
				action: actionMeta,
				method: methodMeta,
				success: successMeta,
				error: errorMeta,
				variant: variantMeta,
				honeypot: honeypotMeta,
				field: fields,
			},
			refs: { body: bodyContainer },
			children: [actionMeta, methodMeta, successMeta, errorMeta, variantMeta, honeypotMeta, bodyContainer.next()],
		});
	},
});
