import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, SchemaAttribute } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { asNodes, RenderableNodeCursor, extractMediaImage, registerAttributePreset } from '@refrakt-md/runes';

/**
 * Shared taxonomy attributes for storytelling runes that participate in
 * cross-referencing (character, realm, faction, lore, plot).
 *
 * Registered as a named preset so `refrakt reference` output can label
 * these attributes as inherited from the storytelling taxonomy tier
 * rather than listing them as each rune's own.
 */
export const taxonomyAttributes: Record<string, SchemaAttribute> = {
	tags: { type: String, required: false, description: 'Comma-separated keywords for filtering and cross-referencing.' },
};

registerAttributePreset(taxonomyAttributes, {
	name: 'storytelling taxonomy',
	description: 'Shared taxonomy attributes (tags) used by storytelling entities for filtering and cross-referencing.',
});

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
 * SPEC-081: emits flat `data-name` slots rather than a hand-built content
 * column — the rune's `layout` config groups `preamble` / `metadata` / `body`
 * / `sections` into the content column. Returns:
 *
 * - `bodyDiv` — the lead description prose (plus any leftover authored body
 *   nodes when there are no structured sections), wrapped in a `body` slot.
 * - `sectionsContainer` — the structured sections wrapped in a `sections` slot
 *   (only when section headings were authored).
 * - `sections` / `hasSections` — the raw section cursor and presence flag.
 */
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
	// Transform description paragraphs
	const descAstNodes = asNodes(descriptionResolved);
	const descRendered = new RenderableNodeCursor(
		Markdoc.transform(descAstNodes, config) as RenderableTreeNode[],
	);

	const sections = sectionNodes.tag('div').typeof(sectionTypeName) as RenderableNodeCursor<Markdoc.Tag>;
	const hasSections = sections.count() > 0;

	// Body prose: lead description + (when there are no structured sections) any
	// leftover authored body nodes.
	const bodyNodes: RenderableTreeNode[] = [...extraDescription, ...descRendered.toArray()];
	if (!hasSections) bodyNodes.push(...sectionNodes.toArray());
	const bodyDiv = bodyNodes.length > 0
		? new RenderableNodeCursor(bodyNodes).wrap('div') as RenderableNodeCursor<Markdoc.Tag>
		: undefined;

	const sectionsContainer = hasSections
		? sections.wrap('div') as RenderableNodeCursor<Markdoc.Tag>
		: undefined;

	return { bodyDiv, sectionsContainer, sections, hasSections };
}
