async page => {
  const SUPABASE_URL = process.env.SUPABASE_URL || ''
  const FN_URL   = `${SUPABASE_URL}/functions/v1/admin-transition`
  const REST_URL = `${SUPABASE_URL}/rest/v1`
  const SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const FAKE_ID  = '00000000-0000-0000-0000-000000000001'

  const pass = (name, detail) => ({ name, pass: true,  ...detail })
  const fail = (name, detail) => ({ name, pass: false, ...detail })
  const results = []

  // ── Helper ───────────────────────────────────────────────────────────────
  const post = (body, authOverride) =>
    page.request.post(FN_URL, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': authOverride ?? `Bearer ${SVC_KEY}`,
      },
      data: body,
      failOnStatusCode: false,
    })

  const rest = (path) =>
    page.request.get(`${REST_URL}${path}`, {
      headers: {
        'apikey':        SVC_KEY,
        'Authorization': `Bearer ${SVC_KEY}`,
        'Prefer':        'count=exact',
      },
      failOnStatusCode: false,
    })

  // ── Auth tests ────────────────────────────────────────────────────────────
  {
    const r = await post({}, '')                                   // no auth
    const s = r.status()
    results.push(s === 401
      ? pass('No auth header → 401',    { status: s })
      : fail('No auth header → 401',    { status: s, expected: 401 }))
  }
  {
    const r = await post({}, 'Bearer totally_wrong_key')           // bad key
    const s = r.status()
    results.push(s === 401
      ? pass('Wrong auth key → 401',    { status: s })
      : fail('Wrong auth key → 401',    { status: s, expected: 401 }))
  }

  // ── Input validation tests (need valid auth) ──────────────────────────────
  {
    const r = await post({})                                       // empty body
    const s = r.status(); const b = await r.json()
    results.push(s === 400
      ? pass('Empty body → 400',        { status: s, error: b.error })
      : fail('Empty body → 400',        { status: s, body: b }))
  }
  {
    const r = await post({ application_id: FAKE_ID, event_type: 'launch_rockets' })
    const s = r.status(); const b = await r.json()
    results.push(s === 400
      ? pass('Unknown event_type → 400', { status: s, error: b.error })
      : fail('Unknown event_type → 400', { status: s, body: b }))
  }

  // ── Existence check ───────────────────────────────────────────────────────
  {
    const r = await post({ application_id: FAKE_ID, event_type: 'in_review' })
    const s = r.status(); const b = await r.json()
    results.push(s === 404
      ? pass('Non-existent application_id → 404', { status: s })
      : fail('Non-existent application_id → 404', { status: s, body: b }))
  }

  // ── State machine: transition from non-existent/terminal statuses ─────────
  // We can't easily test a real 422 without seeded data, but all 5 tests above
  // confirm the function logic layer is reachable and responding correctly.

  // ── Supabase REST API (powers Retool read queries) ────────────────────────
  {
    const r = await rest('/programs?select=id,name')
    const s = r.status(); const b = await r.json()
    const count = Array.isArray(b) ? b.length : '?'
    results.push(s === 200
      ? pass('programs table readable (service role)', { status: s, rows: count })
      : fail('programs table readable (service role)', { status: s, body: b }))
  }
  {
    const r = await rest('/applications?select=id,status&limit=5')
    const s = r.status(); const b = await r.json()
    const count = Array.isArray(b) ? b.length : '?'
    results.push(s === 200
      ? pass('applications table readable (service role)', { status: s, rows: count })
      : fail('applications table readable (service role)', { status: s, body: b }))
  }
  {
    const r = await rest('/notification_templates?select=trigger_event,channel')
    const s = r.status(); const b = await r.json()
    const count = Array.isArray(b) ? b.length : '?'
    results.push(s === 200 && count === 22
      ? pass('notification_templates: 22 rows seeded', { status: s, rows: count })
      : fail('notification_templates: 22 rows seeded', { status: s, rows: count, expected: 22 }))
  }
  {
    // Anon key should NOT be able to read applications (RLS guard)
    const ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
    const r = await page.request.get(`${REST_URL}/applications?select=id`, {
      headers: {
        'apikey':        ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      failOnStatusCode: false,
    })
    const s = r.status(); const b = await r.json()
    // With RLS, anon gets 200 but an empty array (no rows visible)
    const count = Array.isArray(b) ? b.length : '?'
    results.push(s === 200 && count === 0
      ? pass('RLS blocks anon reads on applications (returns 0 rows)', { status: s, rows: count })
      : fail('RLS blocks anon reads on applications (returns 0 rows)', { status: s, rows: count, note: 'RLS may not be configured or leaking rows' }))
  }

  return results
}
