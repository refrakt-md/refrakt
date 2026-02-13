import { ComponentType } from "../interfaces.js";

export class FormField {
	name: string = '';
	fieldType: string = 'text';
	required: string = 'true';
	placeholder: string = '';
	options: string = '';
}

export interface FormFieldComponent extends ComponentType<FormField> {
	tag: 'div',
	properties: {
		name: 'span',
		fieldType: 'meta',
		required: 'meta',
		placeholder: 'meta',
		options: 'meta',
	},
	refs: {
		body: 'div',
	}
}

export class Form {
	action: string = '';
	method: string = 'POST';
	success: string = '';
	error: string = '';
	style: string = 'stacked';
	honeypot: string = 'true';
	field: FormField[] = [];
}

export interface FormComponent extends ComponentType<Form> {
	tag: 'div',
	properties: {
		action: 'meta',
		method: 'meta',
		success: 'meta',
		error: 'meta',
		style: 'meta',
		honeypot: 'meta',
		field: 'div',
	},
	refs: {
		body: 'div',
	}
}
