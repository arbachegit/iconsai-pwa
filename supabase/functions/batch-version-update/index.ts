// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface VersionEntry {
  message: string;
  date?: string;
  trigger_type?: string;
  files?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const body = await req.json();
      const { entries, single } = body as { entries?: VersionEntry[]; single?: VersionEntry };

      console.log('[batch-version-update] Received request:', { 
        entriesCount: entries?.length, 
        hasSingle: !!single 
      });

      // Get current version
      const { data: currentVersionData } = await supabase
        .from('version_control')
        .select('current_version')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      let currentVersion = currentVersionData?.current_version || '0.0.0';
      const [major, minor, patch] = currentVersion.split('.').map(Number);
      let newPatch = patch;

      const results: any[] = [];

      // Handle single quick registration
      if (single) {
        newPatch += 1;
        const newVersion = `${major}.${minor}.${newPatch}`;

        const { data: insertedVersion, error: insertError } = await supabase
          .from('version_control')
          .insert({
            current_version: newVersion,
            log_message: single.message,
            trigger_type: single.trigger_type || 'CODE_CHANGE',
            timestamp: single.date || new Date().toISOString(),
            associated_data: {
              batch_import: false,
              quick_registration: true,
              files: single.files || [],
              registered_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error('[batch-version-update] Insert error:', insertError);
          throw insertError;
        }

        console.log('[batch-version-update] Quick registration successful:', newVersion);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Version registered successfully',
            previous_version: currentVersion,
            new_version: newVersion,
            entry: insertedVersion,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle batch import
      if (entries && entries.length > 0) {
        console.log('[batch-version-update] Processing batch of', entries.length, 'entries');

        // Sort entries by date (oldest first)
        const sortedEntries = [...entries].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : Date.now();
          const dateB = b.date ? new Date(b.date).getTime() : Date.now();
          return dateA - dateB;
        });

        for (const entry of sortedEntries) {
          newPatch += 1;
          const newVersion = `${major}.${minor}.${newPatch}`;

          const { data: insertedVersion, error: insertError } = await supabase
            .from('version_control')
            .insert({
              current_version: newVersion,
              log_message: entry.message,
              trigger_type: entry.trigger_type || 'CODE_CHANGE',
              timestamp: entry.date || new Date().toISOString(),
              associated_data: {
                batch_import: true,
                files: entry.files || [],
                registered_at: new Date().toISOString(),
              },
            })
            .select()
            .single();

          if (insertError) {
            console.error('[batch-version-update] Batch insert error:', insertError);
            results.push({ error: insertError.message, entry });
          } else {
            results.push({ success: true, version: newVersion, entry: insertedVersion });
          }
        }

        console.log('[batch-version-update] Batch import complete:', results.length, 'entries processed');

        return new Response(
          JSON.stringify({
            success: true,
            message: `Batch import complete: ${results.filter(r => r.success).length}/${entries.length} entries`,
            previous_version: currentVersion,
            new_version: `${major}.${minor}.${newPatch}`,
            results,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'No entries provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[batch-version-update] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
