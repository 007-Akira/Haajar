begin;

create table private.push_encryption_keys (
  singleton boolean primary key default true check (singleton),
  encryption_key text not null check (length(encryption_key) = 64),
  created_at timestamptz not null default now()
);
revoke all on private.push_encryption_keys from public, anon, authenticated;
insert into private.push_encryption_keys (singleton, encryption_key)
values (true, encode(extensions.gen_random_bytes(32), 'hex'));

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_instance_id uuid not null,
  token_hash text not null check (length(token_hash) = 64),
  token_ciphertext bytea not null,
  platform text not null check (platform in ('android', 'ios')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_registered_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_instance_id),
  check ((status = 'active' and revoked_at is null) or status = 'revoked')
);
create index push_devices_active_user_idx on public.push_devices (user_id) where status = 'active';
create unique index push_devices_active_token_idx
  on public.push_devices (token_hash) where status = 'active';
create trigger push_devices_set_updated_at before update on public.push_devices
for each row execute function public.set_updated_at();

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  roll_call_started boolean not null default true,
  join_request_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null check (notification_type in ('roll_call_started', 'join_request_created')),
  event_id uuid not null references public.events(id) on delete restrict,
  group_id uuid not null references public.groups(id) on delete restrict,
  entity_id uuid not null,
  dedupe_key text not null unique,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 240),
  route text not null check (route like '/%'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'partial', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index notification_jobs_pending_idx on public.notification_jobs (created_at) where status = 'pending';

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_jobs(id) on delete restrict,
  device_id uuid not null references public.push_devices(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'invalid_token')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_ticket_id text,
  last_error_code text,
  last_attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, device_id)
);
create index notification_deliveries_pending_idx
  on public.notification_deliveries (created_at) where status in ('pending', 'failed');
create trigger notification_deliveries_set_updated_at before update on public.notification_deliveries
for each row execute function public.set_updated_at();

alter table public.push_devices enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.notification_deliveries enable row level security;

create policy notification_preferences_select_own on public.notification_preferences
for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_update_own on public.notification_preferences
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.push_devices, public.notification_preferences,
  public.notification_jobs, public.notification_deliveries from public, anon, authenticated;
grant select, update (roll_call_started, join_request_updates)
  on public.notification_preferences to authenticated;

