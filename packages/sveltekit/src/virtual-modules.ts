import type { RefraktConfig } from '@refrakt-md/types';

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
}

export function loadVirtualModule(
	id: string,
	config: RefraktConfig,
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

function generateContentModule(config: RefraktConfig, buildCtx: BuildContext): string {
	const configPath = buildCtx.resolvedRoot
		? JSON.stringify(buildCtx.resolvedRoot + '/refrakt.config.json')
		: JSON.stringify('./refrakt.config.json');

	// Build variables object as a raw JS expression
	let variablesExpr = 'undefined';
	if (buildCtx.variables && Object.keys(buildCtx.variables).length > 0) {
		const entries = Object.entries(buildCtx.variables)
			.map(([key, value]) => `\t\t${JSON.stringify(key)}: ${value}`)
			.join(',\n');
		variablesExpr = `{\n${entries}\n\t}`;
	}

	return [
		`import { createRefraktLoader } from '@refrakt-md/content';`,
		``,
		`const _loader = createRefraktLoader({`,
		`\tconfigPath: ${configPath},`,
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
