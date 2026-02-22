import { ComponentType } from "../interfaces.js";

export class FormField {
	fieldType: string = 'text';
}

export interface FormFieldComponent extends ComponentType<FormField> {
	tag: 'div',
	properties: {
		fieldType: 'meta',
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
	tag: 'form',
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
