import { ComponentType } from "../interfaces.js";
import { Topic } from "./docpage.js";

export class Footer {
  topic: Topic[] = [];
  copyright: string | undefined = undefined;
}

export interface FooterComponent extends ComponentType<Footer> {
  tag: 'footer',
  properties: {
    topic: 'div',
    copyright: 'p',
  },
  refs: {},
}
