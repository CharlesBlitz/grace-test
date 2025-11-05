import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  organizationId: string;
  senderId: string;
  residentId: string;
  recipientEmail: string;
  recipientName: string;
  emailType: 'daily_note' | 'incident_report' | 'weekly_summary' | 'care_plan_update' | 'assessment_result';
  subject: string;
  content: string;
  attachmentUrl?: string;
}

function generateEmailHTML(request: EmailRequest, organizationName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${organizationName}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Care Update</p>
  </div>

  <div class="content">
    <p>Dear ${request.recipientName},</p>

    ${request.content}

    ${request.attachmentUrl ? `
      <div class="divider"></div>
      <p>
        <a href="${request.attachmentUrl}" class="button">View Attachment</a>
      </p>
    ` : ''}

    <div class="divider"></div>

    <p style="font-size: 14px; color: #6b7280;">
      This is an automated message from ${organizationName}.
      If you have any questions or concerns, please contact us directly.
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>${organizationName}</strong><br>
      This email was sent to ${request.recipientEmail}<br>
      <a href="#" style="color: #3b82f6; text-decoration: none;">Update email preferences</a>
    </p>
    <p style="margin-top: 10px; font-size: 12px;">
      © ${new Date().getFullYear()} Grace Companion. All rights reserved.
    </p>
  </div>
</body>
</html>
`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const emailRequest: EmailRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', emailRequest.organizationId)
      .single();

    const organizationName = organization?.name || 'Grace Companion';

    const { data: preferences } = await supabase
      .from('family_email_preferences')
      .select('*')
      .eq('resident_id', emailRequest.residentId)
      .eq('email_address', emailRequest.recipientEmail)
      .maybeSingle();

    if (preferences && preferences.consent_revoked_at) {
      throw new Error('Recipient has revoked email consent');
    }

    const canReceive = preferences?.[`can_receive_${emailRequest.emailType.replace('_', '_')}s`];
    if (canReceive === false) {
      throw new Error(`Recipient has opted out of ${emailRequest.emailType} emails`);
    }

    const htmlContent = generateEmailHTML(emailRequest, organizationName);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${organizationName} <notifications@grace-companion.com>`,
        to: emailRequest.recipientEmail,
        subject: emailRequest.subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
    }

    console.log('Email sent via Resend:', {
      to: emailRequest.recipientEmail,
      subject: emailRequest.subject,
      type: emailRequest.emailType,
      emailId: resendData.id,
    });

    const logEntry = {
      organization_id: emailRequest.organizationId,
      sender_user_id: emailRequest.senderId,
      recipient_email: emailRequest.recipientEmail,
      recipient_name: emailRequest.recipientName,
      resident_id: emailRequest.residentId,
      email_type: emailRequest.emailType,
      subject: emailRequest.subject,
      has_attachments: !!emailRequest.attachmentUrl,
      attachment_types: emailRequest.attachmentUrl ? ['pdf'] : [],
      delivery_status: 'sent',
      sent_at: new Date().toISOString(),
    };

    const { error: logError } = await supabase
      .from('email_delivery_logs')
      .insert(logEntry);

    if (logError) {
      console.error('Failed to log email delivery:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: crypto.randomUUID(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Email sending error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
