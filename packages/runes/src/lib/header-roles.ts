import type { Config, Node, ValidationError } from '@markdoc/markdoc';
import { SchemaSideTable } from './schema-side-table.js';
import { OWNER_ATTR, SLOT_ATTR } from './schema-table.js';

/**
 * The header roles a host reads from its children — ADR-046 decision 3.
 *
 * A host whose grammar lifts some of its children into header roles (an
 * eyebrow, a headline, a blurb) registers a reader for them. A composition
 * placing that host can then ask, for its own expanded template, which node
 * fills which role, and compare that with the slot each node came from. The
 * reader is the host's own grammar, not a copy of it, so the check and the
 * rendering cannot disagree.
 */
export type HeaderRoleReader = (
	children: readonly Node[],
	attrs: Record<string, unknown>,
) => ReadonlyArray<{ role: string; node: Node }>;

/** Each host's reader, keyed by its schema. */
export const schemaHeaderRoles = new SchemaSideTable<HeaderRoleReader>();

/** The finding's id, so `validation.disableIds` can turn it off like any other. */
export const SLOT_HEADER_ROLE_ID = 'slot-header-role';

/** The `header` value that stops a host reading a role, for the remedy. */
const REMEDY: Record<string, string> = {
	eyebrow: 'headline',
	blurb: 'headline',
	headline: 'none',
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
				const reader = schema ? schemaHeaderRoles.get(schema) : undefined;
				if (reader) {
					for (const { role, node: filled } of reader(node.children, node.attributes)) {
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
