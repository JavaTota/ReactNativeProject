begin;

-- Fail with a useful constraint error if older data needs correction first.
alter table public.journey_stops add constraint hotel_requires_checkout
  check (kind <> 'Hotel' or end_day_number is not null);
alter table public.profiles add constraint profile_text_limits
  check (char_length(trim(display_name)) between 1 and 100 and char_length(bio) <= 2000);

create function public.check_stop_dates() returns trigger
language plpgsql security invoker set search_path = public as $$
declare last_day integer;
begin
  select end_date - start_date into last_day from journeys where id = new.journey_id;
  if last_day is null or new.day_number > last_day or new.end_day_number > last_day then
    raise exception 'Stop outside journey dates';
  end if;
  return new;
end;
$$;
create trigger check_stop_dates before insert or update on public.journey_stops
for each row execute function public.check_stop_dates();

-- Deferred because save_journey replaces stops after changing the trip dates.
create function public.check_journey_dates() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if exists (select 1 from journey_stops s join journeys j on j.id = s.journey_id
    where j.id = new.id and (s.day_number > j.end_date-j.start_date or s.end_day_number > j.end_date-j.start_date)) then
    raise exception 'Existing stop outside journey dates';
  end if;
  return new;
end;
$$;
create constraint trigger check_journey_dates after update on public.journeys
deferrable initially deferred for each row execute function public.check_journey_dates();

create function public.check_journal_photo() returns trigger
language plpgsql security invoker set search_path = public as $$
declare owner_id text;
begin
  select j.user_id into owner_id from journeys j join journey_stops s on s.journey_id=j.id where s.id=new.stop_id;
  if new.photo_path is not null and (owner_id is null
    or split_part(new.photo_path,'/',1) <> owner_id
    or new.photo_path !~ '^[a-zA-Z0-9_/-]+\.(jpg|png|webp)$'
    or char_length(new.photo_path) > 400) then
    raise exception 'Photo must belong to journey owner';
  end if;
  return new;
end;
$$;
create trigger check_journal_photo before insert or update on public.journal_entries
for each row execute function public.check_journal_photo();

-- Publishing must go through the checked transaction, including direct REST clients.
drop policy "owners create published trips" on public.published_trips;
drop policy "owners update published trips" on public.published_trips;
drop policy "trip owners manage published stops" on public.published_stops;
revoke insert, update on public.published_trips from anon, authenticated;
revoke insert, update, delete on public.published_stops from anon, authenticated;

create function public.publish_journey(journey_id_input text, country_input text, caption_input text default '')
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id text := auth.jwt()->>'sub';
  j journeys%rowtype;
  author_value text;
  post_id text;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  select * into j from journeys where id=journey_id_input and user_id=owner_id for update;
  if not found then raise exception 'Journey not found'; end if;
  if j.status <> 'Completed' or j.end_date > current_date then raise exception 'Complete your trip before publishing'; end if;
  if country_input is null or char_length(trim(country_input)) not between 1 and 100
    or caption_input is null or char_length(caption_input)>2000 then raise exception 'Invalid publication details'; end if;
  select display_name into author_value from profiles where user_id=owner_id;
  if author_value is null then raise exception 'Create your profile first'; end if;
  if not exists(select 1 from journey_stops where journey_id=j.id and visited) then raise exception 'Visit at least one stop before publishing'; end if;
  post_id := 'journey-' || j.id;
  if exists(select 1 from published_trips where id=post_id and user_id<>owner_id) then raise exception 'Post ownership conflict'; end if;
  insert into published_trips(id,user_id,author_name,title,destination,country,caption,duration_days)
  values(post_id,owner_id,author_value,j.title,j.destination,trim(country_input),caption_input,j.end_date-j.start_date+1)
  on conflict(id) do update set author_name=excluded.author_name,title=excluded.title,destination=excluded.destination,
    country=excluded.country,caption=excluded.caption,duration_days=excluded.duration_days,updated_at=now();
  -- Resolve attribution from the original public post instead of trusting client names.
  update published_trips set source_post_id=p.id,source_author=p.author_name,source_title=p.title
    from published_trips p where published_trips.id=post_id and p.id=j.source_post_id;
  delete from published_stops where trip_id=post_id;
  insert into published_stops(trip_id,kind,name,day_number,end_day_number,review,rating,photo_path,sort_order)
  select post_id,s.kind,s.name,s.day_number,s.end_day_number,coalesce(e.review,''),coalesce(e.rating,0),e.photo_path,
    (row_number() over(order by s.day_number,s.id))::integer
  from journey_stops s left join journal_entries e on e.stop_id=s.id
  where s.journey_id=j.id and s.visited;
  update published_trips set cover_path=(select photo_path from published_stops where trip_id=post_id and photo_path is not null order by sort_order limit 1) where id=post_id;
  update journeys set published_post_id=post_id,updated_at=now() where id=j.id;
  return post_id;
end;
$$;

create function public.reuse_itinerary(post_id_input text, start_date_input date)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id text := auth.jwt()->>'sub';
  p published_trips%rowtype;
  s published_stops%rowtype;
  journey_id_value text := gen_random_uuid()::text;
  stop_id_value text;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if start_date_input is null then raise exception 'Start date required'; end if;
  select * into p from published_trips where id=post_id_input for share;
  if not found then raise exception 'Published itinerary not found'; end if;
  insert into journeys(id,user_id,title,destination,start_date,end_date,status,source_post_id,source_author,source_title)
  values(journey_id_value,owner_id,p.title,p.destination,start_date_input,start_date_input+p.duration_days-1,'Planning',p.id,p.author_name,p.title);
  for s in select * from published_stops where trip_id=p.id order by sort_order loop
    stop_id_value := gen_random_uuid()::text;
    insert into journey_stops(id,journey_id,kind,name,day_number,end_day_number,visited)
    values(stop_id_value,journey_id_value,s.kind,s.name,s.day_number,s.end_day_number,false);
    insert into booking_details(stop_id,status,currency) values(stop_id_value,'Not booked','USD');
    insert into journal_entries(stop_id) values(stop_id_value);
  end loop;
  return journey_id_value;
end;
$$;
revoke all on function public.publish_journey(text,text,text) from public,anon;
revoke all on function public.reuse_itinerary(text,date) from public,anon;
grant execute on function public.publish_journey(text,text,text) to authenticated;
grant execute on function public.reuse_itinerary(text,date) to authenticated;

-- A journal image becomes shareable only when referenced by a published stop.
-- Signed URLs expire after 5 minutes. Removing a post cannot recall downloaded copies.
drop policy "users manage own journal files" on storage.objects;
create policy "read own or published journal photos" on storage.objects for select to authenticated
using (bucket_id='journal-media' and ((storage.foldername(name))[1]=(select auth.jwt()->>'sub')
  or exists(select 1 from public.published_stops ps where ps.photo_path=storage.objects.name)));
create policy "upload own journal photos" on storage.objects for insert to authenticated
with check(bucket_id='journal-media' and (storage.foldername(name))[1]=(select auth.jwt()->>'sub'));
-- Immutable uploads keep published snapshots stable. Replace a photo using a new path.
create policy "delete unused own journal photos" on storage.objects for delete to authenticated
using(bucket_id='journal-media' and (storage.foldername(name))[1]=(select auth.jwt()->>'sub')
  and not exists(select 1 from public.published_stops ps where ps.photo_path=storage.objects.name));
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='journal-media';
create index published_stops_photo_idx on public.published_stops(photo_path) where photo_path is not null;

commit;
