// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { episodeId } = await req.json();

    if (!episodeId) {
      return new Response(
        JSON.stringify({ error: "episodeId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-spotify-metadata] Fetching metadata for episode: ${episodeId}`);

    const episodeUrl = `https://open.spotify.com/episode/${episodeId}`;
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(episodeUrl)}`;

    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowYOU/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[fetch-spotify-metadata] Spotify API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch from Spotify", status: response.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`[fetch-spotify-metadata] Success - Title: ${data.title}`);

    const metadata = {
      title: data.title || "Podcast",
      description: data.provider_name ? `${data.provider_name}` : "Episódio do Spotify",
    };

    return new Response(
      JSON.stringify(metadata),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-spotify-metadata] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
