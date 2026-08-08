begin;

create or replace function public.list_my_notifications(notification_limit integer default 50)
returns table(
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  route text,
  delivery_status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  select job.id,
    job.notification_type,
    job.title,
    job.body,
    job.route,
    case
      when bool_or(delivery.status = 'sent') then 'sent'
      when bool_or(delivery.status in ('pending', 'processing')) then 'pending'
      when bool_or(delivery.status = 'failed') then 'failed'
      else 'unavailable'
    end,
    job.created_at
  from public.notification_deliveries delivery
  join public.notification_jobs job on job.id = delivery.job_id
  where delivery.user_id = caller_id
  group by job.id, job.notification_type, job.title, job.body, job.route, job.created_at
  order by job.created_at desc, job.id desc
  limit greatest(1, least(coalesce(notification_limit, 50), 100));
end;
$$;

revoke all on function public.list_my_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.list_my_notifications(integer) to authenticated;

commit;
