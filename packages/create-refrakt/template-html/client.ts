// Client runtime entry. Enables interactive runes (tabs, accordion, drawer,
// search) and layout chrome (the theme-toggle button) in the otherwise-static
// HTML output. `build.ts` bundles this to `build/client.js` with esbuild and
// loads it on every page via `renderFullPage`'s `scripts` option.
import { initPage } from '@refrakt-md/html/client';

initPage();
