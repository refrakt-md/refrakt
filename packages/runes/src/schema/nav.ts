export class NavItem {
  slug: string = '';
  children: NavItem[] = [];
}

export class NavGroup {
  title: string = '';
  item: NavItem[] = [];
}

export class Nav {
  group: NavGroup[] = [];
  item: NavItem[] = [];
}
