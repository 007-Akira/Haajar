begin;

create unique index groups_unique_active_category_name_per_event
  on public.groups(event_id,lower(btrim(name)))
  where group_kind='category' and status='active';

create unique index groups_unique_active_operational_name_per_category
  on public.groups(parent_group_id,lower(btrim(name)))
  where group_kind='operational' and parent_group_id is not null and status='active';

commit;
