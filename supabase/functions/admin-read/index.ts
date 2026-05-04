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
    return new Response('Unauthorized', { status: 401 })
  }

  // Verify the user JWT and check admin role
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user || user.app_metadata?.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 })
  }

  // Privileged reads via service role
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const url = new URL(req.url)
    const resource = url.searchParams.get('resource')

    if (resource === 'programs') {
      const { data, error } = await admin
        .from('programs')
        .select('id, name, course_code')
        .order('name')
      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // Default: applications with program info + applicant details from auth.users
    const { data: apps, error: appsErr } = await admin
      .from('applications')
      .select(`
        id,
        applicant_id,
        status,
        admin_notes,
        locked_fields,
        submitted_at,
        updated_at,
        programs ( name, course_code )
      `)
      .order('updated_at', { ascending: false })
    if (appsErr) throw appsErr

    const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (usersErr) throw usersErr

    const userMap = new Map(users.map((u: any) => [u.id, u]))

    const result = (apps ?? []).map((app: any) => {
      const u: any = userMap.get(app.applicant_id) ?? {}
      const meta = u.user_metadata ?? {}
      return {
        ...app,
        email:      u.email ?? '',
        first_name: meta.first_name ?? meta.full_name?.split(' ')[0] ?? '',
        last_name:  meta.last_name  ?? meta.full_name?.split(' ').slice(1).join(' ') ?? '',
        program_name:  app.programs?.name        ?? '',
        course_code:   app.programs?.course_code ?? '',
      }
    })

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    const message = err?.message ?? err?.msg ?? JSON.stringify(err) ?? String(err)
    console.error('admin-read error:', message, err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
