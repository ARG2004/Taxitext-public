// Utilidades de ubicación GPS: permisos y lectura de posición.

import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type LatLng = { lat: number; lng: number };
export type PermissionResult = 'granted' | 'denied' | 'blocked';

export async function requestLocationPermission(): Promise<PermissionResult> {
  if (Platform.OS !== 'android') return 'granted';
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permiso de ubicación',
        message: 'Taxitex necesita tu ubicación precisa para funcionar correctamente.',
        buttonNeutral: 'Preguntar luego',
        buttonNegative: 'Cancelar',
        buttonPositive: 'Aceptar',
      }
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
    return 'denied';
  } catch {
    return 'denied';
  }
}

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
}

export function watchPosition(onUpdate: (loc: LatLng) => void): number {
  return Geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => {},
    { enableHighAccuracy: true, distanceFilter: 25, interval: 8000, fastestInterval: 5000 }
  );
}

export function clearWatch(id: number) {
  Geolocation.clearWatch(id);
}