import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EscalationRequest {
  taskId: string;
  elderId: string;
  elderName: string;
  taskTitle: string;
  missedAttempts: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const requestData: EscalationRequest = await req.json();
    const { taskId, elderId, elderName, taskTitle, missedAttempts } = requestData;

    const contactsResponse = await fetch(
      `${supabaseUrl}/rest/v1/escalation_contacts?elder_id=eq.${elderId}&active=eq.true&order=priority_order.asc`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!contactsResponse.ok) {
      throw new Error('Failed to fetch escalation contacts');
    }

    const contacts = await contactsResponse.json();

    if (contacts.length === 0) {
      console.error(`No escalation contacts found for elder ${elderId}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No escalation contacts configured',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const results = [];

    for (const contact of contacts) {
      const alertMessage = `ALERT: ${elderName} has missed ${missedAttempts} reminders for "${taskTitle}". Please check on them. - Grace Companion`;
      const notificationMethods = contact.notification_methods || ['sms'];

      for (const method of notificationMethods) {
        try {
          if (method === 'sms' && contact.phone_number) {
            const smsBody = new URLSearchParams({
              To: contact.phone_number,
              From: twilioPhoneNumber,
              Body: alertMessage,
            });

            const smsResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${twilioAuth}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: smsBody.toString(),
              }
            );

            const smsResult = await smsResponse.json();

            const logData = {
              task_id: taskId,
              elder_id: elderId,
              notification_type: 'escalation',
              delivery_method: 'sms',
              recipient: contact.phone_number,
              message_content: alertMessage,
              status: smsResponse.ok ? 'sent' : 'failed',
              sent_at: new Date().toISOString(),
              external_id: smsResult.sid,
              error_message: smsResponse.ok ? null : smsResult.message,
            };

            await fetch(`${supabaseUrl}/rest/v1/notification_log`, {
              method: 'POST',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(logData),
            });

            results.push({
              contact: contact.contact_name,
              method: 'sms',
              success: smsResponse.ok,
              externalId: smsResult.sid,
            });

            console.log(`Sent SMS escalation to ${contact.contact_name}: ${smsResponse.ok}`);
          } else if (method === 'call' && contact.phone_number) {
            const twimlUrl = `https://twimlets.com/echo?Twiml=%3CResponse%3E%3CSay%20voice%3D%22Polly.Joanna%22%3EAlert%20from%20Grace%20Companion.%20${encodeURIComponent(elderName)}%20has%20missed%20${missedAttempts}%20reminders%20for%20${encodeURIComponent(taskTitle)}.%20Please%20check%20on%20them.%3C%2FSay%3E%3C%2FResponse%3E`;

            const callBody = new URLSearchParams({
              To: contact.phone_number,
              From: twilioPhoneNumber,
              Url: twimlUrl,
            });

            const callResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${twilioAuth}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: callBody.toString(),
              }
            );

            const callResult = await callResponse.json();

            const logData = {
              task_id: taskId,
              elder_id: elderId,
              notification_type: 'escalation',
              delivery_method: 'call',
              recipient: contact.phone_number,
              message_content: alertMessage,
              status: callResponse.ok ? 'sent' : 'failed',
              sent_at: new Date().toISOString(),
              external_id: callResult.sid,
              error_message: callResponse.ok ? null : callResult.message,
            };

            await fetch(`${supabaseUrl}/rest/v1/notification_log`, {
              method: 'POST',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(logData),
            });

            results.push({
              contact: contact.contact_name,
              method: 'call',
              success: callResponse.ok,
              externalId: callResult.sid,
            });

            console.log(`Sent call escalation to ${contact.contact_name}: ${callResponse.ok}`);
          } else if (method === 'email' && contact.email) {
            results.push({
              contact: contact.contact_name,
              method: 'email',
              success: false,
              error: 'Email not implemented yet',
            });
          }
        } catch (error) {
          console.error(`Error sending ${method} to ${contact.contact_name}:`, error);
          results.push({
            contact: contact.contact_name,
            method,
            success: false,
            error: error.message,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsSent: results.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in escalation alert:', error);
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
