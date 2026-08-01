begin;

create or replace function public.get_event_member_details(
  target_event_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  member_record public.event_members%rowtype;
  profile_record public.profiles%rowtype;
  can_view_private boolean;
  memberships jsonb;
  answers jsonb;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_active_event_member(target_event_id, caller_id) then
    raise exception 'Event membership required' using errcode = '42501';
  end if;

  select * into member_record from public.event_members
  where event_id = target_event_id and user_id = target_user_id and status = 'active';
  if not found then raise exception 'Event member not found' using errcode = 'P0002'; end if;
  select * into profile_record from public.profiles where id = target_user_id;
  can_view_private := caller_id = target_user_id
    or public.is_event_super_organiser(target_event_id, caller_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'membership_id', membership.id,
    'group_id', group_record.id,
    'group_name', group_record.name,
    'role', membership.role,
    'status', membership.status,
    'joined_at', membership.created_at
  ) order by group_record.name), '[]'::jsonb)
  into memberships
  from public.group_memberships as membership
  join public.groups as group_record on group_record.id = membership.group_id
  where membership.user_id = target_user_id
    and membership.status = 'active'
    and group_record.event_id = target_event_id
    and (
      can_view_private
      or public.is_active_group_member(group_record.id, caller_id)
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'answer_id', answer.id,
    'group_id', request.group_id,
    'group_name', group_record.name,
    'question_id', question.id,
    'label', question.label,
    'answer', answer.answer_json
  ) order by group_record.name, question.position), '[]'::jsonb)
  into answers
  from public.registration_answers as answer
  join public.join_requests as request on request.id = answer.join_request_id
  join public.groups as group_record on group_record.id = request.group_id
  join public.registration_questions as question on question.id = answer.question_id
  where request.user_id = target_user_id
    and group_record.event_id = target_event_id
    and (
      caller_id = target_user_id
      or public.is_group_manager(request.group_id, caller_id)
    );

  return jsonb_build_object(
    'user_id', target_user_id,
    'full_name', profile_record.full_name,
    'phone', profile_record.phone,
    'email', case when can_view_private then profile_record.email else null end,
    'event_role', member_record.role,
    'joined_at', member_record.created_at,
    'memberships', memberships,
    'answers', answers
  );
end;
$$;

create or replace function public.get_join_request_status(target_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  request_record public.join_requests%rowtype;
  group_record public.groups%rowtype;
  event_record public.events%rowtype;
  answers jsonb;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into request_record from public.join_requests where id = target_request_id;
  if not found or request_record.user_id <> caller_id then
    raise exception 'Join request not found' using errcode = 'P0002';
  end if;
  select * into group_record from public.groups where id = request_record.group_id;
  select * into event_record from public.events where id = group_record.event_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', answer.id,
    'question_id', question.id,
    'label', question.label,
    'answer', answer.answer_json
  ) order by question.position), '[]'::jsonb)
  into answers
  from public.registration_answers as answer
  join public.registration_questions as question on question.id = answer.question_id
  where answer.join_request_id = request_record.id;

  return jsonb_build_object(
    'request_id', request_record.id,
    'group_id', group_record.id,
    'group_name', group_record.name,
    'event_id', event_record.id,
    'event_name', event_record.name,
    'status', request_record.status,
    'submitted_at', request_record.submitted_at,
    'reviewed_at', request_record.reviewed_at,
    'rejection_reason', request_record.rejection_reason,
    'answers', answers
  );
end;
$$;

revoke all on function public.get_event_member_details(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_join_request_status(uuid) from public, anon, authenticated;
grant execute on function public.get_event_member_details(uuid, uuid) to authenticated;
grant execute on function public.get_join_request_status(uuid) to authenticated;

commit;
