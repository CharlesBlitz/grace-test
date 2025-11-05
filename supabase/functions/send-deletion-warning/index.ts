import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeletionWarningRequest {
  phoneNumber: string;
  userName: string;
  deletionDate: string;
  isNoK?: boolean;
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

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const { phoneNumber, userName, deletionDate, isNoK }: DeletionWarningRequest = await req.json();

    if (!phoneNumber || !userName || !deletionDate) {
      return new Response(
        JSON.stringify({ error: 'Phone number, user name, and deletion date are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate E.164 format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create appropriate message based on recipient type
    const smsMessage = isNoK
      ? `Grace Companion: Conversation data for your loved one will be automatically deleted on ${deletionDate}. If you need to keep this data longer, please contact support or adjust retention settings in your dashboard.`
      : `Grace Companion: Hello ${userName}, your conversation data will be automatically deleted on ${deletionDate} as part of our privacy policy. If you need to keep this data longer, please contact support or adjust settings in your account.`;

    // Send SMS via Twilio
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const smsBody = new URLSearchParams({
      To: phoneNumber,
      From: twilioPhoneNumber,
      Body: smsMessage,
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

    if (!smsResponse.ok) {
      const errorData = await smsResponse.json();
      console.error('Twilio error:', errorData);
      throw new Error('Failed to send SMS notification');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Deletion warning sent successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending deletion warning:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send deletion warning',
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
