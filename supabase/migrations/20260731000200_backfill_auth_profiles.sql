begin;

-- The auth trigger creates profiles for future users. Backfill users that
-- authenticated before the trigger was installed.
insert into public.profiles (id, full_name, email)
select
  users.id,
  nullif(users.raw_user_meta_data ->> 'full_name', ''),
  users.email
from auth.users as users
on conflict (id) do update
set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  email = excluded.email;

commit;
