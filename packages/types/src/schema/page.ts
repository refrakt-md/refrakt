export class PageSection {
  eyebrow: string | undefined = undefined;
  headline: string | undefined = undefined;
  blurb: string | undefined = undefined;
}

export class Page {
  name: string = '';
  description: string = '';
  contentSection: PageSection[] = [];
}
