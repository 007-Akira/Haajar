begin;

create or replace function private.enqueue_attendance_session_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  job_id uuid;
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
  returning id into job_id;

  insert into public.notification_deliveries (job_id, device_id, user_id)
  select job_id, device.id, new.user_id
  from public.push_devices as device
  left join public.notification_preferences as preference on preference.user_id = new.user_id
  where device.user_id = new.user_id and device.status = 'active'
    and coalesce(preference.roll_call_started, true)
    and exists (select 1 from public.event_members as membership
      where membership.id = new.event_member_id and membership.status = 'active')
  on conflict (job_id, device_id) do nothing;
  return new;
end;
$$;

create or replace function public.claim_push_deliveries(batch_size integer default 100)
returns table (
  delivery_id uuid,
  expo_push_token text,
  notification_title text,
  notification_body text,
  notification_route text
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  encryption_key text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server execution required' using errcode = '42501';
  end if;
  select key.encryption_key into encryption_key
  from private.push_encryption_keys as key where singleton;

  return query
  with claimed as (
    select delivery.id
    from public.notification_deliveries as delivery
    join public.push_devices as device on device.id = delivery.device_id
    join public.notification_jobs as job on job.id = delivery.job_id
    where delivery.status in ('pending', 'failed')
      and delivery.attempt_count < 5
      and device.status = 'active'
      and (
        (job.notification_type = 'roll_call_started' and exists (
          select 1
          from public.attendance_sessions as session
          join public.attendance_unit_roster as roster
            on roster.session_id = session.id and roster.user_id = delivery.user_id
          join public.event_members as event_membership
            on event_membership.id = roster.event_member_id
              and event_membership.status = 'active'
          where session.id = job.entity_id
            and (session.scope_type = 'general' or exists (
              select 1 from public.group_memberships as group_membership
              where group_membership.id = roster.group_membership_id
                and group_membership.status = 'active'
            ))
        ))
        or
        (job.notification_type = 'join_request_created' and exists (
          select 1 from public.group_memberships as manager
          where manager.group_id = job.group_id
            and manager.user_id = delivery.user_id
            and manager.status = 'active'
            and manager.role in ('organiser', 'super_organiser')
        ))
      )
    order by delivery.created_at
    for update of delivery skip locked
    limit greatest(1, least(batch_size, 100))
  ), updated as (
    update public.notification_deliveries as delivery set
      status = 'processing',
      attempt_count = attempt_count + 1,
      last_attempted_at = now()
    from claimed where delivery.id = claimed.id returning delivery.*
  )
  select updated.id,
    extensions.pgp_sym_decrypt(device.token_ciphertext, encryption_key),
    job.title,
    job.body,
    job.route
  from updated
  join public.push_devices as device on device.id = updated.device_id
  join public.notification_jobs as job on job.id = updated.job_id;
end;
$$;

revoke all on function private.enqueue_attendance_session_push()
  from public, anon, authenticated;
revoke all on function public.claim_push_deliveries(integer)
  from public, anon, authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;

commit;
