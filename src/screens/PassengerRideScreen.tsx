// Pantalla de seguimiento del pasajero usando campos en español compatibles con la base de datos original.
// estado: buscando → aceptado → llegado → en_curso → completado | cancelado

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
  ActivityIndicator,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import firestore from '@react-native-firebase/firestore';
import {
  ArrowLeft,
  MessageCircle,
  X,
  Navigation,
  MapPin,
  Phone,
  Shield,
} from 'lucide-react-native';

import { startRide, cancelRide } from '../services/rideService';
import { fetchDrivingRoute } from '../utils/ors';
import type { Ride, RideStatus } from '../types/rideTypes';

const YELLOW = '#F5C200';
const DARK = '#1A1A2E';
const AZUL = '#2B7DB4';
const VERDE = '#34C759';
const ROJO = '#E53935';

// ─── Mapa HTML ────────────────────────────────────────────────────────────────
const buildMapHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,div[id="map"] { width:100%; height:100%; }
    .user-pulse {
      width:18px; height:18px; border-radius:50%;
      background: rgb(245,194,0);
      box-shadow:0 0 0 0 rgba(245,194,0,0.7);
      animation:upulse 2s infinite;
    }
    @keyframes upulse {
      0%   { box-shadow:0 0 0 0 rgba(245,194,0,0.7); }
      70%  { box-shadow:0 0 0 14px rgba(245,194,0,0); }
      100% { box-shadow:0 0 0 0 rgba(245,194,0,0); }
    }
    .driver-dot {
      width:36px; height:36px; border-radius:50%;
      background: rgb(43,125,180); border: 3px solid white;
      display:flex; align-items:center; justify-content:center;
      font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.3);
    }
    .leaflet-control-zoom a { border-radius:8px !important; margin-bottom:4px !important; border:none !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { center:[${lat},${lng}], zoom:15, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

  var userIcon = L.divIcon({ className:'', html:'<div class="user-pulse"></div>', iconSize:[18,18], iconAnchor:[9,9] });
  var driverIcon = L.divIcon({ className:'', html:'<div class="driver-dot">🚕</div>', iconSize:[36,36], iconAnchor:[18,18] });
  var pinSvg = function(color){ return '<svg width="30" height="40" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M17 0C7.6 0 0 7.6 0 17c0 12.4 17 27 17 27s17-14.6 17-27C34 7.6 26.4 0 17 0z" fill="rgb(26,26,46)"/>' +
    '<circle cx="17" cy="17" r="7" fill="' + color + '"/></svg>'; };
  var pickupIcon = L.divIcon({ className:'', html:pinSvg('rgb(43,125,180)'), iconSize:[30,40], iconAnchor:[15,40] });
  var destIcon = L.divIcon({ className:'', html:pinSvg('rgb(245,194,0)'), iconSize:[30,40], iconAnchor:[15,40] });

  var userMarker = L.marker([${lat},${lng}], {icon:userIcon}).addTo(map);
  var driverMarker = null;
  var pickupMarker = null;
  var destMarker = null;
  var routeLayer = null;

  function handleData(raw) {
    try {
      var data = JSON.parse(raw);
      if (data.type === 'driverLocation') {
        if (!driverMarker) {
          driverMarker = L.marker([data.lat, data.lng], {icon:driverIcon}).addTo(map);
        } else {
          driverMarker.setLatLng([data.lat, data.lng]);
        }
      } else if (data.type === 'showPickup') {
        if (!pickupMarker) pickupMarker = L.marker([data.lat, data.lng], {icon:pickupIcon}).addTo(map);
      } else if (data.type === 'showDest') {
        if (!destMarker) destMarker = L.marker([data.lat, data.lng], {icon:destIcon}).addTo(map);
      } else if (data.type === 'route') {
        if (routeLayer) map.removeLayer(routeLayer);
        var coords = data.coords.map(function(c){ return [c[1],c[0]]; });
        routeLayer = L.polyline(coords, { color: data.color || '#F5C200', weight:5, opacity:0.9 }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding:[60,60] });
      } else if (data.type === 'fitAll') {
        var bounds = [];
        if (userMarker) bounds.push(userMarker.getLatLng());
        if (driverMarker) bounds.push(driverMarker.getLatLng());
        if (pickupMarker) bounds.push(pickupMarker.getLatLng());
        if (destMarker) bounds.push(destMarker.getLatLng());
        if (bounds.length >= 2) map.fitBounds(bounds, { padding:[60,60] });
      } else if (data.type === 'clear') {
        if (routeLayer) { map.removeLayer(routeLayer); routeLayer=null; }
        if (driverMarker) { map.removeLayer(driverMarker); driverMarker=null; }
        if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker=null; }
        if (destMarker) { map.removeLayer(destMarker); destMarker=null; }
      }
    } catch(err){}
  }
  window.addEventListener('message', function(e){ handleData(e.data); });
  document.addEventListener('message', function(e){ handleData(e.data); });
