import { describe, it, expect } from 'vitest';
import { splitFiles } from '../src/commands/write.js';

describe('splitFiles', () => {
	it('parses multiple file markers', () => {
		const raw = `--- FILE: index.md ---
---
title: Home
---

# Welcome

--- FILE: docs/guide.md ---
---
title: Guide
---

# Guide content`;

		const files = splitFiles(raw);
		expect(files).toHaveLength(2);
		expect(files[0].path).toBe('index.md');
		expect(files[0].content).toContain('title: Home');
		expect(files[0].content).toContain('# Welcome');
		expect(files[1].path).toBe('docs/guide.md');
		expect(files[1].content).toContain('title: Guide');
		expect(files[1].content).toContain('# Guide content');
	});

	it('handles single file with marker', () => {
		const raw = `--- FILE: about.md ---
---
title: About
---

About page content.`;

		const files = splitFiles(raw);
		expect(files).toHaveLength(1);
		expect(files[0].path).toBe('about.md');
		expect(files[0].content).toContain('title: About');
	});

	it('returns empty array when no markers found', () => {
		const raw = `---
title: Plain file
---

No markers here.`;

		expect(splitFiles(raw)).toEqual([]);
	});

	it('trims leading newline after marker', () => {
		const raw = `--- FILE: test.md ---
---
title: Test
---`;

		const files = splitFiles(raw);
		expect(files[0].content).toMatch(/^---/);
	});

	it('throws on paths with parent traversal', () => {
		const raw = `--- FILE: ../escape.md ---
---
title: Escape
---`;

		expect(() => splitFiles(raw)).toThrow('parent traversal');
	});

	it('throws on nested parent traversal', () => {
		const raw = `--- FILE: docs/../../escape.md ---
---
title: Escape
---`;

		expect(() => splitFiles(raw)).toThrow('parent traversal');
	});

	it('handles three files correctly', () => {
		const raw = `--- FILE: _layout.md ---
---
title: My Site
---

--- FILE: index.md ---
---
title: Home
---

Welcome!

--- FILE: blog/post.md ---
---
title: First Post
---

Hello world.`;

		const files = splitFiles(raw);
		expect(files).toHaveLength(3);
		expect(files[0].path).toBe('_layout.md');
		expect(files[1].path).toBe('index.md');
		expect(files[1].content).toContain('Welcome!');
		expect(files[2].path).toBe('blog/post.md');
		expect(files[2].content).toContain('Hello world.');
	});

	it('trims whitespace from file paths', () => {
		const raw = `--- FILE:  index.md  ---
---
title: Home
---`;

		const files = splitFiles(raw);
		expect(files[0].path).toBe('index.md');
	});
});
