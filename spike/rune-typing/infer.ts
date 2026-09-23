/**
 * Type-level inference for `createContentModelSchema`, prototyped.
 *
 * Nothing here is wired into the build — this is the machinery the spike
 * measures. It derives the `transform(resolved, attrs)` parameter types from
 * the declarations a rune already writes, so no new declaration mechanism
 * (decorators, a model class) is introduced.
 *
 * `Node` is the real Markdoc AST node, not a stand-in.
 */
import type { Node } from '@markdoc/markdoc';

export interface SchemaAttribute {
	type?: unknown;
	required?: boolean;
	matches?: readonly string[] | string[];
	description?: string;
	default?: unknown;
}

// ─── Attributes ──────────────────────────────────────────────────────────────

/** `matches` wins over `type`: it is the narrower statement of the same fact. */
export type AttrValue<A> = A extends { matches: readonly (infer M)[] }
	? M
	: A extends { type: StringConstructor }
		? string
		: A extends { type: NumberConstructor }
			? number
			: A extends { type: BooleanConstructor }
				? boolean
				: unknown;

type RequiredKeys<A> = { [K in keyof A]: A[K] extends { required: true } ? K : never }[keyof A];

export type AttrsOf<A> = { [K in RequiredKeys<A> & keyof A]: AttrValue<A[K]> } & {
	[K in Exclude<keyof A, RequiredKeys<A>>]?: AttrValue<A[K]>;
};

// ─── Content model ───────────────────────────────────────────────────────────

interface FieldDef {
	name: string;
	match: string;
	optional?: boolean;
	greedy?: boolean;
}

/** `greedy` decides array-ness, `optional` decides `| undefined`. */
export type FieldValue<F> = F extends { greedy: true }
	? F extends { optional: true }
		? Node[] | undefined
		: Node[]
	: F extends { optional: true }
		? Node | undefined
		: Node;

type FieldsOf<Fs> = { [K in Extract<Fs, FieldDef> as K['name']]: FieldValue<K> };

/** The `$`-prefixed metadata `resolveSections` merges into each entry.
 *  `$canonicalName` narrows to the literal union of declared known sections. */
type SectionMeta<M> = {
	$heading: string;
	$headingNode: Node;
	$canonicalName?: M extends { knownSections: infer KS } ? Extract<keyof KS, string> : never;
	$canonicalSlug?: string;
};

/** A section body resolves against `sectionModel` — or, when a known section
 *  declares its own `model`, against that. No rune declares one today; when one
 *  does, the entry type is correctly the union of both. */
type SectionBody<M> =
	| ResolvedOf<M extends { sectionModel: infer SM } ? SM : never>
	| (M extends { knownSections: infer KS }
			? { [K in keyof KS]: KS[K] extends { model: infer KM } ? ResolvedOf<KM> : never }[keyof KS]
			: never);

export type SectionEntry<M> = SectionMeta<M> & SectionBody<M>;

/** The discriminant: `resolveSections` returns tag nodes when `emitTag` is set
 *  and resolved entries when it is not (resolver.ts:502 vs :536). */
type SectionsSlot<M> = M extends { emitTag: string }
	? { sections: Node[] }
	: { sections: SectionEntry<M>[] };

/** `contentModel` is either the object or a thunk returning it. */
type Model<CM> = CM extends (...a: never[]) => infer R ? R : CM;

export type ResolvedOf<CM, M = Model<CM>> = M extends {
	type: 'sequence';
	fields: readonly (infer F)[];
}
	? FieldsOf<F>
	: M extends { type: 'sections' }
		? (M extends { fields: readonly (infer PF)[] } ? FieldsOf<PF> : Record<never, never>) &
				SectionsSlot<M>
		: M extends { type: 'delimited'; dynamicZones: true; zoneModel: infer ZM }
			? { zones: ResolvedOf<ZM>[] }
			: M extends { type: 'delimited'; zones: readonly (infer Z)[] }
				? { [K in Extract<Z, { name: string }> as K['name']]: Node[] }
				: // 'custom' and conditional models stay opaque — same as today.
					Record<string, unknown>;

// ─── The builder ─────────────────────────────────────────────────────────────

/**
 * `const` type parameters (TS 5.0+) preserve the literals without `as const` at
 * the call site. The defaults are what make adoption incremental: a rune that
 * declares nothing keeps today's loose types.
 */
export declare function createContentModelSchema<
	// `Record<never, never>`, not `Record<string, never>`: the latter carries a
	// string index signature, which makes every attribute access legal and
	// silently defeats the whole point when `base`/`attributes` are omitted.
	const B extends Record<string, SchemaAttribute> = Record<never, never>,
	const A extends Record<string, SchemaAttribute> = Record<never, never>,
	const CM = unknown,
>(options: {
	base?: B;
	attributes?: A;
	contentModel: CM;
	transform: (resolved: ResolvedOf<CM>, attrs: AttrsOf<B & A>) => unknown;
}): unknown;
