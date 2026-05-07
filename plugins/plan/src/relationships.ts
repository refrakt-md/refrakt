// ─── Relationship Builder ───
// Constructs bidirectional relationship graphs from entity references.
// No Node.js API dependencies — safe for edge runtimes.

/** A directed reference from one entity to another */
export interface EntityRelationship {
	/** The entity that contains the reference */
	fromId: string;
	fromType: string;
	/** The entity being referenced */
	toId: string;
	toType: string;
	/** Relationship kind */
	kind: 'blocks' | 'blocked-by' | 'depends-on' | 'dependency-of' | 'implements' | 'implemented-by' | 'informs' | 'informed-by' | 'related';
}

/** Minimal entity shape needed for relationship building */
export interface RelationshipEntity {
	type: string;
	data: Record<string, unknown>;
}

/**
 * Build a bidirectional relationship index from entity references.
 *
 * Three sources of relationships are processed:
 * 1. **Source references** (from source= attribute): produce `implements`/`implemented-by` edges
 *    (or `informs`/`informed-by` for decisions)
 * 2. **Scanner dependencies** (from ## Dependencies sections): produce `depends-on`/`dependency-of` edges
 * 3. **ID references** (text-pattern matches like WORK-042): produce `related` edges
 *    (or `blocked-by`/`blocks` when the referencing entity has status "blocked")
 *
 * Edges from sources 1 and 2 suppress duplicate edges from source 3.
 */
export function buildRelationships(
	entities: Map<string, RelationshipEntity>,
	sourceReferences: Map<string, Array<{ id: string; type: string }>>,
	scannerDependencies: Map<string, string[]>,
	idReferences: Map<string, Array<{ id: string; type: string }>>,
): Map<string, EntityRelationship[]> {
	const relationships = new Map<string, EntityRelationship[]>();

	function addRel(id: string, rel: EntityRelationship) {
		if (!relationships.has(id)) relationships.set(id, []);
		relationships.get(id)!.push(rel);
	}

	// Track IDs already linked via source= to avoid duplicate 'related' edges
	const sourceLinked = new Set<string>();

	// Process structured source= references → implements / implemented-by (or informs / informed-by for decisions)
	for (const [fromId, refs] of sourceReferences) {
		const fromEntity = entities.get(fromId);
		if (!fromEntity) continue;

		// Decisions use informs/informed-by; work/bug use implements/implemented-by
		const isDecision = fromEntity.type === 'decision';
		const forwardKind: EntityRelationship['kind'] = isDecision ? 'informs' : 'implements';
		const reverseKind: EntityRelationship['kind'] = isDecision ? 'informed-by' : 'implemented-by';

		for (const ref of refs) {
			const toEntity = entities.get(ref.id);
			if (!toEntity) continue;

			sourceLinked.add(`${fromId}→${ref.id}`);

			// A implements/informs B
			addRel(fromId, {
				fromId, fromType: fromEntity.type,
				toId: ref.id, toType: toEntity.type,
				kind: forwardKind,
			});
			// B is implemented-by/informed-by A
			addRel(ref.id, {
				fromId: ref.id, fromType: toEntity.type,
				toId: fromId, toType: fromEntity.type,
				kind: reverseKind,
			});
		}
	}

	// Track IDs already linked via depends-on to avoid duplicate 'related' edges
	const depLinked = new Set<string>();

	// Process scanner dependency data → depends-on / dependency-of
	for (const [fromId, depIds] of scannerDependencies) {
		const fromEntity = entities.get(fromId);
		if (!fromEntity) continue;

		for (const depId of depIds) {
			const toEntity = entities.get(depId);
			if (!toEntity) continue;

			depLinked.add(`${fromId}→${depId}`);

			// A depends-on B
			addRel(fromId, {
				fromId, fromType: fromEntity.type,
				toId: depId, toType: toEntity.type,
				kind: 'depends-on',
			});
			// B is dependency-of A
			addRel(depId, {
				fromId: depId, fromType: toEntity.type,
				toId: fromId, toType: fromEntity.type,
				kind: 'dependency-of',
			});
		}
	}

	// Process text-based ID references → blocks / blocked-by / related
	for (const [fromId, refs] of idReferences) {
		const fromEntity = entities.get(fromId);
		if (!fromEntity) continue;

		for (const ref of refs) {
			const toEntity = entities.get(ref.id);
			if (!toEntity) continue; // Reference to unknown entity — skip

			// Skip if already linked via source= attribute or dependency
			if (sourceLinked.has(`${fromId}→${ref.id}`)) continue;
			if (depLinked.has(`${fromId}→${ref.id}`)) continue;

			// Determine relationship kind
			// If entity A has status "blocked" and references entity B, A is "blocked-by" B
			const fromStatus = String(fromEntity.data.status ?? '');
			const isBlockedBy = fromStatus === 'blocked';

			if (isBlockedBy) {
				// A is blocked by B
				addRel(fromId, {
					fromId, fromType: fromEntity.type,
					toId: ref.id, toType: toEntity.type,
					kind: 'blocked-by',
				});
				// B blocks A
				addRel(ref.id, {
					fromId: ref.id, fromType: toEntity.type,
					toId: fromId, toType: fromEntity.type,
					kind: 'blocks',
				});
			} else {
				// General related reference (bidirectional)
				addRel(fromId, {
					fromId, fromType: fromEntity.type,
					toId: ref.id, toType: toEntity.type,
					kind: 'related',
				});
				addRel(ref.id, {
					fromId: ref.id, fromType: toEntity.type,
					toId: fromId, toType: fromEntity.type,
					kind: 'related',
				});
			}
		}
	}

	return relationships;
}
