import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
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

  // Privileged reads/writes via service role
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const resource = url.searchParams.get('resource')

  try {
    // Programs CRUD
    if (resource === 'programs') {
      // GET list
      if (req.method === 'GET' && !url.searchParams.has('id')) {
        const { data, error } = await admin.from('programs').select('*').order('created_at', { ascending: false })
        if (error) throw error
        return json(data)
      }

      // POST create
      if (req.method === 'POST') {
        const body = await req.json()
        const { data, error } = await admin.from('programs').insert(body).select().single()
        if (error) throw error
        return json(data, 201)
      }

      // PATCH update
      if (req.method === 'PATCH') {
        const id = url.searchParams.get('id')
        if (!id) return new Response('Missing id', { status: 400, headers: CORS })
        const body = await req.json()
        const { data, error } = await admin.from('programs').update(body).eq('id', id).select().single()
        if (error) throw error
        return json(data)
      }

      // DELETE archive
      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id')
        if (!id) return new Response('Missing id', { status: 400, headers: CORS })
        const { error } = await admin.from('programs').update({ status: 'archived' }).eq('id', id)
        if (error) throw error
        return json({ ok: true })
      }
    }

    // Default: applications
    const { data: apps, error: appsErr } = await admin
      .from('applications')
      .select(`
        id, applicant_id, status, admin_notes, locked_fields, submitted_at, updated_at,
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
        email: u.email ?? '',
        first_name: meta.first_name ?? meta.full_name?.split(' ')[0] ?? '',
        last_name: meta.last_name ?? meta.full_name?.split(' ').slice(1).join(' ') ?? '',
        program_name: app.programs?.name ?? '',
        course_code: app.programs?.course_code ?? '',
      }
    })

    return json(result)
  } catch (err: any) {
    console.error('admin-read error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
