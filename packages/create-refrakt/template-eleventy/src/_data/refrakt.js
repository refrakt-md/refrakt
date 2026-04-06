import { createDataFile } from '@refrakt-md/eleventy';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';

export default createDataFile({ theme: { manifest, layouts } });
