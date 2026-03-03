import { ComponentType, Command, LinkItem, PageSection, PageSectionProperties } from "@refrakt-md/types";

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
    actions: 'div',
    body: 'div',
  }
}
