import { createThemeHandle } from '@refrakt-md/sveltekit/hooks';
import { getSite } from '$lib/content';

// No-flash theme SSR (pre-paint script + <html> tint attrs + color-scheme
// meta) is provided by the adapter (SPEC-073); the route cascade comes from
// the loaded Site.
export const handle = createThemeHandle(getSite);
