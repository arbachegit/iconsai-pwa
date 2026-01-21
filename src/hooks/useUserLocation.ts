/**
 * ============================================================
 * useUserLocation.ts - Hook para capturar geolocalização
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-19
 *
 * Descrição: Captura a localização do usuário via Geolocation API
 * e armazena junto com o device fingerprint para uso no PWA Health.
 * ============================================================
 */

import { useState, useEffect, useCallback } from "react";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  city?: string;
  state?: string;
  country?: string;
}

interface UseUserLocationReturn {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: "granted" | "denied" | "prompt" | "unknown";
  requestLocation: () => Promise<UserLocation | null>;
  clearLocation: () => void;
}

const LOCATION_STORAGE_KEY = "pwa_user_location";
const LOCATION_CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");

  // Verificar permissão atual
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setPermissionStatus(result.state as "granted" | "denied" | "prompt");

        result.addEventListener("change", () => {
          setPermissionStatus(result.state as "granted" | "denied" | "prompt");
        });
      }).catch(() => {
        setPermissionStatus("unknown");
      });
    }
  }, []);

  // Carregar localização do cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (cached) {
        const parsed: UserLocation = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;

        // Usar cache se ainda válido
        if (age < LOCATION_CACHE_DURATION) {
          setLocation(parsed);
          console.log("[useUserLocation] Usando localização em cache");
        } else {
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          console.log("[useUserLocation] Cache expirado, removido");
        }
      }
    } catch (err) {
      console.warn("[useUserLocation] Erro ao ler cache:", err);
    }
  }, []);

  // Função para obter nome da cidade via reverse geocoding
  const reverseGeocode = async (lat: number, lng: number): Promise<Partial<UserLocation>> => {
    try {
      // Usando Nominatim (OpenStreetMap) - gratuito
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`,
        {
          headers: {
            "User-Agent": "PWAHealth/1.0",
          },
        }
      );

      if (!response.ok) return {};

      const data = await response.json();
      const address = data.address || {};

      return {
        city: address.city || address.town || address.municipality || address.village,
        state: address.state,
        country: address.country,
      };
    } catch (err) {
      console.warn("[useUserLocation] Reverse geocode falhou:", err);
      return {};
    }
  };

  // Solicitar localização
  const requestLocation = useCallback(async (): Promise<UserLocation | null> => {
    if (!("geolocation" in navigator)) {
      setError("Geolocalização não suportada neste dispositivo");
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Obter nome da cidade
          const geoData = await reverseGeocode(latitude, longitude);

          const newLocation: UserLocation = {
            latitude,
            longitude,
            accuracy,
            timestamp: Date.now(),
            ...geoData,
          };

          // Salvar no estado e cache
          setLocation(newLocation);
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));

          console.log("[useUserLocation] Localização obtida:", newLocation);
          setIsLoading(false);
          setPermissionStatus("granted");
          resolve(newLocation);
        },
        (err) => {
          console.error("[useUserLocation] Erro:", err);

          let errorMessage = "Erro ao obter localização";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Permissão de localização negada";
              setPermissionStatus("denied");
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Localização indisponível";
              break;
            case err.TIMEOUT:
              errorMessage = "Tempo esgotado ao obter localização";
              break;
          }

          setError(errorMessage);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutos
        }
      );
    });
  }, []);

  // Limpar localização
  const clearLocation = useCallback(() => {
    setLocation(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    console.log("[useUserLocation] Localização limpa");
  }, []);

  return {
    location,
    isLoading,
    error,
    permissionStatus,
    requestLocation,
    clearLocation,
  };
}

export default useUserLocation;
