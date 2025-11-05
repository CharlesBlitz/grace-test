import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Data Lifecycle Management Edge Function
 *
 * This function should be called daily via a cron job to:
 * - Archive old conversations
 * - Anonymize service improvement data
 * - Delete conversations past retention period
 * - Notify users of upcoming deletions
 *
 * Setup cron: https://supabase.com/docs/guides/functions/scheduled-functions
 * Configure in Supabase Dashboard -> Edge Functions -> Cron Jobs
 * Schedule: "0 2 * * *" (runs at 2 AM daily)
 */

interface LifecycleStats {
  conversationsArchived: number;
  conversationsDeleted: number;
  conversationsAnonymized: number;
  errors: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Import the DataLifecycleManager - in Edge Functions we need to inline it
    const stats = await runLifecycleManagement(supabaseUrl, supabaseServiceKey);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        stats,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Data lifecycle error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function runLifecycleManagement(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<LifecycleStats> {
  const stats: LifecycleStats = {
    conversationsArchived: 0,
    conversationsDeleted: 0,
    conversationsAnonymized: 0,
    errors: [],
  };

  try {
    // Create admin client with service role key
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Archive conversations
    const archived = await archiveConversations(supabase);
    stats.conversationsArchived = archived;
    console.log(`Archived ${archived} conversations`);

    // Step 2: Anonymize service improvement conversations
    const anonymized = await anonymizeConversations(supabase);
    stats.conversationsAnonymized = anonymized;
    console.log(`Anonymized ${anonymized} conversations`);

    // Step 3: Delete conversations past retention
    const deleted = await deleteConversations(supabase);
    stats.conversationsDeleted = deleted;
    console.log(`Deleted ${deleted} conversations`);

    // Step 4: Notify users of upcoming deletions
    await notifyUpcomingDeletions(supabase);
    console.log("Sent deletion notifications");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(errorMsg);
    console.error("Lifecycle management error:", errorMsg);
  }

  return stats;
}

async function archiveConversations(supabase: any): Promise<number> {
  const now = new Date().toISOString();

  const { data: conversationsToArchive, error: fetchError } = await supabase
    .from("conversations")
    .select("*")
    .eq("is_archived", false)
    .lte("archive_after", now)
    .is("anonymized_at", null);

  if (fetchError) throw new Error(`Archive fetch error: ${fetchError.message}`);
  if (!conversationsToArchive || conversationsToArchive.length === 0) return 0;

  const archivedData = conversationsToArchive.map((conv: any) => ({
    original_id: conv.id,
    elder_id: conv.elder_id,
    transcript: conv.transcript,
    sentiment: conv.sentiment,
    legal_basis: conv.legal_basis,
    retention_category: conv.retention_category,
    flagged_for_safeguarding: conv.flagged_for_safeguarding,
    safeguarding_notes: conv.safeguarding_notes,
    contains_health_data: conv.contains_health_data,
    original_created_at: conv.created_at,
    archived_at: now,
    delete_after: conv.delete_after,
  }));

  const { error: insertError } = await supabase
    .from("archived_conversations")
    .insert(archivedData);

  if (insertError) throw new Error(`Archive insert error: ${insertError.message}`);

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ is_archived: true })
    .in("id", conversationsToArchive.map((c: any) => c.id));

  if (updateError) throw new Error(`Archive update error: ${updateError.message}`);

  return conversationsToArchive.length;
}

async function anonymizeConversations(supabase: any): Promise<number> {
  const now = new Date().toISOString();

  const { data: conversationsToAnonymize, error: fetchError } = await supabase
    .from("conversations")
    .select("*")
    .eq("retention_category", "service_improvement")
    .lte("archive_after", now)
    .is("anonymized_at", null);

  if (fetchError) throw new Error(`Anonymize fetch error: ${fetchError.message}`);
  if (!conversationsToAnonymize || conversationsToAnonymize.length === 0) return 0;

  for (const conv of conversationsToAnonymize) {
    const anonymizedTranscript = anonymizeText(conv.transcript);

    await supabase
      .from("conversations")
      .update({
        elder_id: "00000000-0000-0000-0000-000000000000",
        transcript: anonymizedTranscript,
        anonymized_at: now,
      })
      .eq("id", conv.id);
  }

  return conversationsToAnonymize.length;
}

function anonymizeText(text: string): string {
  let anonymized = text;
  anonymized = anonymized.replace(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g, "[NAME]");
  anonymized = anonymized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]");
  anonymized = anonymized.replace(/\b(?:\+44|0)[\d\s-]{9,13}\b/g, "[PHONE]");
  anonymized = anonymized.replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/gi, "[POSTCODE]");
  anonymized = anonymized.replace(/\b\d+\s+\w+\s+(Street|Road|Avenue|Lane|Drive|Close|Way|Court|Place|Crescent)\b/gi, "[ADDRESS]");
  anonymized = anonymized.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "[DATE]");
  anonymized = anonymized.replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, "[NHS_NUMBER]");
  return anonymized;
}

async function deleteConversations(supabase: any): Promise<number> {
  const now = new Date().toISOString();

  const { data: archivedToDelete, error: archiveFetchError } = await supabase
    .from("archived_conversations")
    .select("id, original_id")
    .lte("delete_after", now)
    .not("delete_after", "is", null);

  if (archiveFetchError) throw new Error(`Delete fetch error: ${archiveFetchError.message}`);

  let deletedCount = 0;

  if (archivedToDelete && archivedToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("archived_conversations")
      .delete()
      .in("id", archivedToDelete.map((c: any) => c.id));

    if (deleteError) throw new Error(`Delete error: ${deleteError.message}`);

    await supabase
      .from("conversations")
      .delete()
      .in("id", archivedToDelete.map((c: any) => c.original_id));

    deletedCount = archivedToDelete.length;
  }

  const { data: mainToDelete } = await supabase
    .from("conversations")
    .select("id")
    .lte("delete_after", now)
    .not("delete_after", "is", null)
    .eq("is_archived", true);

  if (mainToDelete && mainToDelete.length > 0) {
    await supabase
      .from("conversations")
      .delete()
      .in("id", mainToDelete.map((c: any) => c.id));

    deletedCount += mainToDelete.length;
  }

  return deletedCount;
}

async function notifyUpcomingDeletions(supabase: any): Promise<void> {
  const notifyDate = new Date();
  notifyDate.setDate(notifyDate.getDate() + 60);
  const notifyDateStr = notifyDate.toISOString();

  const sixtyOneDaysFromNow = new Date();
  sixtyOneDaysFromNow.setDate(sixtyOneDaysFromNow.getDate() + 61);
  const sixtyOneDaysStr = sixtyOneDaysFromNow.toISOString();

  const { data: upcomingDeletions } = await supabase
    .from("archived_conversations")
    .select("elder_id, delete_after")
    .gte("delete_after", notifyDateStr)
    .lt("delete_after", sixtyOneDaysStr)
    .not("delete_after", "is", null);

  if (!upcomingDeletions || upcomingDeletions.length === 0) return;

  const elderIds = [...new Set(upcomingDeletions.map((d: any) => d.elder_id))];

  for (const elderId of elderIds) {
    const { data: user } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", elderId)
      .single();

    if (user) {
      console.log(`Would notify ${user.email} about upcoming deletion`);
      // TODO: Integrate email service here
    }
  }
}
