import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  // Verify the user JWT and check admin role
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user || user.app_metadata?.role !== 'admin') {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  // Privileged writes via service role
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const resource = url.searchParams.get('resource')
  const applicationId = url.searchParams.get('application_id')

  try {
    // PATCH — update admin notes
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { application_id, admin_notes } = body
      if (!application_id) {
        return new Response('Missing application_id', { status: 400, headers: CORS })
      }

      const { error } = await admin
        .from('applications')
        .update({ admin_notes })
        .eq('id', application_id)

      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // GET cv-url — generate signed URL for the applicant's CV
    if (req.method === 'GET' && resource === 'cv-url') {
      if (!applicationId) {
        return new Response('Missing application_id', { status: 400, headers: CORS })
      }

      const { data: app, error: appError } = await admin
        .from('applications')
        .select('cv_url')
        .eq('id', applicationId)
        .single()

      if (appError || !app) {
        return new Response('Application not found', { status: 404, headers: CORS })
      }
      if (!app.cv_url) {
        return new Response(JSON.stringify({ url: null }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }

      // cv_url stores the storage path, e.g. "applicant_id/application_id.pdf"
      const { data: signed, error: signError } = await admin.storage
        .from('cvs')
        .createSignedUrl(app.cv_url, 3600) // 1-hour expiry

      if (signError) throw signError
      return new Response(JSON.stringify({ url: signed.signedUrl }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // GET timeline — return application_events for an application
    if (req.method === 'GET' && resource === 'timeline') {
      if (!applicationId) {
        return new Response('Missing application_id', { status: 400, headers: CORS })
      }

      const { data, error } = await admin
        .from('application_events')
        .select('id, event_type, triggered_by, metadata, created_at')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    return new Response('Resource not found', { status: 404, headers: CORS })

  } catch (err: any) {
    const message = err?.message ?? err?.msg ?? JSON.stringify(err) ?? String(err)
    console.error('admin-write error:', message, err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
