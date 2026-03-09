import {useSchema} from '@refrakt-md/types';
import {Timeline, TimelineEntry} from './schema/timeline.js';
import {Cast, CastMember} from './schema/cast.js';
import {Organization} from './schema/organization.js';

export const schema = {
  Timeline: useSchema(Timeline).defineType('Timeline', {}, 'ItemList'),
  TimelineEntry: useSchema(TimelineEntry).defineType('TimelineEntry', {}, 'ListItem'),
  Cast: useSchema(Cast).defineType('Cast'),
  CastMember: useSchema(CastMember).defineType('CastMember', {}, 'Person'),
  Organization: useSchema(Organization).defineType('Organization', {}, 'Organization'),
};
