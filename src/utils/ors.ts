// Utilidades de Geocodificación y Ruteo (ORS + OSRM fallback + Nominatim)

export type LatLng = { lat: number; lng: number };

export type RouteResult = {
  coords: [number, number][]; // [lng, lat][]
  distanceKm: number | null;
  durationMin: number | null;
};

const ORS_API_KEY =
  'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ0ODBmNTAwMGQ3MDQ4M2ZhN2VkM2U3M2VkZGNhYzQ2IiwiaCI6Im11cm11cjY0In0=';

/**
 * Fallback: calcula la ruta usando OSRM público (gratuito, sin API key).
 * Se usa cuando OpenRouteService falla tras agotar reintentos.
 */
/**
 * Auxiliar para realizar fetch con un límite de tiempo (timeout).
 */
async function fetchWithTimeout(resource: string, options: any = {}, timeout = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Calcula la ruta usando OSRM público (gratuito, sin API key).
 * Añade User-Agent para cumplir con la política de uso del servidor.
 */
async function fetchOSRMRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'TaxiTex-App-Development',
      },
    }, 4000); // 4 segundos de timeout para OSRM

    if (!res.ok) {
      console.warn('[OSRM] Respuesta no OK:', res.status);
      return null;
    }

    const json = await res.json();
    const route = json.routes?.[0];

    if (!route || !route.geometry?.coordinates?.length) {
      console.warn('[OSRM] Sin rutas válidas en la respuesta:', JSON.stringify(json));
      return null;
    }

    return {
      coords: route.geometry.coordinates,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch (error) {
    console.warn('[OSRM] Excepción o Timeout:', error);
    return null;
  }
}

/**
 * Calcula la ruta usando OpenRouteService (motor secundario / fallback).
 * Tiene un timeout de 3 segundos para evitar que la app se cuelgue.
 */
async function fetchORSRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  try {
    const res = await fetchWithTimeout('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
    }, 3000); // 3 segundos de timeout

    if (!res.ok) {
      console.error('[ORS] Respuesta no OK:', res.status);
      return null;
    }

    const json = await res.json();
    const feature = json.features?.[0];

    if (!feature || !feature.geometry?.coordinates || feature.geometry.coordinates.length === 0) {
      console.error('[ORS] Sin feature/geometry válida:', JSON.stringify(json));
      return null;
    }

    const summary = feature.properties?.summary;

    return {
      coords: feature.geometry.coordinates,
      distanceKm: summary ? summary.distance / 1000 : null,
      durationMin: summary ? summary.duration / 60 : null,
    };
  } catch (error) {
    console.warn('[ORS] Excepción o Timeout:', error);
    return null;
  }
}

/**
 * Función principal para obtener rutas de conducción.
 * Prueba OSRM primero por velocidad y disponibilidad.
 * Si falla, cae a ORS como fallback secundario.
 */
export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng
): Promise<RouteResult | null> {
  console.log('[Routing] Iniciando cálculo de ruta...');
  
  // 1. Intentamos con OSRM
  const osrmResult = await fetchOSRMRoute(from, to);
  if (osrmResult) {
    console.log('[Routing] Ruta calculada con éxito usando OSRM.');
    return osrmResult;
  }

  // 2. Fallback a ORS
  console.warn('[Routing] OSRM falló, intentando fallback con ORS...');
  const orsResult = await fetchORSRoute(from, to);
  if (orsResult) {
    console.log('[Routing] Ruta calculada con éxito usando ORS.');
    return orsResult;
  }

  console.warn('[Routing] Todos los servicios de ruteo fallaron.');
  return null;
}

/**
 * Busca una dirección usando Nominatim (OpenStreetMap)
 */
export async function geocodeSearch(
  text: string,
  focus?: LatLng
): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const query = encodeURIComponent(`${text}, Puebla, Mexico`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1&countrycodes=mx`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TaxiTex-App-Development',
        'Accept-Language': 'es-MX',
      },
    });

    if (!res.ok) {
      console.error('[Nominatim] Respuesta no OK:', res.status);
      return null;
    }

    const json = await res.json();
    if (!json || json.length === 0) {
      console.error('[Nominatim] Sin resultados para:', text);
      return null;
    }

    const result = json[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.error('[Nominatim] Coordenadas inválidas en resultado:', result);
      return null;
    }

    return {
      lat,
      lng,
      label: result.display_name.split(',').slice(0, 3).join(','),
    };
  } catch (error) {
    console.error('[Nominatim] geocodeSearch excepción:', error);
    return null;
  }
}

export async function reverseGeocode(point: LatLng): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${point.lat}&lon=${point.lng}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TaxiTex-App-Development' },
    });
    if (!res.ok) return 'Punto seleccionado';
    const json = await res.json();
    return json.display_name ?? 'Punto seleccionado';
  } catch (error) {
    console.error('[Nominatim] reverseGeocode excepción:', error);
    return 'Punto seleccionado';
  }
}