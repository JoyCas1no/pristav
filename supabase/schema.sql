-- Схема для «Пристав: смена». Выполнить один раз: Supabase → SQL Editor → New query → Run.
-- Вход по логину: в Auth используется служебная почта <логин>@pristav.game, настоящая почта лежит в profiles (видна только владельцу).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,16}$')
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  score int not null,
  day int not null default 0,
  ending text,
  updated_at timestamptz not null default now()
);
create index if not exists scores_score_idx on public.scores (score desc);

-- профиль создаётся автоматически из данных регистрации
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, lower(new.raw_user_meta_data->>'username'), new.raw_user_meta_data->>'real_email');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- свободен ли логин (до регистрации)
create or replace function public.username_free(name text) returns boolean
language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;

-- рекорд: только лучший результат, логин берётся из профиля (подделать нельзя)
create or replace function public.submit_score(p_score int, p_day int, p_ending text) returns void
language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'bad score'; end if;
  select username into uname from public.profiles where id = auth.uid();
  insert into public.scores (user_id, username, score, day, ending)
  values (auth.uid(), uname, p_score, p_day, p_ending)
  on conflict (user_id) do update
    set score = excluded.score, day = excluded.day, ending = excluded.ending, updated_at = now()
    where excluded.score > public.scores.score;
end $$;

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.scores enable row level security;

drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read on public.profiles for select using (auth.uid() = id);

drop policy if exists saves_own_all on public.saves;
create policy saves_own_all on public.saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists scores_read_all on public.scores;
create policy scores_read_all on public.scores for select using (true);
-- вставка и правка рекордов только через submit_score

revoke all on function public.submit_score(int, int, text) from public, anon;
grant execute on function public.submit_score(int, int, text) to authenticated;
grant execute on function public.username_free(text) to anon, authenticated;
