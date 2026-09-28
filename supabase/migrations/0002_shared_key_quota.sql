-- Daily cap for visitors using the deployment's shared Gemini key.
-- Only the app server can count: consume_quota requires a secret whose SHA-256
-- lives in a schema the Data API doesn't expose. Subjects are salted hashes of
-- client IPs, so no raw IPs are stored.
create schema if not exists private;

create table private.settings (
  key text primary key,
  value text not null
);

create table private.usage (
  subject text not null check (subject ~ '^[0-9a-f]{64}$'),
  day date not null default current_date,
  count int not null default 0,
  primary key (subject, day)
);

create function public.consume_quota(p_secret text, p_subject text, p_limit int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  used int;
begin
  if encode(extensions.digest(p_secret, 'sha256'), 'hex')
     is distinct from (select value from private.settings where key = 'quota_secret_sha256') then
    raise exception 'forbidden';
  end if;

  insert into private.usage as u (subject, day, count) values (p_subject, current_date, 1)
  on conflict (subject, day) do update set count = u.count + 1
  returning count into used;

  -- Occasional cleanup of past days.
  if random() < 0.01 then
    delete from private.usage where day < current_date - 1;
  end if;

  return used <= p_limit;
end $$;

revoke all on function public.consume_quota(text, text, int) from public;
grant execute on function public.consume_quota(text, text, int) to anon, authenticated;
