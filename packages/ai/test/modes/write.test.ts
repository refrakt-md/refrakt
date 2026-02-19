import { describe, it, expect } from 'vitest';
import { writePrompt } from '../../src/modes/write.js';

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
});
