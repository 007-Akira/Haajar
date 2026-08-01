begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.qr_encryption_keys (
  singleton boolean primary key default true check (singleton),
  encryption_key text not null check (length(encryption_key) = 64),
  created_at timestamptz not null default now()
);
revoke all on private.qr_encryption_keys from public, anon, authenticated;

insert into private.qr_encryption_keys (singleton, encryption_key)
values (true, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (singleton) do nothing;

alter table public.qr_credentials add column token_ciphertext bytea;

create or replace function public.issue_membership_qr(
  target_membership_id uuid
)
returns table (
  qr_credential_id uuid,
  qr_token text,
  qr_version integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  plain_token text;
  next_version integer;
  encryption_key text;
begin
  select key.encryption_key into encryption_key
  from private.qr_encryption_keys as key
  where key.singleton;
  if encryption_key is null then
    raise exception 'QR encryption key unavailable' using errcode = '55000';
  end if;

  update public.qr_credentials
  set status = 'revoked', revoked_at = now()
  where group_membership_id = target_membership_id
    and status = 'active';

  select coalesce(max(version), 0) + 1
  into next_version
  from public.qr_credentials
  where group_membership_id = target_membership_id;

  plain_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.qr_credentials (
    group_membership_id, token_hash, token_ciphertext, version, status
  ) values (
    target_membership_id,
    encode(extensions.digest(plain_token, 'sha256'), 'hex'),
    extensions.pgp_sym_encrypt(plain_token, encryption_key, 'cipher-algo=aes256'),
    next_version,
    'active'
  )
  returning id, version into qr_credential_id, qr_version;

  qr_token := plain_token;
  return next;
end;
$$;

create or replace function public.get_membership_qr(target_membership_id uuid)
returns table (
  qr_credential_id uuid,
  qr_token text,
  qr_version integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  membership_record public.group_memberships%rowtype;
  credential_record public.qr_credentials%rowtype;
  encryption_key text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into membership_record
  from public.group_memberships
  where id = target_membership_id;
  if not found or membership_record.status <> 'active' then
    raise exception 'Active group membership not found' using errcode = 'P0002';
  end if;
  if membership_record.user_id <> caller_id
    and not public.is_group_manager(membership_record.group_id, caller_id) then
    raise exception 'QR access permission required' using errcode = '42501';
  end if;

  select * into credential_record
  from public.qr_credentials
  where group_membership_id = target_membership_id and status = 'active'
  for update;

  if not found or credential_record.token_ciphertext is null then
    return query select * from public.issue_membership_qr(target_membership_id);
    return;
  end if;

  select key.encryption_key into encryption_key
  from private.qr_encryption_keys as key
  where key.singleton;
  if encryption_key is null then
    raise exception 'QR encryption key unavailable' using errcode = '55000';
  end if;

  qr_credential_id := credential_record.id;
  qr_token := extensions.pgp_sym_decrypt(credential_record.token_ciphertext, encryption_key);
  qr_version := credential_record.version;
  return next;
end;
$$;

revoke all on function public.issue_membership_qr(uuid) from public, anon, authenticated;
revoke all on function public.get_membership_qr(uuid) from public, anon, authenticated;
grant execute on function public.get_membership_qr(uuid) to authenticated;

commit;
