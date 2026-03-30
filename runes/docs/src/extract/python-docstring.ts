/**
 * Python docstring parser — supports Google, NumPy, and Sphinx (reST) conventions.
 * Auto-detects the format and extracts parameters, returns, raises, since, and deprecated.
 */

export interface DocstringParam {
	type: string;
	description: string;
}

export interface DocstringInfo {
	description: string;
	params: Map<string, DocstringParam>;
	returns?: { type: string; description: string };
	raises: Array<{ type: string; description: string }>;
	since?: string;
	deprecated?: string;
}

export type DocstringStyle = 'google' | 'numpy' | 'sphinx' | 'plain';

// ── Detection ────────────────────────────────────────────────────────

const GOOGLE_SECTIONS = /^(Args|Arguments|Parameters|Returns?|Raises?|Yields?|Examples?|Notes?|Attributes|Todo|References):\s*$/m;
const NUMPY_SECTIONS = /^(Parameters|Returns?|Raises?|Yields?|See Also|Notes|References|Examples|Attributes)\s*\n-{3,}/m;
const SPHINX_DIRECTIVES = /:(param|type|returns?|rtype|raises?|var|ivar|cvar)[\s:]/;

export function detectStyle(raw: string): DocstringStyle {
	const text = dedent(raw);
	if (NUMPY_SECTIONS.test(text)) return 'numpy';
	if (SPHINX_DIRECTIVES.test(text)) return 'sphinx';
	if (GOOGLE_SECTIONS.test(text)) return 'google';
	return 'plain';
}

// ── Main entry ───────────────────────────────────────────────────────

export function parseDocstring(raw: string): DocstringInfo {
	const cleaned = dedent(raw);
	const style = detectStyle(cleaned);
	let info: DocstringInfo;
	switch (style) {
		case 'google': info = parseGoogleDocstring(cleaned); break;
		case 'numpy': info = parseNumpyDocstring(cleaned); break;
		case 'sphinx': info = parseSphinxDocstring(cleaned); break;
		default: info = parsePlainDocstring(cleaned); break;
	}
	// Extract reStructuredText directives from any style
	extractRstDirectives(cleaned, info);
	return info;
}

// ── RST directives (shared across all styles) ────────────────────────

function extractRstDirectives(raw: string, info: DocstringInfo): void {
	// .. versionadded:: X.Y
	const sinceMatch = raw.match(/\.\.\s+versionadded::\s*(.+)/);
	if (sinceMatch) info.since = sinceMatch[1].trim();

	// .. deprecated:: X.Y
	const deprecatedMatch = raw.match(/\.\.\s+deprecated::\s*(.+)/);
	if (deprecatedMatch) info.deprecated = deprecatedMatch[1].trim();
}

// ── Plain ────────────────────────────────────────────────────────────

function parsePlainDocstring(raw: string): DocstringInfo {
	return {
		description: raw.trim(),
		params: new Map(),
		raises: [],
	};
}

// ── Google style ─────────────────────────────────────────────────────

function parseGoogleDocstring(raw: string): DocstringInfo {
	const info: DocstringInfo = { description: '', params: new Map(), raises: [] };

	// Split into sections. Each section starts with a header like "Args:"
	const sectionRe = /^(Args|Arguments|Parameters|Returns?|Raises?|Yields?|Examples?|Notes?|Attributes|Todo|References):\s*$/gm;
	const sections: { name: string; headerStart: number; start: number; end: number }[] = [];
	let match: RegExpExecArray | null;

	while ((match = sectionRe.exec(raw)) !== null) {
		sections.push({ name: match[1], headerStart: match.index, start: match.index + match[0].length, end: raw.length });
	}

	// Set end boundaries
	for (let i = 0; i < sections.length - 1; i++) {
		sections[i].end = sections[i + 1].headerStart;
	}

	// Description is everything before the first section (minus RST directives)
	const descEnd = sections.length > 0 ? sections[0].headerStart : raw.length;
	info.description = stripRstDirectives(raw.slice(0, descEnd)).trim();

	for (const section of sections) {
		const body = raw.slice(section.start, section.end);
		const normalized = section.name.replace(/s$/, '').toLowerCase();

		if (normalized === 'arg' || normalized === 'argument' || normalized === 'parameter') {
			parseGoogleParams(body, info.params);
		} else if (normalized === 'return' || normalized === 'yield') {
			info.returns = parseGoogleReturns(body);
		} else if (normalized === 'raise') {
			parseGoogleRaises(body, info.raises);
		}
	}

	return info;
}

