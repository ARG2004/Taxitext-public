import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  LogOut,
  Bell,
  Car,
  Hash,
  Star,
  CheckCircle,
  Clock,
  ShieldAlert,
  Map,
  BarChart,
  User,
  X,
  MapPin,
} from 'lucide-react-native';

import { goOnline, goOffline } from '../services/driverLocationService';
import { requestLocationPermission, getCurrentPosition, LatLng } from '../utils/location';
import type { Ride } from '../types/rideTypes';
import { Spacing, Radius, Shadows, Typography } from '../theme';

const { height } = Dimensions.get('window');

const C = {
  amarillo: '#FFCA28',
  amarilloOscuro: '#F9A825',
  azulTalavera: '#039BE5',
  azulClaro: '#E1F5FE',
  crema: '#F5F7FA',
  cremaBorde: '#E8ECF0',
  carbon: '#1A1A2E',
  carbonMedio: '#5A6272',
  gris: '#9BA3B0',
  blanco: '#FFFFFF',
  verde: '#2ECC71',
  rojo: '#E53935',
};

const DRIVER_MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,div[id="map"] { width:100%; height:100%; background: rgb(245,245,245); }
    .driver-pulse {
      width:24px; height:24px; border-radius:50%;
      background: rgb(3,155,229);
      box-shadow:0 0 0 0 rgba(3,155,229,0.7);
      animation:dpulse 2s infinite;
      display:flex; align-items:center; justify-content:center;
    }
    .driver-pulse::after {
      content:''; width:10px; height:10px; border-radius:50%;
      background: white;
    }
    @keyframes dpulse {
      0%   { box-shadow:0 0 0 0 rgba(3,155,229,0.7); }
      70%  { box-shadow:0 0 0 16px rgba(3,155,229,0); }
      100% { box-shadow:0 0 0 0 rgba(3,155,229,0); }
    }
    .leaflet-container { background: rgb(245,245,245) !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { center:[19.2853,-98.4382], zoom:15, zoomControl:false, attributionControl:false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

  var driverIcon = L.divIcon({ className:'', html:'<div class="driver-pulse"></div>', iconSize:[24,24], iconAnchor:[12,12] });
  var driverMarker = null;

  window.handleMapAction = function(data) {
    if (data.type === 'center') {
      map.flyTo([data.lat, data.lng], 16, { animate: true, duration: 1.5 });
      if (!driverMarker) {
        driverMarker = L.marker([data.lat, data.lng], {icon:driverIcon}).addTo(map);
      } else {
        driverMarker.setLatLng([data.lat, data.lng]);
      }
    }
  };

  function handleData(raw) {
    try {
      var data = JSON.parse(raw);
      window.handleMapAction(data);
    } catch(err){}
  }
  window.addEventListener('message', function(e){ handleData(e.data); });
  document.addEventListener('message', function(e){ handleData(e.data); });
</script>
</body>
</html>
`;

export default function DriverHomeScreen({ navigation }: any) {
  const webviewRef = useRef<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);
  const [stats, setStats] = useState({ viajesHoy: 0, rating: 5.0 });
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const uid = auth().currentUser?.uid;
  const firstName = driverData?.nombre ? driverData.nombre.split(' ')[0] : 'Conductor';

  useEffect(() => {
    loadDriverData();
  }, []);

  // Escuchar si tiene viajes activos para redirigir directamente al mapa
  useEffect(() => {
    if (!uid) return;

    const unsub = firestore()
      .collection('solicitudes')
      .where('conductorId', '==', uid)
      .where('estado', 'in', ['aceptado', 'llegado', 'en_curso'])
      .limit(1)
      .onSnapshot(
        (snap) => {
          if (snap && !snap.empty) {
            navigation.navigate('DriverMap');
          }
        },
        (error) => {
          console.log('Error en onSnapshot rides (DriverHomeScreen):', error);
        }
      );

    return unsub;
  }, [uid, navigation]);

  // Obtener la ubicación exacta del conductor en el montaje
  useEffect(() => {
    (async () => {
      const permission = await requestLocationPermission();
      if (permission === 'granted') {
        try {
          const pos = await getCurrentPosition();
          setDriverLocation(pos);
          sendToMap({ type: 'center', lat: pos.lat, lng: pos.lng });
        } catch (e) {
          console.log('Location error:', e);
        }
      }
      setLoadingLocation(false);
    })();
  }, []);

  const [pendingRides, setPendingRides] = useState<Ride[]>([]);
  const [showRidesModal, setShowRidesModal] = useState(false);

  // Escuchar solicitudes pendientes en estado "buscando"
  useEffect(() => {
    if (!uid) return;

    const unsub = firestore()
      .collection('solicitudes')
      .where('estado', '==', 'buscando')
      .onSnapshot(
        (snap) => {
          if (snap) {
            const list = snap.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as any),
            })) as Ride[];
            setPendingRides(list);
          }
        },
        (error) => {
          console.log('Error al escuchar solicitudes pendientes en home:', error);
        }
      );

    return unsub;
  }, [uid]);

  const handleAcceptRide = async (rideId: string) => {
    if (!uid) return;
    try {
      await firestore().collection('solicitudes').doc(rideId).update({
        conductorId: uid,
        conductorNombre: driverData?.nombre || 'Conductor',
        conductorPlaca: driverData?.placa || '',
        conductorUbicacion: driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null,
        conductorUnidad: driverData?.numUnidad || '',
        estado: 'aceptado',
        aceptadoEn: firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert('Viaje Aceptado', 'Has aceptado la solicitud con éxito. Dirígete a la pantalla de operaciones.');
    } catch (e) {
      console.log('Error accepting ride:', e);
      Alert.alert('Error', 'No se pudo aceptar el viaje.');
    }
  };

  const sendToMap = useCallback((data: object) => {
    const js = `document.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      JSON.stringify(data),
    )}}));true;`;
    webviewRef.current?.injectJavaScript(js);
  }, []);

  const loadDriverData = async () => {
    if (uid) {
      const doc = await firestore().collection('usuarios').doc(uid).get();
      if (doc.exists()) {
        setDriverData(doc.data());
      }
    }
  };

  const toggleOnline = async (value: boolean) => {
    if (!uid) return;

    if (value) {
      const driverInfo = {
        nombre: driverData?.nombre || auth().currentUser?.displayName || 'Conductor',
        placa: driverData?.placa || '',
        numUnidad: driverData?.numUnidad || '',
      };
      const success = await goOnline(uid, driverInfo);
      if (success) {
        setIsOnline(true);
        await firestore().collection('usuarios').doc(uid).update({ activo: true });
        navigation.navigate('DriverMap');
      } else {
        Alert.alert('Error', 'No se pudo obtener acceso a la ubicación.');
      }
    } else {
      await goOffline(uid);
      setIsOnline(false);
      await firestore().collection('usuarios').doc(uid).update({ activo: false });
    }
  };

  const irAlMapa = () => {
    navigation.navigate('DriverMap');
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          if (uid) {
            await firestore().collection('usuarios').doc(uid).update({ activo: false });
          }
          await auth().signOut();
          navigation.replace('Welcome');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.carbon} />

      {/* Floating Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={22} color={C.blanco} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>TAXITEX</Text>
          <Text style={styles.headerSub}>Panel del Conductor</Text>
        </View>

        <TouchableOpacity style={styles.bellBtn} onPress={() => Alert.alert('Notificaciones', 'No tienes avisos nuevos.')}>
          <Bell size={22} color={C.blanco} />
        </TouchableOpacity>
      </View>

      {/* Map Section */}
      <View style={styles.mapWrapper}>
        <WebView
          ref={webviewRef}
          source={{ html: DRIVER_MAP_HTML }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          androidHardwareAccelerationDisabled={true}
          onLoadEnd={() => {
            if (driverLocation) {
              sendToMap({ type: 'center', lat: driverLocation.lat, lng: driverLocation.lng });
            }
          }}
        />

        {/* Floating Panic Button */}
        <TouchableOpacity
          style={styles.panicBtn}
          onPress={() =>
            Alert.alert(
              'Emergencia',
              'Se ha enviado una alerta de emergencia a Taxitex. Mantente en un lugar seguro.',
            )
          }
        >
          <ShieldAlert size={24} color={C.blanco} />
        </TouchableOpacity>

        {loadingLocation && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={C.azulTalavera} />
            <Text style={styles.loaderText}>Localizando satélite GPS...</Text>
          </View>
        )}
      </View>

      {/* Floating Bottom Sheet Panel */}
      <View style={styles.panel}>
        {/* Driver Profile */}
        <View style={styles.infoTop}>
          <View style={styles.avatarCircle}>
            <Car size={26} color={C.blanco} />
          </View>
          <View style={styles.infoTexts}>
            <Text style={styles.infoName}>Hola, {firstName}</Text>
            <View style={styles.infoRow}>
              {driverData?.placa && (
                <View style={styles.infoBadge}>
                  <View style={styles.badgeIconRow}>
                    <Hash size={10} color={C.carbonMedio} />
                    <Text style={styles.infoBadgeText}>{driverData.placa}</Text>
                  </View>
                </View>
              )}
              {driverData?.numUnidad && (
                <View style={[styles.infoBadge, styles.infoBadgeAlt]}>
                  <View style={styles.badgeIconRow}>
                    <Car size={10} color={C.carbonMedio} />
                    <Text style={styles.infoBadgeText}>Unidad {driverData.numUnidad}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Toggle Online */}
        <View style={styles.onlineToggle}>
          <View style={styles.onlineLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? C.verde : C.gris }]} />
            <Text style={styles.onlineLabel}>
              {isOnline ? 'En línea — Recibiendo viajes' : 'Fuera de línea'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#E0E0E0', true: C.verde + '66' }}
            thumbColor={isOnline ? C.verde : '#ccc'}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.viajesHoy}</Text>
            <Text style={styles.statLabel}>Viajes hoy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingRow}>
              <Star size={16} color={C.amarilloOscuro} fill={C.amarilloOscuro} />
              <Text style={styles.statValue}> {stats.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            {driverData?.verificado ? (
              <CheckCircle size={20} color={C.verde} />
            ) : (
              <Clock size={20} color={C.amarilloOscuro} />
            )}
            <Text style={styles.statLabel}>
              {driverData?.verificado ? 'Verificado' : 'Pendiente'}
            </Text>
          </View>
        </View>

        {/* Actions Row (Map & Requests List) if Online */}
        {isOnline && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={[styles.openMapBtn, { flex: 1 }]} onPress={irAlMapa}>
              <View style={styles.openMapInner}>
                <Map size={16} color={C.blanco} />
                <Text style={styles.openMapBtnText}>Ver en Mapa</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewRidesBtn, { flex: 1 }]}
              onPress={() => setShowRidesModal(true)}
            >
              <View style={styles.openMapInner}>
                <Bell size={16} color={C.blanco} />
                <Text style={styles.openMapBtnText}>Ver Solicitudes ({pendingRides.length})</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('DriverRides')}>
            <BarChart size={24} color={C.gris} strokeWidth={2} />
            <Text style={styles.tabLabel}>Historial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={irAlMapa}>
            <View style={styles.activeTabCircle}>
              <Map size={26} color={C.blanco} />
            </View>
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={handleLogout}>
            <LogOut size={24} color={C.gris} />
            <Text style={styles.tabLabel}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Solicitudes Disponibles */}
      <Modal
        visible={showRidesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRidesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solicitudes de Viaje</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowRidesModal(false)}>
                <X size={22} color={C.carbon} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {pendingRides.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No hay solicitudes de viaje en este momento.</Text>
              </View>
            ) : (
              <FlatList
                data={pendingRides}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={styles.rideCardItem}>
                    <View style={styles.rideItemHeader}>
                      <View style={styles.rideItemUser}>
                        <User size={16} color={C.gris} />
                        <Text style={styles.rideItemUserName}>{item.pasajeroNombre}</Text>
                      </View>
                      {item.distanciaKm != null && (
                        <Text style={styles.rideItemDistance}>{item.distanciaKm.toFixed(1)} km</Text>
                      )}
                    </View>

                    <View style={styles.rideItemAddresses}>
                      <View style={styles.rideAddressItem}>
                        <MapPin size={14} color={C.azulTalavera} />
                        <Text style={styles.rideAddressLabel} numberOfLines={1}>
                          <Text style={{ fontWeight: '700' }}>Origen:</Text> {item.origen.label}
                        </Text>
                      </View>
                      <View style={styles.rideAddressItem}>
                        <MapPin size={14} color={C.amarilloOscuro} />
                        <Text style={styles.rideAddressLabel} numberOfLines={1}>
                          <Text style={{ fontWeight: '700' }}>Destino:</Text> {item.destino.label}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.modalAcceptBtn}
                      onPress={() => {
                        setShowRidesModal(false);
                        handleAcceptRide(item.id);
                      }}
                    >
                      <Text style={styles.modalAcceptBtnText}>ACEPTAR VIAJE</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.crema,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.carbon,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    ...Shadows.sm,
  },
  logoutBtn: { padding: 6 },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.blanco,
    letterSpacing: 3,
  },
  headerSub: {
    fontSize: 11,
    color: C.blanco + 'AA',
    fontWeight: '600',
    marginTop: 2,
  },
  bellBtn: { padding: 6 },

  mapWrapper: {
    flex: 1,
    backgroundColor: '#eee',
    position: 'relative',
  },
  map: { flex: 1 },
  mapLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: { marginTop: 10, fontSize: 14, color: C.carbon, fontWeight: '700' },

  panicBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.rojo,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },

  panel: {
    backgroundColor: C.blanco,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#eef0f2',
    ...Shadows.lg,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.azulTalavera,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.azulClaro,
  },
  infoTexts: { flex: 1 },
  infoName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.carbon,
    marginBottom: 6,
  },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoBadge: {
    backgroundColor: C.azulClaro,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoBadgeAlt: { backgroundColor: C.amarillo + '33' },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.carbonMedio,
  },
  badgeIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.cremaBorde,
  },
  onlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  onlineLabel: { fontSize: 13, fontWeight: '700', color: C.carbonMedio },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.cremaBorde,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: C.carbon },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statLabel: { fontSize: 11, color: C.gris, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 30, backgroundColor: C.cremaBorde },

  openMapBtn: {
    backgroundColor: C.azulTalavera,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  openMapInner: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  openMapBtnText: { color: C.blanco, fontSize: 14, fontWeight: '800' },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingVertical: 10,
    height: 75,
    marginTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, color: C.gris, marginTop: 4, fontWeight: '600' },
  tabLabelActive: { color: C.azulTalavera, fontWeight: '800' },
  activeTabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    backgroundColor: C.azulTalavera,
    ...Shadows.sm,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  viewRidesBtn: {
    backgroundColor: C.amarilloOscuro,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: height * 0.75,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.carbon,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: C.gris,
    fontWeight: '600',
    textAlign: 'center',
  },
  rideCardItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  rideItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideItemUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rideItemUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.carbon,
  },
  rideItemDistance: {
    fontSize: 12,
    fontWeight: '800',
    color: C.azulTalavera,
  },
  rideItemAddresses: {
    gap: 8,
    marginBottom: 16,
  },
  rideAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rideAddressLabel: {
    fontSize: 13,
    color: C.carbonMedio,
    flex: 1,
  },
  modalAcceptBtn: {
    backgroundColor: C.azulTalavera,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  modalAcceptBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});