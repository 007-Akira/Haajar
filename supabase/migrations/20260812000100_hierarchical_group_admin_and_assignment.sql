begin;

-- Administrative access is intentionally independent from participation.
create or replace function public.get_group_access(target_group_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); target public.groups%rowtype;
begin
  if caller_id is null then return 'unauthorised'; end if;
  select * into target from public.groups where id = target_group_id;
  if not found then return 'unauthorised'; end if;
  if public.is_active_group_member(target.id, caller_id) then return 'member'; end if;
  if public.is_event_super_organiser(target.event_id, caller_id) then return 'event_admin'; end if;
  return 'unauthorised';
end $$;

create or replace function public.list_group_members_secure(target_group_id uuid)
returns table(membership_id uuid,user_id uuid,role text,status text,approved_at timestamptz,
  joined_at timestamptz,full_name text,phone text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.get_group_access(target_group_id) = 'unauthorised' then
    raise exception 'Group access required' using errcode='42501';
  end if;
  return query select gm.id,gm.user_id,gm.role,gm.status,gm.approved_at,gm.created_at,p.full_name,p.phone
    from public.group_memberships gm join public.profiles p on p.id=gm.user_id
    where gm.group_id=target_group_id and gm.status='active'
    order by gm.created_at,gm.id;
end $$;

-- One canonical aggregation: operational groups count their active memberships;
-- categories count unique active participants in active operational children.
create or replace function public.list_event_groups_with_participation_counts(target_event_id uuid)
returns table(id uuid,event_id uuid,name text,description text,status text,created_by uuid,
  created_at timestamptz,updated_at timestamptz,group_kind text,parent_group_id uuid,
  active_member_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_active_event_member(target_event_id,auth.uid()) then
    raise exception 'Active event membership required' using errcode='42501';
  end if;
  return query select g.id,g.event_id,g.name,g.description,g.status,g.created_by,g.created_at,g.updated_at,
    g.group_kind,g.parent_group_id,
    case when g.group_kind='category' then (
      select count(distinct gm.user_id) from public.groups child
      join public.group_memberships gm on gm.group_id=child.id and gm.status='active'
      where child.parent_group_id=g.id and child.group_kind='operational' and child.status='active'
    ) else (
      select count(distinct gm.user_id) from public.group_memberships gm
      where gm.group_id=g.id and gm.status='active'
    ) end::bigint
  from public.groups g where g.event_id=target_event_id and g.status='active'
  order by g.created_at,g.id;
end $$;

create or replace function public.list_operational_group_assignment_candidates(target_operational_group_id uuid)
returns table(user_id uuid,full_name text,phone text,sibling_group_id uuid,sibling_group_name text,
  sibling_membership_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare target public.groups%rowtype; caller_id uuid:=auth.uid();
begin
  select * into target from public.groups where id=target_operational_group_id;
  if not found or target.group_kind<>'operational' then
    raise exception 'Operational group required' using errcode='22023';
  end if;
  if not public.is_event_super_organiser(target.event_id,caller_id)
    and not exists(select 1 from public.group_memberships gm where gm.group_id=target.id
      and gm.user_id=caller_id and gm.status='active' and gm.role='organiser') then
    raise exception 'Member management permission required' using errcode='42501';
  end if;
  return query select em.user_id,p.full_name,p.phone,sibling.id,sibling.name,sibling_membership.id
    from public.event_members em join public.profiles p on p.id=em.user_id
    left join public.group_memberships own on own.group_id=target.id and own.user_id=em.user_id and own.status='active'
    left join public.group_memberships sibling_membership on sibling_membership.category_group_id=target.parent_group_id
      and sibling_membership.user_id=em.user_id and sibling_membership.status='active'
      and sibling_membership.group_id<>target.id
    left join public.groups sibling on sibling.id=sibling_membership.group_id and sibling.status='active'
    where em.event_id=target.event_id and em.status='active' and own.id is null
    order by p.full_name nulls last,em.user_id;
end $$;

create or replace function public.assign_event_member_to_operational_group(
  target_operational_group_id uuid,target_user_id uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target public.groups%rowtype; membership_id uuid;
  discarded_credential uuid; discarded_token text; discarded_version integer;
begin
  if caller_id is null then return 'unauthorised'; end if;
  select * into target from public.groups where id=target_operational_group_id for share;
  if not found then return 'not_found'; end if;
  if target.group_kind<>'operational' or target.parent_group_id is null then return 'invalid_group'; end if;
  if target.status<>'active' or not exists(select 1 from public.events e where e.id=target.event_id and e.status='active') then
    return 'archived';
  end if;
  if not public.is_event_super_organiser(target.event_id,caller_id)
    and not exists(select 1 from public.group_memberships gm where gm.group_id=target.id
      and gm.user_id=caller_id and gm.status='active' and gm.role='organiser') then return 'unauthorised'; end if;
  if not exists(select 1 from public.event_members em where em.event_id=target.event_id
    and em.user_id=target_user_id and em.status='active') then return 'not_event_member'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target.parent_group_id::text||target_user_id::text,0));
  if exists(select 1 from public.group_memberships gm where gm.group_id=target.id
    and gm.user_id=target_user_id and gm.status='active') then return 'already_member'; end if;
  if exists(select 1 from public.group_memberships gm where gm.category_group_id=target.parent_group_id
    and gm.user_id=target_user_id and gm.status='active' and gm.group_id<>target.id) then
    return 'sibling_membership_exists';
  end if;
  insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
    values(target.id,target_user_id,'member','active',caller_id,now())
    on conflict(group_id,user_id) do update set role='member',status='active',approved_by=caller_id,approved_at=now()
    returning id into membership_id;
  select qr_credential_id,qr_token,qr_version into discarded_credential,discarded_token,discarded_version
    from public.issue_membership_qr(membership_id);
  perform public.write_haajar_audit(target.event_id,target.id,caller_id,'group_membership',membership_id,
    'group_membership.assigned',null,jsonb_build_object('user_id',target_user_id,'role','member'));
  return 'assigned';
exception when unique_violation then return 'sibling_membership_exists';
end $$;

revoke all on function public.get_group_access(uuid),public.list_group_members_secure(uuid),
  public.list_event_groups_with_participation_counts(uuid),
  public.list_operational_group_assignment_candidates(uuid),
  public.assign_event_member_to_operational_group(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_group_access(uuid),public.list_group_members_secure(uuid),
  public.list_event_groups_with_participation_counts(uuid),
  public.list_operational_group_assignment_candidates(uuid),
  public.assign_event_member_to_operational_group(uuid,uuid) to authenticated;

commit;
