import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type RideStatus =
  | 'buscando'      // Pasajero solicitó, buscando conductores
  | 'aceptado'      // Conductor aceptó, se dirige al pickup
  | 'llegado'       // Conductor llegó al punto de recogida
  | 'en_curso'      // Viaje en curso
  | 'completado'    // Viaje finalizado
  | 'cancelado';    // Cancelado

export type GeoPoint = {
  lat: number;
  lng: number;
  label: string;
};

export type Ride = {
  id: string;
  pasajeroId: string;
  pasajeroNombre: string;
  conductorId: string | null;
  conductorNombre: string | null;
  conductorPlaca: string | null;
  conductorUnidad: string | null;
  origen: GeoPoint;
  destino: GeoPoint;
  distanciaKm: number | null;
  duracionMin: number | null;
  conductorUbicacion: { lat: number; lng: number } | null;
  precioFinal: number | null;
  estado: RideStatus;
  canceladoPor: 'passenger' | 'driver' | null;
  creadoEn: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
  aceptadoEn: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
  llegadoEn: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
  iniciadoEn: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
  finalizadoEn: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
};

export type DriverDoc = {
  uid: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
  nombre: string;
  placa: string;
  numUnidad: string;
  updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
};
