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
import Markdoc from '@markdoc/markdoc';

import { schema } from './registry.js';
import { defineRune, runeTagMap } from './rune.js';

export * from './interfaces.js';
export { Rune, defineRune, runeTagMap } from './rune.js';
export { RenderableNodeCursor } from './lib/renderable.js';
export { schema } from './registry.js';
export { createSchema } from './lib/index.js';
export { Model } from './lib/model.js';

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
    description: 'Tabbed code editor with multiple code blocks',
    reinterprets: { fence: 'editor tab content', hr: 'section delimiter' },
    type: schema.Editor,
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
