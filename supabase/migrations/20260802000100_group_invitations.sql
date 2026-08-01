begin;

create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create unique index group_invitations_one_active_per_group_idx
  on public.group_invitations (group_id) where status = 'active';

alter table public.group_invitations enable row level security;
revoke all on public.group_invitations from anon, authenticated;

create or replace function public.create_group_invitation(target_group_id uuid)
returns table (invitation_id uuid, invitation_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  plain_token text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_group_manager(target_group_id, caller_id) then
    raise exception 'Group manager permission required' using errcode = '42501';
  end if;

  update public.group_invitations
  set status = 'revoked', revoked_at = now()
  where group_id = target_group_id and status = 'active';

  plain_token := lower(encode(extensions.gen_random_bytes(12), 'hex'));
  insert into public.group_invitations (group_id, token_hash, created_by)
  values (
    target_group_id,
    encode(extensions.digest(plain_token, 'sha256'), 'hex'),
    caller_id
  )
  returning id into invitation_id;

  invitation_token := plain_token;
  return next;
end;
$$;

create or replace function public.resolve_group_invitation(invitation_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_token text := lower(regexp_replace(coalesce(invitation_token, ''), '[^a-zA-Z0-9]', '', 'g'));
  invitation_record public.group_invitations%rowtype;
  group_record public.groups%rowtype;
  event_record public.events%rowtype;
  form_record public.registration_forms%rowtype;
  organiser_name text;
  membership_status text;
  request_record public.join_requests%rowtype;
  questions jsonb := '[]'::jsonb;
begin
  if length(normalized_token) <> 24 then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  select * into invitation_record from public.group_invitations
  where token_hash = encode(extensions.digest(normalized_token, 'sha256'), 'hex')
    and status = 'active';
  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  select * into group_record from public.groups where id = invitation_record.group_id;
  select * into event_record from public.events where id = group_record.event_id;
  if group_record.status <> 'active' or event_record.status <> 'active' then
    return jsonb_build_object(
      'group_id', group_record.id,
      'group_name', group_record.name,
      'group_description', group_record.description,
      'group_status', 'archived',
      'event_name', event_record.name,
      'questions', '[]'::jsonb,
      'requires_registration', false
    );
  end if;

  select full_name into organiser_name from public.profiles where id = group_record.created_by;
  select * into form_record from public.registration_forms
  where group_id = group_record.id and status = 'published';

  if found then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', question.id,
        'label', question.label,
        'question_type', question.question_type,
        'is_required', question.is_required,
        'position', question.position,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', option.id, 'label', option.label,
            'value', option.value, 'position', option.position
          ) order by option.position)
          from public.registration_options as option
          where option.question_id = question.id
        ), '[]'::jsonb)
      ) order by question.position
    ), '[]'::jsonb)
    into questions
    from public.registration_questions as question
    where question.form_id = form_record.id;
  end if;

  if auth.uid() is not null then
    select status into membership_status from public.group_memberships
    where group_id = group_record.id and user_id = auth.uid();
    select * into request_record from public.join_requests
    where group_id = group_record.id and user_id = auth.uid()
    order by submitted_at desc limit 1;
  end if;

  return jsonb_build_object(
    'group_id', group_record.id,
    'group_name', group_record.name,
    'group_description', group_record.description,
    'group_status', group_record.status,
    'event_name', event_record.name,
    'organiser_name', organiser_name,
    'form_id', form_record.id,
    'questions', questions,
    'requires_registration', jsonb_array_length(questions) > 0,
    'membership_status', membership_status,
    'request_id', request_record.id,
    'request_status', request_record.status,
    'request_submitted_at', request_record.submitted_at,
    'rejection_reason', request_record.rejection_reason
  );
end;
$$;

revoke all on function public.create_group_invitation(uuid) from public, anon, authenticated;
revoke all on function public.resolve_group_invitation(text) from public, anon, authenticated;
grant execute on function public.create_group_invitation(uuid) to authenticated;
grant execute on function public.resolve_group_invitation(text) to anon, authenticated;

commit;
