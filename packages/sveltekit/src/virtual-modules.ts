import type { SiteConfig } from '@refrakt-md/types';

const VIRTUAL_PREFIX = 'virtual:refrakt/';
const RESOLVED_PREFIX = '\0virtual:refrakt/';

export const VIRTUAL_IDS = {
	theme: `${VIRTUAL_PREFIX}theme`,
	tokens: `${VIRTUAL_PREFIX}tokens`,
	config: `${VIRTUAL_PREFIX}config`,
	content: `${VIRTUAL_PREFIX}content`,
} as const;

export function resolveVirtualId(id: string): string | undefined {
	if (id === VIRTUAL_IDS.theme) return `${RESOLVED_PREFIX}theme`;
	if (id === VIRTUAL_IDS.tokens) return `${RESOLVED_PREFIX}tokens`;
	if (id === VIRTUAL_IDS.config) return `${RESOLVED_PREFIX}config`;
	if (id === VIRTUAL_IDS.content) return `${RESOLVED_PREFIX}content`;
	return undefined;
}

/** Build-time context for CSS tree-shaking and content module generation */
export interface BuildContext {
	isBuild: boolean;
	usedCssBlocks?: Set<string>;
	resolvedRoot: string;
	/** Raw JS expressions for Markdoc variables (e.g., { version: '__REFRAKT_VERSION__' }) */
	variables?: Record<string, string>;
	/** Path to refrakt.config.json relative to vite's resolvedRoot. Defaults
	 *  to `refrakt.config.json` (next to vite.config.ts). Used at runtime by
	 *  the virtual content module's `createRefraktLoader`. */
	configPath?: string;
	/** Site name to load from a multi-site config; passed to the runtime
	 *  loader so server-side rendering picks the same site as the plugin. */
	siteName?: string;
}

export function loadVirtualModule(
	id: string,
	config: SiteConfig,
	buildCtx: BuildContext = { isBuild: false, resolvedRoot: '' },
): string | undefined {
	const theme = config.theme;

	if (id === `${RESOLVED_PREFIX}theme`) {
		const overrides = config.overrides;
		const hasOverrides = overrides && Object.keys(overrides).length > 0;
		const routeRules = config.routeRules ?? [{ pattern: '**', layout: 'default' }];

		// ADR-009: Assemble theme from generic exports instead of per-framework adapter.
		// The theme provides manifest + layouts; the framework adapter adds components/elements.
		const lines = [
			`import _manifest from '${theme}/manifest';`,
			`import { layouts as _layouts } from '${theme}/layouts';`,
			`import { registry as _registry } from '@refrakt-md/svelte';`,
			`import { elements as _elements } from '@refrakt-md/svelte';`,
		];

		if (hasOverrides) {
			const entries = Object.entries(overrides);
			for (let i = 0; i < entries.length; i++) {
				lines.push(`import _o${i} from '${entries[i][1]}';`);
			}
		}

		lines.push('');
		lines.push('export const theme = {');
		lines.push('\tmanifest: {');
		lines.push('\t\t..._manifest,');
		lines.push(`\t\trouteRules: ${JSON.stringify(routeRules)},`);
		if (config.baseUrl) {
			lines.push(`\t\tbaseUrl: ${JSON.stringify(config.baseUrl)},`);
		}
		if (config.siteName) {
			lines.push(`\t\tsiteName: ${JSON.stringify(config.siteName)},`);
		}
		if (config.defaultImage) {
			lines.push(`\t\tdefaultImage: ${JSON.stringify(config.defaultImage)},`);
		}
		if (config.logo) {
			lines.push(`\t\tlogo: ${JSON.stringify(config.logo)},`);
		}
		lines.push('\t},');
		lines.push('\tlayouts: _layouts,');

		if (hasOverrides) {
			const entries = Object.entries(overrides);
			lines.push('\tcomponents: {');
			lines.push('\t\t..._registry,');
			for (let i = 0; i < entries.length; i++) {
				lines.push(`\t\t'${entries[i][0]}': _o${i},`);
			}
			lines.push('\t},');
		} else {
			lines.push('\tcomponents: _registry,');
		}

		lines.push('\telements: _elements,');
		lines.push('};');
		return lines.join('\n');
	}

	if (id === `${RESOLVED_PREFIX}tokens`) {
		if (buildCtx.isBuild && buildCtx.usedCssBlocks) {
			const lines = [`import '${theme}/base.css';`];
			for (const block of [...buildCtx.usedCssBlocks].sort()) {
				lines.push(`import '${theme}/styles/runes/${block}.css';`);
			}
			return lines.join('\n');
		}
		// Dev mode: import the full CSS barrel via the package's root export
		return `import '${theme}';`;
	}

	if (id === `${RESOLVED_PREFIX}config`) {
		return `export default ${JSON.stringify(config)};`;
	}

	if (id === `${RESOLVED_PREFIX}content`) {
		return generateContentModule(config, buildCtx);
	}

	return undefined;
}

function generateContentModule(config: SiteConfig, buildCtx: BuildContext): string {
	const relativeConfig = buildCtx.configPath ?? 'refrakt.config.json';
	const configPath = buildCtx.resolvedRoot
		? JSON.stringify(resolvePath(buildCtx.resolvedRoot, relativeConfig))
		: JSON.stringify(relativeConfig);

	// Build variables object as a raw JS expression
	let variablesExpr = 'undefined';
	if (buildCtx.variables && Object.keys(buildCtx.variables).length > 0) {
		const entries = Object.entries(buildCtx.variables)
			.map(([key, value]) => `\t\t${JSON.stringify(key)}: ${value}`)
			.join(',\n');
		variablesExpr = `{\n${entries}\n\t}`;
	}

	const siteName = buildCtx.siteName ? JSON.stringify(buildCtx.siteName) : 'undefined';

	return [
		`import { createRefraktLoader } from '@refrakt-md/content';`,
		``,
		`const _loader = createRefraktLoader({`,
		`\tconfigPath: ${configPath},`,
		`\tsite: ${siteName},`,
		`\tvariables: ${variablesExpr},`,
		`\tdev: import.meta.env.DEV,`,
		`});`,
		``,
		`export const getSite = () => _loader.getSite();`,
		`export const getTransform = () => _loader.getTransform();`,
		`export const getHighlightTransform = () => _loader.getHighlightTransform();`,
		`export const invalidateSite = () => _loader.invalidateSite();`,
	].join('\n');
}

function resolvePath(root: string, relative: string): string {
	if (relative.startsWith('/')) return relative;
	// Use POSIX semantics for the embedded string regardless of host OS.
	const parts = (root + '/' + relative).split('/');
	const stack: string[] = [];
	for (const part of parts) {
		if (part === '' || part === '.') continue;
		if (part === '..') {
			stack.pop();
			continue;
		}
		stack.push(part);
	}
	return '/' + stack.join('/');
}
