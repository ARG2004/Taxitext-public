// Servicio de viajes usando colecciones y campos en español.
// solicitudes y conductores.

import firestore from '@react-native-firebase/firestore';
import { haversineKm } from '../utils/geo';
import type { Ride, RideStatus, GeoPoint, DriverDoc } from '../types/rideTypes';

const SOLICITUDES = 'solicitudes';
const CONDUCTORES = 'conductores';

// ─── Crear viaje ──────────────────────────────────────────────────────────────

export async function createRide(params: {
  passengerId: string;
  passengerName: string;
  origin: GeoPoint;
  destination: GeoPoint;
  distanceKm: number | null;
  durationMin: number | null;
}): Promise<string> {
  const doc: Omit<Ride, 'id'> = {
    pasajeroId: params.passengerId,
    pasajeroNombre: params.passengerName,
    conductorId: null,
    conductorNombre: null,
    conductorPlaca: null,
    conductorUnidad: null,
    origen: params.origin,
    destino: params.destination,
    distanciaKm: params.distanceKm,
    duracionMin: params.durationMin,
    conductorUbicacion: null,
    precioFinal: null,
    estado: 'buscando',
    canceladoPor: null,
    creadoEn: firestore.FieldValue.serverTimestamp(),
    aceptadoEn: null,
    llegadoEn: null,
    iniciadoEn: null,
    finalizadoEn: null,
  };
  const ref = await firestore().collection(SOLICITUDES).add(doc);
  return ref.id;
}

// ─── Buscar conductores cercanos ──────────────────────────────────────────────

export async function findNearbyDrivers(
  origen: { lat: number; lng: number },
  radiusKm: number = 5,
): Promise<DriverDoc[]> {
  const snap = await firestore()
    .collection(CONDUCTORES)
    .where('status', '==', 'available')
    .get();

  const drivers: DriverDoc[] = [];
  snap.forEach((doc) => {
    const data = doc.data() as DriverDoc;
    const dist = haversineKm(origen, { lat: data.lat, lng: data.lng });
    if (dist <= radiusKm) {
      drivers.push(data);
    }
  });

  drivers.sort((a, b) => {
    const distA = haversineKm(origen, { lat: a.lat, lng: a.lng });
    const distB = haversineKm(origen, { lat: b.lat, lng: b.lng });
    return distA - distB;
  });

  return drivers;
}

// ─── Conductor acepta viaje ───────────────────────────────────────────────────

export async function acceptRide(rideId: string, driverUid: string): Promise<boolean> {
  const rideRef = firestore().collection(SOLICITUDES).doc(rideId);
  const driverRef = firestore().collection(CONDUCTORES).doc(driverUid);

  try {
    await firestore().runTransaction(async (tx) => {
      const rideSnap = await tx.get(rideRef);
      if (!rideSnap.exists()) throw new Error('ride-no-existe');

      const ride = rideSnap.data() as Omit<Ride, 'id'>;
      if (ride.estado !== 'buscando' || ride.conductorId) {
        throw new Error('ride-ya-tomado');
      }

      const driverSnap = await tx.get(driverRef);
      const driverData = driverSnap.data() as DriverDoc | undefined;

      tx.update(rideRef, {
        estado: 'aceptado',
        conductorId: driverUid,
        conductorNombre: driverData?.nombre ?? null,
        conductorPlaca: driverData?.placa ?? null,
        conductorUnidad: driverData?.numUnidad ?? null,
        conductorUbicacion: driverData ? { lat: driverData.lat, lng: driverData.lng } : null,
        aceptadoEn: firestore.FieldValue.serverTimestamp(),
      });

      if (driverSnap.exists()) {
        tx.update(driverRef, { status: 'busy' });
      }
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Conductor marca que llegó ────────────────────────────────────────────────

export async function markDriverArrived(rideId: string): Promise<void> {
  await firestore().collection(SOLICITUDES).doc(rideId).update({
    estado: 'llegado',
    llegadoEn: firestore.FieldValue.serverTimestamp(),
  });
}

// ─── Pasajero inicia viaje ───────────────────────────────────────────────────

export async function startRide(rideId: string): Promise<void> {
  await firestore().collection(SOLICITUDES).doc(rideId).update({
    estado: 'en_curso',
    iniciadoEn: firestore.FieldValue.serverTimestamp(),
  });
}

// ─── Conductor finaliza viaje ─────────────────────────────────────────────────

export async function completeRide(
  rideId: string,
  driverUid: string,
  precioFinal?: number,
): Promise<void> {
  const updates: Record<string, any> = {
    estado: 'completado',
    finalizadoEn: firestore.FieldValue.serverTimestamp(),
  };
  if (precioFinal != null) {
    updates.precioFinal = precioFinal;
  }
  await firestore().collection(SOLICITUDES).doc(rideId).update(updates);

  await firestore().collection(CONDUCTORES).doc(driverUid).update({
    status: 'available',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

// ─── Cancelar viaje ───────────────────────────────────────────────────────────

export async function cancelRide(
  rideId: string,
  byWhom: 'passenger' | 'driver',
  driverUid?: string,
): Promise<void> {
  await firestore().collection(SOLICITUDES).doc(rideId).update({
    estado: 'cancelado',
    canceladoPor: byWhom,
    conductorId: null,
    conductorUbicacion: null,
  });

  if (driverUid) {
    await firestore().collection(CONDUCTORES).doc(driverUid).update({
      status: 'available',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }
}

// ─── Actualizar ubicación del conductor en la solicitud activa ─────────────────────

export async function updateDriverLocationOnRide(
  rideId: string,
  location: { lat: number; lng: number },
): Promise<void> {
  await firestore()
    .collection(SOLICITUDES)
    .doc(rideId)
    .update({
      conductorUbicacion: {
        lat: location.lat,
        lng: location.lng,
      },
    })
    .catch(() => {});
}
