import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyOTPRequest {
  phoneNumber: string;
  code: string;
  purpose: 'signup' | 'login';
  name?: string;
  role?: 'elder' | 'nok';
  registrationMethod?: string;
}

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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phoneNumber, code, purpose, name, role, registrationMethod }: VerifyOTPRequest = await req.json();

    if (!phoneNumber || !code || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Phone number, code, and purpose are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For signup, require name and role
    if (purpose === 'signup' && (!name || !role)) {
      return new Response(
        JSON.stringify({ error: 'Name and role are required for signup' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if this phone number belongs to an admin account
    const { data: adminCheck, error: adminCheckError } = await supabase
      .rpc('check_if_admin_by_phone', { p_phone: phoneNumber });

    if (!adminCheckError && adminCheck && adminCheck.is_admin) {
      return new Response(
        JSON.stringify({
          error: 'Admin Account Detected',
          message: `This phone number is registered to an admin account (${adminCheck.email}). Admin users must sign in using email and password at /admin/login, not via OTP.`,
          redirect: '/admin/login',
          is_admin: true,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Find valid OTP code
    const { data: otpRecords, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError || !otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const otpRecord = otpRecords[0];

    // Check attempt limit
    if (otpRecord.attempts >= 3) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please request a new code.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Increment attempts
    const { error: incrementError } = await supabase
      .from('otp_codes')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    if (incrementError) {
      console.error('Failed to increment attempts:', incrementError);
    }

    // Verify code matches
    if (otpRecord.code !== code) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    let user;
    let session;

    if (purpose === 'signup') {
      // Create new user in Supabase Auth with phone as identifier
      // Since we're bypassing email/password, we'll create a random email
      const randomEmail = `${phoneNumber.replace(/\+/g, '')}@gracetemp.local`;
      const randomPassword = crypto.randomUUID();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: randomEmail,
        password: randomPassword,
        phone: phoneNumber,
      });

      if (signUpError || !authData.user) {
        console.error('Auth signup error:', signUpError);
        throw new Error('Failed to create user account');
      }

      user = authData.user;

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name: name!,
          email: randomEmail,
          phone_number: phoneNumber,
          role: role!,
          phone_verified: true,
          timezone: 'America/New_York',
          registration_method: registrationMethod || 'type',
          registration_completed: true,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Failed to create user profile');
      }

      // Create session
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email: randomEmail,
        password: randomPassword,
      });

      if (sessionError || !sessionData.session) {
        throw new Error('Failed to create session');
      }

      session = sessionData.session;
    } else {
      // Login: Find existing user
      const { data: existingUsers, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (userError || !existingUsers) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      user = existingUsers;

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Get user from auth
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers.users.find(u => u.id === user.id);

      if (!authUser) {
        throw new Error('Auth user not found');
      }

      // Create session using admin API
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.email!,
      });

      if (sessionError) {
        throw new Error('Failed to create session');
      }

      // Sign in with the generated link's credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email!,
        password: authUser.email!,
      });

      // If password signin fails, we need to use a different approach
      // Generate a temporary session token
      const { data: tokenData, error: tokenError } = await supabase.auth.admin.createUser({
        email: authUser.email!,
        email_confirm: true,
        user_metadata: { phone: phoneNumber },
      });

      session = tokenData?.session || null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          phone_number: phoneNumber,
          name: name || user.name,
          role: role || user.role,
        },
        session,
        message: 'Verification successful',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to verify OTP',
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