function parseGoogleParams(body: string, params: Map<string, DocstringParam>): void {
	// Pattern: "    name (type): Description" or "    name: Description"
	const lines = body.split('\n');
	let currentName = '';
	let currentType = '';
	let currentDesc = '';

	for (const line of lines) {
		// New param line: starts with indent + identifier
		const paramMatch = line.match(/^\s{2,}(\*{0,2}\w+)\s*(?:\(([^)]+)\))?\s*:\s*(.*)/);
		if (paramMatch) {
			if (currentName) {
				params.set(currentName, { type: currentType || 'Any', description: currentDesc.trim() });
			}
			currentName = paramMatch[1];
			currentType = paramMatch[2] ?? '';
			currentDesc = paramMatch[3] ?? '';
		} else if (currentName && line.match(/^\s{4,}/)) {
			// Continuation line
			currentDesc += ' ' + line.trim();
		}
	}
	if (currentName) {
		params.set(currentName, { type: currentType || 'Any', description: currentDesc.trim() });
	}
}

function parseGoogleReturns(body: string): { type: string; description: string } | undefined {
	const lines = body.split('\n').filter(l => l.trim());
	if (lines.length === 0) return undefined;

	// Pattern: "    type: Description" or just "    Description"
	const first = lines[0].trim();
	const typeMatch = first.match(/^(\S+)\s*:\s*(.*)/);
	if (typeMatch) {
		const desc = [typeMatch[2], ...lines.slice(1).map(l => l.trim())].join(' ').trim();
		return { type: typeMatch[1], description: desc };
	}
	return { type: 'Any', description: lines.map(l => l.trim()).join(' ').trim() };
}

function parseGoogleRaises(body: string, raises: Array<{ type: string; description: string }>): void {
	const lines = body.split('\n');
	let currentType = '';
	let currentDesc = '';

	for (const line of lines) {
		const raiseMatch = line.match(/^\s{2,}(\w+)\s*:\s*(.*)/);
		if (raiseMatch) {
			if (currentType) {
				raises.push({ type: currentType, description: currentDesc.trim() });
			}
			currentType = raiseMatch[1];
			currentDesc = raiseMatch[2] ?? '';
		} else if (currentType && line.match(/^\s{4,}/)) {
			currentDesc += ' ' + line.trim();
		}
	}
	if (currentType) {
		raises.push({ type: currentType, description: currentDesc.trim() });
	}
}

// ── NumPy style ──────────────────────────────────────────────────────

function parseNumpyDocstring(raw: string): DocstringInfo {
	const info: DocstringInfo = { description: '', params: new Map(), raises: [] };

	// Split on sections delimited by underlined headers
	const sectionRe = /^(\w[\w\s]*?)\s*\n(-{3,})\s*$/gm;
	const sections: { name: string; start: number; end: number }[] = [];
	let match: RegExpExecArray | null;

	while ((match = sectionRe.exec(raw)) !== null) {
		const headerStart = match.index;
		const bodyStart = match.index + match[0].length;
		sections.push({ name: match[1].trim(), start: bodyStart, end: raw.length });
		// Store headerStart for description extraction
		if (sections.length === 1) {
			info.description = stripRstDirectives(raw.slice(0, headerStart)).trim();
		}
	}

	if (sections.length === 0) {
		info.description = stripRstDirectives(raw).trim();
		return info;
	}

	// Set end boundaries
	for (let i = 0; i < sections.length - 1; i++) {
		// Find start of next section's header
		const nextHeaderRe = new RegExp(`^${escapeRegex(sections[i + 1].name)}\\s*\\n-{3,}`, 'm');
		const nextMatch = raw.slice(sections[i].start).match(nextHeaderRe);
		if (nextMatch) {
			sections[i].end = sections[i].start + nextMatch.index!;
		}
	}

	for (const section of sections) {
		const body = raw.slice(section.start, section.end);
		const normalized = section.name.replace(/s$/, '').toLowerCase();

		if (normalized === 'parameter') {
			parseNumpyParams(body, info.params);
		} else if (normalized === 'return' || normalized === 'yield') {
			info.returns = parseNumpyReturns(body);
		} else if (normalized === 'raise') {
			parseNumpyRaises(body, info.raises);
		}
	}

	return info;
}

