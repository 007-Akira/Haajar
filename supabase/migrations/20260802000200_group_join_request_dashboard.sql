begin;

create or replace function public.list_group_join_requests(
  target_group_id uuid,
  request_status text default 'pending'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  result jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if request_status not in ('pending', 'accepted', 'rejected') then
    raise exception 'Unsupported join request status' using errcode = '22023';
  end if;
  if not public.is_group_manager(target_group_id, caller_id) then
    raise exception 'Group manager permission required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', request.id,
      'group_id', request.group_id,
      'user_id', request.user_id,
      'status', request.status,
      'submitted_at', request.submitted_at,
      'reviewed_at', request.reviewed_at,
      'rejection_reason', request.rejection_reason,
      'profile', jsonb_build_object(
        'full_name', profile.full_name,
        'phone', profile.phone,
        'email', profile.email
      ),
      'answers', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', answer.id,
            'question_id', answer.question_id,
            'label', question.label,
            'question_type', question.question_type,
            'position', question.position,
            'answer', answer.answer_json
          ) order by question.position, answer.created_at
        )
        from public.registration_answers as answer
        join public.registration_questions as question on question.id = answer.question_id
        where answer.join_request_id = request.id
      ), '[]'::jsonb)
    ) order by request.submitted_at desc
  ), '[]'::jsonb)
  into result
  from public.join_requests as request
  join public.profiles as profile on profile.id = request.user_id
  where request.group_id = target_group_id
    and request.status = request_status;

  return result;
end;
$$;

revoke all on function public.list_group_join_requests(uuid, text)
  from public, anon, authenticated;
grant execute on function public.list_group_join_requests(uuid, text) to authenticated;

commit;
