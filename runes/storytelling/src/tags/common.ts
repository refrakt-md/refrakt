import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { asNodes, RenderableNodeCursor, extractMediaImage } from '@refrakt-md/runes';

/**
 * Shared scene-image extraction for storytelling runes (realm, faction).
 *
 * Takes the resolved `scene` field, transforms it, and returns either:
 * - A media div wrapping the extracted `<img>` tag (if the scene was an image)
 * - Extra description nodes (if the scene was text, not an image)
 *
 * Also returns the raw `<img>` tag for SEO schema use.
 */
export function extractScene(
	sceneResolved: unknown,
	config: Record<string, any>,
): {
	sceneDiv: RenderableNodeCursor<Markdoc.Tag> | undefined;
	sceneImgTag: Markdoc.Tag | undefined;
	extraDescription: RenderableTreeNode[];
} {
	const sceneAstNodes = asNodes(sceneResolved);
	const sceneRendered = new RenderableNodeCursor(
		Markdoc.transform(sceneAstNodes, config) as RenderableTreeNode[],
	);

	const sceneImgTag = extractMediaImage(sceneRendered);

	let sceneDiv: RenderableNodeCursor<Markdoc.Tag> | undefined;
	let extraDescription: RenderableTreeNode[] = [];

	if (sceneImgTag) {
		sceneDiv = new RenderableNodeCursor([sceneImgTag]).wrap('div') as RenderableNodeCursor<Markdoc.Tag>;
	} else if (sceneRendered.count() > 0) {
		// First paragraph was text, not an image — include as description
		extraDescription = sceneRendered.toArray();
	}

	return { sceneDiv, sceneImgTag, extraDescription };
}

/**
 * Shared content assembly for storytelling runes with sections (realm, faction).
 *
 * Takes the extra description nodes, resolved description field, section cursor,
 * and section type name, and returns a wrapped content div.
 */
export function buildStoryContent(
	extraDescription: RenderableTreeNode[],
	descriptionResolved: unknown,
	sectionNodes: RenderableNodeCursor,
	sectionTypeName: string,
	config: Record<string, any>,
): {
	mainContent: RenderableNodeCursor<Markdoc.Tag>;
	sections: RenderableNodeCursor<Markdoc.Tag>;
	hasSections: boolean;
} {
	// Transform description paragraphs
	const descAstNodes = asNodes(descriptionResolved);
	const descRendered = new RenderableNodeCursor(
		Markdoc.transform(descAstNodes, config) as RenderableTreeNode[],
	);

	const sections = sectionNodes.tag('div').typeof(sectionTypeName) as RenderableNodeCursor<Markdoc.Tag>;
	const hasSections = sections.count() > 0;

	// Build content children (everything except scene)
	const contentChildren: any[] = [];
	const allDescNodes = [...extraDescription, ...descRendered.toArray()];
	if (allDescNodes.length > 0) {
		contentChildren.push(...allDescNodes);
	}

	if (hasSections) {
		const sectionsContainer = sections.wrap('div');
		contentChildren.push(sectionsContainer.next());
	} else {
		const body = sectionNodes.wrap('div');
		if (sectionNodes.count() > 0) {
			contentChildren.push(body.next());
		}
	}

	const mainContent = new RenderableNodeCursor(contentChildren).wrap('div');

	return { mainContent, sections, hasSections };
}
