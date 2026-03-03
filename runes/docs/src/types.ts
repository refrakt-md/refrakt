import { useSchema } from '@refrakt-md/types';
import { Api, ApiComponent } from './schema/api.js';
import { Changelog, ChangelogComponent, ChangelogRelease, ChangelogReleaseComponent } from './schema/changelog.js';
import { Symbol, SymbolComponent, SymbolGroup, SymbolGroupComponent, SymbolMember, SymbolMemberComponent } from './schema/symbol.js';

export const schema = {
  Api: useSchema(Api).defineType<ApiComponent>('Api'),
  Changelog: useSchema(Changelog).defineType<ChangelogComponent>('Changelog'),
  ChangelogRelease: useSchema(ChangelogRelease).defineType<ChangelogReleaseComponent>('ChangelogRelease'),
  Symbol: useSchema(Symbol).defineType<SymbolComponent>('Symbol'),
  SymbolGroup: useSchema(SymbolGroup).defineType<SymbolGroupComponent>('SymbolGroup'),
  SymbolMember: useSchema(SymbolMember).defineType<SymbolMemberComponent>('SymbolMember'),
};
