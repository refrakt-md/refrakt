import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';

/** Sentinel `data-field` value the file-ref schema emits. The resolver
 *  (file-ref-resolve.ts) walks the postProcess tree, finds these, and
 *  binds the inline `<a>` to the GitHub URL plus (when `preview="drawer"`
 *  is set) a hoist sentinel for the drawer pipeline to pick up. */
export const FILE_REF_SENTINEL = '__file-ref-sentinel';

/**
 * `file-ref` rune — path-based inline reference to a project file
 * (SPEC-078). Renders as an inline `<a>` to the file's canonical GitHub
 * URL (built from `SiteConfig.repoUrl` + `repoBranch`), with an optional
 * `preview="drawer"` mode that hoists a drawer containing the file's
 * snippet and a "View source on GitHub →" footer link.
 *
 * The transform emits a sentinel meta + placeholder `<a>`. The actual
 * link href, the drawer body, and the hoist sentinel are all bound in
 * postProcess by `resolveFileRefs` so that the rune doesn't need
 * site-config access at transform time and so the file content is read
 * once (not per page-with-mention).
 */
export const fileRef = createContentModelSchema({
	attributes: {
		path: {
			type: String,
			required: true,
			description: 'Project-root-relative file path. Same sandbox as snippet — absolute paths, traversal escapes, and out-of-root symlinks are rejected.',
		},
		lines: {
			type: String,
			required: false,
			description: 'Line range. `"42-58"` (range), `"42"` (single line). Drives both the GitHub anchor (#L42-L58) and the drawer-body snippet slice when `preview="drawer"`.',
		},
		label: {
			type: String,
			required: false,
			description: 'Display text for the inline link. Defaults to the filename (e.g. `token-contract.ts`). Pass an explicit label when the file-ref refers to a symbol within the file rather than the file itself.',
		},
		preview: {
			type: String,
			required: false,
			matches: ['drawer'],
			description: 'Preview target. `"drawer"` hoists a drawer with the file\'s snippet + a GitHub footer link, leaving an inline link at the call site that opens it. Absent → no preview, just the inline link.',
		},
	},
	selfClosing: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const path = String(attrs.path ?? '');
		const lines = attrs.lines !== undefined ? String(attrs.lines) : '';
		const label = attrs.label !== undefined ? String(attrs.label) : '';
		const preview = attrs.preview !== undefined ? String(attrs.preview) : '';

		// Default label: the basename of the path. Authors typically want
		// to refer to a symbol inside the file (e.g. "ThemeTokensConfig")
		// and pass an explicit label; this default is the conservative
		// fallback when no label is given.
		const fallbackLabel = defaultLabel(path);

		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });

		const metas = [
			meta('file-ref-path', path),
			meta('file-ref-lines', lines),
			meta('file-ref-label', label),
			meta('file-ref-preview', preview),
			meta(FILE_REF_SENTINEL, 'true'),
		];

		// Placeholder anchor with the fallback label — resolver replaces
		// the href and (when label is empty) keeps the fallback text.
		const placeholder = new Tag('a', {}, [label || fallbackLabel]);

		return createComponentRenderable({
			rune: 'file-ref',
			// Span keeps the rune inline-safe in prose. The resolver later
			// replaces the span's children with the bound anchor + (with
			// preview) a sibling hoist sentinel.
			tag: 'span',
			properties: {},
			refs: { link: placeholder },
			children: [...metas, placeholder],
		});
	},
});

function defaultLabel(path: string): string {
	if (!path) return '';
	const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
	const slash = trimmed.lastIndexOf('/');
	return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}
