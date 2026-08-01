begin;

create table public.registration_forms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.groups(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  )
);

create table public.registration_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.registration_forms(id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  question_type text not null check (
    question_type in (
      'short_text',
      'number',
      'single_choice',
      'multiple_choice',
      'dropdown',
      'yes_no',
      'phone'
    )
  ),
  is_required boolean not null default false,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (form_id, position)
);

create table public.registration_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.registration_questions(id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  value text not null check (length(btrim(value)) > 0),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (question_id, position),
  unique (question_id, value)
);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
    or (status = 'cancelled' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
    or (status = 'accepted' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.registration_answers (
  id uuid primary key default gen_random_uuid(),
  join_request_id uuid not null references public.join_requests(id) on delete cascade,
  question_id uuid not null references public.registration_questions(id) on delete restrict,
  answer_json jsonb not null,
  corrected_by uuid references public.profiles(id) on delete set null,
  corrected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (join_request_id, question_id),
  check (
    (corrected_by is null and corrected_at is null)
    or (corrected_by is not null and corrected_at is not null)
  )
);

create table public.qr_credentials (
  id uuid primary key default gen_random_uuid(),
  group_membership_id uuid not null references public.group_memberships(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) >= 43),
  version integer not null default 1 check (version > 0),
  status text not null default 'active' check (status in ('active', 'revoked')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  ),
  unique (group_membership_id, version)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check (length(btrim(entity_type)) > 0),
  entity_id uuid not null,
  action text not null check (length(btrim(action)) > 0),
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (event_id is not null or group_id is not null),
  check (jsonb_typeof(metadata) = 'object')
);

create index registration_questions_form_idx
  on public.registration_questions (form_id);
create index registration_options_question_idx
  on public.registration_options (question_id);
create index join_requests_group_status_submitted_idx
  on public.join_requests (group_id, status, submitted_at desc);
create index join_requests_user_submitted_idx
  on public.join_requests (user_id, submitted_at desc);
create unique index join_requests_one_pending_per_user_group_idx
  on public.join_requests (group_id, user_id)
  where status = 'pending';
create index registration_answers_request_idx
  on public.registration_answers (join_request_id);
create index registration_answers_question_idx
  on public.registration_answers (question_id);
create unique index qr_credentials_one_active_per_membership_idx
  on public.qr_credentials (group_membership_id)
  where status = 'active';
create index audit_logs_event_created_idx
  on public.audit_logs (event_id, created_at desc)
  where event_id is not null;
create index audit_logs_group_created_idx
  on public.audit_logs (group_id, created_at desc)
  where group_id is not null;
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create trigger registration_forms_set_updated_at
before update on public.registration_forms
for each row execute function public.set_updated_at();

create trigger registration_answers_set_updated_at
before update on public.registration_answers
for each row execute function public.set_updated_at();

create or replace function public.enforce_registration_form_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'published' then
    if new.status <> old.status
      or new.group_id <> old.group_id
      or new.created_by <> old.created_by
      or new.published_at is distinct from old.published_at then
      raise exception 'Published registration forms are immutable'
        using errcode = '55000';
    end if;
  elsif new.status = 'published' then
    new.published_at = coalesce(new.published_at, now());
  elsif new.published_at is not null then
    raise exception 'Draft registration forms cannot have a publication time'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger registration_forms_enforce_lifecycle
before update on public.registration_forms
for each row execute function public.enforce_registration_form_lifecycle();

create or replace function public.enforce_draft_registration_structure()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_form_id uuid;
  parent_status text;
begin
  if tg_table_name = 'registration_questions' then
    if tg_op = 'UPDATE' and new.form_id <> old.form_id then
      raise exception 'Registration questions cannot move between forms'
        using errcode = '55000';
    end if;
    parent_form_id := case when tg_op = 'DELETE' then old.form_id else new.form_id end;
  else
    select question.form_id
    into parent_form_id
    from public.registration_questions as question
    where question.id = case when tg_op = 'DELETE' then old.question_id else new.question_id end;

    if tg_op = 'UPDATE' and new.question_id <> old.question_id then
      raise exception 'Registration options cannot move between questions'
        using errcode = '55000';
    end if;
  end if;

  select form.status
  into parent_status
  from public.registration_forms as form
  where form.id = parent_form_id;

  if parent_status is distinct from 'draft' then
    raise exception 'Published registration form structure is immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger registration_questions_require_draft_form
before insert or update or delete on public.registration_questions
for each row execute function public.enforce_draft_registration_structure();

create trigger registration_options_require_draft_form
before insert or update or delete on public.registration_options
for each row execute function public.enforce_draft_registration_structure();

create or replace function public.enforce_registration_answer_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.join_requests as request
    join public.registration_forms as form on form.group_id = request.group_id
    join public.registration_questions as question on question.form_id = form.id
    where request.id = new.join_request_id
      and question.id = new.question_id
  ) then
    raise exception 'Answer question does not belong to the requested group form'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger registration_answers_enforce_scope
