import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { saveSpotifyProfile } from '../src/lib/spotify-profile.ts'

const profile = {
  spotify_id: 'spotify-user',
  username: 'Avery',
  access_token: 'new-access-token',
  token_expires_at: '2030-01-01T00:00:00Z',
}

function captureProfileSave(response) {
  const requests = []
  const client = createClient('https://profile-test.invalid', 'local-public-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, options) => {
        const url = new URL(input)
        assert.equal(url.origin, 'https://profile-test.invalid')
        assert.equal(url.pathname, '/rest/v1/users')
        assert.equal(url.searchParams.get('on_conflict'), 'spotify_id')
        assert.equal(options.method, 'POST')
        requests.push(JSON.parse(options.body))
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  })
  return { client, requests }
}

test('login never sends an absent or blank refresh token to overwrite the stored token', async () => {
  for (const token of [null, undefined, '', '   ']) {
    const stored = { ...profile, id: 'existing-profile', refresh_token: 'cron-rotated-token' }
    const { client, requests } = captureProfileSave(stored)
    const { data, error } = await saveSpotifyProfile(client, { ...profile, refresh_token: token })
    assert.equal(error, null)
    assert.equal(requests.length, 1)
    assert.deepEqual(requests[0], profile)
    assert.ok(!Object.hasOwn(requests[0], 'refresh_token'))
    assert.equal(data.refresh_token, 'cron-rotated-token')
    assert.equal(data.id, 'existing-profile')
  }
})

test('login saves a replacement refresh token when Spotify supplies one', async () => {
  const replacement = { ...profile, refresh_token: 'new-provider-refresh-token' }
  const { client, requests } = captureProfileSave({ ...replacement, id: 'existing-profile' })
  const { data, error } = await saveSpotifyProfile(client, replacement)
  assert.equal(error, null)
  assert.deepEqual(requests, [replacement])
  assert.equal(data.refresh_token, 'new-provider-refresh-token')
})

test('profile save surfaces database errors for the login error handler', async () => {
  const client = createClient('https://profile-test.invalid', 'local-public-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async () => new Response(JSON.stringify({ code: '42501', message: 'permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
  })
  const { data, error } = await saveSpotifyProfile(client, profile)
  assert.equal(data, null)
  assert.equal(error.code, '42501')
})