function parseNumpyParams(body: string, params: Map<string, DocstringParam>): void {
	// Pattern: "name : type\n    Description" or "name : type, optional\n    Description"
	const lines = body.split('\n');
	let currentName = '';
	let currentType = '';
	let currentDesc = '';

	for (const line of lines) {
		const paramMatch = line.match(/^(\*{0,2}\w+)\s*:\s*(.*)/);
		if (paramMatch && !line.match(/^\s/)) {
			if (currentName) {
				params.set(currentName, { type: currentType || 'Any', description: currentDesc.trim() });
			}
			currentName = paramMatch[1];
			currentType = paramMatch[2].replace(/,?\s*optional\s*$/, '').trim() || 'Any';
			currentDesc = '';
		} else if (currentName && line.match(/^\s{2,}/)) {
			currentDesc += (currentDesc ? ' ' : '') + line.trim();
		}
	}
	if (currentName) {
		params.set(currentName, { type: currentType || 'Any', description: currentDesc.trim() });
	}
}

function parseNumpyReturns(body: string): { type: string; description: string } | undefined {
	const lines = body.split('\n');
	let type = 'Any';
	let desc = '';

	for (const line of lines) {
		const typeMatch = line.match(/^(\S+)\s*$/);
		if (typeMatch && !line.match(/^\s/) && !desc) {
			type = typeMatch[1];
		} else if (line.match(/^\s{2,}/)) {
			desc += (desc ? ' ' : '') + line.trim();
		}
	}
	if (!type && !desc) return undefined;
	return { type, description: desc.trim() };
}

function parseNumpyRaises(body: string, raises: Array<{ type: string; description: string }>): void {
	const lines = body.split('\n');
	let currentType = '';
	let currentDesc = '';

	for (const line of lines) {
		const typeMatch = line.match(/^(\w+)\s*$/);
		if (typeMatch && !line.match(/^\s/)) {
			if (currentType) {
				raises.push({ type: currentType, description: currentDesc.trim() });
			}
			currentType = typeMatch[1];
			currentDesc = '';
		} else if (currentType && line.match(/^\s{2,}/)) {
			currentDesc += (currentDesc ? ' ' : '') + line.trim();
		}
	}
	if (currentType) {
		raises.push({ type: currentType, description: currentDesc.trim() });
	}
}

// ── Sphinx/reST style ────────────────────────────────────────────────

