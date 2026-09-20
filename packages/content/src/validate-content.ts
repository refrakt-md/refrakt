/**
 * The fast validation tier — SPEC-135 D3 / D14 / WORK-577.
 *
 * `loadContent` validates as a side effect of building a `Site`: it resolves
 * routes and layouts, shells out to git for timestamps, runs the identity
 * transform, and then runs three more cross-page phases over every page. A CLI
 * that called it would be no faster than a build, which defeats the reason for
 * having a CLI (D3).
 *
 * This runs the two steps validation actually needs — parse and validate —
 * against a config built by the *same* function the build uses, so the two
 * cannot disagree about which tags and attributes exist (D14).
 */

import { resolve } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { SecurityPolicy } from '@refrakt-md/types';
import { fsProjectFiles } from '@refrakt-md/types/project-files';
import { escapeFenceTags } from '@refrakt-md/runes';
import { ContentTree } from './content-tree.js';
import { parseFrontmatter } from './frontmatter.js';
import { Router } from './router.js';
import {
	buildPageContentVariables,
	buildPageTransformConfig,
	buildPreprocessHookSets,
	parsePagePartials,
	type PageEnvironmentOptions,
} from './site.js';
import { validatePageDetailed, type ValidationSettings } from './validate.js';

/**
 * One validation finding, with enough location detail for a caller to open the
 * right file at the right line without guessing.
 *
 * Returned instead of a `Site` — deliberately. A half-populated `Site` is the
 * worse of the two failures: it type-checks everywhere a real one does, and is
 * wrong in ways nothing catches (D14).
 */
export interface ContentFinding {
	/** Source path relative to the content root, e.g. `docs/install.md`. */
	file: string;
	/** Resolved route URL, matching what a build reports for the same page. */
	url: string;
	/** 1-based source line, when Markdoc located the finding. */
	line?: number;
	severity: 'info' | 'warning' | 'error';
	/** Markdoc error id, e.g. `tag-undefined`. */
	id?: string;
	message: string;
}

export interface ValidateContentOptions extends PageEnvironmentOptions {
	/** URL base path for route resolution. Default: `'/'`. */
	basePath?: string;
	/** Icon registry — part of the transform config, so part of what a page is
	 *  validated against. */
	icons?: Record<string, Record<string, string>>;
	/** Site-wide Markdoc variables available in content via `{% $name %}`. */
	variables?: Record<string, unknown>;
	/** Security policy for sandbox runes, exposed to preprocess hooks. */
	securityPolicy?: SecurityPolicy;
	/** Project-root-relative key of the sandbox examples directory. */
	sandboxExamplesDir?: string;
	/** Per-site config slice. `validation` is read from here, exactly as
	 *  `loadContent` reads it, so a caller that hands over the site's config
	 *  inherits identical dispositions for free — SPEC-135 D5a. */
	siteConfig?: unknown;
	/** Explicit settings, overriding `siteConfig.validation`. For callers that
	 *  resolved config themselves; prefer passing `siteConfig`. */
	validation?: ValidationSettings;
}

/**
 * Validate every page in a content tree, returning findings.
 *
 * Accepts a directory path or a pre-built {@link ContentTree}. Runs parse,
 * preprocess and `Markdoc.validate`, and **nothing else**: no `resolveLayouts`,
 * no `resolveTimestamps` (no git), no `Markdoc.transform`, no `runPipeline`.
 *
 * Two departures from WORK-577's acceptance criteria, both in service of the
 * agreement the same item calls its real deliverable:
 *
 * - **It resolves routes.** The criteria say not to call `router.resolve`, to
 *   keep the tier fast. `Router.resolve` is pure string manipulation with no
 *   I/O (`router.ts:46`), so it costs nothing measurable — and without it every
 *   finding's `url` would differ from the build's, making the agreement
 *   approximate where it could be exact.
 * - **It runs preprocess hooks.** The criteria do not mention them. They are
 *   not optional: `{% snippet %}` resolves itself into a fence node during
 *   preprocess and `{% include %}` pastes partial content in, so skipping them
 *   validates a different tree than the build does — precisely the divergence
 *   D5a exists to forbid.
 *
 * What stays skipped is where the cost actually is: git, layouts, the identity
 * transform, and the three cross-page phases. Those are the `--deep` tier.
 */
