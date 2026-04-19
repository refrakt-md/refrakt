import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
	describeRune,
	hydrateAllRuneInfos,
	hydrateRuneByName,
	serializeRune,
	groupReferenceInfos,
	renderReferenceMarkdown,
	type ReferenceContext,
	type RuneInfo,
} from '@refrakt-md/runes';

export type { ReferenceContext } from '@refrakt-md/runes';

// ---------------------------------------------------------------------------
// `refrakt reference <name>` — single rune reference
// ---------------------------------------------------------------------------

export interface ReferenceNameOptions {
	name: string;
	format: 'markdown' | 'json';
	noExample: boolean;
}

export function referenceNameCommand(
	ctx: ReferenceContext,
	options: ReferenceNameOptions,
): { exitCode: number; output: string } {
	const info = hydrateRuneByName(ctx, options.name);
	if (!info) {
		return {
			exitCode: 1,
			output: `Error: Unknown rune "${options.name}". Run \`refrakt reference list\` to see available runes.`,
		};
	}
	const packageName = info.package ?? 'core';

	// Empty-string `example` suppresses both the caller-provided fixture and the
	// `RUNE_EXAMPLES[name]` fallback inside `describeRune`.
	const finalInfo: RuneInfo = options.noExample ? { ...info, example: '' } : info;

	if (options.format === 'json') {
		const serialized = serializeRune(finalInfo, packageName);
		if (options.noExample) delete serialized.example;
		return { exitCode: 0, output: JSON.stringify(serialized, null, 2) };
	}

	return { exitCode: 0, output: describeRune(finalInfo) };
}

// ---------------------------------------------------------------------------
// `refrakt reference list` — enumerate available runes
// ---------------------------------------------------------------------------

export interface ReferenceListOptions {
	packageFilter?: string;
	format: 'markdown' | 'json';
}

export function referenceListCommand(
	ctx: ReferenceContext,
	options: ReferenceListOptions,
): { exitCode: number; output: string } {
	const all = hydrateAllRuneInfos(ctx);
	const filtered = options.packageFilter
		? all.filter(info => info.package === options.packageFilter)
		: all;

	if (options.packageFilter && filtered.length === 0) {
		return {
			exitCode: 1,
			output: `Error: No runes found for package "${options.packageFilter}".`,
		};
	}

	const groups = groupReferenceInfos(filtered);

	if (options.format === 'json') {
		const payload = groups.map(group => ({
			package: group.packageName,
			label: group.label,
			runes: group.runes,
		}));
		return { exitCode: 0, output: JSON.stringify(payload, null, 2) };
	}

	const lines: string[] = [];
	for (const group of groups) {
		lines.push(`## ${group.label}`);
		lines.push('');
		for (const rune of group.runes) {
			const aliases = rune.aliases.length > 0 ? ` (aliases: ${rune.aliases.join(', ')})` : '';
			const desc = rune.description ? ` — ${rune.description}` : '';
			lines.push(`- ${rune.name}${desc}${aliases}`);
		}
		lines.push('');
	}
	return { exitCode: 0, output: lines.join('\n').trimEnd() };
}

// ---------------------------------------------------------------------------
// `refrakt reference dump` — full reference to a file
// ---------------------------------------------------------------------------

export interface ReferenceDumpOptions {
	output: string;
	format: 'markdown' | 'json';
	section: string;
	check: boolean;
	/** Optional preamble inserted between the auto-generated header and the runes listing. */
	preamble?: string;
}

export interface ReferenceDumpResult {
	/** Process exit code: 0 for success, 1 for --check mismatch or error. */
	exitCode: number;
	/** Message suitable for stderr (non-empty on check failure / new-file creation). */
	message: string;
	/** The rendered content the command wrote (or would write). */
	rendered: string;
	/** Set to true when the file was written (as opposed to --check mismatch / no-op). */
	wrote: boolean;
}

/** Find the index of the next heading at or above `level`, skipping headings that
 *  appear inside fenced code blocks. Returns -1 when no such heading exists. */
