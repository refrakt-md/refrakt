import type { RunePackage } from '@refrakt-md/types';
import { swatch } from './tags/swatch.js';
import { palette } from './tags/palette.js';
import { typography } from './tags/typography.js';
import { spacing } from './tags/spacing.js';
import { preview } from './tags/preview.js';
import { designContext } from './tags/design-context.js';
import { mockup } from './tags/mockup.js';
import { config } from './config.js';
import { designPipelineHooks } from './pipeline.js';

export const design: RunePackage = {
  name: 'design',
  displayName: 'Design',
  version: '0.8.1',
  runes: {
    'swatch': {
      transform: swatch,
      description: 'Inline color chip with colored dot and label for referencing colors in prose',
      reinterprets: {},
      fixture: `{% swatch color="#2563EB" label="Ultramarine" /%}`,
    },
    'palette': {
      transform: palette,
      description: 'Visual color palette displaying swatches with names, values, and optional WCAG contrast/accessibility info',
      reinterprets: { list: 'color entries (name: #value)', heading: 'color group title' },
      fixture: `{% palette title="Brand Colors" showContrast="true" showA11y="true" %}
## Primary
- Blue: #2563EB
- Indigo: #4F46E5
- Purple: #7C3AED

## Neutrals
- Gray: #F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB, #9CA3AF, #6B7280, #4B5563, #374151, #1F2937, #111827
{% /palette %}`,
    },
    'typography': {
      transform: typography,
      description: 'Font specimen display showing typefaces at multiple sizes and weights with sample text',
      reinterprets: { list: 'font entries (role: Family Name (weights))' },
      fixture: `{% typography title="Font System" sample="The quick brown fox jumps over the lazy dog" %}
- heading: Inter (600, 700)
- body: Inter (400, 500)
- mono: JetBrains Mono (400, 500)
{% /typography %}`,
    },
    'spacing': {
      transform: spacing,
      description: 'Visual display of spacing scale, border radii, and shadow tokens as proportional shapes',
      reinterprets: { heading: 'section type (Spacing, Radius, Shadows)', list: 'token entries (name: value)' },
      fixture: `{% spacing title="Design Tokens" %}
## Spacing
- unit: 4px
- scale: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32

## Radius
- sm: 4px
- md: 8px
- lg: 12px
- full: 9999px

## Shadows
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.1)
- lg: 0 10px 15px rgba(0,0,0,0.1)
{% /spacing %}`,
    },
    'preview': {
      transform: preview,
      description: 'Component preview with theme toggle and adjustable width for documentation and design systems',
      reinterprets: {},
      fixture: `{% preview title="Button Variants" theme="auto" responsive="mobile,tablet,desktop" %}
\`\`\`html
<button class="rf-btn rf-btn--primary">Primary</button>
<button class="rf-btn rf-btn--secondary">Secondary</button>
\`\`\`

<button class="rf-btn rf-btn--primary">Primary</button>
<button class="rf-btn rf-btn--secondary">Secondary</button>
{% /preview %}`,
    },
    'mockup': {
      transform: mockup,
      description: 'Device frame chrome (phone, tablet, browser, laptop) wrapping content for realistic device context',
      reinterprets: {},
      fixture: `{% mockup device="browser" url="https://example.com" %}

A landing page with a hero section and call to action.

{% /mockup %}`,
    },
    'design-context': {
      transform: designContext,
      description: 'Unified design token card composing palette, typography, and spacing runes with automatic sandbox injection',
      reinterprets: {},
      fixture: `{% design-context title="Brand Tokens" %}

{% typography %}
- heading: Inter (400, 600, 700)
- body: Source Sans Pro (400, 600)
- mono: Fira Code (400)
{% /typography %}

{% palette %}
## Brand
- Primary: #2563EB
- Secondary: #7C3AED
- Accent: #F59E0B
{% /palette %}

{% spacing %}
## Spacing
- unit: 4px
- scale: 4, 8, 12, 16, 24, 32, 48, 64
{% /spacing %}

{% /design-context %}`,
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
  pipeline: designPipelineHooks,
};

export default design;
