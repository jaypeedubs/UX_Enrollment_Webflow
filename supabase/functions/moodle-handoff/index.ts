import { createClient } from 'npm:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// STUB — Moodle credentials are TBD.
//
// When MOODLE_BASE_URL and MOODLE_API_TOKEN are available, replace the stub
// block below with:
//
//   1. Check if Moodle user exists:
//      wsfunction=core_user_get_users_by_field&field=email&values[0]=<email>
//
//   2. If not found, create user:
//      wsfunction=core_user_create_users&users[0][username]=<email>
//        &users[0][email]=<email>&users[0][firstname]=<first>
//        &users[0][lastname]=<last>&users[0][password]=<generated>
//
//   3. Enrol user in course:
//      wsfunction=enrol_manual_enrol_users&enrolments[0][roleid]=5
//        &enrolments[0][userid]=<moodle_user_id>
//        &enrolments[0][courseid]=<moodle_course_id>
//
// Note: programs will need a moodle_course_id column (add via migration) to
// map program_id → Moodle course ID.
// ---------------------------------------------------------------------------

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
      .select('applicant_id, program_id, programs(name)')
      .eq('id', application_id)
      .single()

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404 })
    }

    const { data: { user } } = await admin.auth.admin.getUserById(app.applicant_id)
    const programName = (app.programs as { name: string } | null)?.name ?? 'unknown'

    const moodleBaseUrl = Deno.env.get('MOODLE_BASE_URL')
    const moodleToken = Deno.env.get('MOODLE_API_TOKEN')

    if (!moodleBaseUrl || !moodleToken) {
      console.warn('Moodle credentials not configured — skipping enrolment:', application_id)

      await admin.from('application_events').insert({
        application_id,
        event_type: 'moodle_pending',
        metadata: {
          reason: 'Moodle credentials not yet configured',
          applicant_email: user?.email,
          program: programName,
        },
      })

      return new Response(JSON.stringify({ ok: true, status: 'pending_credentials' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // --- Replace this block with real Moodle API calls ---
    console.log('Moodle stub reached for application:', application_id)
    // -----------------------------------------------------

    return new Response(JSON.stringify({ ok: true, status: 'stub' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