</script>
</body>
</html>
`;

export default function PassengerRideScreen({ route, navigation }: any) {
  const { rideId, originLat, originLng } = route.params;
  const webviewRef = useRef<any>(null);

  const [ride, setRide] = useState<Ride | null>(null);
  const [etaInfo, setEtaInfo] = useState<{ km: string; min: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const mapHtml = useRef(buildMapHtml(originLat, originLng)).current;

  const sendToMap = useCallback((data: object) => {
    const js = `document.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      JSON.stringify(data),
    )}}));true;`;
    webviewRef.current?.injectJavaScript(js);
  }, []);

  // ── Listener del ride ──
  useEffect(() => {
    const unsub = firestore()
      .collection('solicitudes')
      .doc(rideId)
      .onSnapshot(
        (snap) => {
          if (!snap.exists()) return;
          const data = { id: snap.id, ...(snap.data() as any) } as Ride;
          setRide(data);
        },
        (err) => {
          console.log('Error escuchando solicitud de viaje:', err);
        },
      );
    return unsub;
  }, [rideId]);

  // ── Actualizar mapa al cambiar ride ──
  useEffect(() => {
    if (!ride) return;

    sendToMap({ type: 'showPickup', lat: ride.origen.lat, lng: ride.origen.lng });
    sendToMap({ type: 'showDest', lat: ride.destino.lat, lng: ride.destino.lng });

    if (ride.conductorUbicacion) {
      sendToMap({ type: 'driverLocation', lat: ride.conductorUbicacion.lat, lng: ride.conductorUbicacion.lng });
    }
  }, [ride?.estado, ride?.conductorUbicacion?.lat, ride?.conductorUbicacion?.lng, sendToMap]);

  // ── Calcular ETA hacia pickup ──
  useEffect(() => {
    if (!ride?.conductorUbicacion) return;
    if (ride.estado !== 'aceptado') return;

    const calcEta = async () => {
      const result = await fetchDrivingRoute(ride.conductorUbicacion!, ride.origen);
      if (result) {
        sendToMap({
          type: 'route',
          coords: result.coords,
          color: AZUL,
        });
        if (result.distanceKm != null && result.durationMin != null) {
          setEtaInfo({
            km: result.distanceKm.toFixed(1),
            min: String(Math.round(result.durationMin)),
          });
        }
      }
    };
    calcEta();
  }, [ride?.conductorUbicacion?.lat, ride?.conductorUbicacion?.lng, ride?.estado, sendToMap]);

  // ── Calcular ruta al destino ──
  useEffect(() => {
    if (!ride?.conductorUbicacion) return;
    if (ride.estado !== 'en_curso') return;

    const calcRuta = async () => {
      const result = await fetchDrivingRoute(ride.conductorUbicacion!, ride.destino);
      if (result) {
        sendToMap({
          type: 'route',
          coords: result.coords,
          color: YELLOW,
        });
        if (result.distanceKm != null && result.durationMin != null) {
          setEtaInfo({
            km: result.distanceKm.toFixed(1),
            min: String(Math.round(result.durationMin)),
          });
        }
      }
    };
    calcRuta();
  }, [ride?.conductorUbicacion?.lat, ride?.conductorUbicacion?.lng, ride?.estado, sendToMap]);

  const handleWebViewLoad = () => {
    if (ride) {
      sendToMap({ type: 'showPickup', lat: ride.origen.lat, lng: ride.origen.lng });
      sendToMap({ type: 'showDest', lat: ride.destino.lat, lng: ride.destino.lng });
      if (ride.conductorUbicacion) {
        sendToMap({ type: 'driverLocation', lat: ride.conductorUbicacion.lat, lng: ride.conductorUbicacion.lng });
      }
      sendToMap({ type: 'fitAll' });
    }
  };

  const handleStartRide = async () => {
    if (!ride) return;
    setBusy(true);
    try {
      await startRide(ride.id);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el viaje.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (!ride) return;
    Alert.alert('Cancelar viaje', '¿Estás seguro que deseas cancelar?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelRide(ride.id, 'passenger', ride.conductorId ?? undefined);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleGoBack = () => {
    if (ride && (ride.estado === 'completado' || ride.estado === 'cancelado')) {
      navigation.goBack();
    } else if (ride && ride.estado === 'buscando') {
      handleCancel();
    } else {
      navigation.goBack();
    }
  };

  const openChat = () => {
    navigation.navigate('Chat', { solicitudId: ride?.id });
  };

  const handlePanic = () => {
    Alert.alert(
      '🚨 Emergencia',
      'Se ha enviado una alerta de emergencia a Taxitex y tus contactos de confianza.',
    );
  };

  const estado: RideStatus = ride?.estado ?? 'buscando';

  const renderPanel = () => {
    switch (estado) {
      case 'buscando':
        return (
          <View style={styles.panel}>
            <View style={styles.searchingRow}>
              <Animated.View style={[styles.searchDot, { opacity: pulseAnim }]} />
              <View style={styles.searchingTexts}>
                <Text style={styles.panelTitle}>Buscando conductor...</Text>
                <Text style={styles.panelSub}>
                  Te notificaremos cuando un taxi acepte tu viaje
                </Text>
              </View>
            </View>
            <View style={styles.routePreview}>
              <MapPin size={14} color={AZUL} />
              <Text style={styles.routePreviewText} numberOfLines={1}>
                {ride?.destino.label ?? 'Destino'}
              </Text>
              {ride?.distanciaKm != null && (
                <Text style={styles.routePreviewDist}>
                  {ride.distanciaKm.toFixed(1)} km
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={busy}>
              <X size={16} color={ROJO} />
              <Text style={styles.cancelBtnText}>Cancelar solicitud</Text>
            </TouchableOpacity>
          </View>
        );

      case 'aceptado':
        return (
          <View style={styles.panel}>
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>🚕</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{ride?.conductorNombre ?? 'Conductor'}</Text>
                <View style={styles.driverBadges}>
                  {ride?.conductorPlaca && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>🔢 {ride.conductorPlaca}</Text>
                    </View>
                  )}
                  {ride?.conductorUnidad && (
                    <View style={[styles.badge, styles.badgeAlt]}>
                      <Text style={styles.badgeText}>🚖 U. {ride.conductorUnidad}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {etaInfo && (
              <View style={styles.etaRow}>
                <Navigation size={14} color={AZUL} />
                <Text style={styles.etaText}>
                  Tu conductor llega en ~{etaInfo.min} min ({etaInfo.km} km)
                </Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.chatBtn} onPress={openChat}>
                <MessageCircle size={18} color={DARK} />
                <Text style={styles.chatBtnText}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelSmallBtn} onPress={handleCancel}>
                <X size={16} color={ROJO} />
                <Text style={styles.cancelSmallText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'llegado':
        return (
          <View style={styles.panel}>
            <View style={styles.arrivedBanner}>
              <Text style={styles.arrivedEmoji}>🚕</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.arrivedTitle}>¡Tu conductor ya llegó!</Text>
                <Text style={styles.arrivedSub}>
                  {ride?.conductorNombre} te espera. Acuerden el precio del viaje.
                </Text>
              </View>
            </View>

            <View style={styles.driverBadges}>
              {ride?.conductorPlaca && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>🔢 {ride.conductorPlaca}</Text>
                </View>
              )}
              {ride?.conductorUnidad && (
                <View style={[styles.badge, styles.badgeAlt]}>
                  <Text style={styles.badgeText}>🚖 U. {ride.conductorUnidad}</Text>
                </View>
              )}
            </View>

            <View style={styles.arrivedActions}>
              <TouchableOpacity
                style={styles.startRideBtn}
                onPress={handleStartRide}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={DARK} size="small" />
                ) : (
                  <Text style={styles.startRideBtnText}>✅ Iniciar viaje</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelOutlineBtn} onPress={handleCancel} disabled={busy}>
                <Text style={styles.cancelOutlineText}>Cancelar viaje</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.chatBtn} onPress={openChat}>
              <MessageCircle size={18} color={DARK} />
              <Text style={styles.chatBtnText}>Chat con conductor</Text>
            </TouchableOpacity>
          </View>
        );

      case 'en_curso':
        return (
          <View style={styles.panel}>
            <View style={styles.inProgressRow}>
              <MapPin size={16} color={YELLOW} />
              <Text style={styles.inProgressText} numberOfLines={2}>
                Llevándote a: {ride?.destino.label}
              </Text>
            </View>

            {etaInfo && (
              <View style={styles.etaRow}>
                <Navigation size={14} color={YELLOW} />
                <Text style={styles.etaText}>
                  {etaInfo.km} km · ~{etaInfo.min} min restantes
                </Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.chatBtn} onPress={openChat}>
                <MessageCircle size={18} color={DARK} />
                <Text style={styles.chatBtnText}>Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.panicBtn} onPress={handlePanic}>
                <Shield size={18} color="#fff" />
                <Text style={styles.panicBtnText}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'completado':
        return (
          <View style={styles.panel}>
            <Text style={styles.completedEmoji}>✅</Text>
            <Text style={styles.completedTitle}>¡Viaje completado!</Text>
            <Text style={styles.completedSub}>
              Has llegado a {ride?.destino.label}
            </Text>

            {ride?.distanciaKm != null && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryItem}>📏 {ride.distanciaKm.toFixed(1)} km</Text>
                {ride?.precioFinal != null && (
                  <Text style={styles.summaryItem}>💰 ${ride.precioFinal} MXN</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.backHomeBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backHomeBtnText}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
        );

      case 'cancelado':
        return (
          <View style={styles.panel}>
            <Text style={styles.completedEmoji}>❌</Text>
            <Text style={styles.completedTitle}>Viaje cancelado</Text>
            <Text style={styles.completedSub}>
              {ride?.canceladoPor === 'driver'
                ? 'El conductor canceló el viaje.'
                : 'Has cancelado el viaje.'}
            </Text>
            <TouchableOpacity
              style={styles.backHomeBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backHomeBtnText}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const headerTitle = (() => {
    switch (estado) {
      case 'buscando': return 'Buscando conductor';
      case 'aceptado': return 'Conductor en camino';
      case 'llegado': return 'Conductor ha llegado';
      case 'en_curso': return 'Viaje en curso';
      case 'completado': return 'Viaje completado';
      case 'cancelado': return 'Viaje cancelado';
      default: return 'Tu viaje';
    }
  })();

  const headerBg = estado === 'en_curso' ? DARK
    : estado === 'llegado' ? VERDE
    : AZUL;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: headerBg }]}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />

      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleGoBack}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          androidHardwareAccelerationDisabled={true}
          onLoadEnd={handleWebViewLoad}
        />

        {etaInfo && (estado === 'aceptado' || estado === 'en_curso') && (
          <View style={styles.etaBadge}>
            <Navigation size={12} color="#fff" />
            <Text style={styles.etaBadgeText}>
              {etaInfo.km} km · {etaInfo.min} min
            </Text>
          </View>
        )}
      </View>

      {renderPanel()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },

  etaBadge: {
    position: 'absolute', top: 12, right: 12, backgroundColor: DARK,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  etaBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  panel: {
    backgroundColor: '#fff', padding: 16, gap: 12,
    borderTopWidth: 1, borderTopColor: '#eee',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    paddingBottom: Platform.select({ ios: 28, android: 16 }),
  },

  searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: YELLOW },
  searchingTexts: { flex: 1 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  panelSub: { fontSize: 12, color: '#999', marginTop: 2 },
  routePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  routePreviewText: { flex: 1, fontSize: 13, color: DARK, fontWeight: '500' },
  routePreviewDist: { fontSize: 12, color: '#999', fontWeight: '600' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
  },
  cancelBtnText: { fontSize: 13, color: ROJO, fontWeight: '600' },

  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: YELLOW,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: YELLOW + '66',
  },
  driverAvatarText: { fontSize: 26 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 4 },
  driverBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#E8F4FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  badgeAlt: { backgroundColor: YELLOW + '33' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#3A3A3C' },

  etaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  etaText: { flex: 1, fontSize: 13, color: DARK, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 10 },
  chatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  chatBtnText: { fontSize: 14, fontWeight: '700', color: DARK },
  cancelSmallBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: ROJO + '44',
  },
  cancelSmallText: { fontSize: 13, color: ROJO, fontWeight: '600' },

  arrivedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: VERDE + '15', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: VERDE + '33',
  },
  arrivedEmoji: { fontSize: 36 },
  arrivedTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  arrivedSub: { fontSize: 12, color: '#666', marginTop: 2 },
  arrivedActions: { gap: 8 },
  startRideBtn: {
    backgroundColor: YELLOW, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: YELLOW, shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  startRideBtnText: { fontSize: 16, fontWeight: '800', color: DARK },
  cancelOutlineBtn: {
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  cancelOutlineText: { fontSize: 14, color: '#999', fontWeight: '600' },

  inProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inProgressText: { flex: 1, fontSize: 14, fontWeight: '700', color: DARK },
  panicBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ROJO, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    elevation: 4, shadowColor: ROJO, shadowOpacity: 0.4, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  panicBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  completedEmoji: { fontSize: 44, textAlign: 'center' },
  completedTitle: { fontSize: 20, fontWeight: '800', color: DARK, textAlign: 'center' },
  completedSub: { fontSize: 13, color: '#999', textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    backgroundColor: '#F5F7FA', borderRadius: 12, paddingVertical: 12,
  },
  summaryItem: { fontSize: 14, fontWeight: '700', color: DARK },
  backHomeBtn: {
    backgroundColor: YELLOW, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
    elevation: 4, shadowColor: YELLOW, shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  backHomeBtnText: { fontSize: 15, fontWeight: '800', color: DARK },
});
