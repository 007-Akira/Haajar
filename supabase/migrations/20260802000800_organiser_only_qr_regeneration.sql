begin;

-- QR rotation is an organiser-managed security action. Membership owners may
-- display, save, and share their current credential but cannot rotate it.
create or replace function public.regenerate_membership_qr(
  target_membership_id uuid
)
returns table (
  qr_credential_id uuid,
  qr_token text,
  qr_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  membership_record public.group_memberships%rowtype;
  target_event_id uuid;
  old_credential_id uuid;
  issued_credential_id uuid;
  issued_token text;
  issued_version integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into membership_record
  from public.group_memberships
  where id = target_membership_id
  for update;

  if not found or membership_record.status <> 'active' then
    raise exception 'Active group membership not found' using errcode = 'P0002';
  end if;

  select event_id into target_event_id
  from public.groups
  where id = membership_record.group_id;

  if not public.is_group_manager(membership_record.group_id, caller_id) then
    raise exception 'QR reset permission required' using errcode = '42501';
  end if;

  select id into old_credential_id
  from public.qr_credentials
  where group_membership_id = target_membership_id and status = 'active'
  for update;

  select issued.qr_credential_id, issued.qr_token, issued.qr_version
  into issued_credential_id, issued_token, issued_version
  from public.issue_membership_qr(target_membership_id) as issued;

  perform public.write_haajar_audit(
    target_event_id, membership_record.group_id, caller_id,
    'group_membership', target_membership_id, 'qr_credential.regenerated',
    jsonb_build_object('revoked_credential_id', old_credential_id),
    jsonb_build_object(
      'owner_id', membership_record.user_id,
      'credential_id', issued_credential_id,
      'version', issued_version
    )
  );

  qr_credential_id := issued_credential_id;
  qr_token := issued_token;
  qr_version := issued_version;
  return next;
end;
$$;

revoke all on function public.regenerate_membership_qr(uuid) from public, anon, authenticated;
grant execute on function public.regenerate_membership_qr(uuid) to authenticated;

commit;
