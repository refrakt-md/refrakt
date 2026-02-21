import { ComponentType } from "../interfaces.js";
import { Tab, TabPanel } from "./tabs.js";

export class CodeGroup {
  title: string = '';
  tab: Tab[] = [];
  panel: TabPanel[] = [];
}

export interface CodeGroupComponent extends ComponentType<CodeGroup> {
  tag: 'section',
  properties: {
    title: 'meta',
    tab: 'li',
    panel: 'li',
  },
  refs: {
    tabs: 'ul',
    panels: 'ul',
  },
}
