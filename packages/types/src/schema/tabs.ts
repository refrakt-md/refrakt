import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class TabGroup extends PageSection {
  tab: Tab[] = [];
  panel: TabPanel[] = [];
}

export interface TabGroupProperties extends PageSectionProperties {
  tab: 'li',
  panel: 'li',
}

export interface TabGroupComponent extends ComponentType<TabGroup> {
  tag: 'section',
  properties: TabGroupProperties,
  refs: {
    tabs: 'ul',
    panels: 'ul',
  }
}

export class TabPanel {}

export interface TabPanelComponent extends ComponentType<TabPanel> {
  tag: 'li',
  properties: {},
}

export class Tab {
  name: string = '';
  image: string | undefined = undefined;
}

export interface TabComponent extends ComponentType<Tab> {
  tag: 'li',
  properties: {
    name: 'span',
    image: 'img' | 'svg',
  }
}
