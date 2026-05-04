import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
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

    // Default: applications with program info
    const { data, error } = await admin
      .from('applications')
      .select(`
        id,
        applicant_id,
        status,
        first_name,
        last_name,
        email,
        admin_notes,
        submitted_at,
        updated_at,
        programs ( name, course_code )
      `)
      .order('updated_at', { ascending: false })
    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
