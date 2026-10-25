-- Profile IDs are not auth.users IDs in this application. Match Spotify identity
-- using the trusted auth.identities table, rather than editable user_metadata.
create table public.ipod_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  model text not null default 'classic4' check (model in ('classic4', 'mini2', 'nano3', 'nano5', 'classic160', 'shuffle2')),
  finish text not null default 'white',
  updated_at timestamptz not null default now(),
  constraint ipod_finish_matches_model check (
    (model = 'classic4' and finish in ('white')) or
    (model = 'mini2' and finish in ('silver', 'blue', 'pink', 'green')) or
    (model = 'nano3' and finish in ('silver', 'black', 'blue', 'green', 'red', 'pink')) or
    (model = 'nano5' and finish in ('silver', 'black', 'purple', 'blue', 'green', 'yellow', 'orange', 'red', 'pink')) or
    (model = 'classic160' and finish in ('silver', 'black')) or
    (model = 'shuffle2' and finish in ('silver', 'blue', 'pink', 'green', 'orange'))
  )
);
create function public.owns_ipod_profile(target_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.users u
    join auth.identities i on i.user_id = auth.uid() and i.provider = 'spotify'
    where u.id = target_user_id and (
      i.provider_id = u.spotify_id or
      i.identity_data ->> 'provider_id' = u.spotify_id or
      i.identity_data ->> 'sub' = u.spotify_id
    )
  );
$function$;
revoke all on function public.owns_ipod_profile(uuid) from public, anon;
grant execute on function public.owns_ipod_profile(uuid) to authenticated;
alter table public.ipod_preferences enable row level security;
revoke all on public.ipod_preferences from anon, authenticated;
grant select on public.ipod_preferences to anon, authenticated;
grant insert, update on public.ipod_preferences to authenticated;
create policy "Device choices are visible with the collection"
  on public.ipod_preferences for select using (true);
create policy "Choose your own iPod"
  on public.ipod_preferences for insert to authenticated
  with check (
    owner_id = auth.uid() and public.owns_ipod_profile(user_id)
  );
create policy "Change your own iPod"
  on public.ipod_preferences for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid() and public.owns_ipod_profile(user_id)
  );
