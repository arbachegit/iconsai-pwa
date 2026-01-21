// ============================================
// SEARCH NEARBY CLINICS - Buscar clínicas próximas
// VERSAO: 1.0.0 | DEPLOY: 2026-01-19
// API: Google Places API
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

interface NearbyRequest {
  latitude: number;
  longitude: number;
  radius?: number; // metros, default 5000 (5km)
  type?: "hospital" | "clinic" | "doctor" | "pharmacy" | "all";
  keyword?: string; // ex: "UBS", "pronto socorro", "cardiologista"
  maxResults?: number;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  distance: number; // em metros
  distanceText: string; // "1.2 km"
  rating?: number;
  totalRatings?: number;
  isOpen?: boolean;
  openNow?: string; // "Aberto agora" ou "Fechado"
  phone?: string;
  website?: string;
  types: string[];
  isPublic: boolean; // UBS, hospital público
  location: {
    lat: number;
    lng: number;
  };
  googleMapsUrl: string;
}

// Calcular distância entre dois pontos (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Formatar distância para texto
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Detectar se é estabelecimento público
function isPublicHealthcare(name: string, types: string[]): boolean {
  const publicKeywords = [
    "ubs", "unidade básica", "unidade de saúde",
    "upa", "pronto atendimento",
    "hospital municipal", "hospital estadual", "hospital público",
    "posto de saúde", "centro de saúde",
    "ama ", "caps", "cras",
    "sus", "prefeitura", "secretaria"
  ];

  const nameLower = name.toLowerCase();
  return publicKeywords.some(kw => nameLower.includes(kw));
}

// Mapear tipo de busca para tipos do Google Places
function getPlaceTypes(type: string): string[] {
  switch (type) {
    case "hospital":
      return ["hospital"];
    case "clinic":
      return ["doctor", "health"];
    case "doctor":
      return ["doctor"];
    case "pharmacy":
      return ["pharmacy"];
    case "all":
    default:
      return ["hospital", "doctor", "health", "pharmacy"];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NearbyRequest = await req.json();
    const {
      latitude,
      longitude,
      radius = 5000,
      type = "all",
      keyword,
      maxResults = 10,
    } = body;

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "latitude e longitude são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      console.error("[search-nearby-clinics] GOOGLE_PLACES_API_KEY não configurada");
      return new Response(
        JSON.stringify({
          error: "API de busca não configurada",
          clinics: [],
          fallbackMessage: "Não foi possível buscar clínicas próximas. Por favor, pesquise manualmente no Google Maps."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placeTypes = getPlaceTypes(type);
    const allResults: any[] = [];

    // Buscar para cada tipo
    for (const placeType of placeTypes) {
      const params = new URLSearchParams({
        location: `${latitude},${longitude}`,
        radius: radius.toString(),
        type: placeType,
        language: "pt-BR",
        key: GOOGLE_PLACES_API_KEY,
      });

      if (keyword) {
        params.append("keyword", keyword);
      }

      const url = `${PLACES_NEARBY_URL}?${params.toString()}`;
      console.log(`[search-nearby-clinics] Buscando tipo: ${placeType}`);

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results) {
        allResults.push(...data.results);
      } else if (data.status !== "ZERO_RESULTS") {
        console.warn(`[search-nearby-clinics] Google API status: ${data.status}`);
      }
    }

    // Remover duplicatas por place_id
    const uniqueResults = Array.from(
      new Map(allResults.map(r => [r.place_id, r])).values()
    );

    // Processar e formatar resultados
    const clinics: Clinic[] = uniqueResults.map((place) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      return {
        id: place.place_id,
        name: place.name,
        address: place.vicinity || place.formatted_address || "",
        distance: Math.round(distance),
        distanceText: formatDistance(distance),
        rating: place.rating,
        totalRatings: place.user_ratings_total,
        isOpen: place.opening_hours?.open_now,
        openNow: place.opening_hours?.open_now ? "Aberto agora" : "Fechado",
        types: place.types || [],
        isPublic: isPublicHealthcare(place.name, place.types || []),
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      };
    });

    // Ordenar por distância
    clinics.sort((a, b) => a.distance - b.distance);

    // Limitar resultados
    const limitedClinics = clinics.slice(0, maxResults);

    // Separar públicos e privados
    const publicClinics = limitedClinics.filter(c => c.isPublic);
    const privateClinics = limitedClinics.filter(c => !c.isPublic);

    console.log(`[search-nearby-clinics] Encontrados: ${limitedClinics.length} (${publicClinics.length} públicos, ${privateClinics.length} privados)`);

    return new Response(
      JSON.stringify({
        success: true,
        total: limitedClinics.length,
        publicCount: publicClinics.length,
        privateCount: privateClinics.length,
        clinics: limitedClinics,
        publicClinics,
        privateClinics,
        searchLocation: {
          latitude,
          longitude,
          radius,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[search-nearby-clinics] Erro:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro ao buscar clínicas",
        clinics: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
