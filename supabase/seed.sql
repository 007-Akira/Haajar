-- Deterministic development seed.
--
-- Supabase Auth owns auth.users. Create at least one local user first (Studio,
-- an OAuth sign-in, or the Admin API), then run `supabase db reset` again.
-- The first auth user becomes the seed event's super organiser.

do $$
declare
  seed_user_id uuid;
  seed_event_id constant uuid := '10000000-0000-4000-8000-000000000001';
  seed_group_ids constant uuid[] := array[
    '20000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid,
    '20000000-0000-4000-8000-000000000003'::uuid,
    '20000000-0000-4000-8000-000000000004'::uuid
  ];
  seed_group_names constant text[] := array[
    'Bus 2',
    'Compartment B4',
    'Room 203',
    'Activity Team C'
  ];
  item_index integer;
begin
  select id into seed_user_id
  from auth.users
  order by created_at, id
  limit 1;

  if seed_user_id is null then
    raise notice 'Haajar seed skipped: create a local auth user, then rerun db reset.';
    return;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    profile_completed
  )
  select
    id,
    coalesce(raw_user_meta_data ->> 'full_name', 'Development Organiser'),
    email,
    '+910000000000',
    true
  from auth.users
  where id = seed_user_id
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    profile_completed = excluded.profile_completed;

  insert into public.events (id, name, description, created_by, status)
  values (
    seed_event_id,
    'Industrial Visit 2026',
    'Deterministic local development event.',
    seed_user_id,
    'active'
  )
  on conflict (id) do nothing;

  insert into public.event_members (event_id, user_id, role, status)
  values (seed_event_id, seed_user_id, 'super_organiser', 'active')
  on conflict (event_id, user_id) do update set
    role = excluded.role,
    status = excluded.status;

  for item_index in 1..array_length(seed_group_ids, 1) loop
    insert into public.groups (
      id,
      event_id,
      name,
      description,
      created_by,
      status
    )
    values (
      seed_group_ids[item_index],
      seed_event_id,
      seed_group_names[item_index],
      'Deterministic development group.',
      seed_user_id,
      'active'
    )
    on conflict (id) do nothing;

    insert into public.group_memberships (
      group_id,
      user_id,
      role,
      status,
      approved_by,
      approved_at
    )
    values (
      seed_group_ids[item_index],
      seed_user_id,
      case
        when item_index = 4 then 'super_organiser'
        else 'organiser'
      end,
      'active',
      seed_user_id,
      now()
    )
    on conflict (group_id, user_id) do update set
      role = excluded.role,
      status = excluded.status,
      approved_by = excluded.approved_by,
      approved_at = excluded.approved_at;
  end loop;
end
$$;
