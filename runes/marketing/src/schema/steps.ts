import { PageSection } from "@refrakt-md/types";

export class Steps extends PageSection {
  step: Step[] = [];
}

export class Step {
  name: string = '';
}
