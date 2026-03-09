export class FormField {
	fieldType: string = 'text';
}

export class Form {
	action: string = '';
	method: string = 'POST';
	success: string = '';
	error: string = '';
	variant: string = 'stacked';
	honeypot: string = 'true';
	field: FormField[] = [];
}
