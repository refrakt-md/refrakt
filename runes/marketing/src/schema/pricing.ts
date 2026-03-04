import { PageSection } from "@refrakt-md/types";

export class Tier {
  name: string | undefined = undefined;
  description: string | undefined = undefined;
  price: string | undefined = undefined;
  currency: string | undefined = undefined;
  url: string | undefined = undefined;
}

export class Pricing extends PageSection {
  tier: Tier[] = [];
}
