import { useSchema } from '@refrakt-md/types';
import { Swatch, SwatchComponent } from './schema/swatch.js';
import { Palette, PaletteComponent } from './schema/palette.js';
import { Typography, TypographyComponent } from './schema/typography.js';
import { Spacing, SpacingComponent } from './schema/spacing.js';
import { DesignContext, DesignContextComponent } from './schema/design-context.js';
import { Preview, PreviewComponent } from './schema/preview.js';

export const schema = {
  Swatch: useSchema(Swatch).defineType<SwatchComponent>('Swatch'),
  Palette: useSchema(Palette).defineType<PaletteComponent>('Palette'),
  Typography: useSchema(Typography).defineType<TypographyComponent>('Typography'),
  Spacing: useSchema(Spacing).defineType<SpacingComponent>('Spacing'),
  DesignContext: useSchema(DesignContext).defineType<DesignContextComponent>('DesignContext'),
  Preview: useSchema(Preview).defineType<PreviewComponent>('Preview'),
};
