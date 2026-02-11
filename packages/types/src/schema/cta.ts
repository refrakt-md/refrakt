import { ComponentType } from "../interfaces.js";
import { Command, LinkItem } from "./common.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class CallToAction extends PageSection {
  action: (LinkItem | Command)[] = [];
}

export interface CallToActionProperties extends PageSectionProperties {
  action: 'li' | 'div',
}

export interface CallToActionComponent extends ComponentType<CallToAction> {
  tag: 'section',
  properties: CallToActionProperties,
  refs: {
    layout: 'div',
    body: 'section',
    actions: 'section',
    showcase: 'div',
  }
}
