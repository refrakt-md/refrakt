import { ComponentType } from "../interfaces.js";

export class Testimonial {
	quote: string = '';
	authorName: string = '';
	authorRole: string = '';
	rating: number | undefined = undefined;
	avatar: string = '';
}

export interface TestimonialComponent extends ComponentType<Testimonial> {
	tag: 'article',
	properties: {
		quote: 'blockquote',
		authorName: 'span',
		authorRole: 'span',
		rating: 'meta',
		avatar: 'img',
	},
	refs: {}
}
