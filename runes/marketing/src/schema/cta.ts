import { Command, LinkItem, PageSection } from "@refrakt-md/types";

export class CallToAction extends PageSection {
  action: (LinkItem | Command)[] = [];
}
