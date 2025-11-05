import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  summaryId: string;
  organizationId?: string;
}

function generateWellnessEmailHTML(summary: any, elder: any, organization: string): string {
  const getMoodEmoji = (score: number) => {
    if (score >= 4.5) return '😊';
    if (score >= 3.5) return '🙂';
    if (score >= 2.5) return '😐';
    if (score >= 1.5) return '😟';
    return '😢';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8fafc;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 30px;
      border-radius: 12px 12px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .content {
      background: white;
      padding: 30px;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
    }
    .score-card {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      text-align: center;
      margin: 24px 0;
    }
    .score-value {
      font-size: 48px;
      font-weight: bold;
      margin: 10px 0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 24px 0;
    }
    .metric-card {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .metric-label {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1e293b;
    }
    .insights-section {
      margin: 24px 0;
      padding: 20px;
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      border-radius: 8px;
    }
    .concerns-section {
      margin: 24px 0;
      padding: 20px;
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      border-radius: 8px;
    }
    .list-item {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .list-item:last-child {
      border-bottom: none;
    }
    .footer {
      background: #f8fafc;
      padding: 24px;
      border-radius: 0 0 12px 12px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border: 1px solid #e2e8f0;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 32px;
      text-decoration: none;
      border-radius: 8px;
      margin: 16px 0;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${getMoodEmoji(summary.overall_wellness_score / 20)} Wellness Report</h1>
    <p style="margin: 0; font-size: 18px;">${elder.name}</p>
    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">
      ${formatDate(summary.report_period_start)} - ${formatDate(summary.report_period_end)}
    </p>
  </div>

  <div class="content">
    <div class="score-card">
      <div style="font-size: 16px; opacity: 0.9;">Overall Wellness Score</div>
      <div class="score-value">${summary.overall_wellness_score}</div>
      <div style="font-size: 14px; opacity: 0.9;">
        ${getTrendIcon(summary.wellness_trend)} ${summary.wellness_trend.charAt(0).toUpperCase() + summary.wellness_trend.slice(1)}
      </div>
    </div>

    <h2 style="color: #1e293b; margin-top: 32px;">This Week's Summary</h2>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Mood ${getTrendIcon(summary.mood_trend)}</div>
        <div class="metric-value">${summary.avg_mood_rating.toFixed(1)}/5</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Energy ${getTrendIcon(summary.energy_trend)}</div>
        <div class="metric-value">${summary.avg_energy_level.toFixed(1)}/5</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sleep Quality ${getTrendIcon(summary.sleep_trend)}</div>
        <div class="metric-value">${summary.avg_sleep_quality.toFixed(1)}/5</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sleep Duration</div>
        <div class="metric-value">${summary.avg_hours_slept.toFixed(1)}h</div>
      </div>
    </div>

    <div class="metric-card" style="margin-bottom: 24px;">
      <div class="metric-label">Pain Level ${getTrendIcon(summary.pain_trend)}</div>
      <div class="metric-value">${summary.avg_pain_level.toFixed(1)}/10</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
        ${summary.days_with_pain} ${summary.days_with_pain === 1 ? 'day' : 'days'} with pain reported
      </div>
    </div>

    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <div style="color: #64748b; font-size: 14px; margin-bottom: 8px;">Check-in Completion</div>
      <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: #10b981; height: 100%; width: ${summary.check_in_completion_rate}%; border-radius: 4px;"></div>
      </div>
      <div style="font-size: 14px; color: #1e293b; margin-top: 8px;">
        ${summary.total_check_ins} of 7 days completed (${summary.check_in_completion_rate}%)
      </div>
    </div>

    ${summary.positive_highlights && summary.positive_highlights.length > 0 ? `
    <div class="insights-section">
      <h3 style="margin: 0 0 16px 0; color: #059669;">✨ Positive Highlights</h3>
      ${summary.positive_highlights.map((highlight: string) => `
        <div class="list-item">• ${highlight}</div>
      `).join('')}
    </div>
    ` : ''}

    ${summary.key_insights && summary.key_insights.length > 0 ? `
    <div style="margin: 24px 0; padding: 20px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
      <h3 style="margin: 0 0 16px 0; color: #2563eb;">💡 Key Insights</h3>
      ${summary.key_insights.map((insight: string) => `
        <div class="list-item">• ${insight}</div>
      `).join('')}
    </div>
    ` : ''}

    ${summary.concerning_patterns && summary.concerning_patterns.length > 0 ? `
    <div class="concerns-section">
      <h3 style="margin: 0 0 16px 0; color: #dc2626;">⚠️ Areas for Attention</h3>
      ${summary.concerning_patterns.map((pattern: string) => `
        <div class="list-item">• ${pattern}</div>
      `).join('')}
      <p style="margin: 16px 0 0 0; font-size: 14px; color: #991b1b;">
        These patterns have been flagged for staff review. Care team will follow up as needed.
      </p>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p style="margin: 0 0 16px 0;">
      <strong>${organization}</strong>
    </p>
    <p style="margin: 0;">
      This weekly wellness report is generated automatically to keep you informed about your loved one's wellbeing.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 12px;">
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
    const { summaryId, organizationId }: EmailRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: summary, error: summaryError } = await supabase
      .from('wellness_summaries')
      .select('*')
      .eq('id', summaryId)
      .single();

    if (summaryError || !summary) {
      throw new Error('Wellness summary not found');
    }

    const { data: elder, error: elderError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', summary.elder_id)
      .single();

    if (elderError || !elder) {
      throw new Error('Elder not found');
    }

    const { data: nokRelationships } = await supabase
      .from('elder_nok_relationships')
      .select('nok_id')
      .eq('elder_id', summary.elder_id);

    if (!nokRelationships || nokRelationships.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No family members to notify',
          emailsSent: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const nokIds = nokRelationships.map(r => r.nok_id);
    const { data: familyMembers } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', nokIds);

    if (!familyMembers || familyMembers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No family members with email addresses',
          emailsSent: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle();

    const organizationName = organization?.name || 'Grace Companion';

    const emailPromises = familyMembers.map(async (familyMember) => {
      if (!familyMember.email) return null;

      const { data: preferences } = await supabase
        .from('family_email_preferences')
        .select('can_receive_weekly_summaries, consent_revoked_at')
        .eq('family_member_id', familyMember.id)
        .eq('resident_id', summary.elder_id)
        .maybeSingle();

      if (preferences?.consent_revoked_at || preferences?.can_receive_weekly_summaries === false) {
        return null;
      }

      const htmlContent = generateWellnessEmailHTML(summary, elder, organizationName);

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
          to: familyMember.email,
          subject: `Weekly Wellness Report for ${elder.name}`,
          html: htmlContent,
        }),
      });

      const resendData = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error(`Failed to send email to ${familyMember.email}:`, resendData);
        throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
      }

      console.log(`Email sent to ${familyMember.email} via Resend:`, resendData.id);

      const logEntry = {
        organization_id: organizationId,
        sender_user_id: null,
        recipient_email: familyMember.email,
        recipient_name: familyMember.name,
        resident_id: summary.elder_id,
        email_type: 'weekly_summary',
        subject: `Weekly Wellness Report for ${elder.name}`,
        has_attachments: false,
        attachment_types: [],
        delivery_status: 'sent',
        sent_at: new Date().toISOString(),
      };

      await supabase.from('email_delivery_logs').insert(logEntry);

      return familyMember.email;
    });

    const results = await Promise.all(emailPromises);
    const emailsSent = results.filter(r => r !== null).length;

    await supabase
      .from('wellness_summaries')
      .update({
        sent_to_family: true,
        family_email_sent_at: new Date().toISOString(),
        family_recipients: results.filter(r => r !== null),
      })
      .eq('id', summaryId);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        recipients: results.filter(r => r !== null),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error sending wellness report emails:', error);

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