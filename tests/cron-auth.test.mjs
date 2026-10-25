import { test } from 'node:test'
import assert from 'node:assert/strict'

// The handler is imported against inert local configuration. No network requests
// are permitted during authentication tests, even if authorization regresses.
process.env.SUPABASE_URL = 'https://unconfigured.invalid'
process.env.SUPABASE_ANON_KEY = 'test-public-key'
const headers = [undefined, 'Bearer undefined', 'Bearer wrong-secret']

test('cron rejects missing configuration and invalid credentials without leaking secrets', async () => {
  const originalFetch = globalThis.fetch
  const originalError = console.error
  const originalLog = console.log
  const logs = []
  let requests = 0
  globalThis.fetch = async () => { requests++; throw new Error('Unexpected network request') }
  console.error = (...args) => logs.push(args.join(' '))
  console.log = (...args) => logs.push(args.join(' '))
  try {
    delete process.env.CRON_SECRET
    const missing = await import('../api/updateTrackOfDay.ts?missing')
    for (const authorization of headers) {
      const response = await missing.GET(new Request('http://localhost/api/updateTrackOfDay', { headers: authorization ? { authorization } : {} }))
      assert.equal(response.status, 503)
    }
    process.env.CRON_SECRET = 'test-private-cron-secret'
    const configured = await import('../api/updateTrackOfDay.ts?configured')
    for (const authorization of headers) {
      const response = await configured.GET(new Request('http://localhost/api/updateTrackOfDay', { headers: authorization ? { authorization } : {} }))
      assert.equal(response.status, 401)
      assert.ok(!(await response.text()).includes(process.env.CRON_SECRET))
    }
    assert.equal(requests, 0)
    assert.ok(!logs.join('\n').includes('test-private-cron-secret'))
    assert.ok(!logs.join('\n').includes('Bearer wrong-secret'))
  } finally {
    globalThis.fetch = originalFetch
    console.error = originalError
    console.log = originalLog
    delete process.env.CRON_SECRET
  }
})
