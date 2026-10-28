create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade default auth.uid(),
  slug text not null unique check (length(slug) between 3 and 120),
  name text not null check (length(btrim(name)) > 0),
  cuisines text[] not null default '{}',
  address text not null check (length(btrim(address)) > 0),
  neighborhood text not null default '',
  city text not null check (length(btrim(city)) > 0),
  phone text,
  whatsapp text,
  description text,
  image text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  temporarily_closed boolean not null default false,
  is_published boolean not null default false,
  hours jsonb not null default '{}'::jsonb check (jsonb_typeof(hours) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (establishment_id, position)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  available boolean not null default true,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, position)
);

create index establishments_published_name_idx on public.establishments (name) where is_published;
create index establishments_cuisines_idx on public.establishments using gin (cuisines);
create index menu_categories_establishment_position_idx on public.menu_categories (establishment_id, position);
create index menu_items_category_position_idx on public.menu_items (category_id, position);

alter table public.establishments enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

create policy establishments_public_or_owner_read
  on public.establishments for select to anon, authenticated
  using (is_published or owner_id = (select auth.uid()));

create policy establishments_insert_owner
  on public.establishments for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy establishments_update_owner
  on public.establishments for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy establishments_delete_owner
  on public.establishments for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy menu_categories_public_or_owner_read
  on public.menu_categories for select to anon, authenticated
  using (exists (
    select 1 from public.establishments e
    where e.id = establishment_id
      and (e.is_published or e.owner_id = (select auth.uid()))
  ));

create policy menu_categories_insert_owner
  on public.menu_categories for insert to authenticated
  with check (exists (
    select 1 from public.establishments e
    where e.id = establishment_id and e.owner_id = (select auth.uid())
  ));

create policy menu_categories_update_owner
  on public.menu_categories for update to authenticated
  using (exists (
    select 1 from public.establishments e
    where e.id = establishment_id and e.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.establishments e
    where e.id = establishment_id and e.owner_id = (select auth.uid())
  ));

create policy menu_categories_delete_owner
  on public.menu_categories for delete to authenticated
  using (exists (
    select 1 from public.establishments e
    where e.id = establishment_id and e.owner_id = (select auth.uid())
  ));

create policy menu_items_public_or_owner_read
  on public.menu_items for select to anon, authenticated
  using (exists (
    select 1
    from public.menu_categories c
    join public.establishments e on e.id = c.establishment_id
    where c.id = category_id
      and (e.is_published or e.owner_id = (select auth.uid()))
  ));

create policy menu_items_insert_owner
  on public.menu_items for insert to authenticated
  with check (exists (
    select 1
    from public.menu_categories c
    join public.establishments e on e.id = c.establishment_id
    where c.id = category_id and e.owner_id = (select auth.uid())
  ));

create policy menu_items_update_owner
  on public.menu_items for update to authenticated
  using (exists (
    select 1
    from public.menu_categories c
    join public.establishments e on e.id = c.establishment_id
    where c.id = category_id and e.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.menu_categories c
    join public.establishments e on e.id = c.establishment_id
    where c.id = category_id and e.owner_id = (select auth.uid())
  ));

create policy menu_items_delete_owner
  on public.menu_items for delete to authenticated
  using (exists (
    select 1
    from public.menu_categories c
    join public.establishments e on e.id = c.establishment_id
    where c.id = category_id and e.owner_id = (select auth.uid())
  ));

grant usage on schema public to anon, authenticated;
grant select on public.establishments, public.menu_categories, public.menu_items to anon, authenticated;
grant insert (slug, name, cuisines, address, neighborhood, city, phone, whatsapp, description, image, latitude, longitude, temporarily_closed, hours)
  on public.establishments to authenticated;
grant update (slug, name, cuisines, address, neighborhood, city, phone, whatsapp, description, image, latitude, longitude, temporarily_closed, hours, is_published)
  on public.establishments to authenticated;
