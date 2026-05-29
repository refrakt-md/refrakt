/**
 * file-ref postProcess resolver (SPEC-078, WORK-301).
 *
 * Walks the rendered page, finds `file-ref` sentinels, binds each inline
 * `<a>` to the canonical GitHub URL built from the site's `repoUrl` /
 * `repoBranch`, and (when `preview="drawer"` is set) emits a
 * `hoist-drawer` sentinel that the drawer pipeline picks up to render a
 * preview drawer containing the file's snippet + a "View source on
 * GitHub →" footer link.
 */

import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { PipelineContext } from '@refrakt-md/types';
import { buildGithubBlobUrl, formatLineAnchor } from '@refrakt-md/transform';
import {
	HOIST_DRAWER_SENTINEL,
	pathToSlug,
	registerHoistBuilder,
	type HoistBuildContext,
} from './drawer-pipeline.js';
import { FILE_REF_SENTINEL } from './tags/file-ref.js';
import { readSnippetFile, SnippetSandboxError } from './lib/read-file.js';
import { inferLanguage } from './lang-map.js';

const { Tag } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

function isTag(node: unknown): node is TagNode {
	return Tag.isTag(node as never);
}

function metaContent(tag: TagNode, field: string): string {
	for (const child of tag.children ?? []) {
		if (isTag(child) && child.name === 'meta' && child.attributes['data-field'] === field) {
			return String(child.attributes.content ?? '');
		}
	}
	return '';
}

function hasSentinel(tag: TagNode): boolean {
	return (tag.children ?? []).some(
		c => isTag(c) && c.name === 'meta' && c.attributes['data-field'] === FILE_REF_SENTINEL,
	);
}

interface FileRefQuery {
	path: string;
	lines: string;
	label: string;
	preview: string;
}

function readQuery(tag: TagNode): FileRefQuery {
	return {
		path: metaContent(tag, 'file-ref-path'),
		lines: metaContent(tag, 'file-ref-lines'),
		label: metaContent(tag, 'file-ref-label'),
		preview: metaContent(tag, 'file-ref-preview'),
	};
}