function findNextHeading(source: string, level: number): number {
	const lines = source.split('\n');
	let offset = 0;
	let inFence = false;
	for (const line of lines) {
		if (/^```/.test(line)) {
			inFence = !inFence;
		} else if (!inFence) {
			const m = line.match(/^(#{1,6})(?!#)\s/);
			if (m && m[1].length <= level) {
				return offset;
			}
		}
		offset += line.length + 1;
	}
	return -1;
}

function replaceNamedSection(existing: string, sectionHeading: string, replacement: string): string {
	const headingLine = sectionHeading.startsWith('#') ? sectionHeading : `## ${sectionHeading}`;
	const level = (headingLine.match(/^#+/) ?? ['##'])[0].length;
	const escaped = headingLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const startRe = new RegExp(`^${escaped}\\s*$`, 'm');
	const startMatch = existing.match(startRe);
	if (!startMatch || startMatch.index === undefined) {
		const sep = existing.endsWith('\n') ? '' : '\n';
		return `${existing}${sep}\n${replacement.trimEnd()}\n`;
	}
	const start = startMatch.index;
	const afterHeading = start + startMatch[0].length;
	const tail = existing.slice(afterHeading);
	// Skip the leading `\n` so we don't re-match the same heading line.
	const tailOffset = tail.startsWith('\n') ? 1 : 0;
	const nextIdxInTail = findNextHeading(tail.slice(tailOffset), level);
	const end = nextIdxInTail === -1
		? existing.length
		: afterHeading + tailOffset + nextIdxInTail;
	const before = existing.slice(0, start);
	const after = existing.slice(end);
	const block = replacement.trimEnd() + '\n';
	const leading = before.length === 0 || before.endsWith('\n\n') ? '' : (before.endsWith('\n') ? '\n' : '\n\n');
	const trailing = after.length === 0 || after.startsWith('\n') ? '' : '\n';
	return `${before}${leading}${block}${trailing}${after}`;
}

export function referenceDumpCommand(
	ctx: ReferenceContext,
	options: ReferenceDumpOptions,
): ReferenceDumpResult {
	let rendered: string;
	if (options.format === 'json') {
		const infos = hydrateAllRuneInfos(ctx);
		const payload = infos.map(info => serializeRune(info, info.package ?? 'core'));
		rendered = JSON.stringify(payload, null, 2) + '\n';
	} else {
		rendered = renderReferenceMarkdown(ctx, { preamble: options.preamble });
	}

	const outputPath = resolve(options.output);
	const fileExists = existsSync(outputPath);

	// For markdown dumps into an existing file, only replace the named section.
	let finalContent = rendered;
	if (options.format === 'markdown' && fileExists) {
		const existing = readFileSync(outputPath, 'utf-8');
		// Strip the generated-header comments from the replacement block so they
		// don't accumulate on every rerun; leave them at the top of a fresh file only.
		const innerBlock = rendered
			.replace(/^<!-- Generated by `refrakt reference dump`[^\n]*-->\n/m, '')
			.replace(/^<!-- Re-run when[^\n]*-->\n/m, '')
			.replace(/^\n+/, '');
		if (options.section === '# Available Runes' || options.section === 'Available Runes' || !options.section) {
			finalContent = replaceNamedSection(existing, '# Available Runes', innerBlock);
		} else {
			finalContent = replaceNamedSection(existing, options.section, innerBlock);
		}
	}

	if (options.check) {
		if (!fileExists) {
			return {
				exitCode: 1,
				message: `Error: ${options.output} does not exist. Run \`refrakt reference dump\` to create it.`,
				rendered: finalContent,
				wrote: false,
			};
		}
		const current = readFileSync(outputPath, 'utf-8');
		if (current !== finalContent) {
			return {
				exitCode: 1,
				message: `Error: ${options.output} is out of date. Run \`refrakt reference dump\` to regenerate it.`,
				rendered: finalContent,
				wrote: false,
			};
		}
		return { exitCode: 0, message: '', rendered: finalContent, wrote: false };
	}

	mkdirSync(dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, finalContent);
	return { exitCode: 0, message: '', rendered: finalContent, wrote: true };
}
