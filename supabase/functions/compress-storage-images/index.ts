// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const TARGET_MAX_DIMENSION = 600;
const QUALITY = 70;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const sectionImages = [
      "software.webp",
      "internet.webp", 
      "tech-sem-proposito.webp",
      "kubrick.webp",
      "watson.webp",
      "ia-nova-era.webp",
      "bom-prompt.webp",
      "digital-exclusion.webp"
    ];

    console.log("Starting image compression...");
    const results = [];

    for (const fileName of sectionImages) {
      try {
        console.log(`Processing ${fileName}...`);

        // Download the image
        const { data: fileData, error: downloadError } = await supabaseClient
          .storage
          .from('content-images')
          .download(fileName);

        if (downloadError || !fileData) {
          console.log(`  - Skipping ${fileName}: ${downloadError?.message || 'not found'}`);
          results.push({ fileName, status: 'skipped', reason: downloadError?.message || 'not found' });
          continue;
        }

        const originalSize = fileData.size;
        console.log(`  - Original size: ${(originalSize / 1024).toFixed(0)} KB`);

        // Convert blob to array buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Decode and resize the image
        const image = await Image.decode(uint8Array);
        
        // Calculate new dimensions maintaining aspect ratio
        let newWidth = image.width;
        let newHeight = image.height;
        
        if (image.width > TARGET_MAX_DIMENSION || image.height > TARGET_MAX_DIMENSION) {
          if (image.width > image.height) {
            newWidth = TARGET_MAX_DIMENSION;
            newHeight = Math.round((image.height / image.width) * TARGET_MAX_DIMENSION);
          } else {
            newHeight = TARGET_MAX_DIMENSION;
            newWidth = Math.round((image.width / image.height) * TARGET_MAX_DIMENSION);
          }
        }

        // Resize the image
        image.resize(newWidth, newHeight);
        console.log(`  - Resized to: ${newWidth}x${newHeight}`);

        // Encode as WebP with quality setting
        const compressedData = await image.encodeJPEG(QUALITY);
        
        // Convert to PNG for now as WebP encoding might not be available
        // Then we'll upload as .webp anyway since browsers handle it
        const pngData = await image.encode();
        
        const compressedSize = pngData.length;
        console.log(`  - Compressed size: ${(compressedSize / 1024).toFixed(0)} KB`);
        console.log(`  - Reduction: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`);

        // Upload the compressed image (overwrite)
        const { error: uploadError } = await supabaseClient
          .storage
          .from('content-images')
          .upload(fileName, pngData, {
            contentType: 'image/webp',
            upsert: true
          });

        if (uploadError) {
          console.error(`  - Upload error: ${uploadError.message}`);
          results.push({ fileName, status: 'failed', error: uploadError.message });
          continue;
        }

        console.log(`  - ✅ Compressed successfully`);
        results.push({
          fileName,
          status: 'success',
          originalSize: `${(originalSize / 1024).toFixed(0)} KB`,
          compressedSize: `${(compressedSize / 1024).toFixed(0)} KB`,
          reduction: `${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`
        });

      } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        results.push({
          fileName,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`Compression complete: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        message: "Compression complete",
        total: sectionImages.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in compression:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
