-- Add course_code to programs for admin panel course circles + filtering
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS course_code TEXT
    CHECK (course_code IN ('ASC','ISC','AAC','FAC','IFAC','CITEC'));

-- Backfill from program names
UPDATE programs SET course_code =
  CASE
    WHEN name ILIKE '%Advanced Surgeon%'          THEN 'ASC'
    WHEN name ILIKE '%Intermediate Surgeon%'       THEN 'ISC'
    WHEN name ILIKE '%Advanced Audiologist%'       THEN 'AAC'
    WHEN name ILIKE '%International Fellow%'       THEN 'IFAC'
    WHEN name ILIKE '%Fellow%'                     THEN 'FAC'
    WHEN name ILIKE '%CITEC%'                      THEN 'CITEC'
    ELSE NULL
  END
WHERE course_code IS NULL;

-- Update more_info_requested email: use {{applicant_message_html}} for
-- the admin-typed message (replaces {{admin_notes}} blockquote)
UPDATE notification_templates
SET body =
'<p>Hi {{applicant_name}},</p>
<p>Our admissions team has reviewed your application for <strong>{{program_name}}</strong> and requires some additional information before a decision can be made.</p>
{{applicant_message_html}}
<p>Please log in and submit your response:</p>
<p><a href="{{status_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Respond Now</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
WHERE trigger_event = 'more_info_requested' AND channel = 'email';

-- Update accepted email: append {{applicant_message_html}} for optional personal note
UPDATE notification_templates
SET body =
'<p>Hi {{applicant_name}},</p>
<p>We''re thrilled to let you know that you''ve been <strong>accepted</strong> into <strong>{{program_name}}</strong>!</p>
{{applicant_message_html}}
<p>To secure your spot, please confirm your enrollment and complete payment:</p>
<p><a href="{{enrollment_url}}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Confirm Enrollment</a></p>
<p>If you have any questions, please contact our admissions team.</p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
WHERE trigger_event = 'accepted' AND channel = 'email';

-- Update waitlisted email: append {{applicant_message_html}} for optional personal note
UPDATE notification_templates
SET body =
'<p>Hi {{applicant_name}},</p>
<p>Your application for <strong>{{program_name}}</strong> has been placed on our waitlist. This means you are a strong candidate and may be offered a spot if one becomes available.</p>
{{applicant_message_html}}
<p>We''ll contact you immediately if your status changes. You can check your current status here:</p>
<p><a href="{{status_url}}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View Status</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
WHERE trigger_event = 'waitlisted' AND channel = 'email';

-- Update rejected email: append {{applicant_message_html}} for optional reason
UPDATE notification_templates
SET body =
'<p>Hi {{applicant_name}},</p>
<p>Thank you for your interest in <strong>{{program_name}}</strong>. After careful review, we are unable to offer you a place in this cohort.</p>
{{applicant_message_html}}
<p>We encourage you to apply again in a future cycle. If you have questions, please reach out to our admissions team.</p>
<p style="color:#6b7280;font-size:13px;margin-top:24px;">ICIT Enrollment Portal</p>'
WHERE trigger_event = 'rejected' AND channel = 'email';
