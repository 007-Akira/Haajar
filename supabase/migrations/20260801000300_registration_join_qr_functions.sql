begin;

create or replace function public.validate_registration_answer(
  target_question_id uuid,
  answer_value jsonb
)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  answer_type text;
begin
  select question_type into answer_type
  from public.registration_questions
  where id = target_question_id;

  if answer_type is null or answer_value is null or answer_value = 'null'::jsonb then
    return false;
  end if;

  if answer_type in ('short_text', 'phone') then
    return jsonb_typeof(answer_value) = 'string'
      and length(btrim(answer_value #>> '{}')) > 0;
  elsif answer_type = 'number' then
    return jsonb_typeof(answer_value) = 'number';
  elsif answer_type = 'yes_no' then
    return jsonb_typeof(answer_value) = 'boolean';
  elsif answer_type in ('single_choice', 'dropdown') then
    return jsonb_typeof(answer_value) = 'string'
      and exists (
        select 1 from public.registration_options
        where question_id = target_question_id
          and value = answer_value #>> '{}'
      );
  elsif answer_type = 'multiple_choice' then
    return jsonb_typeof(answer_value) = 'array'
      and jsonb_array_length(answer_value) > 0
      and not exists (
        select 1
        from jsonb_array_elements(answer_value) as selected(value)
        where jsonb_typeof(selected.value) <> 'string'
          or not exists (
            select 1 from public.registration_options
            where question_id = target_question_id
              and value = selected.value #>> '{}'
          )
      );
  end if;

  return false;
end;
$$;

create or replace function public.write_haajar_audit(
  target_event_id uuid,
  target_group_id uuid,
  target_actor_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  target_action text,
  target_old_data jsonb default null,
  target_new_data jsonb default null,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  audit_id uuid;
begin
  insert into public.audit_logs (
    event_id, group_id, actor_id, entity_type, entity_id, action,
    old_data, new_data, metadata
  ) values (
    target_event_id, target_group_id, target_actor_id, target_entity_type,
    target_entity_id, target_action, target_old_data, target_new_data,
    coalesce(target_metadata, '{}'::jsonb)
  ) returning id into audit_id;
  return audit_id;
end;
$$;

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
security invoker
set search_path = ''
as $$
declare
  plain_token text;
  next_version integer;
begin
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
    group_membership_id, token_hash, version, status
  ) values (
    target_membership_id,
    encode(extensions.digest(plain_token, 'sha256'), 'hex'),
    next_version,
    'active'
  )
  returning id, version into qr_credential_id, qr_version;

  qr_token := plain_token;
  return next;
end;
$$;

create or replace function public.create_registration_form(
  target_group_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  existing_form public.registration_forms%rowtype;
  new_form_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_group_manager(target_group_id, caller_id) then
    raise exception 'Group manager permission required' using errcode = '42501';
  end if;

  select * into existing_form
  from public.registration_forms
  where group_id = target_group_id;

  if found then
    if existing_form.status = 'draft' then
      return existing_form.id;
    end if;
    raise exception 'A published registration form already exists for this group'
      using errcode = '23505';
  end if;

  insert into public.registration_forms (group_id, created_by)
  values (target_group_id, caller_id)
  returning id into new_form_id;

  return new_form_id;
end;
$$;

create or replace function public.save_registration_form_draft(
  target_form_id uuid,
  questions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  form_record public.registration_forms%rowtype;
  question_payload jsonb;
  option_payload jsonb;
  new_question_id uuid;
  question_kind text;
  question_position integer;
  options_payload jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if questions is null or jsonb_typeof(questions) <> 'array' then
    raise exception 'Questions must be a JSON array' using errcode = '22023';
  end if;

  select * into form_record
  from public.registration_forms
  where id = target_form_id
  for update;

  if not found then
    raise exception 'Registration form not found' using errcode = 'P0002';
  end if;
  if not public.is_group_manager(form_record.group_id, caller_id) then
    raise exception 'Group manager permission required' using errcode = '42501';
  end if;
  if form_record.status <> 'draft' then
    raise exception 'Published registration forms cannot be edited'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(questions) as item(value)
    group by (item.value ->> 'position')
    having count(*) > 1
  ) then
    raise exception 'Question positions must be unique' using errcode = '22023';
  end if;

  delete from public.registration_questions where form_id = target_form_id;

  for question_payload in select value from jsonb_array_elements(questions)
  loop
    if jsonb_typeof(question_payload) <> 'object' then
      raise exception 'Every question must be an object' using errcode = '22023';
    end if;
    question_kind := question_payload ->> 'question_type';
    question_position := (question_payload ->> 'position')::integer;
    options_payload := coalesce(question_payload -> 'options', '[]'::jsonb);

    if nullif(btrim(question_payload ->> 'label'), '') is null
      or question_kind not in (
        'short_text', 'number', 'single_choice', 'multiple_choice',
        'dropdown', 'yes_no', 'phone'
      )
      or question_position is null
      or question_position < 0
      or jsonb_typeof(options_payload) <> 'array' then
      raise exception 'Invalid registration question' using errcode = '22023';
    end if;

    if question_kind in ('single_choice', 'multiple_choice', 'dropdown') then
      if jsonb_array_length(options_payload) < 2 then
        raise exception 'Choice questions require at least two options'
          using errcode = '22023';
      end if;
    elsif jsonb_array_length(options_payload) <> 0 then
      raise exception 'This question type cannot contain options'
        using errcode = '22023';
    end if;

    if exists (
      select 1 from jsonb_array_elements(options_payload) as item(value)
      group by (item.value ->> 'position') having count(*) > 1
    ) or exists (
      select 1 from jsonb_array_elements(options_payload) as item(value)
      group by (item.value ->> 'value') having count(*) > 1
    ) then
      raise exception 'Option positions and values must be unique'
        using errcode = '22023';
    end if;

    insert into public.registration_questions (
      form_id, label, question_type, is_required, position
    ) values (
      target_form_id,
      btrim(question_payload ->> 'label'),
      question_kind,
      coalesce((question_payload ->> 'is_required')::boolean, false),
      question_position
    ) returning id into new_question_id;

    for option_payload in select value from jsonb_array_elements(options_payload)
    loop
      if jsonb_typeof(option_payload) <> 'object'
        or nullif(btrim(option_payload ->> 'label'), '') is null
        or nullif(btrim(option_payload ->> 'value'), '') is null
        or (option_payload ->> 'position') is null
        or (option_payload ->> 'position')::integer < 0 then
        raise exception 'Invalid registration option' using errcode = '22023';
      end if;

      insert into public.registration_options (question_id, label, value, position)
      values (
        new_question_id,
        btrim(option_payload ->> 'label'),
        btrim(option_payload ->> 'value'),
        (option_payload ->> 'position')::integer
      );
    end loop;
  end loop;

  return target_form_id;
exception
  when invalid_text_representation then
    raise exception 'Invalid question or option position/value type'
      using errcode = '22023';
end;
$$;

create or replace function public.publish_registration_form(
  target_form_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  form_record public.registration_forms%rowtype;
  parent_event_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into form_record
  from public.registration_forms
  where id = target_form_id
  for update;

  if not found then
    raise exception 'Registration form not found' using errcode = 'P0002';
  end if;
  select event_id into parent_event_id from public.groups
  where id = form_record.group_id;
  if not public.is_group_manager(form_record.group_id, caller_id) then
    raise exception 'Group manager permission required' using errcode = '42501';
  end if;
  if form_record.status = 'published' then
    return form_record.id;
  end if;
  if not exists (
    select 1 from public.registration_questions where form_id = target_form_id
  ) then
    raise exception 'Registration form requires at least one question'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.registration_questions as question
    where question.form_id = target_form_id
      and (
        nullif(btrim(question.label), '') is null
        or (
          question.question_type in ('single_choice', 'multiple_choice', 'dropdown')
          and (select count(*) from public.registration_options as option
               where option.question_id = question.id) < 2
        )
      )
  ) then
    raise exception 'Registration form contains an invalid question'
      using errcode = '22023';
  end if;

  update public.registration_forms
  set status = 'published'
  where id = target_form_id;

  perform public.write_haajar_audit(
    parent_event_id, form_record.group_id, caller_id,
    'registration_form', target_form_id, 'registration_form.published',
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', 'published')
  );
  return target_form_id;
end;
$$;

create or replace function public.submit_join_request(
  target_group_id uuid,
  answers jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_event_id uuid;
  target_form_id uuid;
  form_status text;
  request_id uuid;
  answer_payload jsonb;
  answer_question_id uuid;
  answer_value jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if answers is null or jsonb_typeof(answers) <> 'array' then
    raise exception 'Answers must be a JSON array' using errcode = '22023';
  end if;

  select target_group.event_id
  into target_event_id
  from public.groups as target_group
  join public.events as parent_event on parent_event.id = target_group.event_id
  where target_group.id = target_group_id
    and target_group.status = 'active'
    and parent_event.status = 'active';

  if not found then
    raise exception 'Active group not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.group_memberships
    where group_id = target_group_id and user_id = caller_id and status = 'active'
  ) then
    raise exception 'User is already an active group member' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.join_requests
    where group_id = target_group_id and user_id = caller_id and status = 'pending'
  ) then
    raise exception 'A pending join request already exists' using errcode = '23505';
  end if;

  select id, status into target_form_id, form_status
  from public.registration_forms
  where group_id = target_group_id;

  if found and form_status <> 'published' then
    raise exception 'Registration for this group is not published'
      using errcode = '55000';
  end if;
  if target_form_id is null and jsonb_array_length(answers) > 0 then
    raise exception 'This group does not have a registration form'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(answers) as item(value)
    group by (item.value ->> 'question_id')
    having count(*) > 1
  ) then
    raise exception 'Each question may be answered once' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.registration_questions as question
    where question.form_id = target_form_id
      and question.is_required
      and not exists (
        select 1 from jsonb_array_elements(answers) as item(value)
        where item.value ->> 'question_id' = question.id::text
          and public.validate_registration_answer(question.id, item.value -> 'answer')
      )
  ) then
    raise exception 'Required registration answers are missing or invalid'
      using errcode = '22023';
  end if;

  insert into public.join_requests (group_id, user_id)
  values (target_group_id, caller_id)
  returning id into request_id;

  for answer_payload in select value from jsonb_array_elements(answers)
  loop
    begin
      answer_question_id := (answer_payload ->> 'question_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid registration question ID' using errcode = '22023';
    end;
    answer_value := answer_payload -> 'answer';

    if not exists (
      select 1 from public.registration_questions as question
      where question.id = answer_question_id
        and question.form_id = target_form_id
    ) or not public.validate_registration_answer(answer_question_id, answer_value) then
      raise exception 'Registration answer is invalid' using errcode = '22023';
    end if;

    insert into public.registration_answers (join_request_id, question_id, answer_json)
    values (request_id, answer_question_id, answer_value);
  end loop;

  perform public.write_haajar_audit(
    target_event_id, target_group_id, caller_id,
    'join_request', request_id, 'join_request.submitted',
    null, jsonb_build_object('status', 'pending')
  );
  return request_id;
end;
$$;

create or replace function public.review_join_request(
  target_request_id uuid,
  decision text,
  rejection_reason text default null
)
returns table (
  join_request_id uuid,
  group_membership_id uuid,
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
  request_record public.join_requests%rowtype;
  target_event_id uuid;
  membership_id uuid;
  event_membership_id uuid;
  issued_credential_id uuid;
  issued_token text;
  issued_version integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if decision not in ('accept', 'reject') then
    raise exception 'Decision must be accept or reject' using errcode = '22023';
  end if;

  select * into request_record
  from public.join_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Join request not found' using errcode = 'P0002';
  end if;
  if not public.is_group_manager(request_record.group_id, caller_id) then
    raise exception 'Group manager permission required' using errcode = '42501';
  end if;
  if request_record.user_id = caller_id then
    raise exception 'Users cannot review their own join request' using errcode = '42501';
  end if;

  select event_id into target_event_id from public.groups
  where id = request_record.group_id;

  if request_record.status <> 'pending' then
    if (request_record.status = 'accepted' and decision = 'accept')
      or (request_record.status = 'rejected' and decision = 'reject') then
      if request_record.status = 'accepted' then
        select id into membership_id from public.group_memberships
        where group_id = request_record.group_id and user_id = request_record.user_id;
      else
        membership_id := null;
      end if;
      join_request_id := request_record.id;
      group_membership_id := membership_id;
      qr_credential_id := null;
      qr_token := null;
      qr_version := null;
      return next;
      return;
    end if;
    raise exception 'Join request has already been reviewed' using errcode = '55000';
  end if;

  if decision = 'reject' then
    update public.join_requests
    set status = 'rejected', reviewed_by = caller_id, reviewed_at = now(),
      rejection_reason = nullif(btrim(review_join_request.rejection_reason), '')
    where id = request_record.id;

    perform public.write_haajar_audit(
      target_event_id, request_record.group_id, caller_id,
      'join_request', request_record.id, 'join_request.rejected',
      jsonb_build_object('status', 'pending'),
      jsonb_build_object(
        'status', 'rejected',
        'reason', nullif(btrim(review_join_request.rejection_reason), '')
      )
    );
    join_request_id := request_record.id;
    group_membership_id := null;
    qr_credential_id := null;
    qr_token := null;
    qr_version := null;
    return next;
    return;
  end if;

  insert into public.event_members (event_id, user_id, role, status)
  values (target_event_id, request_record.user_id, 'member', 'active')
  on conflict (event_id, user_id) do update
  set status = 'active',
    role = case
      when public.event_members.status = 'active' then public.event_members.role
      else 'member'
    end
  returning id into event_membership_id;

  insert into public.group_memberships (
    group_id, user_id, role, status, approved_by, approved_at
  ) values (
    request_record.group_id, request_record.user_id, 'member', 'active', caller_id, now()
  )
  on conflict (group_id, user_id) do update
  set role = 'member', status = 'active', approved_by = caller_id, approved_at = now()
  returning id into membership_id;

  update public.join_requests
  set status = 'accepted', reviewed_by = caller_id, reviewed_at = now(),
    rejection_reason = null
  where id = request_record.id;

  select issued.qr_credential_id, issued.qr_token, issued.qr_version
  into issued_credential_id, issued_token, issued_version
  from public.issue_membership_qr(membership_id) as issued;

  perform public.write_haajar_audit(
    target_event_id, request_record.group_id, caller_id,
    'join_request', request_record.id, 'join_request.accepted',
    jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'accepted')
  );
  perform public.write_haajar_audit(
    target_event_id, request_record.group_id, caller_id,
    'event_membership', event_membership_id, 'event_membership.activated',
    null, jsonb_build_object('user_id', request_record.user_id, 'role', 'member')
  );
  perform public.write_haajar_audit(
    target_event_id, request_record.group_id, caller_id,
    'group_membership', membership_id, 'group_membership.activated',
    null, jsonb_build_object('user_id', request_record.user_id, 'role', 'member')
  );
  perform public.write_haajar_audit(
    target_event_id, request_record.group_id, caller_id,
    'qr_credential', issued_credential_id, 'qr_credential.issued',
    null, jsonb_build_object('membership_id', membership_id, 'version', issued_version)
  );

  join_request_id := request_record.id;
  group_membership_id := membership_id;
  qr_credential_id := issued_credential_id;
  qr_token := issued_token;
  qr_version := issued_version;
  return next;
end;
$$;

create or replace function public.correct_registration_answer(
  target_answer_id uuid,
  corrected_answer jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  answer_record public.registration_answers%rowtype;
  target_group_id uuid;
  target_event_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into answer_record
  from public.registration_answers
  where id = target_answer_id
  for update;

  if not found then
    raise exception 'Registration answer not found' using errcode = 'P0002';
  end if;
  select request.group_id, target_group.event_id
  into target_group_id, target_event_id
  from public.join_requests as request
  join public.groups as target_group on target_group.id = request.group_id
  where request.id = answer_record.join_request_id;
  if not public.is_group_manager(target_group_id, caller_id) then
    raise exception 'Group organiser permission required' using errcode = '42501';
  end if;
  if not public.validate_registration_answer(answer_record.question_id, corrected_answer) then
    raise exception 'Corrected registration answer is invalid' using errcode = '22023';
  end if;
  if answer_record.answer_json = corrected_answer then
    return target_answer_id;
  end if;

  update public.registration_answers
  set answer_json = corrected_answer, corrected_by = caller_id, corrected_at = now()
  where id = target_answer_id;

  perform public.write_haajar_audit(
    target_event_id, target_group_id, caller_id,
    'registration_answer', target_answer_id, 'registration_answer.corrected',
    jsonb_build_object('answer', answer_record.answer_json),
    jsonb_build_object('answer', corrected_answer)
  );
  return target_answer_id;
end;
$$;

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
  select event_id into target_event_id from public.groups
  where id = membership_record.group_id;
  if membership_record.user_id <> caller_id
    and not public.is_group_manager(membership_record.group_id, caller_id) then
    raise exception 'QR reset permission required' using errcode = '42501';
  end if;

  select id into old_credential_id from public.qr_credentials
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

create or replace function public.change_group_membership_role(
  target_membership_id uuid,
  new_role text
)
returns table (
  group_membership_id uuid,
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
  caller_group_role text;
  caller_is_event_super boolean;
  issued_credential_id uuid;
  issued_token text;
  issued_version integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if new_role not in ('member', 'co_organiser', 'organiser', 'super_organiser') then
    raise exception 'Invalid group membership role' using errcode = '22023';
  end if;

  select * into membership_record
  from public.group_memberships
  where id = target_membership_id
  for update;

  if not found or membership_record.status <> 'active' then
    raise exception 'Active group membership not found' using errcode = 'P0002';
  end if;
  select event_id into target_event_id from public.groups
  where id = membership_record.group_id;
  if membership_record.user_id = caller_id then
    raise exception 'Users cannot change their own role' using errcode = '42501';
  end if;

  caller_is_event_super := public.is_event_super_organiser(target_event_id, caller_id);
  select role into caller_group_role from public.group_memberships
  where group_id = membership_record.group_id
    and user_id = caller_id
    and status = 'active';

  if not caller_is_event_super and caller_group_role not in ('organiser', 'super_organiser') then
    raise exception 'Role management permission required' using errcode = '42501';
  end if;
  if public.is_event_super_organiser(target_event_id, membership_record.user_id)
    and not caller_is_event_super then
    raise exception 'Only an event super organiser may change this member role'
      using errcode = '42501';
  end if;
  if caller_group_role = 'organiser'
    and membership_record.role in ('organiser', 'super_organiser')
    and not caller_is_event_super then
    raise exception 'Organisers cannot change an equal or higher role'
      using errcode = '42501';
  end if;
  if new_role = 'super_organiser' and not caller_is_event_super then
    raise exception 'Only an event super organiser may assign this role'
      using errcode = '42501';
  end if;
  if caller_group_role = 'organiser' and new_role in ('organiser', 'super_organiser')
    and not caller_is_event_super then
    raise exception 'Organisers may only assign member or co-organiser roles'
      using errcode = '42501';
  end if;

  if membership_record.role = new_role then
    group_membership_id := target_membership_id;
    qr_credential_id := null;
    qr_token := null;
    qr_version := null;
    return next;
    return;
  end if;

  update public.group_memberships set role = new_role
  where id = target_membership_id;

  select issued.qr_credential_id, issued.qr_token, issued.qr_version
  into issued_credential_id, issued_token, issued_version
  from public.issue_membership_qr(target_membership_id) as issued;

  perform public.write_haajar_audit(
    target_event_id, membership_record.group_id, caller_id,
    'group_membership', target_membership_id, 'group_membership.role_changed',
    jsonb_build_object('role', membership_record.role),
    jsonb_build_object('role', new_role, 'qr_version', issued_version)
  );

  group_membership_id := target_membership_id;
  qr_credential_id := issued_credential_id;
  qr_token := issued_token;
  qr_version := issued_version;
  return next;
end;
$$;

revoke all on function public.validate_registration_answer(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.write_haajar_audit(uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.issue_membership_qr(uuid) from public, anon, authenticated;

revoke all on function public.create_registration_form(uuid) from public, anon, authenticated;
revoke all on function public.save_registration_form_draft(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.publish_registration_form(uuid) from public, anon, authenticated;
revoke all on function public.submit_join_request(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.review_join_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.correct_registration_answer(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.regenerate_membership_qr(uuid) from public, anon, authenticated;
revoke all on function public.change_group_membership_role(uuid, text) from public, anon, authenticated;

grant execute on function public.create_registration_form(uuid) to authenticated;
grant execute on function public.save_registration_form_draft(uuid, jsonb) to authenticated;
grant execute on function public.publish_registration_form(uuid) to authenticated;
grant execute on function public.submit_join_request(uuid, jsonb) to authenticated;
grant execute on function public.review_join_request(uuid, text, text) to authenticated;
grant execute on function public.correct_registration_answer(uuid, jsonb) to authenticated;
grant execute on function public.regenerate_membership_qr(uuid) to authenticated;
grant execute on function public.change_group_membership_role(uuid, text) to authenticated;

commit;
