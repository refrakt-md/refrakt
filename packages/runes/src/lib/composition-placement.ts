/**
 * Where a composed rune's universal attributes land — SPEC-145 D14, D24, D31,
 * D33.
 *
 * A composed rune's root is an empty wrapper around what its template places.
 * Only `width`, `spacing` and `inset` belong there, because their CSS needs the
 * box in page flow. Every other axis goes to a rune the template places:
 *
 * - the **paint carrier** (`elevation`, `substrate`, `bg` with `scrim`,
 *   `motion`, `tint`, `density`): the rune marked `chrome` in the template, else
 *   the single rune it places at its top level;
 * - the **owner of a role** (`prominence` → a header, `reading` / `dropcap` →
 *   a prose body, `frame` → media): the carrier when it owns the role, else the
 *   single placed rune that does.
 *
 * Placement is read from each axis (`UniversalAxisFacet.placement`), never from
 * a list here. The attribute is written onto the target tag at expansion, as an
 * ordinary attribute, so the target receives it exactly as if the author had
 * written it there (D24's equivalence). When the target is itself a
 * composition, its own expansion moves it again: nomination delegates.
 */
import type { Node, Schema } from '@markdoc/markdoc';
import { UNIVERSAL_AXIS_FACETS } from '@refrakt-md/transform';
import type { AxisPlacement } from '@refrakt-md/transform';
import { AXIS_ATTRIBUTES } from '../universal-attributes.js';

// ---------------------------------------------------------------------------
// The runes a template may place, by name
// ---------------------------------------------------------------------------

/**
 * Runes a composition can place, by tag name. A composition decides at
 * construction which placed rune owns a role, and only the placed rune's schema
 * says what it accepts. Core runes register when the package entry loads; a
 * plugin's own runes register before its compositions are built, and each
 * composed rune registers once built, so a later composition can place it.
 */
const placeable = new Map<string, Schema>();

export function registerPlaceableSchema(name: string, schema: Schema | undefined): void {
	if (schema) placeable.set(name, schema);
}

export function placeableSchema(name: string): Schema | undefined {
	return placeable.get(name);
}

// ---------------------------------------------------------------------------
// The placements of one composition
// ---------------------------------------------------------------------------

/** A rune the template places, as construction saw it. */
export interface TemplateRune {
	node: Node;
	/** Placed at the template's top level: inside no other placed rune. */
	top: boolean;
	/** Inside an `each` slot, so placed once per item. */
	inEach: boolean;
}

/** Where one axis lands on this composition. */
export type AxisTarget =
	| { placement: 'root' }
	| { placement: Exclude<AxisPlacement, 'root'>; node: Node; rune: string }
	/** Offered, but dropped with a warning: the composition has no carrier (D24). */
	| { placement: 'carrier'; dropped: string }
	/** Not offered: no rune the template places takes the axis (D33.3). */
	| { placement: AxisPlacement; unavailable: string };

export interface CompositionPlacements {
	/** The paint carrier's template node, when there is one. */
	carrier?: Node;
	/** Per axis, by `UniversalAxisFacet.axis`. */
	axes: Record<string, AxisTarget>;
	/** Universal attribute → its axis, for the attributes an axis owns. */
	axisOf: Record<string, string>;
}

/** What the placement step reports at construction — a code and its message. */
export type PlacementFail = (
	code: 'chrome-invalid' | 'chrome-marked-twice' | 'chrome-ambiguous' | 'chrome-collision',
	msg: string,
	at?: Node,
) => never;

const ROLE_NAMES: Record<Exclude<AxisPlacement, 'root' | 'carrier'>, string> = {
	header: 'a page-section header',
	'prose-body': 'a prose body',
	media: 'a media zone or frame target',
};

/** Whether a placed rune takes an axis: its schema declares the axis's first
 *  attribute. Schema narrowing (SPEC-125) put it there only where the axis
 *  applies, and a composed rune's own narrowing follows its placements, so the
 *  same question looks through a nested composition. */
function takes(rune: string, axis: string): boolean {
	const names = AXIS_ATTRIBUTES[axis];
	if (!names || names.length === 0) return true;
	const schema = placeable.get(rune);
	return schema?.attributes?.[names[0]] !== undefined;
}

/**
 * Nominate the carrier (D31) and place every axis (D33). Throws, through
 * `fail`, on a marker that cannot stand and on several top-level runes with no
 * marker.
 */