function defaultLabel(path: string): string {
	if (!path) return '';
	const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
	const slash = trimmed.lastIndexOf('/');
	return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

/**
 * Resolve every `file-ref` sentinel on the page: bind the inline `<a>` to
 * the GitHub URL (or in-page anchor when `preview="drawer"`), emit a
 * sibling hoist sentinel for the drawer pipeline when previewing, and
 * strip the file-ref metas from the rendered tree.
 *
 * Re-entrant per page — the "missing repoUrl" build warning fires at most
 * once per page even when many file-refs share the gap.
 */
export function resolveFileRefs(
	renderable: unknown,
	pageUrl: string,
	repoUrl: string | undefined,
	repoBranch: string | undefined,
	ctx: PipelineContext,
): unknown {
	// Reset the per-page "missing repoUrl" warning gate.
	const localWarned = { value: false };
	const walk = (node: unknown): unknown => {
		if (Array.isArray(node)) {
			let mutated = false;
			const out = node.map(c => {
				const w = walk(c);
				if (w !== c) mutated = true;
				return w;
			});
			return mutated ? out : node;
		}
		if (!isTag(node)) return node;
		const tag = node;
		if (tag.attributes?.['data-rune'] === 'file-ref' && hasSentinel(tag)) {
			return resolveOne(tag, pageUrl, repoUrl, repoBranch, ctx, localWarned);
		}
		if (!tag.children || tag.children.length === 0) return tag;
		let mutated = false;
		const next = tag.children.map(c => {
			const w = walk(c);
			if (w !== c) mutated = true;
			return w;
		});
		if (!mutated) return tag;
		return new Tag(tag.name, tag.attributes, next as never[]);
	};
	return walk(renderable);
}

function resolveOne(
	tag: TagNode,
	pageUrl: string,
	repoUrl: string | undefined,
	repoBranch: string | undefined,
	ctx: PipelineContext,
	localWarned: { value: boolean },
): TagNode {
	const q = readQuery(tag);
	const label = q.label || defaultLabel(q.path) || q.path;
	const slug = pathToSlug(q.path, q.lines);
	const previewDrawer = q.preview === 'drawer';

	const githubUrl = buildGithubBlobUrl(repoUrl, repoBranch, q.path, q.lines);

	if (!githubUrl && !localWarned.value) {
		ctx.warn(
			`file-ref on this page has no GitHub URL — site config is missing \`repoUrl\` (path="${q.path}"). Configure \`SiteConfig.repoUrl\` to render canonical "View source" links.`,
			pageUrl,
		);
		localWarned.value = true;
	}

	// Build the inline anchor. With preview, it points at the hoist anchor;
	// without preview, it points at the GitHub URL (or has no href when
	// repoUrl is absent).
	const anchorAttrs: Record<string, unknown> = {};
	if (previewDrawer) {
		anchorAttrs.href = `#drawer-${slug}`;
		anchorAttrs['aria-controls'] = `drawer-${slug}`;
		anchorAttrs['aria-expanded'] = 'false';
		anchorAttrs['data-target-type'] = 'drawer';
	} else if (githubUrl) {
		anchorAttrs.href = githubUrl;
	}
	const anchor = new Tag('a', anchorAttrs, [label]);

	const children: RenderableTreeNode[] = [anchor];
	if (previewDrawer) {
		// Emit the hoist sentinel as a sibling of the inline link. The
		// drawer pipeline (WORK-300) picks this up, builds the drawer via
		// the registered builder, and strips this meta from the tree.
		const sentinel = new Tag('meta', {
			'data-field': HOIST_DRAWER_SENTINEL,
			'data-source': 'file-ref',
			'data-target-id': slug,
			'data-title': label,
			'data-path': q.path,
			'data-lines': q.lines,
			'data-github-url': githubUrl ?? '',
		});
		children.push(sentinel);
	}

	// Preserve the outer span (carrying `data-rune="file-ref"`) so the
	// engine's BEM class on it survives; replace the children with the
	// resolved anchor + (when previewing) hoist sentinel.
	return new Tag(tag.name, tag.attributes, children as never[]);
}

// ─────────────────────────────────────────────────────────────────────
// Hoist builder — registered with the drawer pipeline so it can build
// preview drawers for `file-ref preview="drawer"` references.
// ─────────────────────────────────────────────────────────────────────

function buildFileRefHoist(
	payload: Record<string, string>,
	context: HoistBuildContext,
): TagNode | null {
	const filePath = payload.path;
	const lines = payload.lines;
	const title = payload.title || defaultLabel(filePath);
	const targetId = payload['target-id'];
	const githubUrl = payload['github-url'];

	if (!filePath || !targetId) {
		context.ctx.warn(
			`file-ref hoist payload missing required path or target-id`,
			context.pageUrl,
		);
		return null;
	}
	if (!context.projectRoot) {
		context.ctx.error(
			`file-ref hoist for "${filePath}" requires a project root in the pipeline; none was threaded through. Drawer body will be empty.`,
			context.pageUrl,
		);
		return null;
	}

	// Read the file (same sandbox as snippet). Errors surface as build
	// errors naming the resolved path and the referencing page.
	let fileContent = '';
	let lang = 'text';
	try {
		const result = readSnippetFile({
			pathAttr: filePath,
			projectRoot: context.projectRoot,
			lines: lines || undefined,
			referencingPage: context.pageUrl,
		});
		fileContent = result.content;
		lang = inferLanguage(result.relativePath);
		for (const w of result.warnings) context.ctx.warn(`file-ref ${filePath}: ${w}`, context.pageUrl);
	} catch (err) {
		const msg = err instanceof SnippetSandboxError
			? err.message
			: `file-ref ${filePath}: ${err instanceof Error ? err.message : String(err)}`;
		context.ctx.error(msg, context.pageUrl);
		return null;
	}

	// Drawer body — a figure.rf-snippet wrapping a `<pre data-language>`
	// so the existing snippet CSS + highlight transform pick it up.
	const codeBlock = new Tag('pre', {
		'data-language': lang,
		'data-codeblock': 'true',
	}, [new Tag('code', {}, [fileContent])]);
	const snippetFigure = new Tag('figure', {
		class: 'rf-snippet',
		'data-rune': 'snippet',
		'data-source-path': filePath,
		...(lines ? { 'data-lines': lines } : {}),
	}, [codeBlock]);
	const body = new Tag('div', { 'data-name': 'body', class: 'rf-drawer__body' }, [snippetFigure]);

	// Header — title + close button (close hidden until the behavior
	// layer reveals it, same as authored drawers).
	const titleHeading = new Tag('h3', { 'data-name': 'title', class: 'rf-drawer__title' }, [title]);
	const closeButton = new Tag('button', {
		type: 'button',
		'aria-label': 'Close',
		hidden: true,
		'data-name': 'close',
		class: 'rf-drawer__close',
	}, ['×']);
	const header = new Tag('header', {
		'data-name': 'header',
		class: 'rf-drawer__header',
	}, [titleHeading, closeButton]);

	// Footer — "View source on GitHub →" link. Hides when no
	// repoUrl is configured (githubUrl will be empty in the payload).
	const footerChildren: RenderableTreeNode[] = [];
	if (githubUrl) {
		const arrow = ' →';
		footerChildren.push(
			new Tag('a', { href: githubUrl, rel: 'external noopener', target: '_blank' }, [`View source on GitHub${arrow}`]),
		);
	}
	const footer = footerChildren.length > 0
		? new Tag('footer', { 'data-name': 'footer', class: 'rf-drawer__footer' }, footerChildren)
		: null;

	const drawerChildren: RenderableTreeNode[] = [header, body];
	if (footer) drawerChildren.push(footer);

	const section = new Tag(
		'section',
		{
			id: `drawer-${targetId}`,
			class: 'rf-drawer',
			'data-rune': 'drawer',
			'data-drawer-id': targetId,
			'data-side': 'right',
			'data-size': 'md',
		},
		drawerChildren,
	);
	return section;
}

// Register the builder when this module is imported.
registerHoistBuilder('file-ref', buildFileRefHoist);
