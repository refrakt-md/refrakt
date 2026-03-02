import { useSchema, Command, CommandComponent, LinkItem, LinkItemComponent } from '@refrakt-md/types';
import { Hero, HeroComponent } from './schema/hero.js';
import { CallToAction, CallToActionComponent } from './schema/cta.js';
import { Feature, FeatureComponent, FeatureDefinition, FeatureDefinitionComponent } from './schema/feature.js';
import { Pricing, PricingComponent, Tier, TierComponent } from './schema/pricing.js';
import { Steps, StepsComponent, Step, StepComponent } from './schema/steps.js';
import { Bento, BentoComponent, BentoCell, BentoCellComponent } from './schema/bento.js';
import { Comparison, ComparisonComponent, ComparisonColumn, ComparisonColumnComponent, ComparisonRow, ComparisonRowComponent } from './schema/comparison.js';
import { Testimonial, TestimonialComponent } from './schema/testimonial.js';

export const schema = {
  Hero: useSchema(Hero).defineType<HeroComponent>('Hero'),
  CallToAction: useSchema(CallToAction).defineType<CallToActionComponent>('CallToAction'),
  Command: useSchema(Command).defineType<CommandComponent>('Command'),
  LinkItem: useSchema(LinkItem).defineType<LinkItemComponent>('LinkItem'),
  Feature: useSchema(Feature).defineType<FeatureComponent>('Feature'),
  FeatureDefinition: useSchema(FeatureDefinition).defineType<FeatureDefinitionComponent>('FeatureDefinition'),
  Pricing: useSchema(Pricing).defineType<PricingComponent>('Pricing'),
  Tier: useSchema(Tier).defineType<TierComponent>('Tier'),
  FeaturedTier: useSchema(Tier).defineType<TierComponent>('FeaturedTier'),
  Steps: useSchema(Steps).defineType<StepsComponent>('Steps'),
  Step: useSchema(Step).defineType<StepComponent>('Step'),
  Bento: useSchema(Bento).defineType<BentoComponent>('Bento'),
  BentoCell: useSchema(BentoCell).defineType<BentoCellComponent>('BentoCell'),
  Comparison: useSchema(Comparison).defineType<ComparisonComponent>('Comparison'),
  ComparisonColumn: useSchema(ComparisonColumn).defineType<ComparisonColumnComponent>('ComparisonColumn'),
  ComparisonRow: useSchema(ComparisonRow).defineType<ComparisonRowComponent>('ComparisonRow'),
  Testimonial: useSchema(Testimonial).defineType<TestimonialComponent>('Testimonial'),
};
