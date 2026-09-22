create extension if not exists pgcrypto;

create type public.journey_status as enum ('Planning', 'Traveling', 'Completed');
create type public.stop_kind as enum ('Hotel', 'Restaurant', 'Activity');
create type public.booking_status as enum ('Not booked', 'Booked', 'No booking needed', 'Cancelled');

create table public.profiles (
  user_id text primary key default (auth.jwt()->>'sub'),
  display_name text not null,
  bio text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journeys (
  id text primary key,
  user_id text not null default (auth.jwt()->>'sub'),
  title text not null check (char_length(title) between 1 and 120),
  destination text not null check (char_length(destination) between 1 and 160),
  start_date date not null,
  end_date date not null,
  status public.journey_status not null default 'Planning',
  source_post_id text,
  source_author text,
  source_title text,
  published_post_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date <= 365)
);

create table public.journey_stops (
  id text primary key,
  journey_id text not null references public.journeys(id) on delete cascade,
  kind public.stop_kind not null,
  name text not null check (char_length(name) between 1 and 200),
  day_number integer not null check (day_number >= 0),
  end_day_number integer,
  visited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'Hotel' and end_day_number > day_number) or (kind <> 'Hotel' and end_day_number is null))
);

-- Reservation data is deliberately isolated from public itinerary content.
create table public.booking_details (
  stop_id text primary key references public.journey_stops(id) on delete cascade,
  status public.booking_status not null default 'Not booked',
  confirmation_number text,
  booking_url text check (booking_url is null or booking_url ~ '^https?://'),
  cost numeric(12,2) check (cost is null or cost >= 0),
  currency char(3),
  cancellation_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_entries (
  stop_id text primary key references public.journey_stops(id) on delete cascade,
  review text not null default '' check (char_length(review) <= 2000),
  rating smallint not null default 0 check (rating between 0 and 5),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_trips (
  id text primary key,
  user_id text not null default (auth.jwt()->>'sub'),
  author_name text not null,
  title text not null,
  destination text not null,
  country text not null,
  caption text not null default '',
  duration_days integer not null check (duration_days between 1 and 366),
  cover_path text,
  source_post_id text,
  source_author text,
  source_title text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.published_trips(id) on delete cascade,
  kind public.stop_kind not null,
  name text not null,
  day_number integer not null check (day_number >= 0),
  end_day_number integer,
  review text not null default '',
  rating smallint not null default 0 check (rating between 0 and 5),
  photo_path text,
  sort_order integer not null default 0
);

create table public.saved_trips (
  user_id text not null default (auth.jwt()->>'sub'),
  trip_id text not null references public.published_trips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

create table public.trip_likes (
  user_id text not null default (auth.jwt()->>'sub'),
  trip_id text not null references public.published_trips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.published_trips(id) on delete cascade,
  user_id text not null default (auth.jwt()->>'sub'),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journeys_user_updated_idx on public.journeys(user_id, updated_at desc);
create index journey_stops_journey_day_idx on public.journey_stops(journey_id, day_number);
create index published_trips_country_idx on public.published_trips(country, published_at desc);
create index published_stops_trip_day_idx on public.published_stops(trip_id, day_number, sort_order);
create index comments_trip_created_idx on public.comments(trip_id, created_at);

alter table public.profiles enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_stops enable row level security;
alter table public.booking_details enable row level security;
alter table public.journal_entries enable row level security;
alter table public.published_trips enable row level security;
alter table public.published_stops enable row level security;
alter table public.saved_trips enable row level security;
alter table public.trip_likes enable row level security;
alter table public.comments enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check ((select auth.jwt()->>'sub') = user_id);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.jwt()->>'sub') = user_id) with check ((select auth.jwt()->>'sub') = user_id);

create policy "owners manage journeys" on public.journeys for all to authenticated
using ((select auth.jwt()->>'sub') = user_id)
with check ((select auth.jwt()->>'sub') = user_id);

create policy "owners manage stops" on public.journey_stops for all to authenticated
using (exists (select 1 from public.journeys j where j.id = journey_id and j.user_id = (select auth.jwt()->>'sub')))
with check (exists (select 1 from public.journeys j where j.id = journey_id and j.user_id = (select auth.jwt()->>'sub')));

create policy "owners manage booking details" on public.booking_details for all to authenticated
using (exists (select 1 from public.journey_stops s join public.journeys j on j.id = s.journey_id where s.id = stop_id and j.user_id = (select auth.jwt()->>'sub')))
with check (exists (select 1 from public.journey_stops s join public.journeys j on j.id = s.journey_id where s.id = stop_id and j.user_id = (select auth.jwt()->>'sub')));

create policy "owners manage journal entries" on public.journal_entries for all to authenticated
using (exists (select 1 from public.journey_stops s join public.journeys j on j.id = s.journey_id where s.id = stop_id and j.user_id = (select auth.jwt()->>'sub')))
with check (exists (select 1 from public.journey_stops s join public.journeys j on j.id = s.journey_id where s.id = stop_id and j.user_id = (select auth.jwt()->>'sub')));

create policy "published trips are public" on public.published_trips for select using (true);
create policy "owners create published trips" on public.published_trips for insert to authenticated with check ((select auth.jwt()->>'sub') = user_id);
create policy "owners update published trips" on public.published_trips for update to authenticated using ((select auth.jwt()->>'sub') = user_id) with check ((select auth.jwt()->>'sub') = user_id);
create policy "owners delete published trips" on public.published_trips for delete to authenticated using ((select auth.jwt()->>'sub') = user_id);

create policy "published stops are public" on public.published_stops for select using (true);
create policy "trip owners manage published stops" on public.published_stops for all to authenticated
using (exists (select 1 from public.published_trips p where p.id = trip_id and p.user_id = (select auth.jwt()->>'sub')))
with check (exists (select 1 from public.published_trips p where p.id = trip_id and p.user_id = (select auth.jwt()->>'sub')));

create policy "users manage saved trips" on public.saved_trips for all to authenticated
using ((select auth.jwt()->>'sub') = user_id)
with check ((select auth.jwt()->>'sub') = user_id);
create policy "likes are public" on public.trip_likes for select using (true);
create policy "users manage own likes" on public.trip_likes for insert to authenticated with check ((select auth.jwt()->>'sub') = user_id);
create policy "users remove own likes" on public.trip_likes for delete to authenticated using ((select auth.jwt()->>'sub') = user_id);
create policy "comments are public" on public.comments for select using (true);
create policy "users create own comments" on public.comments for insert to authenticated with check ((select auth.jwt()->>'sub') = user_id);
create policy "users update own comments" on public.comments for update to authenticated using ((select auth.jwt()->>'sub') = user_id) with check ((select auth.jwt()->>'sub') = user_id);
create policy "users delete own comments" on public.comments for delete to authenticated using ((select auth.jwt()->>'sub') = user_id);

-- One authenticated RPC prevents partial journey saves if a child write fails.
create or replace function public.save_journey(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id text := auth.jwt()->>'sub';
  stop jsonb;
  stop_id text;
  start_value date := (payload->>'startDate')::date;
  end_value date := (payload->>'endDate')::date;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if end_value < start_value or end_value - start_value > 365 then raise exception 'Invalid journey dates'; end if;

  insert into journeys (id, user_id, title, destination, start_date, end_date, status, source_post_id, source_author, source_title, published_post_id, updated_at)
  values (payload->>'id', owner_id, trim(payload->>'title'), trim(payload->>'destination'), start_value, end_value,
    (payload->>'status')::journey_status, payload#>>'{source,id}', payload#>>'{source,author}', payload#>>'{source,title}', payload->>'publishedId', now())
  on conflict (id) do update set title=excluded.title, destination=excluded.destination, start_date=excluded.start_date,
    end_date=excluded.end_date, status=excluded.status, source_post_id=excluded.source_post_id, source_author=excluded.source_author,
    source_title=excluded.source_title, published_post_id=excluded.published_post_id, updated_at=now()
  where journeys.user_id = owner_id;

  if not exists (select 1 from journeys where id = payload->>'id' and user_id = owner_id) then
    raise exception 'Journey not found or not owned by current user';
  end if;

  delete from journey_stops where journey_id = payload->>'id';
  for stop in select * from jsonb_array_elements(coalesce(payload->'stops', '[]'::jsonb)) loop
    stop_id := stop->>'id';
    if (stop->>'day')::integer < 0 or (stop->>'day')::integer > end_value - start_value then raise exception 'Stop outside journey'; end if;
    if stop->>'kind' = 'Hotel' and ((stop->>'endDay')::integer <= (stop->>'day')::integer or (stop->>'endDay')::integer > end_value - start_value) then raise exception 'Invalid hotel dates'; end if;

    insert into journey_stops (id, journey_id, kind, name, day_number, end_day_number, visited)
    values (stop_id, payload->>'id', (stop->>'kind')::stop_kind, trim(stop->>'name'), (stop->>'day')::integer,
      case when stop->>'kind' = 'Hotel' then (stop->>'endDay')::integer else null end, coalesce((stop->>'visited')::boolean, false));

    insert into booking_details (stop_id, status, confirmation_number, booking_url, cost, currency, cancellation_date)
    values (stop_id, coalesce(stop->>'booking','Not booked')::booking_status, nullif(stop->>'confirmation',''), nullif(stop->>'bookingLink',''),
      nullif(stop->>'cost','')::numeric, coalesce(nullif(stop->>'currency',''),'USD'), nullif(stop->>'cancellationDate','')::date);

    insert into journal_entries (stop_id, review, rating, photo_path)
    values (stop_id, coalesce(stop->>'review',''), coalesce((stop->>'rating')::smallint,0), nullif(stop->>'photoUri',''));
  end loop;
end;
$$;

revoke all on function public.save_journey(jsonb) from public, anon;
grant execute on function public.save_journey(jsonb) to authenticated;

insert into storage.buckets (id, name, public) values ('journal-media', 'journal-media', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('published-media', 'published-media', true) on conflict do nothing;

create policy "users manage own journal files" on storage.objects for all to authenticated
using (bucket_id = 'journal-media' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'))
with check (bucket_id = 'journal-media' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
create policy "users upload own published files" on storage.objects for insert to authenticated
with check (bucket_id = 'published-media' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
create policy "users update own published files" on storage.objects for update to authenticated
using (bucket_id = 'published-media' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'))
with check (bucket_id = 'published-media' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
create policy "users delete own published files" on storage.objects for delete to authenticated
using (bucket_id = 'published-media' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