before insert or update of join_request_id, question_id on public.registration_answers
for each row execute function public.enforce_registration_answer_scope();

revoke all on function public.enforce_registration_form_lifecycle() from public;
revoke all on function public.enforce_draft_registration_structure() from public;
revoke all on function public.enforce_registration_answer_scope() from public;

alter table public.registration_forms enable row level security;
alter table public.registration_questions enable row level security;
alter table public.registration_options enable row level security;
alter table public.join_requests enable row level security;
alter table public.registration_answers enable row level security;
alter table public.qr_credentials enable row level security;
alter table public.audit_logs enable row level security;

create policy registration_forms_select_group_members
on public.registration_forms for select to authenticated
using (
  public.is_group_manager(group_id)
  or (status = 'published' and public.is_active_group_member(group_id))
);

create policy registration_forms_insert_managers
on public.registration_forms for insert to authenticated
with check (
  public.is_group_manager(group_id)
  and created_by = auth.uid()
  and status = 'draft'
  and published_at is null
);

create policy registration_forms_update_managers
on public.registration_forms for update to authenticated
using (public.is_group_manager(group_id))
with check (public.is_group_manager(group_id));

create policy registration_questions_select_group_members
on public.registration_questions for select to authenticated
using (
  exists (
    select 1
    from public.registration_forms as form
    where form.id = form_id
      and (
        public.is_group_manager(form.group_id)
        or (
          form.status = 'published'
          and public.is_active_group_member(form.group_id)
        )
      )
  )
);

create policy registration_questions_manage_drafts
on public.registration_questions for all to authenticated
using (
  exists (
    select 1
    from public.registration_forms as form
    where form.id = form_id
      and form.status = 'draft'
      and public.is_group_manager(form.group_id)
  )
)
with check (
  exists (
    select 1
    from public.registration_forms as form
    where form.id = form_id
      and form.status = 'draft'
      and public.is_group_manager(form.group_id)
  )
);

create policy registration_options_select_group_members
on public.registration_options for select to authenticated
using (
  exists (
    select 1
    from public.registration_questions as question
    join public.registration_forms as form on form.id = question.form_id
    where question.id = question_id
      and (
        public.is_group_manager(form.group_id)
        or (
          form.status = 'published'
          and public.is_active_group_member(form.group_id)
        )
      )
  )
);

create policy registration_options_manage_drafts
on public.registration_options for all to authenticated
using (
  exists (
    select 1
    from public.registration_questions as question
    join public.registration_forms as form on form.id = question.form_id
    where question.id = question_id
      and form.status = 'draft'
      and public.is_group_manager(form.group_id)
  )
)
with check (
  exists (
    select 1
    from public.registration_questions as question
    join public.registration_forms as form on form.id = question.form_id
    where question.id = question_id
      and form.status = 'draft'
      and public.is_group_manager(form.group_id)
  )
);

create policy join_requests_select_owner_or_managers
on public.join_requests for select to authenticated
using (user_id = auth.uid() or public.is_group_manager(group_id));

create policy registration_answers_select_owner_or_managers
on public.registration_answers for select to authenticated
using (
  exists (
    select 1
    from public.join_requests as request
    where request.id = join_request_id
      and (
        request.user_id = auth.uid()
        or public.is_group_manager(request.group_id)
      )
  )
);

create policy audit_logs_select_managers
on public.audit_logs for select to authenticated
using (
  (group_id is not null and public.is_group_manager(group_id))
  or (event_id is not null and public.is_event_super_organiser(event_id))
);

revoke all on public.registration_forms, public.registration_questions,
  public.registration_options, public.join_requests, public.registration_answers,
  public.qr_credentials, public.audit_logs from anon, authenticated;

grant select on public.registration_forms, public.registration_questions,
  public.registration_options, public.join_requests, public.registration_answers,
  public.audit_logs to authenticated;
grant insert (group_id, created_by) on public.registration_forms to authenticated;
grant update (status) on public.registration_forms to authenticated;
grant insert (form_id, label, question_type, is_required, position)
  on public.registration_questions to authenticated;
grant update (label, question_type, is_required, position)
  on public.registration_questions to authenticated;
grant delete on public.registration_questions to authenticated;
grant insert (question_id, label, value, position)
  on public.registration_options to authenticated;
grant update (label, value, position) on public.registration_options to authenticated;
grant delete on public.registration_options to authenticated;

commit;
