import type {
	EntityRegistry,
	PipelineContext,
	PluginPipelineHooks,
	RouteRule,
	TransformedPage,
} from '@refrakt-md/types';
import { matchRouteEntity } from '@refrakt-md/transform';

/**
 * SPEC-092 Layers 2 + 3 — register pages as typed registry entities.
 *
 * A page becomes a first-class entity of a declared type — *in addition to* its
 * `page` registration — when its frontmatter sets `type`, or when a `routeRules`
 * entry matching its URL declares an `entity` (frontmatter wins). The typed
 * entity **reuses the `page` entity's already reserved-filtered `data`** (the
 * core register hook ran earlier this phase), so it inherits the Layer-1
 * frontmatter passthrough for free; `id` defaults to the page URL.
 *
 * Mirrors the entityRoutes adapter (SPEC-069): config-driven registry behaviour
 * lives here in the content layer, so every adapter gets it with no plumbing.
 * No-op unless a page declares `type` or a `routeRules` rule declares `entity`.
 */
export function createPageEntityHooks(siteConfig: unknown): PluginPipelineHooks {
	const routeRules = (siteConfig as { routeRules?: RouteRule[] } | undefined)?.routeRules ?? [];

	return {
		register(pages: readonly TransformedPage[], registry: EntityRegistry, ctx: PipelineContext): void {
			for (const page of pages) {
				const fmType = typeof page.frontmatter.type === 'string' ? page.frontmatter.type.trim() : '';
				const type = fmType || matchRouteEntity(page.url, routeRules);
				if (!type) continue;

				const fmId = typeof page.frontmatter.id === 'string' ? page.frontmatter.id.trim() : '';
				const id = fmId || page.url;

				// Reuse the `page` entity's reserved-filtered data (registered by the
				// core hook, which runs first in the register phase).
				const pageEntity = registry.getById('page', page.url);
				const data = { ...(pageEntity?.data ?? { url: page.url, title: page.title }) };

				const existing = registry.getById(type, id);
				if (existing && existing.sourceUrl !== page.url) {
					ctx.warn(
						`Entity '${type}:${id}' already registered from '${existing.sourceUrl}'`,
						page.url,
					);
				}

				registry.register({ type, id, sourceUrl: page.url, data });
			}
		},
	};
}
