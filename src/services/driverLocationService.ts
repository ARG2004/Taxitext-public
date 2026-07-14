// Servicio de geolocalización de conductores usando colección en español "conductores"
import firestore from '@react-native-firebase/firestore';
import { watchPosition, clearWatch, getCurrentPosition, requestLocationPermission } from '../utils/location';
import type { DriverDoc } from '../types/rideTypes';

let _watchId: number | null = null;
const CONDUCTORES = 'conductores';

export async function goOnline(
  uid: string,
  driverInfo: { nombre: string; placa: string; numUnidad: string },
): Promise<boolean> {
  const permission = await requestLocationPermission();
  if (permission !== 'granted') return false;

  let lat = 0;
  let lng = 0;
  try {
    const pos = await getCurrentPosition();
    lat = pos.lat;
    lng = pos.lng;
  } catch {
    // 0,0 por defecto
  }

  const doc: Omit<DriverDoc, 'uid'> & { uid: string } = {
    uid,
    lat,
    lng,
    status: 'available',
    nombre: driverInfo.nombre,
    placa: driverInfo.placa,
    numUnidad: driverInfo.numUnidad,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  await firestore().collection(CONDUCTORES).doc(uid).set(doc, { merge: true });
  startTrackingLocation(uid);
  return true;
}

export async function goOffline(uid: string): Promise<void> {
  stopTrackingLocation();
  await firestore().collection(CONDUCTORES).doc(uid).update({
    status: 'offline',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function setDriverBusy(uid: string): Promise<void> {
  await firestore().collection(CONDUCTORES).doc(uid).update({
    status: 'busy',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function setDriverAvailable(uid: string): Promise<void> {
  await firestore().collection(CONDUCTORES).doc(uid).update({
    status: 'available',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

function startTrackingLocation(uid: string): void {
  if (_watchId !== null) {
    clearWatch(_watchId);
  }
  _watchId = watchPosition((loc) => {
    firestore()
      .collection(CONDUCTORES)
      .doc(uid)
      .update({
        lat: loc.lat,
        lng: loc.lng,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => {});
  });
}

export function stopTrackingLocation(): void {
  if (_watchId !== null) {
    clearWatch(_watchId);
    _watchId = null;
  }
}
