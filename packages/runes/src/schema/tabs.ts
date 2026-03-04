import { PageSection } from "@refrakt-md/types";

export class TabGroup extends PageSection {
  tab: Tab[] = [];
  panel: TabPanel[] = [];
}

export class TabPanel {}

export class Tab {
  name: string = '';
  image: string | undefined = undefined;
}
