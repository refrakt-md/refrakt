import { PageSection } from "@refrakt-md/types";

export class FeatureDefinition {
  name: string | undefined = undefined;
  description: string | undefined = undefined;
  image: string | undefined = undefined;
}

export class Feature extends PageSection {
  featureItem: FeatureDefinition[] = [];
}
