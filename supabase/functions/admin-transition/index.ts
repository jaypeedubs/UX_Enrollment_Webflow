import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// event_type values the admin can fire and their resulting status.
// null = no status change (e.g. more_info_requested keeps status = in_review)
const EVENT_STATUS_MAP: Record<string, string | null> = {
  in_review:           'in_review',
  accepted:            'accepted',
  rejected:            'rejected',
  waitlisted:          'waitlisted',
  more_info_requested: null,
  withdrawn:           'withdrawn',
}

// Which admin events are allowed from each current application status.
// Statuses not listed here are terminal (enrolled, enrollment_confirmed, draft).
const ALLOWED_EVENTS: Record<string, string[]> = {
  submitted:   ['in_review', 'accepted', 'rejected', 'waitlisted', 'more_info_requested', 'withdrawn'],
  in_review:   ['accepted', 'rejected', 'waitlisted', 'more_info_requested', 'withdrawn'],
  waitlisted:  ['accepted', 'rejected', 'withdrawn'],
  accepted:    ['rejected', 'withdrawn'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  // Admin-only: accept service role key (Retool) OR a JWT with role=admin claim
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  let authorized = authHeader === `Bearer ${serviceKey}`
  if (!authorized && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await anonClient.auth.getUser()
    authorized = user?.app_metadata?.role === 'admin'
  }
  if (!authorized) return new Response('Unauthorized', { status: 401 })

  try {
    const { application_id, event_type, admin_notes, applicant_message } = await req.json()

    if (!application_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'application_id and event_type are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
      )
    }

    if (!(event_type in EVENT_STATUS_MAP)) {
      return new Response(
        JSON.stringify({ error: `Unknown event_type: ${event_type}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
      )
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    const { data: app, error: appErr } = await admin
      .from('applications')
      .select('id, status')
      .eq('id', application_id)
      .single()

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const allowed = ALLOWED_EVENTS[app.status]
    if (!allowed || !allowed.includes(event_type)) {
      return new Response(
        JSON.stringify({
          error: `Cannot apply event '${event_type}' to application in status '${app.status}'`,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json', ...CORS } }
      )
    }

    const newStatus = EVENT_STATUS_MAP[event_type]

    // Build update payload (only fields that actually change)
    const updatePayload: Record<string, unknown> = {}
    if (newStatus !== null) updatePayload.status = newStatus
    if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateErr } = await admin
        .from('applications')
        .update(updatePayload)
        .eq('id', application_id)

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
        )
      }
    }

    // Insert event — DB webhook picks this up and fires handle-notification
    await admin.from('application_events').insert({
      application_id,
      event_type,
      metadata: (admin_notes || applicant_message)
        ? { ...(admin_notes ? { admin_notes } : {}), ...(applicant_message ? { applicant_message } : {}) }
        : undefined,
    })

    return new Response(
      JSON.stringify({ ok: true, old_status: app.status, new_status: newStatus ?? app.status }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  } catch (err: any) {
    const message = err?.message ?? JSON.stringify(err) ?? String(err)
    console.error('admin-transition error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
})
