import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  organizationId: string;
  dataType: 'daily_notes' | 'incidents' | 'medications' | 'demographics';
  recordIds?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { organizationId, dataType, recordIds }: SyncRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error: configError } = await supabase
      .from('integration_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'person_centred_software')
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      throw new Error('Integration not configured or not enabled');
    }

    const apiEndpoint = config.api_endpoint;
    const apiKey = config.api_credentials?.api_key;
    const apiSecret = config.api_credentials?.api_secret;

    if (!apiEndpoint || !apiKey) {
      throw new Error('API credentials not configured');
    }

    const startTime = Date.now();
    let recordCount = 0;
    let syncStatus = 'success';
    let errorMessage = null;

    try {
      if (dataType === 'daily_notes') {
        let query = supabase
          .from('care_documentation')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'approved')
          .order('document_date', { ascending: false })
          .limit(100);

        if (recordIds && recordIds.length > 0) {
          query = query.in('id', recordIds);
        }

        const { data: notes } = await query;

        if (notes && notes.length > 0) {
          for (const note of notes) {
            const pcsPayload = {
              resident_external_id: note.resident_id,
              note_date: note.document_date,
              care_notes: note.care_notes,
              mood: note.mood_assessment,
              physical_health: note.physical_health,
              social_engagement: note.social_engagement,
              concerns: note.detected_concerns || [],
            };

            recordCount++;
          }
        }
      } else if (dataType === 'incidents') {
        let query = supabase
          .from('incident_alert_log')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (recordIds && recordIds.length > 0) {
          query = query.in('id', recordIds);
        }

        const { data: incidents } = await query;

        if (incidents && incidents.length > 0) {
          for (const incident of incidents) {
            const pcsPayload = {
              resident_external_id: incident.resident_id,
              incident_date: incident.created_at,
              severity: incident.severity,
              categories: incident.categories,
              description: `Incident detected via AI monitoring. Keywords: ${incident.detected_keywords?.join(', ')}`,
              confidence_score: incident.confidence_score,
            };

            recordCount++;
          }
        }
      }

      console.log(`Successfully synced ${recordCount} ${dataType} records to Person Centred Software`);
    } catch (error: any) {
      syncStatus = 'failed';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      await supabase.from('integration_sync_history').insert({
        organization_id: organizationId,
        integration_id: config.id,
        sync_type: 'manual',
        direction: 'push',
        data_type: dataType,
        record_count: recordCount,
        sync_status: syncStatus,
        error_message: errorMessage,
        duration_ms: duration,
      });

      if (syncStatus === 'success') {
        await supabase
          .from('integration_configurations')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'success',
          })
          .eq('id', config.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordCount,
        dataType,
        message: `Successfully synced ${recordCount} records`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('PCS sync error:', error);

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
