import { heading, paragraph, fence, list, item, em, strong, text, link, hardbreak, image } from './nodes.js';

export { Page } from './documents/page.js';
import { menu } from './documents/menu.js';
import { DocPage } from './documents/doc.js';
import { summary, topic } from './documents/summary.js';
import { footer } from './documents/footer.js';

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
import Markdoc from '@markdoc/markdoc';

export * from './interfaces.js';
export { TagWrapper } from './lib/types.js';
export { RenderableNodeCursor } from './lib/renderable.js';
export { schema } from './registry.js';
export { createSchema } from './lib/index.js';
export { Model } from './lib/model.js';

export const documents = {
  menu,
  footer,
  doc: new DocPage(),
  summary,
}

export const tags = {
  cta,
  'call-to-action': cta,
  codegroup,
  error,
  feature,
  definition,
  grid,
  hint,
  tab,
  tabs,
  step,
  steps,
  pricing,
  tier,
  topic,
  'music-playlist': musicPlaylist,
  'music-recording': musicRecording,
  ...Markdoc.tags
}

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
