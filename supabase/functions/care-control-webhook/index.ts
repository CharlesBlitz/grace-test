import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const signature = req.headers.get('X-Webhook-Signature');
    const organizationId = payload.organization_id;
    const eventType = payload.event_type;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const { data: config } = await supabase
      .from('integration_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'care_control')
      .eq('is_enabled', true)
      .single();

    if (!config) {
      throw new Error('Integration not configured');
    }

    if (signature && config.webhook_secret) {
      const expectedSignature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(config.webhook_secret + JSON.stringify(payload))
      );
      const expectedSigHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expectedSigHex) {
        console.error('Invalid webhook signature');
        throw new Error('Invalid webhook signature');
      }
    }

    const { error: webhookError } = await supabase
      .from('webhook_events')
      .insert({
        organization_id: organizationId,
        integration_type: 'care_control',
        event_type: eventType,
        payload: payload,
        headers: Object.fromEntries(req.headers.entries()),
        processing_status: 'pending',
      });

    if (webhookError) {
      console.error('Failed to store webhook event:', webhookError);
    }

    console.log(`Received ${eventType} webhook for organization ${organizationId}`);

    if (eventType === 'resident.updated') {
      const residentData = payload.data;
      console.log('Processing resident update:', residentData);
    } else if (eventType === 'assessment.completed') {
      const assessmentData = payload.data;
      console.log('Processing assessment completion:', assessmentData);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received and queued for processing',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Webhook processing error:', error);

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
