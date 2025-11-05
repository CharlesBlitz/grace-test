import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const digits = formData.get('Digits') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    console.log('Received response:', { callSid, digits, from, to });

    const responseText = digits === '1' ? 'doing_well' :
                        digits === '2' ? 'needs_assistance' :
                        'unknown';

    const { data: notificationLog, error: findError } = await supabase
      .from('notification_log')
      .select('id, elder_id, task_id')
      .eq('external_id', callSid)
      .eq('delivery_method', 'call')
      .maybeSingle();

    if (findError || !notificationLog) {
      console.error('Could not find notification log:', findError);
    } else {
      const { error: updateError } = await supabase
        .from('notification_log')
        .update({
          elder_response: responseText,
          response_captured_at: new Date().toISOString()
        })
        .eq('id', notificationLog.id);

      if (updateError) {
        console.error('Error updating notification log:', updateError);
      }

      if (digits === '2' && notificationLog.elder_id) {
        const { data: nokRelations } = await supabase
          .from('elder_nok_relationships')
          .select('nok_id, users!elder_nok_relationships_nok_id_fkey(name, phone_number)')
          .eq('elder_id', notificationLog.elder_id)
          .eq('can_modify_settings', true);

        if (nokRelations && nokRelations.length > 0) {
          const { data: elder } = await supabase
            .from('users')
            .select('name')
            .eq('id', notificationLog.elder_id)
            .maybeSingle();

          const elderName = elder?.name || 'Elder';

          for (const relation of nokRelations) {
            const nokData = relation.users as any;
            if (nokData?.phone_number) {
              const alertMessage = `ALERT: ${elderName} pressed 2 indicating they need assistance during a reminder call. Please check on them immediately.`;

              const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
              const smsBody = new URLSearchParams({
                To: nokData.phone_number,
                From: to,
                Body: alertMessage,
              });

              await fetch(
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

              console.log(`Sent assistance alert to NOK: ${nokData.name}`);
            }
          }
        }
      }
    }

    let responseMessage = '';
    if (digits === '1') {
      responseMessage = "Thank you! I'm glad you're doing well. Take care!";
    } else if (digits === '2') {
      responseMessage = "Thank you for letting me know. I've notified your family member. Help is on the way.";
    } else {
      responseMessage = "Thank you. Take care!";
    }

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${responseMessage}</Say>
  <Hangup/>
</Response>`;

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('Error handling reminder response:', error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you. Take care.</Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });
  }
});
