import { ComponentType } from "../interfaces.js";
import { TabGroup } from "./tabs.js";

export class Editor {
  tabs: TabGroup[] = [];
}

export interface EditorComponent extends ComponentType<Editor> {
  tag: 'section',
  properties: {
    tabs: 'section',
  },
  refs: {
    area: 'div',
  },
}
