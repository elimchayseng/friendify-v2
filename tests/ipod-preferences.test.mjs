import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { IPODS } from '../src/lib/ipods.ts'

const authA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const authB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const profileA = '11111111-1111-4111-8111-111111111111'
const profileB = '22222222-2222-4222-8222-222222222222'

test('saved iPods enforce profile ownership and valid hardware finishes', async t => {
  const db = new PGlite()
  try {
    // Mirror the existing separate profile/auth IDs and broad legacy defaults.
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create table auth.identities(user_id uuid, provider text, provider_id text, identity_data jsonb);
      create table public.users(id uuid primary key, spotify_id text);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth, public to anon, authenticated;
      insert into auth.users values ('${authA}'), ('${authB}');
      insert into public.users values ('${profileA}', 'spotify-a'), ('${profileB}', 'spotify-b');
      insert into auth.identities values
        ('${authA}', 'spotify', 'spotify-a', '{}'),
        ('${authB}', 'spotify', 'spotify-b', '{}');
      alter default privileges grant all on tables to anon, authenticated;
      alter default privileges grant all on functions to anon, authenticated;
    `)
    await db.exec(readFileSync(new URL('../supabase/migrations/20261025000000_create_ipod_preferences.sql', import.meta.url), 'utf8'))
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${authA}'`)

    await t.test('saves for the Spotify identity when profile and auth UUIDs differ', async () => {
      await db.query('insert into ipod_preferences(user_id, model, finish) values ($1, $2, $3)', [profileA, 'mini2', 'blue'])
      const result = await db.query('select model, finish from ipod_preferences where user_id = $1', [profileA])
      assert.deepEqual(result.rows[0], { model: 'mini2', finish: 'blue' })
    })
    await t.test('every finish offered by the picker is accepted by PostgreSQL', async () => {
      for (const model of IPODS) for (const finish of model.finishes) {
        await db.query('update ipod_preferences set model = $1, finish = $2 where user_id = $3', [model.id, finish, profileA])
      }
      await db.query('update ipod_preferences set model = $1, finish = $2 where user_id = $3', ['shuffle2', 'green', profileA])
    })
    await t.test('rejects creating or moving a choice onto another profile', async () => {
      await assert.rejects(db.query('insert into ipod_preferences(user_id, model, finish) values ($1, $2, $3)', [profileB, 'nano3', 'blue']), error => error.code === '42501')
      await assert.rejects(db.query('update ipod_preferences set user_id = $1 where user_id = $2', [profileB, profileA]), error => error.code === '42501')
    })
    await t.test('rejects invented model/finish combinations', async () => {
      await assert.rejects(db.query("update ipod_preferences set model = 'classic4', finish = 'purple' where user_id = $1", [profileA]), error => error.code === '23514')
    })
    await t.test('another account can read the choice but cannot edit it', async () => {
      await db.exec(`set request.jwt.claim.sub = '${authB}'`)
      await db.query('insert into ipod_preferences(user_id, model, finish) values ($1, $2, $3)', [profileB, 'classic160', 'black'])
      await db.query("update ipod_preferences set finish = 'silver' where user_id = $1", [profileA])
      assert.equal((await db.query('select finish from ipod_preferences where user_id = $1', [profileA])).rows[0].finish, 'green')
    })
    await t.test('anonymous access is read-only despite legacy default grants', async () => {
      await db.exec('reset role; set role anon')
      assert.equal((await db.query('select model from ipod_preferences')).rows.length, 2)
      await assert.rejects(db.query("update ipod_preferences set finish = 'silver' where user_id = $1", [profileA]), error => error.code === '42501')
      await assert.rejects(db.query('select public.owns_ipod_profile($1)', [profileA]), error => error.code === '42501')
    })
    await t.test('deleting a profile cleans up its saved choice', async () => {
      await db.exec('reset role')
      await db.query('delete from public.users where id = $1', [profileA])
      assert.equal((await db.query('select model from ipod_preferences')).rows.length, 1)
    })
  } finally { await db.close() }
})
