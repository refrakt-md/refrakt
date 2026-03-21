# refrakt.md

**Write Markdown. Get structure.**

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

[Documentation](https://refrakt.md) | [Getting Started](https://refrakt.md/docs/getting-started) | [Rune Catalog](https://refrakt.md/docs/runes)

## Features

- **Built on Markdoc** — Not another Markdown dialect. Refrakt extends Markdoc with semantic runes that add meaning to the Markdown you already write.
- **Runes, not components** — Runes reinterpret the Markdown inside them. A heading inside `{% nav %}` becomes a group title. A list inside `{% cta %}` becomes action buttons. You write Markdown — the rune decides what it means.
- **SEO from the start** — Every rune can emit Schema.org JSON-LD and Open Graph metadata automatically. Recipes get Recipe schema, events get Event schema, FAQs get FAQ schema — no manual wiring.
- **AI-powered authoring** — Generate full pages with `refrakt write`. The CLI knows every rune and produces valid Markdown with proper rune structure. Supports Claude and local models via Ollama.
- **Layout inheritance** — Define regions in `_layout.md` files that cascade down directory trees. Headers, navigation, and sidebars compose automatically.
- **Portable content** — Your content stays decoupled from presentation. Render with SvelteKit or as static HTML, with more adapters planned.

## Quick Start

```bash
npm create refrakt my-site
cd my-site
npm install
npm run dev
```

For static HTML output:

```bash
npm create refrakt my-site -- --target html
```

## Packages

### Core

| Package | Description |
|---------|-------------|
| `@refrakt-md/types` | Shared TypeScript interfaces |
| `@refrakt-md/runes` | ~37 core rune schemas, SEO extraction, config |
| `@refrakt-md/transform` | Identity transform engine (BEM classes, structure injection) |
| `@refrakt-md/lumina` | Lumina theme (design tokens, CSS) |
| `@refrakt-md/behaviors` | Progressive enhancement JS (tabs, accordion, datatable, form) |
| `@refrakt-md/content` | Content loading, routing, layout cascade |
| `@refrakt-md/svelte` | SvelteKit renderer and component registry |
| `@refrakt-md/sveltekit` | Vite plugin, virtual modules, HMR |
| `@refrakt-md/html` | Static HTML renderer |
| `@refrakt-md/highlight` | Syntax highlighting with Shiki |
| `@refrakt-md/ai` | AI prompt building and providers |
| `@refrakt-md/cli` | CLI tools (write, inspect, contracts) |
| `create-refrakt` | Project scaffolding |

### Community Packages

Eight official packages add domain-specific runes — install only what you need.

| Package | Runes |
|---------|-------|
| `@refrakt-md/marketing` | hero, cta, feature, pricing, testimonial, bento, steps, comparison |
| `@refrakt-md/docs` | api, symbol, changelog |
| `@refrakt-md/design` | swatch, palette, typography, spacing, preview, mockup |
| `@refrakt-md/learning` | howto, recipe |
| `@refrakt-md/storytelling` | character, realm, faction, lore, plot, bond, storyboard |
| `@refrakt-md/business` | cast, organization, timeline |
| `@refrakt-md/places` | event, map, itinerary |
| `@refrakt-md/media` | playlist, track, audio |

## Documentation

Full documentation is available at **[refrakt.md](https://refrakt.md)**.

- [Getting Started](https://refrakt.md/docs/getting-started) — Scaffold a project and write your first page
- [Rune Catalog](https://refrakt.md/docs/runes) — Browse all 60+ runes with examples
- [Theme Development](https://refrakt.md/docs/themes) — Create custom themes with design tokens and CSS
- [CLI Tools](https://refrakt.md/docs/cli) — Inspect runes, generate content with AI, audit CSS coverage
- [Adapters](https://refrakt.md/docs/adapters) — SvelteKit, HTML, and extensibility
- [Community Packages](https://refrakt.md/docs/packages) — Install, create, and extend rune packages

## Contributing

Contributions are welcome! This is an npm workspaces monorepo — build order matters:

```bash
npm run build    # Build all packages in dependency order
npm test         # Run all tests
```

See [RELEASING.md](RELEASING.md) for the release process.

## License

[MIT](LICENSE)
