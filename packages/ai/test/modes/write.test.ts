import { describe, it, expect } from 'vitest';
import { writePrompt, exemplarSection } from '../../src/modes/write.js';

describe('writePrompt', () => {
	it('includes frontmatter instructions when no options', () => {
		const result = writePrompt();
		expect(result).toContain('YAML frontmatter');
		expect(result).toContain('title: Page Title');
	});

	it('includes frontmatter instructions when multiFile is false', () => {
		const result = writePrompt({ multiFile: false });
		expect(result).toContain('YAML frontmatter');
		expect(result).toContain('title: Page Title');
	});

	it('includes multi-file instructions when multiFile is true', () => {
		const result = writePrompt({ multiFile: true });
		expect(result).toContain('--- FILE:');
		expect(result).toContain('Multi-file output');
	});

	it('includes frontmatter and example structure in multi-file', () => {
		const result = writePrompt({ multiFile: true });
		expect(result).toContain('--- FILE: index.md ---');
		expect(result).toContain('--- FILE: _layout.md ---');
		expect(result).toContain('YAML frontmatter');
	});

	it('warns against parent traversal', () => {
		const result = writePrompt({ multiFile: true });
		expect(result).toContain('../');
	});

	it('draws few-shot exemplars from fixtures instead of a hardcoded example', () => {
		const result = writePrompt({ multiFile: true });
		expect(result).toContain('## Example patterns');
		// Role-tagged fixtures are included …
		expect(result).toContain('### section');
		expect(result).toContain('### card');
		// … and the old hardcoded hero stub is gone.
		expect(result).not.toContain('# Welcome');
	});

	it('exposes exemplars in single-file mode too', () => {
		expect(writePrompt({ multiFile: false })).toContain('## Example patterns');
	});
});

describe('exemplarSection', () => {
	it('only includes fixtures with an explicit canonical/rich role', () => {
		const section = exemplarSection();
		// `section` is role-tagged; `chart` is a bare fixture (no explicit role).
		expect(section).toContain('### section');
		expect(section).not.toContain('### chart');
	});

	it('surfaces a fixture\'s notes as authoring guidance', () => {
		// `badge` carries notes in its fixture frontmatter.
		expect(exemplarSection()).toContain('Inline rune — embed within prose');
	});

	it('renders each exemplar as a fenced Markdoc block', () => {
		expect(exemplarSection()).toMatch(/### \w[\s\S]*?```md[\s\S]*?```/);
	});
});

