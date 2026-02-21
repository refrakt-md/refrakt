import type { SerializedTag } from '@refrakt-md/types';
import { isTag, makeTag } from '@refrakt-md/transform';

/**
 * PostTransform for FormField runes.
 *
 * Reads resolved modifier values (fieldType, required, placeholder, options)
 * and injects the appropriate HTML input elements into the body div.
 * Special field types (submit, separator, help, description, group) replace
 * the FormField wrapper entirely.
 */
export function formFieldPostTransform(
	node: SerializedTag,
	context: { modifiers: Record<string, string>; parentType?: string },
): SerializedTag {
	const { modifiers } = context;
	const fieldType = modifiers.fieldType || 'text';
	const required = modifiers.required === 'true';
	const placeholder = modifiers.placeholder || '';
	const optionsList = modifiers.options
		? modifiers.options.split(',').map(o => o.trim()).filter(Boolean)
		: [];

	// Extract field name from the span[property="name"] child
	const nameSpan = node.children.find(
		(c): c is SerializedTag => isTag(c) && c.attributes.property === 'name',
	);

	// Guard against double-transformation: nested runes inside data-name containers
	// get processed twice by the engine. If the name span is gone, this tag was already
	// transformed — return unchanged to preserve the first pass result.
	if (!nameSpan) return node;

	const fieldName = nameSpan.children.filter(c => typeof c === 'string').join('');
	const fieldId = `field-${fieldName.toLowerCase().replace(/\s+/g, '-')}`;

	// --- Special types: replace the entire FormField wrapper ---

	if (fieldType === 'submit') {
		return makeTag('div', { class: 'rf-form-field' }, [
			makeTag('button', { type: 'submit', class: 'rf-form__submit' }, [fieldName]),
		]);
	}

	if (fieldType === 'separator') {
		return makeTag('hr', { class: 'rf-form__separator' }, []);
	}

	if (fieldType === 'help') {
		return makeTag('p', { class: 'rf-form__help' }, [fieldName]);
	}

	if (fieldType === 'description') {
		return makeTag('p', { class: 'rf-form__text' }, [fieldName]);
	}

	if (fieldType === 'group') {
		// Keep child fields (everything except name span and meta tags)
		const groupChildren = node.children.filter(
			(c): boolean => isTag(c) ? c.attributes.property !== 'name' : false,
		);
		return makeTag('fieldset', { class: 'rf-form-fieldset' }, [
			makeTag('legend', {}, [fieldName]),
			...groupChildren,
		]);
	}

	// --- Standard input types: inject label + input into body ---

	// Build label element
	const labelChildren: (string | SerializedTag)[] = [fieldName];
	if (required) {
		labelChildren.push(
			makeTag('span', { class: 'rf-form-field__required', 'aria-hidden': 'true' }, ['*']),
		);
	}
	const label = makeTag('label', { for: fieldId }, labelChildren);

	// Build input element based on type
	let inputElement: SerializedTag;

	if (fieldType === 'textarea') {
		inputElement = makeTag('textarea', {
			id: fieldId,
			name: fieldId,
			...(placeholder ? { placeholder } : {}),
			...(required ? { required: '' } : {}),
			rows: '4',
		}, []);
	} else if (fieldType === 'select') {
		const optionElements = [
			makeTag('option', { value: '', disabled: '', selected: '' }, ['Select an option']),
			...optionsList.map(o => makeTag('option', { value: o }, [o])),
		];
		inputElement = makeTag('select', {
			id: fieldId,
			name: fieldId,
			...(required ? { required: '' } : {}),
		}, optionElements);
	} else if (fieldType === 'radio' || fieldType === 'checkbox') {
		// Radio/checkbox use fieldset + legend instead of div + label
		const choiceElements = optionsList.map((o, i) =>
			makeTag('label', { class: 'rf-form-choice' }, [
				makeTag('input', {
					type: fieldType,
					name: fieldId,
					value: o,
					...(required && fieldType === 'radio' && i === 0 ? { required: '' } : {}),
				}, []),
				makeTag('span', {}, [o]),
			]),
		);
		return makeTag('fieldset', {
			class: 'rf-form-field rf-form-choice-group',
			'data-field-type': fieldType,
		}, [
			makeTag('legend', {}, labelChildren),
			...choiceElements,
		]);
	} else {
		// Standard input: text, email, tel, url, number, date, password, file
		inputElement = makeTag('input', {
			type: fieldType,
			id: fieldId,
			name: fieldId,
			...(placeholder ? { placeholder } : {}),
			...(required ? { required: '' } : {}),
		}, []);
	}

	// Inject label + input into the body div, remove the name span
	const newChildren = node.children
		.filter((c): boolean => {
			// Remove name span (its text is now in the label)
			if (isTag(c) && c.attributes.property === 'name') return false;
			return true;
		})
		.map(child => {
			if (!isTag(child)) return child;
			// Replace empty body div contents with label + input
			if (child.attributes['data-name'] === 'body') {
				return { ...child, children: [label, inputElement] };
			}
			return child;
		});

	return { ...node, children: newChildren };
}
