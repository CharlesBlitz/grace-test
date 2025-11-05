import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BatchGenerationRequest {
  organizationId: string;
  residentIds: string[];
  dateRange: {
    start: string;
    end: string;
  };
  templateId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: BatchGenerationRequest = await req.json();
    const { organizationId, residentIds, dateRange, templateId } = body;

    if (!organizationId || !residentIds || residentIds.length === 0) {
      throw new Error("organizationId and residentIds are required");
    }

    // Verify user is part of organization
    const { data: orgUser } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!orgUser) {
      throw new Error("Unauthorized: User not in organization");
    }

    // Create batch job record
    const { data: batchJob, error: jobError } = await supabase
      .from("batch_processing_jobs")
      .insert({
        organization_id: organizationId,
        created_by: user.id,
        job_type: "daily_notes",
        date_range_start: dateRange.start,
        date_range_end: dateRange.end,
        resident_ids: residentIds,
        template_id: templateId,
        status: "processing",
        total_items: residentIds.length,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Process each resident
    const results = [];
    const errors = [];
    const generatedDocIds = [];

    for (const residentId of residentIds) {
      try {
        // Call the generate-daily-notes function for each resident
        const response = await fetch(
          `${supabaseUrl}/functions/v1/generate-daily-notes`,
          {
            method: "POST",
            headers: {
              "Authorization": authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              residentId,
              organizationId,
              startDate: dateRange.start,
              endDate: dateRange.end,
            }),
          }
        );

        const result = await response.json();

        if (result.success && result.documentation) {
          results.push({
            residentId,
            success: true,
            documentationId: result.documentation.id,
          });
          generatedDocIds.push(result.documentation.id);
        } else {
          errors.push({
            residentId,
            error: result.message || "Failed to generate note",
          });
        }
      } catch (error) {
        errors.push({
          residentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Update progress
      await supabase
        .from("batch_processing_jobs")
        .update({
          processed_items: results.length + errors.length,
        })
        .eq("id", batchJob.id);
    }

    // Complete the batch job
    const status = errors.length === 0 ? "completed" : errors.length < residentIds.length ? "partial" : "failed";

    await supabase
      .from("batch_processing_jobs")
      .update({
        status,
        generated_document_ids: generatedDocIds,
        error_messages: errors,
        failed_items: errors.length,
        completed_at: new Date().toISOString(),
        total_processing_time_seconds: Math.floor(
          (Date.now() - new Date(batchJob.started_at).getTime()) / 1000
        ),
      })
      .eq("id", batchJob.id);

    return new Response(
      JSON.stringify({
        success: true,
        batchJobId: batchJob.id,
        results: {
          total: residentIds.length,
          successful: results.length,
          failed: errors.length,
        },
        generatedDocuments: generatedDocIds,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in batch generation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