export async function validateContent(
	source: string | ContentTree,
	options: ValidateContentOptions = {},
): Promise<ContentFinding[]> {
	const tree = typeof source === 'string' ? await ContentTree.fromDirectory(source) : source;
	const router = new Router(options.basePath ?? '/');

	// Mirror `loadContent`'s defaults for the directory form. It derives a
	// project root from the content directory's parent and roots a
	// `fsProjectFiles` provider there; without the same defaults, snippet's
	// preprocess cannot read files here while it can in a build, and the two
	// paths report different findings for the same corpus.
	//
	// Found by running this function against refrakt's own 235-page site and
	// diffing: 13 findings the build had and this did not, plus one it had and
	// the build did not — all of them snippet tags that resolved in one path and
	// not the other. Exactly the divergence D5a forbids, and invisible without
	// the comparison.
	const env: PageEnvironmentOptions = { ...options };
	if (typeof source === 'string') {
		const projectRoot = options.projectRoot ?? resolve(source, '..');
		env.projectRoot = projectRoot;
		env.sandbox = options.sandbox ?? fsProjectFiles(projectRoot);
	}

	const parsedPartials = await parsePagePartials(tree, env);
	const hookSets = buildPreprocessHookSets(env, parsedPartials);

	// D5a — settings come off the site config exactly as `loadContent` reads
	// them (`site.ts`), and are handed to `validatePageDetailed`, which resolves
	// them through `resolveValidationIds`. Not reimplemented here: the three-way
	// refinement (demote / drop / always-report) has one implementation, and
	// this path calls it.
	const settings =
		options.validation ??
		(options.siteConfig as { validation?: ValidationSettings } | undefined)?.validation;

	const out: ContentFinding[] = [];

	for (const page of tree.pages()) {
		const { frontmatter, content } = parseFrontmatter(page.raw);
		const route = router.resolve(page.relativePath, frontmatter);
		let ast: Node = Markdoc.parse(escapeFenceTags(content));

		// Computed before preprocess, exactly as the build does, so snippet can
		// resolve `path=$file.path`-style references. `timestamps` is omitted —
		// that is the git call the fast tier exists to skip, and nothing in
		// preprocess reads `$file.created` / `$file.modified`.
		const contentVariables = buildPageContentVariables({
			ast,
			frontmatter,
			relativePath: page.relativePath,
			filePath: page.filePath,
			url: route.url,
			draft: route.draft,
			variables: options.variables,
			projectRoot: env.projectRoot,
			sandbox: env.sandbox,
			sandboxExamplesDir: options.sandboxExamplesDir,
			securityPolicy: options.securityPolicy,
			siteConfig: options.siteConfig,
		});

		// Preprocess needs somewhere to put its own diagnostics. They are
		// collected and discarded here: a preprocess warning is a pipeline
		// finding, not a content-validation finding, and reporting it from this
		// entry point would make the fast tier return findings a `validatePage`
		// comparison could never match. The build still reports them.
		const ppCtx = {
			info() {},
			warn() {},
			error() {},
			projectRoot: env.projectRoot,
			sandbox: env.sandbox,
			variables: contentVariables,
			partials: parsedPartials ?? {},
		};
		for (const { hooks } of hookSets) {
			if (!hooks.preprocess) continue;
			const next = await hooks.preprocess(
				ast,
				{ url: route.url, relativePath: page.relativePath, filePath: page.filePath },
				ppCtx as never,
			);
			if (next) ast = next;
		}

		const { config } = buildPageTransformConfig({
			ast,
			content,
			path: route.url,
			sourcePath: page.relativePath,
			icons: options.icons,
			additionalTags: options.additionalTags,
			contentVariables,
			partials: parsedPartials,
		});

		for (const finding of validatePageDetailed(ast, config, { url: route.url, settings })) {
			out.push({
				file: page.relativePath,
				url: route.url,
				line: finding.line,
				severity: finding.warning.severity,
				id: finding.id,
				message: finding.warning.message,
			});
		}
	}

	return out;
}
