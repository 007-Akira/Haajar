begin;

-- Keep one reusable invitation per group. The hash remains the lookup value;
-- encrypted recovery is restricted to group managers so the same invitation
-- can be reopened without rotating it.
alter table public.group_invitations
  add column if not exists token_ciphertext bytea;

create or replace function public.create_group_invitation(target_group_id uuid)
returns table (invitation_id uuid, invitation_token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  invitation_record public.group_invitations%rowtype;
  plain_token text;
  encryption_key text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_group_manager(target_group_id, caller_id) then
    raise exception 'Group manager permission required' using errcode = '42501';
  end if;

  -- Serialise concurrent first-use requests for this group.
  perform pg_advisory_xact_lock(hashtextextended(target_group_id::text, 0));

  select key.encryption_key into encryption_key
  from private.qr_encryption_keys as key
  where key.singleton;
  if encryption_key is null then
    raise exception 'Invitation encryption key unavailable' using errcode = '55000';
  end if;

  select * into invitation_record
  from public.group_invitations
  where group_id = target_group_id and status = 'active'
  for update;

  if found and invitation_record.token_ciphertext is not null then
    invitation_id := invitation_record.id;
    invitation_token := extensions.pgp_sym_decrypt(
      invitation_record.token_ciphertext,
      encryption_key
    );
    return next;
    return;
  end if;

  -- Legacy active invitations cannot be recovered because only their hashes
  -- exist. Rotate such an invitation once, then keep the replacement stable.
  if found then
    update public.group_invitations
    set status = 'revoked', revoked_at = now()
    where id = invitation_record.id;
  end if;

  plain_token := lower(encode(extensions.gen_random_bytes(12), 'hex'));
  insert into public.group_invitations (
    group_id, token_hash, token_ciphertext, created_by
  ) values (
    target_group_id,
    encode(extensions.digest(plain_token, 'sha256'), 'hex'),
    extensions.pgp_sym_encrypt(plain_token, encryption_key, 'cipher-algo=aes256'),
    caller_id
  )
  returning id into invitation_id;

  invitation_token := plain_token;
  return next;
end;
$$;

-- Retrying a submission (including a rapid double tap or an uncertain network
-- response) returns the existing pending request instead of surfacing a unique
-- constraint conflict.
create or replace function public.submit_join_request(
  target_group_id uuid,
  answers jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
volatile
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

  perform pg_advisory_xact_lock(
    hashtextextended(target_group_id::text || ':' || caller_id::text, 0)
  );

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

  select id into request_id
  from public.join_requests
  where group_id = target_group_id and user_id = caller_id and status = 'pending'
  order by submitted_at desc
  limit 1;
  if request_id is not null then
    return request_id;
  end if;

  if exists (
    select 1 from public.group_memberships
    where group_id = target_group_id and user_id = caller_id and status = 'active'
  ) then
    raise exception 'User is already an active group member' using errcode = '55000';
  end if;

  select id, status into target_form_id, form_status
  from public.registration_forms
  where group_id = target_group_id;
  if found and form_status <> 'published' then
    raise exception 'Registration for this group is not published' using errcode = '55000';
  end if;
  if target_form_id is null and jsonb_array_length(answers) > 0 then
    raise exception 'This group does not have a registration form' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(answers) as item(value)
    group by (item.value ->> 'question_id')
    having count(*) > 1
  ) then
    raise exception 'Each question may be answered once' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.registration_questions as question
    where question.form_id = target_form_id and question.is_required
      and not exists (
        select 1 from jsonb_array_elements(answers) as item(value)
        where item.value ->> 'question_id' = question.id::text
          and public.validate_registration_answer(question.id, item.value -> 'answer')
      )
  ) then
    raise exception 'Required registration answers are missing or invalid' using errcode = '22023';
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
      where question.id = answer_question_id and question.form_id = target_form_id
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

revoke all on function public.create_group_invitation(uuid),
  public.submit_join_request(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_group_invitation(uuid),
  public.submit_join_request(uuid, jsonb)
  to authenticated;

commit;
