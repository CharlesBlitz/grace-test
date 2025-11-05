import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegistrationData {
  registrationType: 'self' | 'nok-assisted';
  nokName?: string;
  nokEmail?: string;
  nokRelationship?: string;
  elderName: string;
  elderEmail?: string;
  timezone: string;
  consentGiven: boolean;
  voiceRecorded: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const data: RegistrationData = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (data.registrationType === 'self') {
      const elderEmail = data.elderEmail || `${data.elderName.toLowerCase().replace(/\s+/g, '')}@gracecompanion.temp`;

      const { data: elderUser, error: elderError } = await supabase
        .from('users')
        .insert({
          name: data.elderName,
          email: elderEmail,
          role: 'elder',
          timezone: data.timezone,
          consent_on: new Date().toISOString(),
          registered_by_nok: false,
        })
        .select()
        .single();

      if (elderError) throw elderError;

      return new Response(
        JSON.stringify({
          success: true,
          userId: elderUser.id,
          message: 'Self-registration completed successfully',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );

    } else {
      if (!data.nokName || !data.nokEmail || !data.nokRelationship) {
        throw new Error("Missing NoK information");
      }

      const { data: nokUser, error: nokError } = await supabase
        .from('users')
        .upsert({
          name: data.nokName,
          email: data.nokEmail,
          role: 'nok',
          timezone: data.timezone,
          consent_on: new Date().toISOString(),
        }, {
          onConflict: 'email',
        })
        .select()
        .single();

      if (nokError) throw nokError;

      const elderEmail = data.elderEmail || `${data.nokEmail.split('@')[0]}-elder@gracecompanion.temp`;

      const { data: elderUser, error: elderError } = await supabase
        .from('users')
        .insert({
          name: data.elderName,
          email: elderEmail,
          role: 'elder',
          timezone: data.timezone,
          registered_by_nok: true,
          guardian_consent_on: new Date().toISOString(),
        })
        .select()
        .single();

      if (elderError) throw elderError;

      const { error: relationshipError } = await supabase
        .from('elder_nok_relationships')
        .insert({
          elder_id: elderUser.id,
          nok_id: nokUser.id,
          relationship_type: data.nokRelationship,
          is_primary_contact: true,
          can_modify_settings: true,
        });

      if (relationshipError) throw relationshipError;

      return new Response(
        JSON.stringify({
          success: true,
          elderId: elderUser.id,
          nokId: nokUser.id,
          message: 'NoK-assisted registration completed successfully',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

  } catch (error) {
    console.error('Registration error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
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