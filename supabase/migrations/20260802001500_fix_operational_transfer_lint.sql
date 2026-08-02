begin;

-- PL/pgSQL output columns are variables. Qualify the credential column so it
-- cannot conflict with the function's group_membership_id output variable.
create or replace function public.transfer_operational_group_membership(
  source_membership_id uuid,
  target_operational_group_id uuid
)
returns table (
  group_membership_id uuid,
  source_group_id uuid,
  target_group_id uuid,
  qr_version integer
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  source_membership public.group_memberships%rowtype;
  source_group public.groups%rowtype;
  target_group public.groups%rowtype;
  target_membership_id uuid;
  issued_version integer;
  discarded_credential_id uuid;
  discarded_plain_token text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select * into source_membership from public.group_memberships
    where id=source_membership_id for update;
  if not found or source_membership.status<>'active' then
    raise exception 'Active source membership required' using errcode='P0002';
  end if;
  select * into source_group from public.groups where id=source_membership.group_id for share;
  select * into target_group from public.groups where id=target_operational_group_id for share;
  if not found or source_group.group_kind<>'operational'
    or target_group.group_kind<>'operational'
    or source_group.parent_group_id is null
    or source_group.parent_group_id is distinct from target_group.parent_group_id then
    raise exception 'Transfer requires sibling operational groups' using errcode='22023';
  end if;
  if target_group.status<>'active'
    or not exists(select 1 from public.groups
      where id=source_group.parent_group_id and status='active' and group_kind='category')
    or not exists(select 1 from public.events where id=source_group.event_id and status='active') then
    raise exception 'Active event, category, and target group required' using errcode='55000';
  end if;
  if not public.is_event_super_organiser(source_group.event_id,caller_id) then
    raise exception 'Event super organiser permission required' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(source_group.parent_group_id::text || ':' || source_membership.user_id::text, 0)
  );

  update public.group_memberships set status='inactive',updated_at=now()
    where id=source_membership.id;
  update public.qr_credentials as credential set status='revoked',revoked_at=now()
    where credential.group_membership_id=source_membership.id and credential.status='active';

  insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
    values(target_group.id,source_membership.user_id,source_membership.role,'active',caller_id,now())
  on conflict(group_id,user_id) do update set
    role=excluded.role,status='active',approved_by=caller_id,approved_at=now(),updated_at=now()
  returning id into target_membership_id;

  select issued.qr_credential_id,issued.qr_token,issued.qr_version
    into discarded_credential_id,discarded_plain_token,issued_version
    from public.issue_membership_qr(target_membership_id) issued;

  perform public.write_haajar_audit(source_group.event_id,target_group.id,caller_id,
    'group_membership',target_membership_id,'group_membership.transferred',
    jsonb_build_object('source_group_id',source_group.id,'role',source_membership.role),
    jsonb_build_object('target_group_id',target_group.id,'role',source_membership.role,
      'qr_version',issued_version),
    jsonb_build_object('category_group_id',source_group.parent_group_id));

  group_membership_id:=target_membership_id;
  source_group_id:=source_group.id;
  target_group_id:=target_group.id;
  qr_version:=issued_version;
  return next;
end $$;

revoke all on function public.transfer_operational_group_membership(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.transfer_operational_group_membership(uuid,uuid)
  to authenticated;

commit;
