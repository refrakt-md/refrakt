import {useSchema} from '@refrakt-md/types';
import {Swatch} from './schema/swatch.js';
import {Palette} from './schema/palette.js';
import {Typography} from './schema/typography.js';
import {Spacing} from './schema/spacing.js';
import {DesignContext} from './schema/design-context.js';
import {Preview} from './schema/preview.js';

export const schema = {
  Swatch: useSchema(Swatch).defineType('Swatch'),
  Palette: useSchema(Palette).defineType('Palette'),
  Typography: useSchema(Typography).defineType('Typography'),
  Spacing: useSchema(Spacing).defineType('Spacing'),
  DesignContext: useSchema(DesignContext).defineType('DesignContext'),
  Preview: useSchema(Preview).defineType('Preview'),
};
