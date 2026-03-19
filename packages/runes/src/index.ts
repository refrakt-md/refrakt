import { heading, paragraph, fence, list, item, em, strong, text, link, hardbreak, image } from './nodes.js';

export { Page } from './documents/page.js';
import { DocPage } from './documents/doc.js';

import { error } from './tags/error.js';
import { grid } from './tags/grid.js';
import { codegroup } from './tags/codegroup.js';
import { hint } from './tags/hint.js';
import { tab, tabs } from './tags/tabs.js';
import { nav } from './tags/nav.js';
import { region } from './tags/region.js';
import { layout } from './tags/layout.js';
import { details } from './tags/details.js';
import { figure } from './tags/figure.js';
import { gallery } from './tags/gallery.js';
import { accordion, accordionItem } from './tags/accordion.js';
import { toc } from './tags/toc.js';
import { embed } from './tags/embed.js';
import { breadcrumb } from './tags/breadcrumb.js';
import { budget, budgetCategory, budgetLineItem } from './tags/budget.js';
import { compare } from './tags/compare.js';
import { datatable } from './tags/datatable.js';
import { diff } from './tags/diff.js';
import { chart } from './tags/chart.js';
import { diagram } from './tags/diagram.js';
import { sidenote } from './tags/sidenote.js';
import { conversation, conversationMessage } from './tags/conversation.js';
import { reveal, revealStep } from './tags/reveal.js';
import { annotate, annotateNote } from './tags/annotate.js';
import { form, formField } from './tags/form.js';
import { sandbox } from './tags/sandbox.js';
import { icon } from './tags/icon.js';
import { pullquote } from './tags/pullquote.js';
import { textblock } from './tags/textblock.js';
import { mediatext } from './tags/mediatext.js';
import { tint } from './tags/tint.js';
import { showcase } from './tags/showcase.js';
import { bg } from './tags/bg.js';
import { blog } from './tags/blog.js';
import Markdoc from '@markdoc/markdoc';

import { schema } from './registry.js';
import { defineRune, runeTagMap } from './rune.js';

export * from './interfaces.js';
export { Rune, defineRune, runeTagMap } from './rune.js';
export { RenderableNodeCursor } from './lib/renderable.js';
export { schema } from './registry.js';
export { createSchema, createContentModelSchema, createComponentRenderable, asNodes, schemaContentModels } from './lib/index.js';
export type { DeprecationRule, ContentModelSchemaOptions } from './lib/index.js';
export { resolve, resolveSequence, resolveDelimited, resolveContentModel, resolveListItems, evaluateCondition, matchesType } from './lib/resolver.js';
export { attribute } from './lib/annotations/attribute.js';
export { group, groupList } from './lib/annotations/group.js';
export { id } from './lib/annotations/id.js';
export { Model } from './lib/model.js';
export { NodeStream } from './lib/node.js';
export { linkItem, pageSectionProperties, name as nameHelper, description as descriptionHelper, SplitablePageSectionModel, SplitLayoutModel } from './tags/common.js';
export { extractHeadings, headingsToList } from './util.js';
export type { HeadingInfo } from './util.js';
export { extractSeo, collectJsonLd, textContent } from './seo.js';
export type { PageSeo, OgMeta } from './seo.js';
export { serialize, serializeTree } from './serialize.js';
export { RUNE_EXAMPLES } from './examples.js';
export { loadRunePackage, mergePackages, applyAliases, loadLocalRunes, discoverPackageFixtures } from './packages.js';
export type { LoadedPackage, MergedPackageResult } from './packages.js';
export { coreConfig, baseConfig, corePipelineHooks, type PageTreeNode } from './config.js';
export { BREADCRUMB_AUTO_SENTINEL } from './tags/breadcrumb.js';
export { NAV_AUTO_SENTINEL } from './tags/nav.js';
export { TINT_TOKENS } from './tags/tint.js';
export type { TintToken } from './tags/tint.js';

export const documents = {
  doc: new DocPage(),
}

