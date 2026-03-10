import {useSchema} from '@refrakt-md/types';
import {Api} from './schema/api.js';
import {Changelog, ChangelogRelease} from './schema/changelog.js';
import {Symbol, SymbolGroup, SymbolMember} from './schema/symbol.js';

export const schema = {
  Api: useSchema(Api).defineType('Api'),
  Changelog: useSchema(Changelog).defineType('Changelog'),
  ChangelogRelease: useSchema(ChangelogRelease).defineType('ChangelogRelease'),
  Symbol: useSchema(Symbol).defineType('Symbol', {}, 'TechArticle'),
  SymbolGroup: useSchema(SymbolGroup).defineType('SymbolGroup'),
  SymbolMember: useSchema(SymbolMember).defineType('SymbolMember'),
};