function parseSphinxDocstring(raw: string): DocstringInfo {
	const info: DocstringInfo = { description: '', params: new Map(), raises: [] };
	const lines = raw.split('\n');
	const descLines: string[] = [];
	let foundDirective = false;

	// Temporary storage for :type: merging
	const paramTypes = new Map<string, string>();

	let returnDesc = '';
	let returnType = '';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// :param name: description
		const paramMatch = line.match(/^\s*:param\s+(\w+)\s*:\s*(.*)/);
		if (paramMatch) {
			foundDirective = true;
			const name = paramMatch[1];
			let desc = paramMatch[2];
			// Collect continuation lines
			while (i + 1 < lines.length && lines[i + 1].match(/^\s+\S/) && !lines[i + 1].match(/^\s*:/)) {
				i++;
				desc += ' ' + lines[i].trim();
			}
			const existing = info.params.get(name);
			info.params.set(name, {
				type: existing?.type ?? 'Any',
				description: desc.trim(),
			});
			continue;
		}

		// :type name: type
		const typeMatch = line.match(/^\s*:type\s+(\w+)\s*:\s*(.*)/);
		if (typeMatch) {
			foundDirective = true;
			paramTypes.set(typeMatch[1], typeMatch[2].trim());
			continue;
		}

		// :returns: / :return: description
		const returnMatch = line.match(/^\s*:returns?\s*:\s*(.*)/);
		if (returnMatch) {
			foundDirective = true;
			returnDesc = returnMatch[1];
			while (i + 1 < lines.length && lines[i + 1].match(/^\s+\S/) && !lines[i + 1].match(/^\s*:/)) {
				i++;
				returnDesc += ' ' + lines[i].trim();
			}
			continue;
		}

		// :rtype: type
		const rtypeMatch = line.match(/^\s*:rtype\s*:\s*(.*)/);
		if (rtypeMatch) {
			foundDirective = true;
			returnType = rtypeMatch[1].trim();
			continue;
		}

		// :raises Type: description
		const raiseMatch = line.match(/^\s*:raises?\s+(\w+)\s*:\s*(.*)/);
		if (raiseMatch) {
			foundDirective = true;
			let desc = raiseMatch[2];
			while (i + 1 < lines.length && lines[i + 1].match(/^\s+\S/) && !lines[i + 1].match(/^\s*:/)) {
				i++;
				desc += ' ' + lines[i].trim();
			}
			info.raises.push({ type: raiseMatch[1], description: desc.trim() });
			continue;
		}

		// RST directives (.. versionadded, .. deprecated) are handled by extractRstDirectives
		if (line.match(/^\s*\.\.\s+(versionadded|deprecated)::/)) {
			foundDirective = true;
			continue;
		}

		if (!foundDirective) {
			descLines.push(line);
		}
	}

	info.description = stripRstDirectives(descLines.join('\n')).trim();

	// Merge :type: into :param:
	for (const [name, type] of paramTypes) {
		const existing = info.params.get(name);
		if (existing) {
			existing.type = type;
		} else {
			info.params.set(name, { type, description: '' });
		}
	}

	// Set returns
	if (returnDesc || returnType) {
		info.returns = { type: returnType || 'Any', description: returnDesc.trim() };
	}

	return info;
}

// ── Helpers ──────────────────────────────────────────────────────────

function stripRstDirectives(text: string): string {
	return text
		.replace(/\.\.\s+versionadded::\s*.+(\n\s+.*)*/g, '')
		.replace(/\.\.\s+deprecated::\s*.+(\n\s+.*)*/g, '')
		.trim();
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove common leading whitespace from all lines (Python's `inspect.cleandoc` equivalent).
 * The first line is treated specially: its leading whitespace is stripped independently.
 */
function dedent(text: string): string {
	const lines = text.split('\n');
	// First line: strip leading whitespace
	const firstLine = lines[0].trimStart();

	if (lines.length === 1) return firstLine;

	// Find minimum indentation of non-empty lines after the first
	let minIndent = Infinity;
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim().length === 0) continue;
		const indent = line.match(/^\s*/)![0].length;
		if (indent < minIndent) minIndent = indent;
	}
	if (!isFinite(minIndent)) minIndent = 0;

	// Strip common indentation
	const dedented = [firstLine];
	for (let i = 1; i < lines.length; i++) {
		dedented.push(lines[i].slice(minIndent));
	}

	// Remove leading/trailing blank lines
	while (dedented.length > 0 && dedented[0].trim() === '') dedented.shift();
	while (dedented.length > 0 && dedented[dedented.length - 1].trim() === '') dedented.pop();

	return dedented.join('\n');
}
