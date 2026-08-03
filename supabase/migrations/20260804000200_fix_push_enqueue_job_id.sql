begin;

-- PL/pgSQL treats an unqualified `job_id` in these trigger queries as
-- ambiguous because notification_deliveries has a column with the same name.
-- Keep the trigger transaction-safe by using an unambiguous local variable.
create or replace function private.enqueue_join_request_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_job_id uuid;
  target_event public.events%rowtype;
  target_group public.groups%rowtype;
begin
  select * into target_group from public.groups where id = new.group_id;
  select * into target_event from public.events where id = target_group.event_id;

  insert into public.notification_jobs (
    notification_type, event_id, group_id, entity_id, dedupe_key, title, body, route
  ) values (
    'join_request_created', target_event.id, target_group.id, new.id,
    'join-request-created:' || new.id, left(target_group.name, 120),
    'New join request',
    '/events/' || target_event.id || '/groups/' || target_group.id || '/join-requests'
  ) on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning id into queued_job_id;

  insert into public.notification_deliveries (job_id, device_id, user_id)
  select queued_job_id, device.id, membership.user_id
  from public.group_memberships as membership
  join public.push_devices as device
    on device.user_id = membership.user_id and device.status = 'active'
  join public.notification_preferences as preference
    on preference.user_id = membership.user_id and preference.join_request_updates
  where membership.group_id = new.group_id and membership.status = 'active'
    and membership.role in ('organiser', 'super_organiser')
  on conflict (job_id, device_id) do nothing;
  return new;
end;
$$;

create or replace function private.enqueue_attendance_session_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_job_id uuid;
  target_event public.events%rowtype;
  target_group public.groups%rowtype;
  target_session public.attendance_sessions%rowtype;
  notification_group_id uuid;
  notification_route text;
begin
  select * into target_event from public.events where id = new.event_id;
  select * into target_session from public.attendance_sessions where id = new.session_id;
  notification_group_id := coalesce(new.group_id, target_session.category_group_id);
  select * into target_group from public.groups where id = notification_group_id;
  notification_route := case when target_session.scope_type = 'general'
    then '/events/' || new.event_id || '/attendance/general/' || new.session_id
    else '/events/' || new.event_id || '/groups/' || target_session.category_group_id
      || '/roll-calls/' || new.session_id end;

  insert into public.notification_jobs (
    notification_type, event_id, group_id, entity_id, dedupe_key, title, body, route
  ) values (
    'roll_call_started', new.event_id, notification_group_id, new.session_id,
    'attendance-session-started:' || new.session_id,
    left(target_event.name || case when target_group.id is null
      then '' else ' · ' || target_group.name end, 120),
    'Roll call has started',
    notification_route
  ) on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning id into queued_job_id;

  insert into public.notification_deliveries (job_id, device_id, user_id)
  select queued_job_id, device.id, new.user_id
  from public.push_devices as device
  left join public.notification_preferences as preference on preference.user_id = new.user_id
  where device.user_id = new.user_id and device.status = 'active'
    and coalesce(preference.roll_call_started, true)
    and exists (
      select 1 from public.event_members as membership
      where membership.id = new.event_member_id and membership.status = 'active'
    )
  on conflict (job_id, device_id) do nothing;
  return new;
end;
$$;

commit;
