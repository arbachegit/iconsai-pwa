import { useState, useEffect } from "react";

const LOCATION_STORAGE_KEY = "knowyou_user_location";

export function useGeolocation() {
  const [location, setLocation] = useState<string | null>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    return saved || null;
  });
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isLoading, setIsLoading] = useState(false);

  // Save location to localStorage whenever it changes
  useEffect(() => {
    if (location) {
      localStorage.setItem(LOCATION_STORAGE_KEY, location);
    }
  }, [location]);

  // Allow manual location setting (for when user tells us in chat)
  const setManualLocation = (city: string) => {
    setLocation(city);
    setPermission('granted');
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setPermission('denied');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check permission status
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setPermission(result.state);
      
      if (result.state === 'granted' || result.state === 'prompt') {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Reverse geocoding para obter nome da cidade
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`,
                {
                  headers: {
                    'User-Agent': 'KnowRisk-Chat-App',
                  }
                }
              );
              const data = await response.json();
              const cityName = data.address?.city || data.address?.town || data.address?.village || 'Localização desconhecida';
              setLocation(cityName);
              setPermission('granted');
            } catch (error) {
              console.error('Error reverse geocoding:', error);
              setLocation(null);
            } finally {
              setIsLoading(false);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            setPermission('denied');
            setLocation(null);
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Permission query error:', error);
      setPermission('denied');
      setIsLoading(false);
    }
  };

  // Auto-request on mount if permission was previously granted
  useEffect(() => {
    const checkInitialPermission = async () => {
      if (!navigator.geolocation) return;
      
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (result.state === 'granted') {
          requestLocation();
        }
      } catch {
        // Permission API not supported, do nothing
      }
    };

    checkInitialPermission();
  }, []);

  return { location, permission, isLoading, requestLocation, setManualLocation };
}