export const runes = {
  nav: defineRune({
    name: 'nav',
    schema: nav,
    description: 'Navigation structure with page slug references and optional grouping',
    reinterprets: { heading: 'nav group title', list: 'page references (slugs)' },
    type: schema.Nav,
  }),
  region: defineRune({
    name: 'region',
    schema: region,
    description: 'Named content block within a layout definition',
  }),
  layout: defineRune({
    name: 'layout',
    schema: layout,
    description: 'Layout definition containing named regions',
  }),
  codegroup: defineRune({
    name: 'codegroup',
    schema: codegroup,
    description: 'Tabbed code block with language tabs',
    reinterprets: { fence: 'tab content' },
    type: schema.CodeGroup,
  }),
  error: defineRune({
    name: 'error',
    schema: error,
    description: 'Error reporting table',
    type: schema.Error,
  }),
  grid: defineRune({
    name: 'grid',
    aliases: ['columns'],
    schema: grid,
    description: 'Grid layout container with configurable columns and rows',
    reinterprets: { hr: 'grid cell delimiter' },
    type: schema.Grid,
  }),
  hint: defineRune({
    name: 'hint',
    aliases: ['callout', 'alert'],
    schema: hint,
    description: 'Callout/admonition block with type variants (note, warning, caution, check)',
    reinterprets: { paragraph: 'message body' },
    type: schema.Hint,
  }),
  tab: defineRune({
    name: 'tab',
    schema: tab,
    description: 'Individual tab within a tab group',
    type: schema.Tab,
  }),
  tabs: defineRune({
    name: 'tabs',
    schema: tabs,
    description: 'Tabbed interface with tab panels',
    reinterprets: { heading: 'tab name' },
    type: schema.TabGroup,
  }),
  details: defineRune({
    name: 'details',
    schema: details,
    description: 'Collapsible disclosure block for supplementary content',
    reinterprets: { heading: 'summary label', paragraph: 'hidden content' },
    type: schema.Details,
  }),
  figure: defineRune({
    name: 'figure',
    schema: figure,
    description: 'Enhanced image with caption, attribution, and sizing',
    reinterprets: { image: 'figure image', paragraph: 'caption' },
    seoType: 'ImageObject',
    type: schema.Figure,
  }),
  gallery: defineRune({
    name: 'gallery',
    schema: gallery,
    description: 'Multi-image container with grid, carousel, or masonry layout and optional lightbox',
    reinterprets: { image: 'gallery item', heading: 'section title' },
    seoType: 'ImageGallery',
    type: schema.Gallery,
  }),
  accordion: defineRune({
    name: 'accordion',
    aliases: ['faq'],
    schema: accordion,
    description: 'Collapsible accordion sections where headings become toggleable headers',
    reinterprets: { heading: 'accordion section header', paragraph: 'collapsible panel content' },
    seoType: 'FAQPage',
    type: schema.Accordion,
  }),
  'accordion-item': defineRune({
    name: 'accordion-item',
    schema: accordionItem,
    description: 'Individual accordion section',
    type: schema.AccordionItem,
  }),
  toc: defineRune({
    name: 'toc',
    aliases: ['table-of-contents'],
    schema: toc,
    description: 'Auto-generated table of contents from document headings',
    type: schema.TableOfContents,
  }),
  embed: defineRune({
    name: 'embed',
    schema: embed,
    description: 'Embedded content from external services (YouTube, Twitter, CodePen, Spotify)',
    reinterprets: { paragraph: 'fallback text' },
    seoType: 'VideoObject',
    type: schema.Embed,
  }),
  breadcrumb: defineRune({
    name: 'breadcrumb',
    schema: breadcrumb,
    description: 'Navigation breadcrumb trail showing page hierarchy',
    reinterprets: { list: 'breadcrumb path items', link: 'breadcrumb link' },
    seoType: 'BreadcrumbList',
    type: schema.Breadcrumb,
  }),
  budget: defineRune({
    name: 'budget',
    schema: budget,
    description: 'Structured cost breakdown with categories, line items, and auto-calculated totals',
    reinterprets: { heading: 'category label', list: 'line items (Description: $amount)' },
    seoType: 'ItemList',
    type: schema.Budget,
  }),
  'budget-category': defineRune({
    name: 'budget-category',
    schema: budgetCategory,
    description: 'Cost category within a budget containing line items',
    reinterprets: { list: 'line items (Description: $amount)' },
    type: schema.BudgetCategory,
  }),
  'budget-line-item': defineRune({
    name: 'budget-line-item',
    schema: budgetLineItem,
    description: 'Individual budget line item with description and amount',
    type: schema.BudgetLineItem,
  }),
  compare: defineRune({
    name: 'compare',
    schema: compare,
    description: 'Side-by-side code comparison with labeled panels',
    reinterprets: { fence: 'comparison panel' },
    type: schema.Compare,
  }),
  datatable: defineRune({
    name: 'datatable',
    aliases: ['data-table'],
    schema: datatable,
    description: 'Interactive data table with sorting, filtering, and pagination from a Markdown table',
    reinterprets: { table: 'interactive data table' },
    seoType: 'Dataset',
    type: schema.DataTable,
  }),
  diff: defineRune({
    name: 'diff',
    schema: diff,
    description: 'Side-by-side or unified diff view between two code blocks',
    reinterprets: { fence: 'before/after code blocks' },
    type: schema.Diff,
  }),
  chart: defineRune({
    name: 'chart',
    schema: chart,
    description: 'Chart visualization from a Markdown table. First column becomes axis labels, header row becomes series names.',
    reinterprets: { table: 'chart data' },
    type: schema.Chart,
  }),
  diagram: defineRune({
    name: 'diagram',
    schema: diagram,
    description: 'Diagram rendering from Mermaid, PlantUML, or ASCII art code blocks',
    reinterprets: { fence: 'diagram source code' },
    type: schema.Diagram,
  }),
  sidenote: defineRune({
    name: 'sidenote',
    aliases: ['footnote', 'marginnote'],
    schema: sidenote,
    description: 'Margin note or footnote displayed alongside the main content',
    reinterprets: { paragraph: 'note content' },
    type: schema.Sidenote,
  }),
  conversation: defineRune({
    name: 'conversation',
    aliases: ['dialogue', 'chat'],
    schema: conversation,
    description: 'Chat/dialogue display where blockquotes become alternating speaker messages',
    reinterprets: { blockquote: 'speaker message', strong: 'speaker name' },
    type: schema.Conversation,
  }),
  'conversation-message': defineRune({
    name: 'conversation-message',
    schema: conversationMessage,
    description: 'Individual message within a conversation',
    type: schema.ConversationMessage,
  }),
  reveal: defineRune({
    name: 'reveal',
    schema: reveal,
    description: 'Progressive disclosure where headings become reveal steps shown one at a time',
    reinterprets: { heading: 'reveal step label', paragraph: 'revealed content' },
    type: schema.Reveal,
  }),
  'reveal-step': defineRune({
    name: 'reveal-step',
    schema: revealStep,
    description: 'Individual step within a reveal sequence',
    type: schema.RevealStep,
  }),
  annotate: defineRune({
    name: 'annotate',
    schema: annotate,
    description: 'Content with margin annotations. Nested note tags appear as margin notes alongside the main text.',
    reinterprets: { paragraph: 'main content' },
    type: schema.Annotate,
  }),
  note: defineRune({
    name: 'note',
    schema: annotateNote,
    description: 'Annotation note within an annotate block',
    type: schema.AnnotateNote,
  }),
  form: defineRune({
    name: 'form',
    aliases: ['contact-form'],
    schema: form,
    description: 'Accessible HTML form from Markdown. Lists become input fields with smart type inference, blockquotes followed by lists become select/radio/checkbox groups.',
    reinterprets: { list: 'form fields (type inferred from name)', blockquote: 'help text or selection group label', heading: 'fieldset group', strong: 'submit button label', hr: 'section separator' },
    type: schema.Form,
  }),
  'form-field': defineRune({
    name: 'form-field',
    schema: formField,
    description: 'Individual form field with inferred type',
    type: schema.FormField,
  }),
  sandbox: defineRune({
    name: 'sandbox',
    schema: sandbox,
    description: 'Isolated HTML/CSS/JS rendering in an iframe with optional framework loading',
    reinterprets: {},
    type: schema.Sandbox,
  }),
  pullquote: defineRune({
    name: 'pullquote',
    aliases: ['pull-quote'],
    schema: pullquote,
    description: 'Decorative pull quote for magazine-style emphasis with float and block modes',
    reinterprets: { blockquote: 'quote text', paragraph: 'quote text' },
    type: schema.PullQuote,
  }),
  textblock: defineRune({
    name: 'textblock',
    aliases: ['text-block', 'prose'],
    schema: textblock,
    description: 'Text formatting block with drop caps, multi-column layout, lead paragraphs, and alignment control',
    reinterprets: { paragraph: 'formatted text' },
    type: schema.TextBlock,
  }),
  mediatext: defineRune({
    name: 'mediatext',
    aliases: ['media-text'],
    schema: mediatext,
    description: 'Image and text side by side with configurable ratio and optional text wrapping',
    reinterprets: { image: 'media image', paragraph: 'body text' },
    type: schema.MediaText,
  }),
  icon: defineRune({
    name: 'icon',
    schema: icon,
    description: 'Inline icon resolved by name from the theme icon registry. Self-closing.',
    reinterprets: {},
  }),
  tint: defineRune({
    name: 'tint',
    schema: tint,
    description: 'Section-level colour override via CSS custom properties. Declared as first child of a block rune.',
    reinterprets: { heading: 'light/dark section separator', list: 'token key-value pairs' },
    type: schema.Tint,
  }),
  showcase: defineRune({
    name: 'showcase',
    schema: showcase,
    description: 'Media presentation wrapper with shadow, bleed displacement, and aspect ratio enforcement',
    type: schema.Showcase,
  }),
  bg: defineRune({
    name: 'bg',
    schema: bg,
    description: 'Background image/video directive — modifies parent section backdrop',
    type: schema.Bg,
  }),
  blog: defineRune({
    name: 'blog',
    schema: blog,
    description: 'Blog post listing with filtering, sorting, and multiple layouts. Displays pages from a content folder as a navigable blog index.',
    seoType: 'Blog',
    reinterprets: { heading: 'section title', paragraph: 'section description' },
    type: schema.Blog,
  }),
};

/** Markdoc-compatible tags map derived from runes + Markdoc built-in tags */
export const tags = {
  ...runeTagMap(runes),
  ...Markdoc.tags,
};

export const nodes = {
  heading,
  paragraph,
  fence,
  list,
  item,
  em,
  strong,
  text,
  link,
  hardbreak,
  image,
  table: Markdoc.nodes.table,
  thead: Markdoc.nodes.thead,
  tbody: Markdoc.nodes.tbody,
  th: Markdoc.nodes.th,
  tr: Markdoc.nodes.tr,
  error: Markdoc.nodes.error,
}
