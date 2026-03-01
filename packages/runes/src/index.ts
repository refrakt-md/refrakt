import { heading, paragraph, fence, list, item, em, strong, text, link, hardbreak, image } from './nodes.js';

export { Page } from './documents/page.js';
import { DocPage } from './documents/doc.js';

import { cta } from './tags/cta.js';
import { error } from './tags/error.js';
import { grid } from './tags/grid.js';
import { codegroup } from './tags/codegroup.js';
import { feature, definition } from './tags/feature.js';
import { hint } from './tags/hint.js';
import { steps, step } from './tags/steps.js';
import { tab, tabs } from './tags/tabs.js';
import { pricing, tier } from './tags/pricing.js';
import { musicPlaylist } from './tags/music-playlist.js'
import { musicRecording } from './tags/music-recording.js'
import { nav } from './tags/nav.js';
import { region } from './tags/region.js';
import { layout } from './tags/layout.js';
import { details } from './tags/details.js';
import { figure } from './tags/figure.js';
import { accordion, accordionItem } from './tags/accordion.js';
import { toc } from './tags/toc.js';
import { hero } from './tags/hero.js';
import { testimonial } from './tags/testimonial.js';
import { timeline, timelineEntry } from './tags/timeline.js';
import { changelog, changelogRelease } from './tags/changelog.js';
import { embed } from './tags/embed.js';
import { breadcrumb } from './tags/breadcrumb.js';
import { compare } from './tags/compare.js';
import { recipe } from './tags/recipe.js';
import { howto } from './tags/howto.js';
import { event } from './tags/event.js';
import { cast, castMember } from './tags/cast.js';
import { organization } from './tags/organization.js';
import { datatable } from './tags/datatable.js';
import { api } from './tags/api.js';
import { diff } from './tags/diff.js';
import { chart } from './tags/chart.js';
import { diagram } from './tags/diagram.js';
import { sidenote } from './tags/sidenote.js';
import { conversation, conversationMessage } from './tags/conversation.js';
import { reveal, revealStep } from './tags/reveal.js';
import { bento, bentoCell } from './tags/bento.js';
import { storyboard, storyboardPanel } from './tags/storyboard.js';
import { annotate, annotateNote } from './tags/annotate.js';
import { form, formField } from './tags/form.js';
import { comparison, comparisonColumn, comparisonRow } from './tags/comparison.js';
import { map, mapPin } from './tags/map.js';
import { preview } from './tags/preview.js';
import { sandbox } from './tags/sandbox.js';
import { symbol, symbolGroup, symbolMember } from './tags/symbol.js';
import { swatch } from './tags/swatch.js';
import { palette } from './tags/palette.js';
import { typography } from './tags/typography.js';
import { spacing } from './tags/spacing.js';
import { designContext } from './tags/design-context.js';
import { icon } from './tags/icon.js';
import Markdoc from '@markdoc/markdoc';

import { schema } from './registry.js';
import { defineRune, runeTagMap } from './rune.js';

