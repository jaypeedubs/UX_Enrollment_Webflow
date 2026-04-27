import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const SITE_URL = Deno.env.get('SITE_URL') ?? ''

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()

    // DB webhook sends { type, table, record, schema, old_record }
    const record = payload.record
    if (!record) return new Response('no record', { status: 200 })

    const { id: eventId, application_id, event_type, metadata = {} } = record

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch application + program name
    const { data: app, error: appErr } = await admin
      .from('applications')
      .select('applicant_id, program_id, admin_notes, programs(name)')
      .eq('id', application_id)
      .single()

    if (appErr || !app) {
      console.error('application not found:', application_id, appErr)
      return new Response(JSON.stringify({ error: 'application not found' }), { status: 200 })
    }

    const programName = (app.programs as { name: string } | null)?.name ?? 'your program'

    // Fetch applicant email + name from auth.users (requires service role)
    const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(app.applicant_id)
    if (userErr || !user) {
      console.error('user not found:', app.applicant_id, userErr)
      return new Response(JSON.stringify({ error: 'user not found' }), { status: 200 })
    }

    const applicantEmail = user.email ?? ''
    const applicantName =
      [user.user_metadata?.first_name, user.user_metadata?.last_name]
        .filter(Boolean)
        .join(' ') || applicantEmail

    // Fetch both templates in one query
    const { data: templates } = await admin
      .from('notification_templates')
      .select('channel, subject, body')
      .eq('trigger_event', event_type)

    const emailTpl = templates?.find((t) => t.channel === 'email')
    const inAppTpl = templates?.find((t) => t.channel === 'in_app')

    const vars: Record<string, string> = {
      applicant_name: applicantName,
      program_name: programName,
      admin_notes: app.admin_notes ?? '',
      site_url: SITE_URL,
      dashboard_url: `${SITE_URL}/dashboard`,
      apply_url: `${SITE_URL}/apply`,
      status_url: `${SITE_URL}/application-status`,
      enrollment_url: `${SITE_URL}/enrollment-confirmation`,
    }

    const results: Record<string, unknown> = {}

    // Send email
    if (emailTpl && applicantEmail) {
      const { data, error } = await resend.emails.send({
        from: 'ICIT Enrollment <noreply@icit.org>',
        to: applicantEmail,
        subject: interpolate(emailTpl.subject ?? '', vars),
        html: interpolate(emailTpl.body, vars),
      })
      results.email = error ? { error: error.message } : { id: data?.id }
    }

    // Insert in-app notification
    if (inAppTpl) {
      const { error } = await admin.from('notifications').insert({
        applicant_id: app.applicant_id,
        application_id,
        message: interpolate(inAppTpl.body, vars),
      })
      results.in_app = error ? { error: error.message } : { ok: true }
    }

    // Write results back to event metadata for auditability
    await admin
      .from('application_events')
      .update({ metadata: { ...metadata, notification_result: results } })
      .eq('id', eventId)

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
