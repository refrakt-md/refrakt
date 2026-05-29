import { createThemeHandle } from '@refrakt-md/sveltekit/hooks';
import { getSite } from 'virtual:refrakt/content';

// No-flash theme SSR — the pre-paint script, <html> tint attributes, and
// color-scheme meta — provided by the adapter. The route's tint cascade comes
// from the loaded Site. Compose with other handles via SvelteKit's sequence().
export const handle = createThemeHandle(getSite);
