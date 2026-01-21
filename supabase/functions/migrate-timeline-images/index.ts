// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    console.log("Iniciando migração de imagens da timeline...");

    // Fetch all timeline images (Base64)
    const { data: images, error: fetchError } = await supabaseClient
      .from('generated_images')
      .select('*')
      .like('section_id', 'history-%');

    if (fetchError) {
      throw new Error(`Erro ao buscar imagens: ${fetchError.message}`);
    }

    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma imagem para migrar", migrated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${images.length} imagens para migrar`);

    const results = [];

    for (const image of images) {
      try {
        const { section_id, image_url, prompt_key } = image;
        
        // Skip if already a Storage URL
        if (image_url.startsWith('http') && !image_url.startsWith('data:')) {
          console.log(`Pulando ${section_id} - já é URL de Storage`);
          results.push({ section_id, status: 'skipped', reason: 'already_storage_url' });
          continue;
        }

        console.log(`Migrando ${section_id}...`);

        // Convert Base64 to binary
        const base64Data = image_url.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        console.log(`  - Tamanho binário: ${binaryData.length} bytes`);

        // Upload to Storage as WebP
        const fileName = `${section_id}.webp`;
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('timeline-images')
          .upload(fileName, binaryData, {
            contentType: 'image/webp',
            upsert: true
          });

        if (uploadError) {
          console.error(`  - Erro no upload: ${uploadError.message}`);
          results.push({ section_id, status: 'failed', error: uploadError.message });
          continue;
        }

        console.log(`  - Upload bem-sucedido`);

        // Get public URL
        const { data: publicUrlData } = supabaseClient
          .storage
          .from('timeline-images')
          .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;
        console.log(`  - URL pública: ${publicUrl}`);

        // Update database with new URL
        const { error: updateError } = await supabaseClient
          .from('generated_images')
          .update({
            image_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('section_id', section_id);

        if (updateError) {
          console.error(`  - Erro ao atualizar banco: ${updateError.message}`);
          results.push({ section_id, status: 'failed', error: updateError.message });
          continue;
        }

        console.log(`  - ✅ Migrado com sucesso: ${section_id}`);
        results.push({ 
          section_id, 
          status: 'success', 
          old_size: base64Data.length,
          new_url: publicUrl
        });

      } catch (error) {
        console.error(`Erro ao migrar ${image.section_id}:`, error);
        results.push({ 
          section_id: image.section_id, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`Migração concluída: ${successCount} sucesso, ${failedCount} falha, ${skippedCount} puladas`);

    return new Response(
      JSON.stringify({
        message: "Migração concluída",
        total: images.length,
        migrated: successCount,
        failed: failedCount,
        skipped: skippedCount,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na migração:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: error 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});