import type { Config, Node, ValidationError } from '@markdoc/markdoc';
import type { ContentModel, ResolvedContent } from '@refrakt-md/types';
import { SchemaSideTable } from './schema-side-table.js';
import { OWNER_ATTR, SLOT_ATTR } from './schema-table.js';
import { resolveContentModel } from './resolver.js';

/**
 * The header roles a host reads from its children — ADR-046 decision 3.
 *
 * A host whose content model lifts some of its children into header roles (an
 * eyebrow, a headline, a blurb) registers the roles and that model. A
 * composition placing the host can then ask, for its own expanded template,
 * which node fills which role, and compare that with the slot each node came
 * from. Since SPEC-186 D5 the roles are read from the host's declared content
 * model, the same one its transform resolves, so the check and the rendering
 * cannot disagree, and no hand-written reader restates the grammar.
 */
export interface HeaderRoleHost {
	/** The field names that are header roles. */
	roles: readonly string[];
	/** The host's content model, as its schema declares it. */
	model: ContentModel | ((attrs: Record<string, any>) => ContentModel);
}

/** Each host's roles and model, keyed by its schema. */
export const schemaHeaderRoles = new SchemaSideTable<HeaderRoleHost>();

/** The nodes filling each header role, read through the host's model. A
 *  delimited model's zones are searched one level down. */
export function readHeaderRoles(
	host: HeaderRoleHost,
	children: readonly Node[],
	attrs: Record<string, unknown>,
): Array<{ role: string; node: Node }> {
	const model = typeof host.model === 'function' ? host.model(attrs) : host.model;
	const { content } = resolveContentModel([...children], model, attrs);
	const out: Array<{ role: string; node: Node }> = [];
	const scan = (values: ResolvedContent) => {
		for (const role of host.roles) {
			const node = values[role];
			if (node && typeof node === 'object' && !Array.isArray(node) && 'type' in node) {
				out.push({ role, node: node as Node });
			}
		}
	};
	scan(content);
	for (const zone of Object.values(content)) {
		if (zone && typeof zone === 'object' && !Array.isArray(zone) && !('type' in zone)) {
			scan(zone as ResolvedContent);
		}
	}
	return out;
}

/** The finding's id, so `validation.disableIds` can turn it off like any other. */
export const SLOT_HEADER_ROLE_ID = 'slot-header-role';

/** The `header` value that stops a host reading a role, for the remedy. */
const REMEDY: Record<string, string> = {
	eyebrow: 'headline',
	blurb: 'headline',
	headline: 'none',
	'epigraph-quote': 'headline',
	'epigraph-attribution': 'headline',
};

/**
 * Report slot content that a placed host reads as a header role the slot is
 * not named for.
 *
 * Walks the composition's expanded template, `placed`. For each placed tag
 * whose schema registered a reader, it reads the roles as that host will, and
 * reports each node that carries this rune's slot marker under a different
 * name. Template text and slots named for their role are not reported. The
 * check reads the AST only and changes nothing that renders.
 */
export function auditSlotHeaderRoles(
	rune: string,
	placed: readonly Node[],
	config: Config,
): ValidationError[] {
	const out: ValidationError[] = [];
	const visit = (nodes: readonly Node[]) => {
		for (const node of nodes) {
			if (node.type === 'tag' && node.tag) {
				const schema = config.tags?.[node.tag];
				const host = schema ? schemaHeaderRoles.get(schema) : undefined;
				if (host) {
					for (const { role, node: filled } of readHeaderRoles(
						host,
						node.children,
						node.attributes,
					)) {
						const slot = filled.attributes?.[SLOT_ATTR];
						if (slot === undefined || filled.attributes?.[OWNER_ATTR] !== rune) continue;
						if (slot === role) continue;
						out.push({
							id: SLOT_HEADER_ROLE_ID,
							level: 'warning',
							message:
								`slot \`${slot}\` of \`${rune}\` is read as \`${node.tag}\`'s ${role}; ` +
								`name the field \`${role}\`, or set \`header="${REMEDY[role] ?? 'none'}"\` on the ${node.tag}`,
						});
					}
				}
			}
			visit(node.children);
		}
	};
	visit(placed);
	return out;
}
