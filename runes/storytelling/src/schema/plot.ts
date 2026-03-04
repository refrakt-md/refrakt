export class Beat {
	label: string = '';
	status: string = 'planned';
	id: string = '';
	track: string = '';
	follows: string = '';
}

export class Plot {
	title: string = '';
	plotType: string = 'arc';
	structure: string = 'linear';
	tags: string = '';
	beat: Beat[] = [];
}
