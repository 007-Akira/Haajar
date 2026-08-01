begin;

create or replace function public.list_event_member_directory(
  target_event_id uuid
)
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  phone text,
  event_role text,
  active_internal_group_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_active_event_member(target_event_id, auth.uid()) then
    raise exception 'Active event membership required' using errcode = '42501';
  end if;

  return query
  select
    event_member.id,
    event_member.user_id,
    profile.full_name,
    profile.phone,
    event_member.role,
    count(group_membership.id)::bigint
  from public.event_members as event_member
  join public.profiles as profile
    on profile.id = event_member.user_id
  left join public.group_memberships as group_membership
    on group_membership.user_id = event_member.user_id
    and group_membership.status = 'active'
    and exists (
      select 1
      from public.groups as event_group
      where event_group.id = group_membership.group_id
        and event_group.event_id = target_event_id
        and event_group.status = 'active'
    )
  where event_member.event_id = target_event_id
    and event_member.status = 'active'
  group by
    event_member.id,
    event_member.user_id,
    profile.full_name,
    profile.phone,
    event_member.role,
    event_member.created_at
  order by event_member.created_at, event_member.id;
end;
$$;

revoke all on function public.list_event_member_directory(uuid) from public;
revoke all on function public.list_event_member_directory(uuid) from anon;
grant execute on function public.list_event_member_directory(uuid) to authenticated;

commit;
