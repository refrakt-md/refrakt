import { heading, paragraph, fence, list, item, em, strong, text, link, hardbreak, image, table } from './nodes.js';

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
import { juxtapose } from './tags/juxtapose.js';
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
import { xref } from './tags/xref.js';
import Markdoc from '@markdoc/markdoc';

import { defineRune, runeTagMap } from './rune.js';

export * from './interfaces.js';
export { Rune, defineRune, runeTagMap } from './rune.js';
export { RenderableNodeCursor } from './lib/renderable.js';
export { createContentModelSchema, createComponentRenderable, asNodes, schemaContentModels } from './lib/index.js';
export type { DeprecationRule, ContentModelSchemaOptions } from './lib/index.js';
export { resolve, resolveSequence, resolveDelimited, resolveContentModel, resolveListItems, evaluateCondition, matchesType } from './lib/resolver.js';
export { linkItem, pageSectionProperties, buildLayoutMetas, extractMediaImage, unwrapParagraphImages, name as nameHelper, description as descriptionHelper, SplitablePageSectionModel, SplitLayoutModel, splitLayoutAttributes } from './tags/common.js';
export type { LayoutMetas } from './tags/common.js';
export { extractHeadings, headingsToList } from './util.js';
export type { HeadingInfo } from './util.js';
export { extractSeo, collectJsonLd, textContent } from './seo.js';
export type { PageSeo, OgMeta } from './seo.js';
export { serialize, serializeTree } from './serialize.js';
export { RUNE_EXAMPLES } from './examples.js';
export { describeRune, renderContentModel, serializeContentModel, stripContentModel, EXCLUDED_RUNES, HIDDEN_ATTRIBUTES } from './reference.js';
export type {
	RuneInfo,
	RuneBasePresetInfo,
	SerializedContentModel,
	SerializedSequenceModel,
	SerializedSectionsModel,
	SerializedDelimitedModel,
	SerializedCustomModel,
	SerializedContentField,
	SerializedDelimitedZone,
	SerializedHeadingExtractField,
	SerializedKnownSection,
} from './reference.js';
export {
	registerAttributePreset,
	lookupAttributePreset,
	schemaBasePresets,
	UNIVERSAL_ATTRIBUTE_NAMES,
} from './attribute-presets.js';
export type { AttributePresetMetadata } from './attribute-presets.js';
export { loadRunePackage, mergePackages, applyAliases, loadLocalRunes, discoverPackageFixtures } from './packages.js';
export type { LoadedPackage, MergedPackageResult } from './packages.js';
export { coreConfig, baseConfig, corePipelineHooks, type PageTreeNode } from './config.js';
export { BREADCRUMB_AUTO_SENTINEL } from './tags/breadcrumb.js';
export { NAV_AUTO_SENTINEL } from './tags/nav.js';
export { TINT_TOKENS } from './tags/tint.js';
export type { TintToken } from './tags/tint.js';
export { XREF_RUNE_MARKER } from './tags/xref.js';
export { resolveXrefs } from './xref-resolve.js';
export { escapeFenceTags } from './fence-escape.js';

// Component override prop interfaces (ADR-008)
export type {
	AccordionItemProps, AccordionProps,
	AnnotateNoteProps, AnnotateProps,
	BlogProps,
	BreadcrumbItemProps, BreadcrumbProps,
	BudgetLineItemProps, BudgetCategoryProps, BudgetProps,
	ChartProps,
	CodeGroupProps,
	CompareProps,
	ConversationMessageProps, ConversationProps,
	DataTableProps,
	DetailsProps,
	DiagramProps,
	DiffProps,
	EmbedProps,
	ErrorProps,
	FigureProps,
	FormProps,
	GalleryProps,
	GridProps,
	HintProps,
	JuxtaposePanelProps, JuxtaposeProps,
	MediaTextProps,
	NavItemProps, NavGroupProps, NavProps,
	PullQuoteProps,
	RevealStepProps, RevealProps,
	SandboxProps,
	ShowcaseProps,
	SidenoteProps,
	TabProps, TabPanelProps, TabGroupProps,
	TextBlockProps,
	TableOfContentsProps,
} from './props.js';

