import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendOTPRequest {
  phoneNumber: string;
  purpose: 'signup' | 'login';
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { phoneNumber, purpose }: SendOTPRequest = await req.json();

    if (!phoneNumber || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Phone number and purpose are required' }),
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

    // Check rate limiting: only allow one OTP per phone per minute
    const recentOtpCheck = await fetch(
      `${supabaseUrl}/rest/v1/otp_codes?phone_number=eq.${encodeURIComponent(phoneNumber)}&created_at=gte.${new Date(Date.now() - 60000).toISOString()}&select=id`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const recentOtps = await recentOtpCheck.json();
    if (recentOtps.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Please wait before requesting another code' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For signup, check if phone number already exists
    if (purpose === 'signup') {
      const userCheck = await fetch(
        `${supabaseUrl}/rest/v1/users?phone_number=eq.${encodeURIComponent(phoneNumber)}&select=id`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      );

      const existingUsers = await userCheck.json();
      if (existingUsers.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Phone number already registered' }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // For login, check if user exists
    if (purpose === 'login') {
      const userCheck = await fetch(
        `${supabaseUrl}/rest/v1/users?phone_number=eq.${encodeURIComponent(phoneNumber)}&select=id`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      );

      const existingUsers = await userCheck.json();
      if (existingUsers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Phone number not found. Please sign up first.' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Generate OTP code
    const otpCode = generateOTP();

    // Delete any existing unverified OTP for this phone
    await fetch(
      `${supabaseUrl}/rest/v1/otp_codes?phone_number=eq.${encodeURIComponent(phoneNumber)}&verified=eq.false`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    // Store OTP in database
    const otpResponse = await fetch(`${supabaseUrl}/rest/v1/otp_codes`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        code: otpCode,
        purpose,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });

    if (!otpResponse.ok) {
      throw new Error('Failed to store OTP code');
    }

    // Send SMS via Twilio
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const smsMessage = `Your Grace Companion verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code.`;

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
      throw new Error('Failed to send SMS');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 600,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send OTP',
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
