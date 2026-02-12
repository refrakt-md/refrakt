import type { RefraktConfig } from '@refrakt-md/types';

const VIRTUAL_PREFIX = 'virtual:refrakt/';
const RESOLVED_PREFIX = '\0virtual:refrakt/';

export const VIRTUAL_IDS = {
	theme: `${VIRTUAL_PREFIX}theme`,
	tokens: `${VIRTUAL_PREFIX}tokens`,
	config: `${VIRTUAL_PREFIX}config`,
} as const;

export function resolveVirtualId(id: string): string | undefined {
	if (id === VIRTUAL_IDS.theme) return `${RESOLVED_PREFIX}theme`;
	if (id === VIRTUAL_IDS.tokens) return `${RESOLVED_PREFIX}tokens`;
	if (id === VIRTUAL_IDS.config) return `${RESOLVED_PREFIX}config`;
	return undefined;
}

export function loadVirtualModule(id: string, config: RefraktConfig): string | undefined {
	if (id === `${RESOLVED_PREFIX}theme`) {
		return `export { theme } from '${config.theme}';`;
	}

	if (id === `${RESOLVED_PREFIX}tokens`) {
		return `import '${config.theme}/tokens.css';`;
	}

	if (id === `${RESOLVED_PREFIX}config`) {
		return `export default ${JSON.stringify(config)};`;
	}

	return undefined;
}
