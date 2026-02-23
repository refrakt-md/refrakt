import type { SymbolDoc, SymbolKind, SymbolParameter, SymbolMemberDoc } from '../extractors/types.js';

export interface GeneratorOptions {
	/** Base heading level for the symbol name (default: 2 = ##) */
	headingLevel?: number;
	/** Whether to include frontmatter (default: true) */
	frontmatter?: boolean;
}

const GROUP_KINDS: SymbolKind[] = ['class', 'interface', 'module'];

function isGroupKind(kind: SymbolKind): boolean {
	return GROUP_KINDS.includes(kind);
}

/** Convert camelCase/PascalCase to kebab-case for file slugs */
export function toSlug(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

function escapeYaml(s: string): string {
	if (/[:"'{}\[\]#&*!|>%@`]/.test(s) || s.startsWith(' ') || s.endsWith(' ')) {
		return `"${s.replace(/"/g, '\\"')}"`;
	}
	return s;
}

function heading(level: number, text: string): string {
	return `${'#'.repeat(level)} ${text}`;
}

function formatParameter(param: SymbolParameter): string {
	const optionalMark = param.optional ? ' *(optional)*' : '';
	const defaultMark = param.defaultValue ? ` *Default: \`${param.defaultValue}\`*` : '';
	const desc = param.description ? ` -- ${param.description}` : '';
	return `- **${param.name}** \`${param.type}\`${optionalMark}${desc}${defaultMark}`;
}

function formatChildParameter(param: SymbolParameter): string {
	const optionalMark = param.optional ? ' *(optional)*' : '';
	const defaultMark = param.defaultValue ? ` *Default: \`${param.defaultValue}\`*` : '';
	const desc = param.description ? ` -- ${param.description}` : '';
	return `  - **${param.name}** \`${param.type}\`${optionalMark}${desc}${defaultMark}`;
}

function writeMember(lines: string[], member: SymbolMemberDoc, memberLevel: number): void {
	lines.push(heading(memberLevel, member.name));
	lines.push('');

	if (member.description) {
		lines.push(member.description);
		lines.push('');
	}

	lines.push('```typescript');
	lines.push(member.signature);
	lines.push('```');
	lines.push('');

	if (member.parameters && member.parameters.length > 0) {
		for (const param of member.parameters) {
			lines.push(formatParameter(param));
			if (param.children) {
				for (const child of param.children) {
					lines.push(formatChildParameter(child));
				}
			}
		}
		lines.push('');
	}

	if (member.returns) {
		const desc = member.returns.description ? ` -- ${member.returns.description}` : '';
		lines.push(`> Returns \`${member.returns.type}\`${desc}`);
		lines.push('');
	}

	if (member.throws) {
		for (const t of member.throws) {
			const desc = t.description ? ` ${t.description}` : '';
			lines.push(`> Throws \`${t.type}\`${desc}`);
			lines.push('');
		}
	}
}

/** Generate a single {% symbol %} Markdown block for one SymbolDoc */
export function generateSymbolMarkdown(doc: SymbolDoc, options?: GeneratorOptions): string {
	const level = options?.headingLevel ?? 2;
	const lines: string[] = [];

	// Frontmatter
	if (options?.frontmatter !== false) {
		lines.push('---');
		lines.push(`title: ${escapeYaml(doc.name)}`);
		const firstLine = doc.description.split('\n')[0].trim();
		if (firstLine) {
			lines.push(`description: ${escapeYaml(firstLine)}`);
		}
		lines.push('---');
		lines.push('');
	}

	// Opening tag
	const attrs: string[] = [`kind="${doc.kind}"`];
	attrs.push(`lang="typescript"`);
	if (doc.since) attrs.push(`since="${doc.since}"`);
	if (doc.deprecated) attrs.push(`deprecated="${doc.deprecated}"`);
	if (doc.source) attrs.push(`source="${doc.source}"`);
	if (level !== 2) attrs.push(`headingLevel=${level}`);
	lines.push(`{% symbol ${attrs.join(' ')} %}`);
	lines.push('');

	// Symbol name heading
	lines.push(heading(level, doc.name));
	lines.push('');

	// For functions/enums/types: description before signature
	// For classes/interfaces/modules: description after signature
	if (!isGroupKind(doc.kind)) {
		if (doc.description) {
			lines.push(doc.description);
			lines.push('');
		}
	}

	// Type signature
	lines.push('```typescript');
	lines.push(doc.signature);
	lines.push('```');
	lines.push('');

	// For group kinds: description after signature
	if (isGroupKind(doc.kind)) {
		if (doc.description) {
			lines.push(doc.description);
			lines.push('');
		}
	}

	// Parameters (for function/enum kinds)
	if (doc.parameters && doc.parameters.length > 0) {
		for (const param of doc.parameters) {
			lines.push(formatParameter(param));
			if (param.children) {
				for (const child of param.children) {
					lines.push(formatChildParameter(child));
				}
			}
		}
		lines.push('');
	}

	// Returns (as blockquote)
	if (doc.returns) {
		const desc = doc.returns.description ? ` -- ${doc.returns.description}` : '';
		lines.push(`> Returns \`${doc.returns.type}\`${desc}`);
		lines.push('');
	}

	// Throws (as blockquotes)
	if (doc.throws) {
		for (const t of doc.throws) {
			const desc = t.description ? ` ${t.description}` : '';
			lines.push(`> Throws \`${t.type}\`${desc}`);
			lines.push('');
		}
	}

	// Groups (for class/interface/module kinds)
	if (doc.groups) {
		const groupLevel = level + 1;
		const memberLevel = level + 2;

		for (const group of doc.groups) {
			// Special case: Constructor group has no group heading in the docs format
			// Actually, looking at the docs, Constructor IS a group heading
			lines.push(heading(groupLevel, group.label));
			lines.push('');

			if (group.members.length === 1 && group.label === 'Constructor') {
				// Constructor is typically shown without a member sub-heading
				const member = group.members[0];

				if (member.description) {
					lines.push(member.description);
					lines.push('');
				}

				lines.push('```typescript');
				lines.push(member.signature);
				lines.push('```');
				lines.push('');

				if (member.parameters && member.parameters.length > 0) {
					for (const param of member.parameters) {
						lines.push(formatParameter(param));
						if (param.children) {
							for (const child of param.children) {
								lines.push(formatChildParameter(child));
							}
						}
					}
					lines.push('');
				}
			} else {
				for (const member of group.members) {
					writeMember(lines, member, memberLevel);
				}
			}
		}
	}

	// Closing tag
	lines.push('{% /symbol %}');
	lines.push('');

	return lines.join('\n');
}

/** Generate a single file containing multiple symbols from the same source file */
export function generateMultiSymbolMarkdown(docs: SymbolDoc[], fileName: string): string {
	const lines: string[] = [];

	lines.push('---');
	lines.push(`title: ${escapeYaml(fileName)}`);
	lines.push(`description: ${escapeYaml(`API reference for ${fileName}`)}`);
	lines.push('---');
	lines.push('');

	for (const doc of docs) {
		lines.push(generateSymbolMarkdown(doc, { frontmatter: false }));
	}

	return lines.join('\n');
}