export const documents = {
  doc: new DocPage(),
}

export const runes = {
  nav: defineRune({
    name: 'nav',
    schema: nav,
    description: 'Navigation structure with page slug references and optional grouping',
    typeName: 'Nav',
    category: 'Site',
    snippet: ['{% nav %}', '## ${1:Section}', '', '- ${2:page-slug}', '- ${3:another-page}', '{% /nav %}'],
  }),
  region: defineRune({
    name: 'region',
    schema: region,
    description: 'Named content block within a layout definition',
    snippet: ['{% region name="${1:header}" %}', '$0', '{% /region %}'],
  }),
  layout: defineRune({
    name: 'layout',
    schema: layout,
    description: 'Layout definition containing named regions',
    category: 'Site',
    snippet: ['{% layout %}', '{% region name="${1:header}" %}', '$0', '{% /region %}', '{% /layout %}'],
  }),
  codegroup: defineRune({
    name: 'codegroup',
    schema: codegroup,
    description: 'Tabbed code block with language tabs',
    typeName: 'CodeGroup',
    category: 'Code & Data',
    snippet: ['{% codegroup %}', '```${1:js}', '$0', '```', '', '```${2:ts}', '', '```', '{% /codegroup %}'],
  }),
  error: defineRune({
    name: 'error',
    schema: error,
    description: 'Error reporting table',
    typeName: 'Error',
    category: 'Semantic',
  }),
  grid: defineRune({
    name: 'grid',
    aliases: ['columns'],
    schema: grid,
    description: 'Grid layout container with configurable columns and rows',
    typeName: 'Grid',
    category: 'Layout',
    snippet: ['{% grid columns=${1:2} %}', '${2:First column content}', '', '---', '', '${3:Second column content}', '{% /grid %}'],
  }),
  hint: defineRune({
    name: 'hint',
    aliases: ['callout', 'alert'],
    schema: hint,
    description: 'Callout/admonition block with type variants (note, warning, caution, check)',
    typeName: 'Hint',
    category: 'Content',
    snippet: ['{% hint type="${1|note,warning,caution,check|}" %}', '$0', '{% /hint %}'],
  }),
  tab: defineRune({
    name: 'tab',
    schema: tab,
    description: 'Individual tab within a tab group',
    typeName: 'Tab',
  }),
  tabs: defineRune({
    name: 'tabs',
    schema: tabs,
    description: 'Tabbed interface with tab panels',
    typeName: 'TabGroup',
    category: 'Layout',
    snippet: ['{% tabs %}', '## ${1:Tab One}', '', '${2:Content for tab one.}', '', '## ${3:Tab Two}', '', '${4:Content for tab two.}', '{% /tabs %}'],
  }),
  details: defineRune({
    name: 'details',
    schema: details,
    description: 'Collapsible disclosure block for supplementary content',
    typeName: 'Details',
    category: 'Content',
    snippet: ['{% details summary="${1:Click to expand}" %}', '$0', '{% /details %}'],
  }),
  figure: defineRune({
    name: 'figure',
    schema: figure,
    description: 'Enhanced image with caption, attribution, and sizing',
    seoType: 'ImageObject',
    typeName: 'Figure', schemaOrgType: 'ImageObject',
    category: 'Content',
    snippet: ['{% figure size="${1|medium,small,large,full|}" %}', '![${2:Alt text}](${3:/path/to/image.png})', '', '${4:Caption text}', '{% /figure %}'],
  }),
  gallery: defineRune({
    name: 'gallery',
    schema: gallery,
    description: 'Multi-image container with grid, carousel, or masonry layout and optional lightbox',
    seoType: 'ImageGallery',
    typeName: 'Gallery', schemaOrgType: 'ImageGallery',
    category: 'Content',
    snippet: ['{% gallery layout="${1|grid,carousel,masonry|}" %}', '![${2:Alt text}](${3:/path/to/image1.png})', '', '![${4:Alt text}](${5:/path/to/image2.png})', '{% /gallery %}'],
  }),
  accordion: defineRune({
    name: 'accordion',
    aliases: ['faq'],
    schema: accordion,
    description: 'Collapsible accordion sections where headings become toggleable headers',
    seoType: 'FAQPage',
    typeName: 'Accordion', schemaOrgType: 'FAQPage',
    category: 'Layout',
    snippet: ['{% accordion %}', '## ${1:First Question}', '', '${2:Answer to the first question.}', '', '## ${3:Second Question}', '', '${4:Answer to the second question.}', '{% /accordion %}'],
  }),
  'accordion-item': defineRune({
    name: 'accordion-item',
    schema: accordionItem,
    description: 'Individual accordion section',
    typeName: 'AccordionItem', schemaOrgType: 'Question',
  }),
  toc: defineRune({
    name: 'toc',
    aliases: ['table-of-contents'],
    schema: toc,
    description: 'Auto-generated table of contents from document headings',
    typeName: 'TableOfContents',
    category: 'Site',
    snippet: ['{% toc /%}'],
  }),
  embed: defineRune({
    name: 'embed',
    schema: embed,
    description: 'Embedded content from external services (YouTube, Twitter, CodePen, Spotify)',
    seoType: 'VideoObject',
    typeName: 'Embed', schemaOrgType: 'VideoObject',
    category: 'Content',
    snippet: ['{% embed url="${1:https://}" /%}'],
  }),
  breadcrumb: defineRune({
    name: 'breadcrumb',
    schema: breadcrumb,
    description: 'Navigation breadcrumb trail showing page hierarchy',
    seoType: 'BreadcrumbList',
    typeName: 'Breadcrumb', schemaOrgType: 'BreadcrumbList',
    category: 'Site',
    snippet: ['{% breadcrumb /%}'],
  }),
  budget: defineRune({
    name: 'budget',
    schema: budget,
    description: 'Structured cost breakdown with categories, line items, and auto-calculated totals',
    seoType: 'ItemList',
    typeName: 'Budget', schemaOrgType: 'ItemList',
    category: 'Semantic',
    snippet: ['{% budget %}', '## ${1:Category}', '', '- ${2:Item description}: \\$${3:100}', '- ${4:Another item}: \\$${5:200}', '{% /budget %}'],
  }),
  'budget-category': defineRune({
    name: 'budget-category',
    schema: budgetCategory,
    description: 'Cost category within a budget containing line items',
    typeName: 'BudgetCategory',
  }),
  'budget-line-item': defineRune({
    name: 'budget-line-item',
    schema: budgetLineItem,
    description: 'Individual budget line item with description and amount',
    typeName: 'BudgetLineItem',
  }),
  compare: defineRune({
    name: 'compare',
    schema: compare,
    description: 'Side-by-side code comparison with labeled panels',
    typeName: 'Compare',
    category: 'Code & Data',
    snippet: ['{% compare %}', '```${1:js}', '${2:// Before}', '```', '', '```${3:js}', '${4:// After}', '```', '{% /compare %}'],
  }),
  datatable: defineRune({
    name: 'datatable',
    aliases: ['data-table'],
    schema: datatable,
    description: 'Interactive data table with sorting, filtering, and pagination from a Markdown table',
    seoType: 'Dataset',
    typeName: 'DataTable', schemaOrgType: 'Dataset',
    category: 'Code & Data',
    snippet: ['{% datatable %}', '| ${1:Column A} | ${2:Column B} | ${3:Column C} |', '|---|---|---|', '| ${4:Data} | ${5:Data} | ${6:Data} |', '{% /datatable %}'],
  }),
  diff: defineRune({
    name: 'diff',
    schema: diff,
    description: 'Side-by-side or unified diff view between two code blocks',
    typeName: 'Diff',
    category: 'Code & Data',
    snippet: ['{% diff %}', '```${1:js}', '${2:// Before}', '```', '', '```${3:js}', '${4:// After}', '```', '{% /diff %}'],
  }),
  chart: defineRune({
    name: 'chart',
    schema: chart,
    description: 'Chart visualization from a Markdown table. First column becomes axis labels, header row becomes series names.',
    typeName: 'Chart',
    category: 'Code & Data',
    snippet: ['{% chart type="${1|bar,line,pie,area|}" %}', '| ${2:Label} | ${3:Series A} | ${4:Series B} |', '|---|---|---|', '| ${5:Item 1} | ${6:10} | ${7:20} |', '| ${8:Item 2} | ${9:30} | ${10:15} |', '{% /chart %}'],
  }),
  diagram: defineRune({
    name: 'diagram',
    schema: diagram,
    description: 'Diagram rendering from Mermaid, PlantUML, or ASCII art code blocks',
    typeName: 'Diagram',
    category: 'Code & Data',
    snippet: ['{% diagram language="${1|mermaid,plantuml,ascii|}" %}', '```${1:mermaid}', '$0', '```', '{% /diagram %}'],
  }),
  sidenote: defineRune({
    name: 'sidenote',
    aliases: ['footnote', 'marginnote'],
    schema: sidenote,
    description: 'Margin note or footnote displayed alongside the main content',
    typeName: 'Sidenote',
    category: 'Content',
    snippet: ['{% sidenote %}', '$0', '{% /sidenote %}'],
  }),
  conversation: defineRune({
    name: 'conversation',
    aliases: ['dialogue', 'chat'],
    schema: conversation,
    description: 'Chat/dialogue display where blockquotes become alternating speaker messages',
    typeName: 'Conversation',
    category: 'Semantic',
    snippet: ['{% conversation %}', '> **${1:Alice}**: ${2:Hello!}', '', '> **${3:Bob}**: ${4:Hi there!}', '{% /conversation %}'],
  }),
  'conversation-message': defineRune({
    name: 'conversation-message',
    schema: conversationMessage,
    description: 'Individual message within a conversation',
    typeName: 'ConversationMessage',
  }),
  reveal: defineRune({
    name: 'reveal',
    schema: reveal,
    description: 'Progressive disclosure where headings become reveal steps shown one at a time',
    typeName: 'Reveal',
    category: 'Layout',
    snippet: ['{% reveal %}', '## ${1:Step One}', '', '${2:Content revealed first.}', '', '## ${3:Step Two}', '', '${4:Content revealed next.}', '{% /reveal %}'],
  }),
  'reveal-step': defineRune({
    name: 'reveal-step',
    schema: revealStep,
    description: 'Individual step within a reveal sequence',
    typeName: 'RevealStep',
  }),
  juxtapose: defineRune({
    name: 'juxtapose',
    schema: juxtapose,
    description: 'Side-by-side comparison with interactive reveal (slider, toggle, fade, or auto)',
    typeName: 'Juxtapose',
    category: 'Layout',
  }),
  annotate: defineRune({
    name: 'annotate',
    schema: annotate,
    description: 'Content with margin annotations. Nested note tags appear as margin notes alongside the main text.',
    typeName: 'Annotate',
    category: 'Layout',
    snippet: ['{% annotate %}', '${1:Main content here.}', '', '{% note %}', '${2:Margin note content.}', '{% /note %}', '', '${3:More main content.}', '{% /annotate %}'],
  }),
  note: defineRune({
    name: 'note',
    schema: annotateNote,
    description: 'Annotation note within an annotate block',
    typeName: 'AnnotateNote',
  }),
  form: defineRune({
    name: 'form',
    aliases: ['contact-form'],
    schema: form,
    description: 'Accessible HTML form from Markdown. Lists become input fields with smart type inference, blockquotes followed by lists become select/radio/checkbox groups.',
    typeName: 'Form',
    category: 'Content',
    snippet: ['{% form action="${1:/api/contact}" %}', '- Name', '- Email', '- Message', '', '**${2:Submit}**', '{% /form %}'],
  }),
  'form-field': defineRune({
    name: 'form-field',
    schema: formField,
    description: 'Individual form field with inferred type',
    typeName: 'FormField',
  }),
  sandbox: defineRune({
    name: 'sandbox',
    schema: sandbox,
    description: 'Isolated HTML/CSS/JS rendering in an iframe with optional framework loading',
    typeName: 'Sandbox',
    category: 'Code & Data',
    snippet: ['{% sandbox framework="${1|,tailwind,bootstrap,bulma,pico|}" %}', '$0', '{% /sandbox %}'],
  }),
  pullquote: defineRune({
    name: 'pullquote',
    aliases: ['pull-quote'],
    schema: pullquote,
    description: 'Decorative pull quote for magazine-style emphasis with float and block modes',
    typeName: 'PullQuote',
    category: 'Content',
    snippet: ['{% pullquote variant="${1|default,accent,editorial|}" %}', '> ${2:Quote text to emphasize.}', '{% /pullquote %}'],
  }),
  textblock: defineRune({
    name: 'textblock',
    aliases: ['text-block', 'prose'],
    schema: textblock,
    description: 'Text formatting block with drop caps, multi-column layout, lead paragraphs, and alignment control',
    typeName: 'TextBlock',
    category: 'Content',
    snippet: ['{% textblock dropcap %}', '${1:Formatted text content with drop cap styling.}', '{% /textblock %}'],
  }),
  mediatext: defineRune({
    name: 'mediatext',
    aliases: ['media-text'],
    schema: mediatext,
    description: 'Image and text side by side with configurable ratio and optional text wrapping',
    typeName: 'MediaText',
    category: 'Layout',
    snippet: ['{% mediatext align="${1|left,right|}" ratio="${2|1:1,1:2,2:1|}" %}', '![${3:Alt text}](${4:/path/to/image.png})', '', '${5:Text content displayed alongside the image.}', '{% /mediatext %}'],
  }),
  icon: defineRune({
    name: 'icon',
    schema: icon,
    description: 'Inline icon resolved by name from the theme icon registry. Self-closing.',
    category: 'Content',
    snippet: ['{% icon name="${1:icon-name}" /%}'],
  }),
  tint: defineRune({
    name: 'tint',
    schema: tint,
    description: 'Section-level colour override via CSS custom properties. Declared as first child of a block rune.',
    typeName: 'Tint',
    snippet: ['{% tint %}', '- background: ${1:#1a1a2e}', '- primary: ${2:#e94560}', '- accent: ${3:#0f3460}', '{% /tint %}'],
  }),
  showcase: defineRune({
    name: 'showcase',
    schema: showcase,
    description: 'Media presentation wrapper with shadow, bleed displacement, and aspect ratio enforcement',
    typeName: 'Showcase',
    category: 'Layout',
    snippet: ['{% showcase shadow="${1|none,soft,hard,elevated|}" %}', '$0', '{% /showcase %}'],
  }),
  bg: defineRune({
    name: 'bg',
    schema: bg,
    description: 'Background image/video directive — modifies parent section backdrop',
    typeName: 'Bg',
    snippet: ['{% bg src="${1:/path/to/image.jpg}" overlay="${2:rgba(0,0,0,0.5)}" /%}'],
  }),
  blog: defineRune({
    name: 'blog',
    schema: blog,
    description: 'Blog post listing with filtering, sorting, and multiple layouts. Displays pages from a content folder as a navigable blog index.',
    seoType: 'Blog',
    typeName: 'Blog', schemaOrgType: 'Blog',
    category: 'Semantic',
  }),
  xref: defineRune({
    name: 'xref',
    aliases: ['ref'],
    schema: xref,
    description: 'Inline cross-reference that resolves an entity by ID or name from the registry. Self-closing.',
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
  table,
  thead: Markdoc.nodes.thead,
  tbody: Markdoc.nodes.tbody,
  th: Markdoc.nodes.th,
  tr: Markdoc.nodes.tr,
  error: Markdoc.nodes.error,
}