grant delete on public.establishments to authenticated;
grant insert (establishment_id, name, position) on public.menu_categories to authenticated;
grant update (name, position) on public.menu_categories to authenticated;
grant delete on public.menu_categories to authenticated;
grant insert (category_id, name, description, price, image_url, available, position) on public.menu_items to authenticated;
grant update (name, description, price, image_url, available, position) on public.menu_items to authenticated;
grant delete on public.menu_items to authenticated;

create function public.update_establishment_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger establishments_set_updated_at
  before update on public.establishments
  for each row execute function public.update_establishment_timestamp();

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.update_establishment_timestamp();

create function public.validate_establishment_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published then
    if new.owner_id is distinct from (select auth.uid()) then
      raise exception 'Only the establishment owner can publish this profile.' using errcode = '42501';
    end if;
    if length(btrim(new.name)) = 0 or length(btrim(new.address)) = 0 or length(btrim(new.city)) = 0
      or coalesce(cardinality(new.cuisines), 0) = 0 then
      raise exception 'Complete the public profile before publishing.' using errcode = '23514';
    end if;
    if not exists (
      select 1
      from public.menu_categories c
      join public.menu_items i on i.category_id = c.id
      where c.establishment_id = new.id
    ) then
      raise exception 'Add at least one menu item before publishing.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger establishments_validate_publication
  before insert or update on public.establishments
  for each row execute function public.validate_establishment_publication();

create function public.save_my_menu(p_categories jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_establishment_id uuid;
  v_category jsonb;
  v_item jsonb;
  v_category_id uuid;
  v_category_position integer := 0;
  v_item_position integer;
begin
  if jsonb_typeof(p_categories) <> 'array' then
    raise exception 'Categories must be an array.' using errcode = '22023';
  end if;

  select e.id into v_establishment_id
  from public.establishments e
  where e.owner_id = (select auth.uid())
  limit 1
  for update;

  if v_establishment_id is null then
    raise exception 'Create an establishment profile first.' using errcode = 'P0002';
  end if;

  delete from public.menu_categories where establishment_id = v_establishment_id;

  for v_category in select value from jsonb_array_elements(p_categories) loop
    if length(btrim(coalesce(v_category->>'name', ''))) = 0 then
      raise exception 'Every menu category needs a name.' using errcode = '22023';
    end if;
    insert into public.menu_categories (establishment_id, name, position)
    values (v_establishment_id, btrim(v_category->>'name'), v_category_position)
    returning id into v_category_id;

    if jsonb_typeof(coalesce(v_category->'items', '[]'::jsonb)) <> 'array' then
      raise exception 'Category items must be an array.' using errcode = '22023';
    end if;

    v_item_position := 0;
    for v_item in select value from jsonb_array_elements(coalesce(v_category->'items', '[]'::jsonb)) loop
      if length(btrim(coalesce(v_item->>'name', ''))) = 0 or coalesce(v_item->>'price', '') !~ '^\d+(\.\d{1,2})?$' then
        raise exception 'Every menu item needs a name and a valid price.' using errcode = '22023';
      end if;
      insert into public.menu_items (category_id, name, description, price, image_url, available, position)
      values (
        v_category_id,
        btrim(v_item->>'name'),
        nullif(btrim(coalesce(v_item->>'description', '')), ''),
        (v_item->>'price')::numeric(10, 2),
        nullif(btrim(coalesce(v_item->>'image', v_item->>'image_url', '')), ''),
        coalesce((v_item->>'available')::boolean, true),
        v_item_position
      );
      v_item_position := v_item_position + 1;
    end loop;
    v_category_position := v_category_position + 1;
  end loop;
end;
$$;

revoke all on function public.update_establishment_timestamp() from public, anon, authenticated;
revoke all on function public.validate_establishment_publication() from public, anon, authenticated;
revoke all on function public.save_my_menu(jsonb) from public, anon;
grant execute on function public.save_my_menu(jsonb) to authenticated;

