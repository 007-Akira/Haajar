begin;

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
  organiser_name text;
  notification_group_id uuid;
  scope_label text;
  notification_route text;
  notification_body text;
begin
  select * into target_event from public.events where id = new.event_id;
  select * into target_session from public.attendance_sessions where id = new.session_id;
  select nullif(btrim(profile.full_name), '') into organiser_name
  from public.profiles as profile where profile.id = target_session.started_by;

  if target_session.scope_type = 'general' then
    notification_group_id := null;
    scope_label := 'General';
    notification_route := '/events/' || new.event_id || '/attendance/general/' || new.session_id;
  else
    notification_group_id := target_session.category_group_id;
    select * into target_group from public.groups where id = notification_group_id;
    scope_label := coalesce(nullif(btrim(target_group.name), ''), 'Group');
    notification_route := case when target_group.group_kind = 'operational'
      then '/events/' || new.event_id || '/groups/' || target_group.id
      else '/events/' || new.event_id end;
  end if;

  notification_body := target_event.name || ' • ' || scope_label || E'\n' ||
    case when organiser_name is null then 'Started by an organiser'
      else 'Started by: ' || organiser_name end;

  insert into public.notification_jobs (
    notification_type, event_id, group_id, entity_id, dedupe_key, title, body, route
  ) values (
    'roll_call_started', new.event_id, notification_group_id, new.session_id,
    'attendance_started:' || new.session_id,
    'Roll call is active', left(notification_body, 240), notification_route
  ) on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning id into queued_job_id;

  insert into public.notification_deliveries (job_id, device_id, user_id)
  select queued_job_id, device.id, new.user_id
  from public.push_devices as device
  left join public.notification_preferences as preference on preference.user_id = new.user_id
  where device.user_id = new.user_id
    and device.status = 'active'
    and coalesce(preference.roll_call_started, true)
    and exists (
      select 1 from public.event_members as membership
      where membership.id = new.event_member_id and membership.status = 'active'
    )
  on conflict (job_id, device_id) do nothing;
  return new;
end;
$$;

revoke all on function private.enqueue_attendance_session_push()
  from public, anon, authenticated;

commit;
