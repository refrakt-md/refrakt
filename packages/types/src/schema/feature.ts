import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class FeatureDefinition {
  name: string | undefined = undefined;
  description: string | undefined = undefined;
  image: string | undefined = undefined;
}

export interface FeatureDefinitionComponent extends ComponentType<FeatureDefinition> {
  tag: 'div',
  properties: {
    name: 'span',
    description: 'dd',
    image: 'img' | 'svg',
  }
}

export class Feature extends PageSection {
  featureItem: FeatureDefinition[] = [];
}

export interface FeatureProperties extends PageSectionProperties {
  featureItem: 'div',
  split: 'meta',
  mirror: 'meta',
}

export interface FeatureComponent extends ComponentType<Feature> {
  tag: 'section',
  properties: FeatureProperties,
  refs: {
    body: 'div',
    showcase: 'div',
  },
}
