import type { RunePackage } from '@refrakt-md/types';
import { swatch } from './tags/swatch.js';
import { palette } from './tags/palette.js';
import { typography } from './tags/typography.js';
import { spacing } from './tags/spacing.js';
import { preview } from './tags/preview.js';
import { designContext } from './tags/design-context.js';
import { config } from './config.js';

export const design: RunePackage = {
  name: 'design',
  displayName: 'Design',
  version: '0.6.0',
  runes: {
    'swatch': {
      transform: swatch,
      description: 'Inline color chip with colored dot and label for referencing colors in prose',
      reinterprets: {},
    },
    'palette': {
      transform: palette,
      description: 'Visual color palette displaying swatches with names, values, and optional WCAG contrast/accessibility info',
      reinterprets: { list: 'color entries (name: #value)', heading: 'color group title' },
    },
    'typography': {
      transform: typography,
      description: 'Font specimen display showing typefaces at multiple sizes and weights with sample text',
      reinterprets: { list: 'font entries (role: Family Name (weights))' },
    },
    'spacing': {
      transform: spacing,
      description: 'Visual display of spacing scale, border radii, and shadow tokens as proportional shapes',
      reinterprets: { heading: 'section type (Spacing, Radius, Shadows)', list: 'token entries (name: value)' },
    },
    'preview': {
      transform: preview,
      aliases: ['showcase'],
      description: 'Component showcase with theme toggle and adjustable width for documentation and design systems',
      reinterprets: {},
    },
    'design-context': {
      transform: designContext,
      description: 'Unified design token card composing palette, typography, and spacing runes with automatic sandbox injection',
      reinterprets: {},
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default design;
