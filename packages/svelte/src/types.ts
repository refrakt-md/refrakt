/** A serialized Markdoc Tag (plain object, not a class instance) */
export interface SerializedTag {
	$$mdtype: 'Tag';
	name: string;
	attributes: Record<string, any>;
	children: RendererNode[];
}

export type RendererNode = SerializedTag | string | number | null | undefined | RendererNode[];
