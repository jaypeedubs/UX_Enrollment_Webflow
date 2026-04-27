-- ============================================================
-- ICIT Application System — Notification Templates Seed
-- ============================================================
-- Template variables (interpolated by handle-notification):
--   {{applicant_name}}   {{program_name}}    {{admin_notes}}
--   {{dashboard_url}}    {{apply_url}}       {{status_url}}
--   {{enrollment_url}}   {{site_url}}
-- ============================================================

-- Shared email wrapper macro (inline via repeated CTE is too verbose;
-- templates include minimal HTML so Resend renders well in all clients)

-- ============================================================
-- draft_saved
-- ============================================================
INSERT INTO notification_templates (trigger_event, channel, subject, body) VALUES
('draft_saved', 'email',
  'Your ICIT application draft has been saved',
  '<p>Hi {{applicant_name}},</p>
<p>Your application for <strong>{{program_name}}</strong> has been saved as a draft. You can continue where you left off at any time.</p>
<p><a href="{{apply_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Continue Application</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('draft_saved', 'in_app',
  NULL,
  'Your application for {{program_name}} has been saved as a draft.'
),

-- ============================================================
-- submitted
-- ============================================================
('submitted', 'email',
  'Application received — {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>We've received your application for <strong>{{program_name}}</strong>. Our admissions team will review it shortly.</p>
<p>You can track your application status at any time:</p>
<p><a href="{{status_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View Application Status</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('submitted', 'in_app',
  NULL,
  'Your application for {{program_name}} has been submitted. We'll be in touch soon.'
),

-- ============================================================
-- in_review
-- ============================================================
('in_review', 'email',
  'Your application is under review — {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>Good news — your application for <strong>{{program_name}}</strong> is now being reviewed by our admissions team.</p>
<p>We'll notify you as soon as a decision has been made. In the meantime, you can check your status here:</p>
<p><a href="{{status_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View Status</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('in_review', 'in_app',
  NULL,
  'Your application for {{program_name}} is now under review.'
),

-- ============================================================
-- accepted
-- ============================================================
('accepted', 'email',
  'Congratulations — you''ve been accepted to {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>We're thrilled to let you know that you've been <strong>accepted</strong> into <strong>{{program_name}}</strong>!</p>
<p>To secure your spot, please confirm your enrollment and complete payment:</p>
<p><a href="{{enrollment_url}}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Confirm Enrollment</a></p>
<p>If you have any questions, please contact our admissions team.</p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('accepted', 'in_app',
  NULL,
  'Congratulations! You''ve been accepted to {{program_name}}. Please confirm your enrollment to secure your spot.'
),

-- ============================================================
-- rejected
-- ============================================================
('rejected', 'email',
  'Update on your application — {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>Thank you for your interest in <strong>{{program_name}}</strong>. After careful review, we are unable to offer you a place in this cohort.</p>
<p>We encourage you to apply again in a future cycle. If you have questions, please reach out to our admissions team.</p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('rejected', 'in_app',
  NULL,
  'We have reviewed your application for {{program_name}}. Unfortunately, we are unable to offer you a place in this cohort.'
),

-- ============================================================
-- waitlisted
-- ============================================================
('waitlisted', 'email',
  'You''ve been waitlisted — {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>Your application for <strong>{{program_name}}</strong> has been placed on our waitlist. This means you are a strong candidate and may be offered a spot if one becomes available.</p>
<p>We'll contact you immediately if your status changes. You can check your current status here:</p>
<p><a href="{{status_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View Status</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('waitlisted', 'in_app',
  NULL,
  'Your application for {{program_name}} has been placed on the waitlist. We''ll notify you if a spot opens up.'
),

-- ============================================================
-- more_info_requested
-- ============================================================
('more_info_requested', 'email',
  'Additional information needed — {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>Our admissions team has reviewed your application for <strong>{{program_name}}</strong> and requires some additional information before a decision can be made.</p>
<blockquote style="border-left:3px solid #e5e7eb;padding-left:16px;color:#374151;margin:16px 0;">{{admin_notes}}</blockquote>
<p>Please log in and submit your response:</p>
<p><a href="{{status_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Respond Now</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('more_info_requested', 'in_app',
  NULL,
  'The admissions team has requested additional information about your {{program_name}} application. Please log in to respond.'
),

-- ============================================================
-- withdrawn
-- ============================================================
('withdrawn', 'email',
  'Application withdrawn — {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>Your application for <strong>{{program_name}}</strong> has been withdrawn as requested. If this was a mistake or you'd like to apply again in a future cycle, please contact us.</p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('withdrawn', 'in_app',
  NULL,
  'Your application for {{program_name}} has been withdrawn.'
),

-- ============================================================
-- draft_deadline_reminder
-- ============================================================
('draft_deadline_reminder', 'email',
  'Reminder: your {{program_name}} application is still in draft',
  '<p>Hi {{applicant_name}},</p>
<p>Just a reminder that you have an unfinished application for <strong>{{program_name}}</strong>. The deadline is approaching — don't miss your chance.</p>
<p><a href="{{apply_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Complete Application</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('draft_deadline_reminder', 'in_app',
  NULL,
  'Reminder: your application for {{program_name}} is still a draft. Complete and submit before the deadline.'
),

-- ============================================================
-- enrollment_confirmed
-- ============================================================
('enrollment_confirmed', 'email',
  'Enrollment confirmed — completing payment for {{program_name}}',
  '<p>Hi {{applicant_name}},</p>
<p>You've confirmed your intent to enroll in <strong>{{program_name}}</strong>. You should be redirected to the payment page now.</p>
<p>If you were not redirected, please click below to complete payment:</p>
<p><a href="{{enrollment_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Complete Payment</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('enrollment_confirmed', 'in_app',
  NULL,
  'You''ve confirmed enrollment in {{program_name}}. Complete your payment to finalize your spot.'
),

-- ============================================================
-- payment_received
-- ============================================================
('payment_received', 'email',
  'Payment received — welcome to {{program_name}}!',
  '<p>Hi {{applicant_name}},</p>
<p>Your payment has been received and your enrollment in <strong>{{program_name}}</strong> is now confirmed. Welcome!</p>
<p>You will receive a separate email with login details for the ICIT learning platform once your account has been set up.</p>
<p><a href="{{dashboard_url}}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Go to Dashboard</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
),
('payment_received', 'in_app',
  NULL,
  'Payment received! Your enrollment in {{program_name}} is confirmed. Welcome to ICIT.'
)

ON CONFLICT (trigger_event, channel) DO UPDATE
  SET subject = EXCLUDED.subject,
      body    = EXCLUDED.body;
