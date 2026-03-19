import { PageSection } from "@refrakt-md/types";

export class Blog extends PageSection {
	folder: string = '';
	sort: string = 'date-desc';
	filter: string = '';
	limit: number | undefined = undefined;
	layout: string = 'list';
}

export class BlogPost {
	title: string = '';
	url: string = '';
	date: string = '';
	description: string = '';
	draft: boolean = false;
}
