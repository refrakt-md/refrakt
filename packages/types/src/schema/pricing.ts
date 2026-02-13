import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class Tier {
  name: string | undefined = undefined;
  description: string | undefined = undefined;
  price: string | undefined = undefined;
  currency: string | undefined = undefined;
  url: string | undefined = undefined;
}

export interface TierComponent extends ComponentType<Tier> {
  tag: 'li',
  properties: {
    name: 'h1',
    description: 'p',
    price: 'p',
    currency: 'meta',
    url: 'a',
  },
  refs: { body: 'div' }
}

export class Pricing extends PageSection {
  tier: Tier[] = [];
}

export interface PricingProperties extends PageSectionProperties {
  tier: 'li',
}

export interface PricingComponent extends ComponentType<Pricing> {
  tag: 'section',
  properties: PricingProperties,
  refs: { tiers: 'ul' }
}