export * from './interfaces.js';
export { Rune, defineRune, runeTagMap } from './rune.js';
export { RenderableNodeCursor } from './lib/renderable.js';
export { schema } from './registry.js';
export { createSchema } from './lib/index.js';
export { Model } from './lib/model.js';
export { extractHeadings } from './util.js';
export type { HeadingInfo } from './util.js';
export { extractSeo, buildSeoTypeMap, textContent } from './seo.js';
export type { PageSeo, OgMeta } from './seo.js';
export { serialize, serializeTree } from './serialize.js';
export { RUNE_EXAMPLES } from './examples.js';
export { loadRunePackage, mergePackages } from './packages.js';
export type { LoadedPackage, MergedPackageResult } from './packages.js';

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
  cta: defineRune({
    name: 'cta',
    aliases: ['call-to-action'],
    schema: cta,
    description: 'Call-to-action section with headline, actions, and optional showcase',
    reinterprets: { heading: 'section headline', paragraph: 'blurb', list: 'action items', fence: 'command' },
    type: schema.CallToAction,
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
  feature: defineRune({
    name: 'feature',
    schema: feature,
    description: 'Feature showcase with definition list of items',
    reinterprets: { heading: 'section headline', paragraph: 'description', list: 'feature definitions', image: 'feature icon' },
    type: schema.Feature,
  }),
  definition: defineRune({
    name: 'definition',
    schema: definition,
    description: 'Individual feature definition with icon, name, and description',
    reinterprets: { heading: 'feature name', paragraph: 'feature description', image: 'feature icon' },
    type: schema.FeatureDefinition,
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
  step: defineRune({
    name: 'step',
    schema: step,
    description: 'Individual step within a steps sequence',
    type: schema.Step,
  }),
  steps: defineRune({
    name: 'steps',
    schema: steps,
    description: 'Sequential step-by-step instructions',
    reinterprets: { heading: 'step name', paragraph: 'step content' },
    type: schema.Steps,
  }),
  pricing: defineRune({
    name: 'pricing',
    schema: pricing,
    description: 'Pricing table with tier comparison',
    reinterprets: { heading: 'section headline', paragraph: 'section description' },
    seoType: 'Product',
    type: schema.Pricing,
  }),
  tier: defineRune({
    name: 'tier',
    schema: tier,
    description: 'Individual pricing tier with name, price, and features',
    seoType: 'Offer',
    type: schema.Tier,
  }),
  'music-playlist': defineRune({
    name: 'music-playlist',
    schema: musicPlaylist,
    description: 'Music playlist with track listing',
    reinterprets: { heading: 'playlist name', list: 'track listing' },
    seoType: 'MusicPlaylist',
    type: schema.MusicPlaylist,
  }),
  'music-recording': defineRune({
    name: 'music-recording',
    schema: musicRecording,
    description: 'Individual music track metadata',
    seoType: 'MusicRecording',
    type: schema.MusicRecording,
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
  hero: defineRune({
    name: 'hero',
    schema: hero,
    description: 'Full-width introductory section for landing pages with title, subtitle, and call-to-action',
    reinterprets: { heading: 'hero title', paragraph: 'subtitle/tagline', list: 'action buttons', image: 'hero image' },
    type: schema.Hero,
  }),
  testimonial: defineRune({
    name: 'testimonial',
    aliases: ['review'],
    schema: testimonial,
    description: 'Customer testimonial or review with quote, author attribution, and optional rating',
    reinterprets: { blockquote: 'testimonial quote', strong: 'author name', paragraph: 'author role', image: 'avatar' },
    seoType: 'Review',
    type: schema.Testimonial,
  }),
  timeline: defineRune({
    name: 'timeline',
    schema: timeline,
    description: 'Chronological event display where headings become dated milestones',
    reinterprets: { heading: 'date and milestone label', paragraph: 'event description' },
    seoType: 'ItemList',
    type: schema.Timeline,
  }),
  'timeline-entry': defineRune({
    name: 'timeline-entry',
    schema: timelineEntry,
    description: 'Individual timeline entry with date and label',
    type: schema.TimelineEntry,
  }),
  changelog: defineRune({
    name: 'changelog',
    schema: changelog,
    description: 'Version history where headings become releases with categorized changes',
    reinterprets: { heading: 'version number and date', list: 'categorized changes', strong: 'change category' },
    type: schema.Changelog,
  }),
  'changelog-release': defineRune({
    name: 'changelog-release',
    schema: changelogRelease,
    description: 'Individual changelog release with version and date',
    type: schema.ChangelogRelease,
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
  compare: defineRune({
    name: 'compare',
    schema: compare,
    description: 'Side-by-side code comparison with labeled panels',
    reinterprets: { fence: 'comparison panel' },
    type: schema.Compare,
  }),
  recipe: defineRune({
    name: 'recipe',
    schema: recipe,
    description: 'Recipe with ingredients, steps, and chef tips. Lists become ingredients, ordered lists become steps, blockquotes become tips.',
    reinterprets: { list: 'ingredients', 'ordered list': 'steps', blockquote: 'chef tips', image: 'recipe photo', heading: 'recipe name' },
    seoType: 'Recipe',
    type: schema.Recipe,
  }),
  howto: defineRune({
    name: 'howto',
    aliases: ['how-to'],
    schema: howto,
    description: 'Step-by-step how-to guide with tools/materials list and instructions',
    reinterprets: { 'ordered list': 'steps', list: 'tools/materials', heading: 'title' },
    seoType: 'HowTo',
    type: schema.HowTo,
  }),
  event: defineRune({
    name: 'event',
    schema: event,
    description: 'Event information with date, location, and agenda',
    reinterprets: { heading: 'event name', list: 'speakers/agenda', blockquote: 'venue description', link: 'registration URL' },
    seoType: 'Event',
    type: schema.Event,
  }),
  cast: defineRune({
    name: 'cast',
    aliases: ['team'],
    schema: cast,
    description: 'People directory for team pages, cast lists, or speaker lineups. List items with "Name - Role" pattern become entries.',
    reinterprets: { list: 'people entries (Name - Role)', image: 'avatar/headshot', link: 'profile URL' },
    seoType: 'Person',
    type: schema.Cast,
  }),
  'cast-member': defineRune({
    name: 'cast-member',
    schema: castMember,
    description: 'Individual cast/team member with name and role',
    type: schema.CastMember,
  }),
  organization: defineRune({
    name: 'organization',
    aliases: ['business'],
    schema: organization,
    description: 'Structured business/organization information with contact details, hours, and location',
    reinterprets: { heading: 'organization name', image: 'logo', link: 'website/social profiles' },
    seoType: 'Organization',
    type: schema.Organization,
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
  api: defineRune({
    name: 'api',
    aliases: ['endpoint'],
    schema: api,
    description: 'API endpoint documentation with method, path, parameters, and request/response examples',
    reinterprets: { heading: 'endpoint title', fence: 'request/response examples', table: 'parameter list', blockquote: 'notes/warnings' },
    type: schema.Api,
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
  bento: defineRune({
    name: 'bento',
    schema: bento,
    description: 'Magazine-style bento grid where heading levels determine cell size',
    reinterprets: { heading: 'cell title (level determines size)', paragraph: 'cell content', image: 'cell background' },
    type: schema.Bento,
  }),
  'bento-cell': defineRune({
    name: 'bento-cell',
    schema: bentoCell,
    description: 'Individual cell within a bento grid',
    type: schema.BentoCell,
  }),
  storyboard: defineRune({
    name: 'storyboard',
    aliases: ['comic'],
    schema: storyboard,
    description: 'Comic/storyboard layout where images become panels and paragraphs become captions',
    reinterprets: { image: 'panel visual', paragraph: 'caption/dialogue' },
    type: schema.Storyboard,
  }),
  'storyboard-panel': defineRune({
    name: 'storyboard-panel',
    schema: storyboardPanel,
    description: 'Individual panel within a storyboard',
    type: schema.StoryboardPanel,
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
  comparison: defineRune({
    name: 'comparison',
    aliases: ['versus', 'vs'],
    schema: comparison,
    description: 'Product/feature comparison matrix where headings become columns and bold labels align rows across columns',
    reinterprets: { heading: 'column header (thing being compared)', list: 'feature rows', strong: 'row alignment label', 's': 'negative indicator', blockquote: 'callout badge' },
    type: schema.Comparison,
  }),
  'comparison-column': defineRune({
    name: 'comparison-column',
    schema: comparisonColumn,
    description: 'Individual column within a comparison matrix',
    type: schema.ComparisonColumn,
  }),
  'comparison-row': defineRune({
    name: 'comparison-row',
    schema: comparisonRow,
    description: 'Individual row/cell within a comparison column',
    type: schema.ComparisonRow,
  }),
  map: defineRune({
    name: 'map',
    schema: map,
    description: 'Interactive map visualization from Markdown lists of locations with pins, routes, and grouped layers',
    reinterprets: { list: 'location pins or route waypoints', heading: 'pin group label', strong: 'pin name', em: 'pin description', link: 'pin click URL' },
    seoType: 'Place',
    type: schema.Map,
  }),
  'map-pin': defineRune({
    name: 'map-pin',
    schema: mapPin,
    description: 'Individual map pin with location data',
    type: schema.MapPin,
  }),
  preview: defineRune({
    name: 'preview',
    aliases: ['showcase'],
    schema: preview,
    description: 'Component showcase with theme toggle and adjustable width for documentation and design systems',
    reinterprets: {},
    type: schema.Preview,
  }),
  sandbox: defineRune({
    name: 'sandbox',
    schema: sandbox,
    description: 'Isolated HTML/CSS/JS rendering in an iframe with optional framework loading',
    reinterprets: {},
    type: schema.Sandbox,
  }),
  symbol: defineRune({
    name: 'symbol',
    schema: symbol,
    description: 'Code construct documentation for functions, classes, interfaces, enums, and type aliases',
    reinterprets: { heading: 'construct name or member group', fence: 'type signature', list: 'parameter definitions', blockquote: 'returns/throws/deprecation' },
    seoType: 'TechArticle',
    type: schema.Symbol,
  }),
  'symbol-group': defineRune({
    name: 'symbol-group',
    schema: symbolGroup,
    description: 'Member group within a class/interface symbol',
    type: schema.SymbolGroup,
  }),
  'symbol-member': defineRune({
    name: 'symbol-member',
    schema: symbolMember,
    description: 'Individual member within a symbol group',
    type: schema.SymbolMember,
  }),
  swatch: defineRune({
    name: 'swatch',
    schema: swatch,
    description: 'Inline color chip with colored dot and label for referencing colors in prose',
    reinterprets: {},
    type: schema.Swatch,
  }),
  palette: defineRune({
    name: 'palette',
    schema: palette,
    description: 'Visual color palette displaying swatches with names, values, and optional WCAG contrast/accessibility info',
    reinterprets: { list: 'color entries (name: #value)', heading: 'color group title' },
    type: schema.Palette,
  }),
  typography: defineRune({
    name: 'typography',
    schema: typography,
    description: 'Font specimen display showing typefaces at multiple sizes and weights with sample text',
    reinterprets: { list: 'font entries (role: Family Name (weights))' },
    type: schema.Typography,
  }),
  spacing: defineRune({
    name: 'spacing',
    schema: spacing,
    description: 'Visual display of spacing scale, border radii, and shadow tokens as proportional shapes',
    reinterprets: { heading: 'section type (Spacing, Radius, Shadows)', list: 'token entries (name: value)' },
    type: schema.Spacing,
  }),
  'design-context': defineRune({
    name: 'design-context',
    schema: designContext,
    description: 'Unified design token card composing palette, typography, and spacing runes with automatic sandbox injection',
    reinterprets: {},
    type: schema.DesignContext,
  }),
  icon: defineRune({
    name: 'icon',
    schema: icon,
    description: 'Inline icon resolved by name from the theme icon registry. Self-closing.',
    reinterprets: {},
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
