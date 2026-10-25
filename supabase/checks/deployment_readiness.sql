-- Read-only: inspect production policies and grants without reading user data.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'tracks', 'user_tracks', 'ipod_preferences')
order by tablename;

-- Token columns must not be readable by other accounts or anonymous visitors.
-- Interpret grants together with RLS policies, rather than grants alone.
select grantee, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'users'
  and column_name in ('access_token', 'refresh_token', 'token_expires_at')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by grantee, column_name, privilege_type;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('users', 'tracks', 'user_tracks', 'ipod_preferences')
order by tablename, policyname;

-- The iPod ownership helper reads trusted Spotify identities in this schema.
select column_name, data_type
from information_schema.columns
where table_schema = 'auth' and table_name = 'identities'
  and column_name in ('user_id', 'provider', 'provider_id', 'identity_data')
order by column_name;