create or replace function public.register_push_device(
  push_token text,
  device_platform text,
  target_app_instance_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  encryption_key text;
  normalized_token text := btrim(push_token);
  registered_device_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if target_app_instance_id is null or device_platform not in ('android', 'ios') then
    raise exception 'Valid device registration is required' using errcode = '22023';
  end if;
  if normalized_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' or length(normalized_token) > 200 then
    raise exception 'Invalid Expo push token' using errcode = '22023';
  end if;
  select key.encryption_key into encryption_key from private.push_encryption_keys as key where singleton;
  if encryption_key is null then raise exception 'Push encryption unavailable' using errcode = '55000'; end if;

  insert into public.notification_preferences (user_id) values (caller_id)
  on conflict (user_id) do nothing;

  update public.push_devices set status = 'revoked', revoked_at = now()
  where token_hash = encode(extensions.digest(normalized_token, 'sha256'), 'hex')
    and (user_id <> caller_id or app_instance_id <> target_app_instance_id)
    and status = 'active';

  insert into public.push_devices (
    user_id, app_instance_id, token_hash, token_ciphertext, platform,
    status, last_registered_at, revoked_at
  ) values (
    caller_id, target_app_instance_id,
    encode(extensions.digest(normalized_token, 'sha256'), 'hex'),
    extensions.pgp_sym_encrypt(normalized_token, encryption_key, 'cipher-algo=aes256'),
    device_platform, 'active', now(), null
  )
  on conflict (user_id, app_instance_id) do update set
    token_hash = excluded.token_hash,
    token_ciphertext = excluded.token_ciphertext,
    platform = excluded.platform,
    status = 'active',
    last_registered_at = now(),
    revoked_at = null
  returning id into registered_device_id;
  return registered_device_id;
end;
$$;

create or replace function public.revoke_push_device(target_app_instance_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); affected integer;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.push_devices set status = 'revoked', revoked_at = now()
  where user_id = caller_id and app_instance_id = target_app_instance_id and status = 'active';
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

create or replace function private.enqueue_roll_call_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare job_id uuid; target_event public.events%rowtype; target_group public.groups%rowtype;
begin
  select * into target_event from public.events where id = new.event_id;
  select * into target_group from public.groups where id = new.group_id;
  insert into public.notification_jobs (
    notification_type, event_id, group_id, entity_id, dedupe_key, title, body, route
  ) values (
    'roll_call_started', new.event_id, new.group_id, new.roll_call_id,
    'roll-call-started:' || new.roll_call_id,
    left(target_event.name || ' · ' || target_group.name, 120),
    'Roll call has started',
    '/events/' || new.event_id || '/groups/' || new.group_id || '/roll-calls/' || new.roll_call_id
  ) on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning id into job_id;

  insert into public.notification_deliveries (job_id, device_id, user_id)
  select job_id, device.id, new.user_id
  from public.push_devices as device
  left join public.notification_preferences as preference on preference.user_id = new.user_id
  where device.user_id = new.user_id and device.status = 'active'
    and coalesce(preference.roll_call_started, true)
    and exists (select 1 from public.group_memberships as membership
      where membership.id = new.membership_id and membership.status = 'active')
  on conflict (job_id, device_id) do nothing;
  return new;
end;
$$;
create trigger roll_call_roster_enqueue_push after insert on public.roll_call_roster_members
for each row execute function private.enqueue_roll_call_push();

create or replace function private.enqueue_join_request_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare job_id uuid; target_event public.events%rowtype; target_group public.groups%rowtype;
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
  returning id into job_id;
  insert into public.notification_deliveries (job_id, device_id, user_id)
  select job_id, device.id, membership.user_id
  from public.group_memberships as membership
  join public.push_devices as device on device.user_id = membership.user_id and device.status = 'active'
  join public.notification_preferences as preference
    on preference.user_id = membership.user_id and preference.join_request_updates
  where membership.group_id = new.group_id and membership.status = 'active'
    and membership.role in ('organiser', 'super_organiser')
  on conflict (job_id, device_id) do nothing;
  return new;
end;
$$;
create trigger join_request_enqueue_push after insert on public.join_requests
for each row execute function private.enqueue_join_request_push();

create or replace function public.claim_push_deliveries(batch_size integer default 100)
returns table (
  delivery_id uuid, expo_push_token text, notification_title text,
  notification_body text, notification_route text
)
language plpgsql volatile security definer set search_path = '' as $$
declare encryption_key text;
begin
  if auth.role() <> 'service_role' then raise exception 'Server execution required' using errcode = '42501'; end if;
  select key.encryption_key into encryption_key from private.push_encryption_keys as key where singleton;
  return query
  with claimed as (
    select delivery.id from public.notification_deliveries as delivery
    where delivery.status in ('pending', 'failed') and delivery.attempt_count < 5
    order by delivery.created_at for update skip locked limit greatest(1, least(batch_size, 100))
  ), updated as (
    update public.notification_deliveries as delivery set
      status = 'processing', attempt_count = attempt_count + 1, last_attempted_at = now()
    from claimed where delivery.id = claimed.id returning delivery.*
  )
  select updated.id,
    extensions.pgp_sym_decrypt(device.token_ciphertext, encryption_key),
    job.title, job.body, job.route
  from updated join public.push_devices as device on device.id = updated.device_id
  join public.notification_jobs as job on job.id = updated.job_id
  where device.status = 'active';
end;
$$;

create or replace function public.complete_push_delivery(
  target_delivery_id uuid, delivery_status text,
  provider_ticket text default null, error_code text default null
)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Server execution required' using errcode = '42501'; end if;
  if delivery_status not in ('sent', 'failed', 'invalid_token') then
    raise exception 'Invalid delivery status' using errcode = '22023';
  end if;
  update public.notification_deliveries set status = delivery_status,
    provider_ticket_id = left(provider_ticket, 200), last_error_code = left(error_code, 120),
    sent_at = case when delivery_status = 'sent' then now() else null end
  where id = target_delivery_id;
  if delivery_status = 'invalid_token' then
    update public.push_devices set status = 'revoked', revoked_at = now()
    where id = (select device_id from public.notification_deliveries where id = target_delivery_id);
  end if;
end;
$$;

revoke all on function public.register_push_device(text, text, uuid),
  public.revoke_push_device(uuid) from public, anon, authenticated;
grant execute on function public.register_push_device(text, text, uuid),
  public.revoke_push_device(uuid) to authenticated;
revoke all on function public.claim_push_deliveries(integer),
  public.complete_push_delivery(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_push_deliveries(integer),
  public.complete_push_delivery(uuid, text, text, text) to service_role;
revoke all on function private.enqueue_roll_call_push(), private.enqueue_join_request_push()
  from public, anon, authenticated;

commit;
