import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  // Raw body must be read before any parsing — required for signature verification
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook Error: ${err}`, { status: 400 })
  }

  // Only handle payment completion
  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const applicationId = session.metadata?.application_id

  if (!applicationId) {
    console.error('No application_id in session metadata:', session.id)
    return new Response('No application_id in session metadata', { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Update status → enrolled. .eq('status', 'enrollment_confirmed') guards against
  // Stripe delivering the same event twice.
  const { error: updateErr } = await admin
    .from('applications')
    .update({ status: 'enrolled' })
    .eq('id', applicationId)
    .eq('status', 'enrollment_confirmed')

  if (updateErr) {
    console.error('Failed to update application status:', updateErr)
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 })
  }

  // Insert event — DB webhook picks this up and fires handle-notification
  await admin.from('application_events').insert({
    application_id: applicationId,
    event_type: 'payment_received',
    metadata: {
      stripe_session_id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
    },
  })

  // Fire moodle-handoff asynchronously (fire-and-forget; errors logged inside)
  const moodleUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/moodle-handoff`
  fetch(moodleUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ application_id: applicationId }),
  }).catch((err) => console.error('moodle-handoff call failed:', err))

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
