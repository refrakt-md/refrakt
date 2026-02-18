import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('symbol tag', () => {
	it('should transform a basic function symbol', () => {
		const result = parse(`{% symbol kind="function" lang="typescript" %}
## renderContent

Transforms a Markdoc document into a renderable tree.

\`\`\`typescript
renderContent(source: string, options?: RenderOptions): RenderTree
\`\`\`

- **source** \`string\` — Raw Markdoc content
- **options** \`RenderOptions\` *(optional)* — Configuration

> Returns \`RenderTree\` — A framework-agnostic tree.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass kind, lang, since, deprecated, source as meta', () => {
		const result = parse(`{% symbol kind="function" lang="typescript" since="1.0.0" deprecated="2.0.0" source="https://github.com/example" %}
## myFunction

Description.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const kind = metas.find(m => m.attributes.property === 'kind');
		expect(kind).toBeDefined();
		expect(kind!.attributes.content).toBe('function');

		const lang = metas.find(m => m.attributes.property === 'lang');
		expect(lang).toBeDefined();
		expect(lang!.attributes.content).toBe('typescript');

		const since = metas.find(m => m.attributes.property === 'since');
		expect(since).toBeDefined();
		expect(since!.attributes.content).toBe('1.0.0');

		const deprecated = metas.find(m => m.attributes.property === 'deprecated');
		expect(deprecated).toBeDefined();
		expect(deprecated!.attributes.content).toBe('2.0.0');

		const source = metas.find(m => m.attributes.property === 'source');
		expect(source).toBeDefined();
		expect(source!.attributes.content).toBe('https://github.com/example');
	});

	it('should default kind to function and lang to typescript', () => {
		const result = parse(`{% symbol %}
## myFunction

Description.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const kind = metas.find(m => m.attributes.property === 'kind');
		expect(kind!.attributes.content).toBe('function');

		const lang = metas.find(m => m.attributes.property === 'lang');
		expect(lang!.attributes.content).toBe('typescript');
	});

	it('should convert class group headings to SymbolGroup tags', () => {
		const result = parse(`{% symbol kind="class" lang="typescript" %}
## ContentParser

The core parsing engine.

\`\`\`typescript
class ContentParser extends EventEmitter
\`\`\`

### Methods

#### parse

Parse a source string.

#### transform

Transform a parsed AST.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		expect(tag).toBeDefined();

		const groups = findAllTags(tag!, t => t.attributes.typeof === 'SymbolGroup');
		expect(groups.length).toBe(1);

		const members = findAllTags(tag!, t => t.attributes.typeof === 'SymbolMember');
		expect(members.length).toBe(2);
	});

	it('should handle class with multiple groups', () => {
		const result = parse(`{% symbol kind="class" %}
## MyClass

Description.

### Constructor

Constructor details.

### Properties

Property details.

### Methods

#### doSomething

Method description.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		const groups = findAllTags(tag!, t => t.attributes.typeof === 'SymbolGroup');
		expect(groups.length).toBe(3);
	});

	it('should handle interface kind the same as class', () => {
		const result = parse(`{% symbol kind="interface" %}
## ThemeImplementation

Interface description.

### Properties

- **name** \`string\` — Theme name

### Methods

#### getComponent

Resolve a rune to a component.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		const groups = findAllTags(tag!, t => t.attributes.typeof === 'SymbolGroup');
		expect(groups.length).toBe(2);
	});

	it('should handle enum kind without groups', () => {
		const result = parse(`{% symbol kind="enum" %}
## RuneCategory

Classification categories for runes.

\`\`\`typescript
enum RuneCategory
\`\`\`

- **Layout** \`"layout"\` — Core structural runes
- **Content** \`"content"\` — Content structure runes
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		expect(tag).toBeDefined();

		// Enum shouldn't create groups
		const groups = findAllTags(tag!, t => t.attributes.typeof === 'SymbolGroup');
		expect(groups.length).toBe(0);
	});

	it('should handle type alias kind', () => {
		const result = parse(`{% symbol kind="type" %}
## RuneMap

A mapping of rune names to their definitions.

\`\`\`typescript
type RuneMap = Record<string, RuneDefinition>
\`\`\`
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		expect(tag).toBeDefined();
		const kind = findAllTags(tag!, t => t.name === 'meta').find(m => m.attributes.property === 'kind');
		expect(kind!.attributes.content).toBe('type');
	});

	it('should handle headingLevel shifting', () => {
		const result = parse(`{% symbol kind="class" headingLevel=3 %}
### MyClass

Description.

#### Methods

##### doSomething

Method description.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		expect(tag).toBeDefined();

		const groups = findAllTags(tag!, t => t.attributes.typeof === 'SymbolGroup');
		expect(groups.length).toBe(1);

		const members = findAllTags(tag!, t => t.attributes.typeof === 'SymbolMember');
		expect(members.length).toBe(1);
	});

	it('should work with hook kind', () => {
		const result = parse(`{% symbol kind="hook" lang="typescript" %}
## useRuneContext

Access the current rune context.

\`\`\`typescript
useRuneContext(): RuneContext | null
\`\`\`

> Returns \`RuneContext | null\` — The parent rune context.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		expect(tag).toBeDefined();
		const kind = findAllTags(tag!, t => t.name === 'meta').find(m => m.attributes.property === 'kind');
		expect(kind!.attributes.content).toBe('hook');
	});

	it('should handle function kind without groups even with ### headings', () => {
		const result = parse(`{% symbol kind="function" %}
## myFunction

Description.

### Examples

Some examples follow.
{% /symbol %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Symbol');
		// Function kind should NOT convert ### headings to groups
		const groups = findAllTags(tag!, t => t.attributes.typeof === 'SymbolGroup');
		expect(groups.length).toBe(0);
	});
});