export function resolvePlacements(
	rune: string,
	runes: readonly TemplateRune[],
	fail: PlacementFail,
): CompositionPlacements {
	for (const r of runes) {
		const schema = placeable.get(r.node.tag!);
		if (schema?.attributes?.chrome !== undefined) {
			fail(
				'chrome-collision',
				`it places \`{% ${r.node.tag} %}\`, which declares an attribute named \`chrome\`. In a template \`chrome\` nominates the paint carrier (D31), so the two cannot be told apart. Rename the rune's attribute.`,
				r.node,
			);
		}
	}

	const marked = runes.filter((r) => r.node.attributes.chrome !== undefined);
	for (const r of marked) {
		if (r.node.attributes.chrome !== true) {
			fail(
				'chrome-invalid',
				`\`chrome\` on \`{% ${r.node.tag} %}\` takes no value; write it bare, as \`{% ${r.node.tag} chrome %}\` (D31).`,
				r.node,
			);
		}
		if (r.inEach) {
			fail(
				'chrome-invalid',
				`\`{% ${r.node.tag} chrome %}\` is inside an \`each\` slot, so it would be placed once per item. The carrier is one region; mark a rune outside the slot (D31).`,
				r.node,
			);
		}
	}
	if (marked.length > 1) {
		fail(
			'chrome-marked-twice',
			`\`chrome\` marks ${marked.map((r) => `\`{% ${r.node.tag} %}\``).join(' and ')}. A rune has exactly one paint carrier; mark one of them (D31).`,
			marked[1].node,
		);
	}

	let carrier: Node | undefined = marked[0]?.node;
	if (!carrier) {
		const top = runes.filter((r) => r.top);
		// A rune repeated per item is several regions, however it is written.
		const several = top.length > 1 || top.some((r) => r.inEach);
		if (several) {
			const names = [...new Set(top.map((r) => `\`{% ${r.node.tag} %}\``))].join(', ');
			fail(
				'chrome-ambiguous',
				`it places several runes at its top level (${names}) and marks none as the paint carrier, so \`elevation\`, \`tint\` and the rest would have nowhere to land. Wrap them in one \`{% section %}\`, which then carries them, or mark one with \`chrome\` (D14, D31).`,
				top[1]?.node ?? top[0].node,
			);
		}
		carrier = top[0]?.node;
	}
	const carrierRune = carrier?.tag;

	const axes: Record<string, AxisTarget> = {};
	const axisOf: Record<string, string> = {};
	for (const facet of UNIVERSAL_AXIS_FACETS) {
		for (const name of AXIS_ATTRIBUTES[facet.axis] ?? []) axisOf[name] = facet.axis;
		const placement = facet.placement;
		if (placement === 'root') {
			axes[facet.axis] = { placement };
			continue;
		}
		if (placement === 'carrier') {
			if (!carrier) {
				axes[facet.axis] = {
					placement,
					dropped: `\`${rune}\` places no rune to carry it`,
				};
			} else if (takes(carrierRune!, facet.axis)) {
				axes[facet.axis] = { placement, node: carrier, rune: carrierRune! };
			} else {
				axes[facet.axis] = {
					placement,
					unavailable: `its paint carrier \`${carrierRune}\` does not take \`${facet.axis}\``,
				};
			}
			continue;
		}
		// A role owner: the carrier when it owns the role, else the single rune
		// the template places itself that does (D33.2).
		if (carrier && takes(carrierRune!, facet.axis)) {
			axes[facet.axis] = { placement, node: carrier, rune: carrierRune! };
			continue;
		}
		const owners = runes.filter((r) => !r.inEach && takes(r.node.tag!, facet.axis));
		if (owners.length === 1) {
			axes[facet.axis] = { placement, node: owners[0].node, rune: owners[0].node.tag! };
		} else if (owners.length === 0) {
			axes[facet.axis] = {
				placement,
				unavailable: `no rune \`${rune}\` places owns ${ROLE_NAMES[placement]}`,
			};
		} else {
			axes[facet.axis] = {
				placement,
				unavailable: `several runes \`${rune}\` places own ${ROLE_NAMES[placement]} (${owners.map((o) => `\`${o.node.tag}\``).join(', ')}) and none is its paint carrier`,
			};
		}
	}
	return { carrier, axes, axisOf };
}

/** The universal attributes this composition offers, and why it offers none of
 *  an axis's — the composed half of SPEC-125's narrowing. Root-placed axes, and
 *  axes no placed rune takes, are left to the ordinary structural gates on the
 *  composed rune itself: a composition that places no rune and declares
 *  `provides: [prose]` keeps `reading` on its own root, as before. */
export function placementAvailability(placements: CompositionPlacements): {
	offered: Set<string>;
	withheld: Map<string, string>;
} {
	const offered = new Set<string>();
	const withheld = new Map<string, string>();
	for (const [axis, target] of Object.entries(placements.axes)) {
		if (target.placement === 'root') continue;
		if ('unavailable' in target) {
			withheld.set(axis, target.unavailable);
			continue;
		}
		for (const name of AXIS_ATTRIBUTES[axis] ?? []) offered.add(name);
	}
	return { offered, withheld };
}

/**
 * Split one instance's attributes: the universal ones that move to a placed
 * rune, by target node, and those dropped for want of a carrier. What is left
 * stays on the root. The author's value replaces a literal the template wrote on
 * the target (D34.4).
 */
export function moveAttributes(
	placements: CompositionPlacements,
	attrs: Record<string, unknown>,
): { moves: Map<Node, Record<string, unknown>>; moved: Set<string>; dropped: string[] } {
	const moves = new Map<Node, Record<string, unknown>>();
	const moved = new Set<string>();
	const dropped: string[] = [];
	for (const [name, value] of Object.entries(attrs)) {
		if (value === undefined || value === null) continue;
		const axis = placements.axisOf[name];
		if (!axis) continue;
		const target = placements.axes[axis];
		if (!target || target.placement === 'root') continue;
		if ('node' in target) {
			moved.add(name);
			const into = moves.get(target.node) ?? {};
			into[name] = value;
			moves.set(target.node, into);
		} else if ('dropped' in target) {
			moved.add(name);
			dropped.push(name);
		}
		// An axis no placed rune takes stays on the root, where it is offered only
		// when the composed rune meets the axis's gate itself.
	}
	return { moves, moved, dropped };
}
