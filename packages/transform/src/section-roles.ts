import type { RuneConfig, StructureEntry, LayoutEntry } from './types.js';

/**
 * Slot/role drift — SPEC-125 Phase 1, *Guard against recurrence*.
 *
 * A rune's `sections` map is what `reading`, `dropcap` and `prominence` gate on.
 * When a rune declares a `body` slot and never maps it to the `body` role, those
 * attributes are dropped in silence: `{% card reading="prose" %}` did nothing at
 * all, with no warning, until v0.31.0. Twelve such mismatches were found by an
 * ad-hoc script; this is that script turned into a standing check.
 *
 * **Direction only — this flags a *missing* role and never a role that is
 * present.** A `body` role on a non-prose region (`DataTable`'s table,
 * `Showcase`'s viewport) is an overload of what `body` means, not a data error,
 * and Lumina styles those roles directly. Flagging them here would push someone
 * toward removing a correct role instead of toward the real fix, which is to
 * separate the prose capability from the structural role.
 */

/** Slot names that mean "this rune has a body region". */
export const BODY_SLOT_NAMES = ['body'] as const;

/** Slot names that mean "this rune has a heading of its own". `name` is
 *  included because several runes render their heading from a `name` attribute
 *  rather than from a markdown heading. */
export const HEADER_SLOT_NAMES = ['title', 'header', 'headline', 'name'] as const;

/** Roles that satisfy a header-ish slot — the same set `prominence` gates on. */
const HEADER_ROLES = new Set(['header', 'preamble', 'title', 'description']);

export interface SectionRoleFinding {
	/** `theme.runes` key, e.g. `Card`. */
	rune: string;
	/** The declared slot with no matching role. */
	slot: string;
	/** Which rule fired. */
	kind: 'missing-body-role' | 'missing-header-role';
	message: string;
}

/**
 * Every slot name a rune declares, gathered from the five config fields that can
 * introduce one. The ad-hoc audit script had to reconstruct this; keeping it in
 * one place means the lint and any later consumer agree on what a rune's slots
 * are.
 *
 * - `layout` — container keys and their `children` entries
 * - `structure` — entry keys and the `ref` of every (possibly nested) entry
 * - `autoLabel` — the `data-name` values it assigns
 * - `blocks` — projected metadata blocks, which become named elements
 * - `contentWrapper` — its `ref`
 *
 * Slot names the *schema* emits as bare `data-name` attributes are not visible
 * from config at all, so this is a lower bound. That is the right side to err
 * on: the lint only fires on what it can see, and never invents a slot.
 */
export function declaredSlots(config: RuneConfig): Set<string> {
	const slots = new Set<string>();

	for (const [key, entry] of Object.entries(config.layout ?? {})) {
		// `root` is the layout's entry point, not a slot of its own.
		if (key !== 'root') slots.add(key);
		collectLayoutChildren(entry, slots);
	}

	for (const [key, entry] of Object.entries(config.structure ?? {})) {
		slots.add(key);
		collectStructureRefs(entry, slots);
	}

	for (const label of Object.values(config.autoLabel ?? {})) slots.add(label);
	for (const key of Object.keys(config.blocks ?? {})) slots.add(key);
	if (config.contentWrapper?.ref) slots.add(config.contentWrapper.ref);

	return slots;
}

function collectLayoutChildren(entry: LayoutEntry | string[] | undefined, into: Set<string>): void {
	if (!entry) return;
	if (Array.isArray(entry)) {
		for (const child of entry) if (typeof child === 'string') into.add(child);
		return;
	}
	const children = (entry as { children?: unknown }).children;
	if (Array.isArray(children)) {
		for (const child of children) if (typeof child === 'string') into.add(child);
	}
}

function collectStructureRefs(entry: StructureEntry | undefined, into: Set<string>): void {
	if (!entry || typeof entry !== 'object') return;
	if (typeof entry.ref === 'string') into.add(entry.ref);
	for (const child of entry.children ?? []) {
		if (typeof child !== 'string') collectStructureRefs(child as StructureEntry, into);
	}
}

/** Which slots a rune's `sections` map already accounts for. */
function rolesBySlot(config: RuneConfig): Map<string, string> {
	return new Map(Object.entries(config.sections ?? {}));
}

/**
 * Flag runes whose declared slots have no matching section role.
 *
 * A rune opts out per slot with `sectionRoleExceptions`, which carries the
 * reason alongside the decision rather than leaving it in a commit message.
 * Most exceptions so far share one shape: **a child rune takes the `title` role
 * only when its parent does not already hold one** — a second title inside the
 * same subtree flattens the hierarchy `prominence` exists to scale. That is
 * recorded per rune rather than inferred here, so the lint stays a data check
 * and each decision stays readable where it was made.
 */
export function lintSectionRoles(runes: Record<string, RuneConfig>): SectionRoleFinding[] {
	const findings: SectionRoleFinding[] = [];

	for (const [rune, config] of Object.entries(runes)) {
		if (!config || typeof config !== 'object') continue;

		const slots = declaredSlots(config);
		const roles = rolesBySlot(config);
		const exceptions = config.sectionRoleExceptions ?? {};
		const declaredRoles = new Set(roles.values());

		for (const slot of BODY_SLOT_NAMES) {
			if (!slots.has(slot) || slot in exceptions) continue;
			if (roles.get(slot) === 'body') continue;
			// Another slot already carries the body role — the region exists and is
			// declared, just under a different name (Blog's `content`, DataTable's
			// `table`). Not drift.
			if (declaredRoles.has('body')) continue;
			findings.push({
				rune, slot, kind: 'missing-body-role',
				message: `"${rune}" declares a \`${slot}\` slot but no \`body\` section role, so \`reading\` and \`dropcap\` are silently dropped on it. Map it in \`sections\`, or record why not in \`sectionRoleExceptions\`.`,
			});
		}

		if (declaredRoles.size > 0 && [...declaredRoles].some((r) => HEADER_ROLES.has(r))) continue;

		for (const slot of HEADER_SLOT_NAMES) {
			if (!slots.has(slot) || slot in exceptions) continue;
			findings.push({
				rune, slot, kind: 'missing-header-role',
				message: `"${rune}" declares a \`${slot}\` slot but no header-ish section role (header/preamble/title/description), so \`prominence\` is dropped with a warning. Map it in \`sections\`, or record why not in \`sectionRoleExceptions\`.`,
			});
			break; // One finding per rune is enough to act on.
		}
	}

	return findings;
}
