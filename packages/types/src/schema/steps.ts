import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class Steps extends PageSection {
  step: Step[] = [];
}

export class Step {
  name: string = '';
}

export interface StepsProperties extends PageSectionProperties {
  step: 'li',
}

export interface StepsComponent extends ComponentType<Steps> {
  tag: 'section',
  properties: StepsProperties,
  refs: {}
}

export interface StepComponent extends ComponentType<Step> {
  tag: 'li',
  properties: {
    name: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  },
  refs: {}
}
