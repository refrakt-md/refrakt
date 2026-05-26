/**
 * Built-in entityRoutes config-rules adapter (SPEC-069 / WORK-268).
 *
 * Turns `site.entityRoutes` into a `contributePages` hook: selects entities by
 * `type` + `filter` (shared field-match grammar), substitutes `{name}`
 * placeholders, renders the inline `render` string (or a `render-template`
 * partial) per entity with `$item` bound, and back-fills each matched entity's
 * `sourceUrl` so refs prefer the on-site page.
 */
import { parseFieldMatch, matchesFieldMatch, type MatchableEntity } from '@refrakt-md/runes';
import type {
	ContributePagesContext,
	ContributedPage,
	EntityRoute,
	EntityRegistration,
	PluginPipelineHooks,
	SiteConfig,
} from '@refrakt-md/types';

/** Fields available to `{name}` substitution: top-level + everything in `data`. */
function substitutionFields(e: EntityRegistration): Record<string, unknown> {
	return { id: e.id, type: e.type, sourceUrl: e.sourceUrl, ...e.data };
}

/** Interpolate `{name}` placeholders from a field set. Missing → '' (with the
 *  caller deciding whether to warn). Optionally per-segment URL-encode. */
function substitute(template: string, fields: Record<string, unknown>, encode: boolean): string {
	return template.replace(/\{([^}]+)\}/g, (_m, name: string) => {
		const raw = fields[name];
		const value = raw == null ? '' : String(raw);
		return encode ? value.split('/').map(encodeURIComponent).join('/') : value;
	});
}

function substituteFrontmatter(
	fm: Record<string, unknown> | undefined,
	fields: Record<string, unknown>,
): Record<string, unknown> | undefined {
	if (!fm) return undefined;
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(fm)) {
		out[k] = typeof v === 'string' ? substitute(v, fields, false) : v;
	}
	return out;
}

function project(e: EntityRegistration) {
	const data = (e.data ?? {}) as Record<string, unknown>;
	// Spread `data` so render templates can reference `$item.<field>` for the
	// same fields available to URL `{name}` substitution. `id`, `type`, and
	// `url` are canonical; `data` is preserved for templates that want the
	// raw payload.
	return { ...data, id: e.id, type: e.type, url: e.sourceUrl || String(data.url ?? ''), data };
}

/** Build the contributePages hook for a site's entityRoutes config. */
export function createEntityRoutesHooks(
	resolvePartial: (name: string) => string | undefined,
): PluginPipelineHooks {
	return {
		contributePages(ctx: ContributePagesContext): ContributedPage[] {
			const site = ctx.siteConfig as SiteConfig | undefined;
			const rules = site?.entityRoutes;
			if (!rules || rules.length === 0) return [];

			const pages: ContributedPage[] = [];
			for (const rule of rules as EntityRoute[]) {
				const inline = rule.render;
				const templateName = rule['render-template'];
				if (inline && templateName) {
					ctx.error(`entityRoutes: rule for type "${rule.type}" sets both render and render-template`);
					continue;
				}
				let content = inline ?? '';
				if (templateName) {
					const loaded = resolvePartial(templateName);
					if (loaded == null) {
						ctx.error(`entityRoutes: render-template "${templateName}" could not be resolved`);
						continue;
					}
					content = loaded;
				}

				const types = rule.type.split(',').map((s) => s.trim()).filter(Boolean);
				const parsed = rule.filter ? parseFieldMatch(rule.filter) : undefined;
				if (parsed) for (const w of parsed.warnings) ctx.warn(`entityRoutes filter: ${w}`);

				let entities: EntityRegistration[] = [];
				for (const type of types) entities.push(...ctx.registry.getAll(type));
				if (parsed) entities = entities.filter((e) => matchesFieldMatch(e as MatchableEntity, parsed));

				for (const entity of entities) {
					const fields = substitutionFields(entity);
					const url = substitute(rule.url, fields, true);
					const title = rule.title ? substitute(rule.title, fields, false) : undefined;
					const frontmatter = substituteFrontmatter(rule.frontmatter, fields);
					pages.push({ url, title, frontmatter, content, variables: { item: project(entity) } });
					// Back-fill sourceUrl so refs/expands prefer the on-site page.
					// The registry stores live registration objects (pre-aggregate).
					(entity as { sourceUrl: string }).sourceUrl = url;
				}
			}
			return pages;
		},
	};
}
