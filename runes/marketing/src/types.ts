import {useSchema} from '@refrakt-md/types';
import {Hero} from './schema/hero.js';
import {CallToAction} from './schema/cta.js';
import {Feature, FeatureDefinition} from './schema/feature.js';
import {Pricing, Tier} from './schema/pricing.js';
import {Steps, Step} from './schema/steps.js';
import {Bento, BentoCell} from './schema/bento.js';
import {Comparison, ComparisonColumn, ComparisonRow} from './schema/comparison.js';
import {Testimonial} from './schema/testimonial.js';

export const schema = {
  Hero: useSchema(Hero).defineType('Hero'),
  CallToAction: useSchema(CallToAction).defineType('CallToAction'),
  Feature: useSchema(Feature).defineType('Feature'),
  FeatureDefinition: useSchema(FeatureDefinition).defineType('FeatureDefinition'),
  Pricing: useSchema(Pricing).defineType('Pricing', {}, 'Product'),
  Tier: useSchema(Tier).defineType('Tier', {}, 'Offer'),
  FeaturedTier: useSchema(Tier).defineType('FeaturedTier', {}, 'Offer'),
  Steps: useSchema(Steps).defineType('Steps'),
  Step: useSchema(Step).defineType('Step'),
  Bento: useSchema(Bento).defineType('Bento'),
  BentoCell: useSchema(BentoCell).defineType('BentoCell'),
  Comparison: useSchema(Comparison).defineType('Comparison'),
  ComparisonColumn: useSchema(ComparisonColumn).defineType('ComparisonColumn'),
  ComparisonRow: useSchema(ComparisonRow).defineType('ComparisonRow'),
  Testimonial: useSchema(Testimonial).defineType('Testimonial', {}, 'Review'),
};
