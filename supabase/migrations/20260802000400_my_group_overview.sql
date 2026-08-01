begin;

create or replace function public.list_my_group_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  active_groups jsonb;
  requests jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'membership_id', membership.id,
      'group_id', group_record.id,
      'group_name', group_record.name,
      'group_status', group_record.status,
      'event_id', event_record.id,
      'event_name', event_record.name,
      'event_status', event_record.status,
      'role', membership.role,
      'member_count', (
        select count(*) from public.group_memberships as peer
        where peer.group_id = group_record.id and peer.status = 'active'
      ),
      'qr_available', exists (
        select 1 from public.qr_credentials as credential
        where credential.group_membership_id = membership.id
          and credential.status = 'active'
      )
    ) order by event_record.name, group_record.name
  ), '[]'::jsonb)
  into active_groups
  from public.group_memberships as membership
  join public.groups as group_record on group_record.id = membership.group_id
  join public.events as event_record on event_record.id = group_record.event_id
  where membership.user_id = caller_id and membership.status = 'active';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'request_id', request.id,
      'group_id', group_record.id,
      'group_name', group_record.name,
      'group_status', group_record.status,
      'event_id', event_record.id,
      'event_name', event_record.name,
      'event_status', event_record.status,
      'status', request.status,
      'submitted_at', request.submitted_at,
      'reviewed_at', request.reviewed_at,
      'rejection_reason', request.rejection_reason
    ) order by request.submitted_at desc
  ), '[]'::jsonb)
  into requests
  from public.join_requests as request
  join public.groups as group_record on group_record.id = request.group_id
  join public.events as event_record on event_record.id = group_record.event_id
  where request.user_id = caller_id
    and request.status in ('pending', 'accepted', 'rejected');

  return jsonb_build_object('active_groups', active_groups, 'requests', requests);
end;
$$;

revoke all on function public.list_my_group_overview() from public, anon, authenticated;
grant execute on function public.list_my_group_overview() to authenticated;

commit;
