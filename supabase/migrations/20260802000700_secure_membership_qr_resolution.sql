begin;

create or replace function public.resolve_membership_qr(
  presented_token text,
  expected_group_id uuid
)
returns table (
  resolution_status text,
  membership_id uuid,
  member_user_id uuid,
  display_name text,
  phone text,
  group_id uuid,
  group_name text,
  member_role text,
  membership_status text,
  credential_status text,
  credential_version integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  audit_actor_id uuid;
  expected_group public.groups%rowtype;
  expected_event public.events%rowtype;
  scanner_role text;
  canonical_token text;
  payload_version integer;
  credential_record public.qr_credentials%rowtype;
  membership_record public.group_memberships%rowtype;
  profile_record public.profiles%rowtype;
  audit_action text;
  audit_entity_type text := 'group';
  audit_entity_id uuid;
begin
  resolution_status := 'invalid';
  membership_id := null;
  member_user_id := null;
  display_name := null;
  phone := null;
  group_id := null;
  group_name := null;
  member_role := null;
  membership_status := null;
  credential_status := null;
  credential_version := null;

  select * into expected_group
  from public.groups
  where id = expected_group_id
  for share;

  if not found then
    return next;
    return;
  end if;

  audit_entity_id := expected_group.id;
  select * into expected_event
  from public.events
  where id = expected_group.event_id
  for share;

  select membership.role into scanner_role
  from public.group_memberships as membership
  where membership.group_id = expected_group.id
    and membership.user_id = caller_id
    and membership.status = 'active';

  select profile.id into audit_actor_id
  from public.profiles as profile
  where profile.id = caller_id;

  if caller_id is null or not coalesce(
    scanner_role in ('co_organiser', 'organiser', 'super_organiser')
      or public.is_event_super_organiser(expected_group.event_id, caller_id),
    false
  ) then
    resolution_status := 'unauthorised';
  elsif expected_group.status <> 'active' or expected_event.status <> 'active' then
    resolution_status := 'archived';
  else
    canonical_token := lower(btrim(coalesce(presented_token, '')));
    if canonical_token ~ '^hjr:[1-9][0-9]{0,8}:[a-f0-9]{64}$' then
      payload_version := split_part(canonical_token, ':', 2)::integer;
      canonical_token := split_part(canonical_token, ':', 3);
    elsif canonical_token ~ '^[a-f0-9]{64}$' then
      payload_version := null;
    else
      canonical_token := null;
    end if;

    if canonical_token is not null then
      select * into credential_record
      from public.qr_credentials
      where token_hash = encode(extensions.digest(canonical_token, 'sha256'), 'hex')
      for share;

      if found then
        select * into membership_record
        from public.group_memberships
        where id = credential_record.group_membership_id
        for share;

        if membership_record.group_id <> expected_group.id then
          resolution_status := 'wrong_group';
        elsif credential_record.status <> 'active' then
          resolution_status := 'revoked';
        elsif membership_record.status <> 'active' then
          resolution_status := 'inactive_membership';
        elsif payload_version is not null and payload_version <> credential_record.version then
          resolution_status := 'invalid';
        else
          select * into profile_record
          from public.profiles
          where id = membership_record.user_id;

          resolution_status := 'valid';
          membership_id := membership_record.id;
          member_user_id := membership_record.user_id;
          display_name := profile_record.full_name;
          phone := profile_record.phone;
          group_id := expected_group.id;
          group_name := expected_group.name;
          member_role := membership_record.role;
          membership_status := membership_record.status;
          credential_status := credential_record.status;
          credential_version := credential_record.version;
          audit_entity_type := 'group_membership';
          audit_entity_id := membership_record.id;
        end if;
      end if;
    end if;
  end if;

  audit_action := case
    when resolution_status = 'valid' then 'qr_credential.resolved'
    else 'qr_credential.resolution_failed'
  end;

  perform public.write_haajar_audit(
    expected_group.event_id,
    expected_group.id,
    audit_actor_id,
    audit_entity_type,
    audit_entity_id,
    audit_action,
    null,
    null,
    jsonb_build_object('resolution_status', resolution_status)
  );

  return next;
end;
$$;

revoke all on function public.resolve_membership_qr(text, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_membership_qr(text, uuid) to authenticated;

commit;
