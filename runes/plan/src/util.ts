import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { asNodes } from '@refrakt-md/runes';

/** Convert heading text to a kebab-case data-name slug. */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Build section wrapper elements from resolved sections.
 * Each section becomes a `<section>` with `data-name` set to the slugified heading text.
 */
export function buildSections(sections: any[], config: any): any[] {
	if (!sections || sections.length === 0) return [];

	return sections.map((section: any) => {
		const headingText = section.$heading as string;
		const slug = slugify(headingText);

		const headingNode = section.$headingNode;
		const bodyContent = Markdoc.transform(asNodes(section.body), config) as RenderableTreeNode[];

		const children: any[] = [];
		if (headingNode) {
			const renderedHeading = Markdoc.transform([headingNode], config) as RenderableTreeNode[];
			children.push(...renderedHeading);
		}
		children.push(...bodyContent);

		return new Tag('section', { 'data-name': slug }, children);
	});
}
