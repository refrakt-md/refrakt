import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, SchemaAttribute } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	asNodes,
	RenderableNodeCursor,
	extractMediaImage,
	registerAttributePreset,
} from '@refrakt-md/runes';

export const taxonomyAttributes: Record<string, SchemaAttribute> = {
	tags: {
		type: String,
		required: false,
		description: 'Comma-separated keywords for filtering and cross-referencing.',
	},
};

registerAttributePreset(taxonomyAttributes, {
	name: 'storytelling taxonomy',
	description:
		'Shared taxonomy attributes (tags) used by storytelling entities for filtering and cross-referencing.',
});

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
		sceneDiv = new RenderableNodeCursor([sceneImgTag]).wrap(
			'div',
		) as RenderableNodeCursor<Markdoc.Tag>;
	} else if (sceneRendered.count() > 0) {
		extraDescription = sceneRendered.toArray();
	}

	return { sceneDiv, sceneImgTag, extraDescription };
}

export function buildStoryContent(
	extraDescription: RenderableTreeNode[],
	descriptionResolved: unknown,
	sectionNodes: RenderableNodeCursor,
	sectionTypeName: string,
	config: Record<string, any>,
): {
	bodyDiv: RenderableNodeCursor<Markdoc.Tag> | undefined;
	sectionsContainer: RenderableNodeCursor<Markdoc.Tag> | undefined;
	sections: RenderableNodeCursor<Markdoc.Tag>;
	hasSections: boolean;
} {
	const descAstNodes = asNodes(descriptionResolved);
	const descRendered = new RenderableNodeCursor(
		Markdoc.transform(descAstNodes, config) as RenderableTreeNode[],
	);

	const sections = sectionNodes
		.tag('div')
		.typeof(sectionTypeName) as RenderableNodeCursor<Markdoc.Tag>;
	const hasSections = sections.count() > 0;

	const bodyNodes: RenderableTreeNode[] = [...extraDescription, ...descRendered.toArray()];
	if (!hasSections) bodyNodes.push(...sectionNodes.toArray());
	const bodyDiv =
		bodyNodes.length > 0
			? (new RenderableNodeCursor(bodyNodes).wrap('div') as RenderableNodeCursor<Markdoc.Tag>)
			: undefined;

	const sectionsContainer = hasSections
		? (sections.wrap('div') as RenderableNodeCursor<Markdoc.Tag>)
		: undefined;

	return { bodyDiv, sectionsContainer, sections, hasSections };
}
