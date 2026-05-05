import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Helper to call Moodle REST API.
 */
async function callMoodle(baseUrl: string, token: string, wsFunction: string, params: Record<string, string | number | boolean>) {
  const url = new URL(`${baseUrl}/webservice/rest/server.php`)
  url.searchParams.set('wstoken', token)
  url.searchParams.set('wsfunction', wsFunction)
  url.searchParams.set('moodlewsrestformat', 'json')

  // Moodle expects flat parameters or specific array syntax.
  // We'll handle basic flat params here; complex arrays should be pre-formatted in params.
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  const res = await fetch(url.toString(), { method: 'POST' })
  if (!res.ok) {
    throw new Error(`Moodle API error: ${res.statusText}`)
  }
  const data = await res.json()
  
  // Moodle returns errors in a 200 response with an exception field
  if (data.exception) {
    throw new Error(`Moodle Exception: ${data.message} (${data.errorcode})`)
  }
  
  return data
}

Deno.serve(async (req) => {
  // Only callable internally via service role Bearer token
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { application_id } = await req.json()
    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id required' }), { status: 400 })
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    const { data: app, error: appErr } = await admin
      .from('applications')
      .select('applicant_id, program_id, programs(name, moodle_course_id)')
      .eq('id', application_id)
      .single()

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404 })
    }

    const program = app.programs as any
    const programName = program?.name ?? 'unknown'
    const moodleCourseId = program?.moodle_course_id

    const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(app.applicant_id)
    if (userErr || !user) {
       return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    const email = user.email!
    const firstName = user.user_metadata?.first_name || 'Student'
    const lastName = user.user_metadata?.last_name || 'User'

    const moodleBaseUrl = Deno.env.get('MOODLE_BASE_URL')
    const moodleToken = Deno.env.get('MOODLE_API_TOKEN')

    if (!moodleBaseUrl || !moodleToken) {
      console.warn('Moodle credentials not configured — skipping enrolment:', application_id)

      await admin.from('application_events').insert({
        application_id,
        event_type: 'moodle_pending',
        metadata: {
          reason: 'Moodle credentials not yet configured',
          applicant_email: email,
          program: programName,
        },
      })

      return new Response(JSON.stringify({ ok: true, status: 'pending_credentials' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!moodleCourseId) {
      console.warn('Moodle course ID not configured for program — skipping enrolment:', programName)

      await admin.from('application_events').insert({
        application_id,
        event_type: 'moodle_error',
        metadata: {
          reason: 'Moodle Course ID not configured for program',
          applicant_email: email,
          program: programName,
        },
      })

      return new Response(JSON.stringify({ ok: true, status: 'missing_course_id' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      // 1. Check if Moodle user exists
      const users = await callMoodle(moodleBaseUrl, moodleToken, 'core_user_get_users_by_field', {
        'field': 'email',
        'values[0]': email,
      })

      let moodleUserId: number

      if (users.length > 0) {
        moodleUserId = users[0].id
        console.log(`Moodle user already exists: ${email} (ID: ${moodleUserId})`)
      } else {
        // 2. Create Moodle user
        // Generate a random-ish password or use a placeholder that they must reset
        const password = `ICIT!${Math.random().toString(36).slice(-8)}`
        const newUser = await callMoodle(moodleBaseUrl, moodleToken, 'core_user_create_users', {
          'users[0][username]': email.toLowerCase(),
          'users[0][email]': email,
          'users[0][firstname]': firstName,
          'users[0][lastname]': lastName,
          'users[0][password]': password,
        })
        moodleUserId = newUser[0].id
        console.log(`Created Moodle user: ${email} (ID: ${moodleUserId})`)
      }

      // 3. Enrol user in course (Role ID 5 is Student)
      await callMoodle(moodleBaseUrl, moodleToken, 'enrol_manual_enrol_users', {
        'enrolments[0][roleid]': 5,
        'enrolments[0][userid]': moodleUserId,
        'enrolments[0][courseid]': moodleCourseId,
      })

      console.log(`Enrolled user ${email} in Moodle course ${moodleCourseId}`)

      // 4. Log success event
      await admin.from('application_events').insert({
        application_id,
        event_type: 'moodle_enrolled',
        metadata: {
          moodle_user_id: moodleUserId,
          moodle_course_id: moodleCourseId,
          applicant_email: email,
          program: programName,
        },
      })

      return new Response(JSON.stringify({ ok: true, moodle_user_id: moodleUserId }), {
        headers: { 'Content-Type': 'application/json' },
      })

    } catch (moodleErr) {
      console.error('Moodle API failure:', moodleErr)

      await admin.from('application_events').insert({
        application_id,
        event_type: 'moodle_error',
        metadata: {
          error: String(moodleErr),
          applicant_email: email,
          program: programName,
          moodle_course_id: moodleCourseId,
        },
      })

      return new Response(JSON.stringify({ error: String(moodleErr) }), { status: 500 })
    }

  } catch (err) {
    console.error('Internal server error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
