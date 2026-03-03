import { useSchema } from '@refrakt-md/types';
import { Timeline, TimelineComponent, TimelineEntry, TimelineEntryComponent } from './schema/timeline.js';
import { Cast, CastComponent, CastMember, CastMemberComponent } from './schema/cast.js';
import { Organization, OrganizationComponent } from './schema/organization.js';

export const schema = {
  Timeline: useSchema(Timeline).defineType<TimelineComponent>('Timeline'),
  TimelineEntry: useSchema(TimelineEntry).defineType<TimelineEntryComponent>('TimelineEntry'),
  Cast: useSchema(Cast).defineType<CastComponent>('Cast'),
  CastMember: useSchema(CastMember).defineType<CastMemberComponent>('CastMember'),
  Organization: useSchema(Organization).defineType<OrganizationComponent>('Organization'),
};
