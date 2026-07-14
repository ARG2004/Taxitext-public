import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Dimensions,
  TextInput,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  MessageCircle,
  X,
  Navigation,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Play,
  User,
  MapPin,
  Clock,
  CreditCard,
} from 'lucide-react-native';

import { Spacing, Radius, Shadows } from '../theme';
import { requestLocationPermission, getCurrentPosition, watchPosition, clearWatch, LatLng } from '../utils/location';
import { fetchDrivingRoute } from '../utils/ors';
import {
  acceptRide,
  markDriverArrived,
  startRide,
  completeRide,
  cancelRide,
  updateDriverLocationOnRide,
} from '../services/rideService';
import type { Ride } from '../types/rideTypes';

const { width, height } = Dimensions.get('window');

const C = {
  amarillo: '#F5C200',
  azulTalavera: '#2B7DB4',
  carbon: '#1C1C1E',
  gris: '#8E8E93',
  blanco: '#FFFFFF',
  verde: '#34C759',
  rojo: '#E53935',
  crema: '#FEFAF0',
  cremaBorde: '#EDE8D5',
};

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,div[id="map"] { width:100%; height:100%; background: rgb(245,245,245); }
    .driver-marker {
      width:32px; height:32px; border-radius:50%;
      background: rgb(43,125,180); border: 2px solid white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display:flex; align-items:center; justify-content:center;
    }
    .passenger-marker {
      width:24px; height:24px; border-radius:50%;
      background: rgb(245,194,0); border: 2px solid white;
      box-shadow: 0 0 15px rgba(245,194,0,0.6);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(245,194,0,0.7); }
      70% { box-shadow: 0 0 0 15px rgba(245,194,0,0); }
      100% { box-shadow: 0 0 0 0 rgba(245,194,0,0); }
    }
    .leaflet-container { background: rgb(245,245,245) !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { center:[19.2853,-98.4382], zoom:15, zoomControl:false, attributionControl:false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

  var driverIcon = L.divIcon({ className:'', html:'<div class="driver-marker"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg></div>', iconSize:[32,32], iconAnchor:[16,16] });
  
  var pinSvg = function(color){ return '<svg width="30" height="40" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M17 0C7.6 0 0 7.6 0 17c0 12.4 17 27 17 27s17-14.6 17-27C34 7.6 26.4 0 17 0z" fill="rgb(26,26,46)"/>' +
    '<circle cx="17" cy="17" r="7" fill="' + color + '"/></svg>'; };
  var pickupIcon = L.divIcon({ className:'', html:pinSvg('rgb(43,125,180)'), iconSize:[30,40], iconAnchor:[15,40] });
  var destIcon = L.divIcon({ className:'', html:pinSvg('rgb(245,194,0)'), iconSize:[30,40], iconAnchor:[15,40] });

  var driverMarker = null;
  var pickupMarker = null;
  var destMarker = null;
  var routeLayer = null;

  window.handleMapAction = function(data) {
    if (data.type === 'center') {
      map.flyTo([data.lat, data.lng], 16, { animate: true, duration: 1.2 });
    } else if (data.type === 'driverLocation') {
      if (!driverMarker) {
        driverMarker = L.marker([data.lat, data.lng], {icon:driverIcon}).addTo(map);
      } else {
        driverMarker.setLatLng([data.lat, data.lng]);
      }
    } else if (data.type === 'showPickup') {
      if (pickupMarker) map.removeLayer(pickupMarker);
      pickupMarker = L.marker([data.lat, data.lng], {icon:pickupIcon}).addTo(map);
    } else if (data.type === 'showDest') {
      if (destMarker) map.removeLayer(destMarker);
      destMarker = L.marker([data.lat, data.lng], {icon:destIcon}).addTo(map);
    } else if (data.type === 'route') {
      if (routeLayer) map.removeLayer(routeLayer);
        var coords = data.coords.map(function(c){ return [c[1],c[0]]; });
        routeLayer = L.polyline(coords, { color: data.color || 'rgb(43,125,180)', weight:6, opacity:0.9, lineCap:'round' }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding:[50,50], animate: true });
    } else if (data.type === 'clear') {
      if (routeLayer) { map.removeLayer(routeLayer); routeLayer=null; }
      if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker=null; }
      if (destMarker) { map.removeLayer(destMarker); destMarker=null; }
    } else if (data.type === 'fitAll') {
      var bounds = [];
      if (driverMarker) bounds.push(driverMarker.getLatLng());
      if (pickupMarker) bounds.push(pickupMarker.getLatLng());
      if (destMarker) bounds.push(destMarker.getLatLng());
      if (bounds.length >= 2) map.fitBounds(bounds, { padding:[50,50], animate: true });
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

export default function DriverMapScreen({ navigation }: any) {
  const webviewRef = useRef<any>(null);
  const uid = auth().currentUser?.uid;

  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [pendingRides, setPendingRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [activeRideRouteStats, setActiveRideRouteStats] = useState<{ distance: number; duration: number } | null>(null);
  const [selectedPreviewRide, setSelectedPreviewRide] = useState<Ride | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'selectRide') {
        const found = pendingRides.find(r => r.id === data.rideId);
        if (found) {
          setSelectedPreviewRide(found);
        }
      } else if (data.type === 'acceptRide') {
        handleAccept(data.rideId);
      }
    } catch (e) {
      console.log('Error parsing WebView message:', e);
    }
  };

  const sendToMap = useCallback((data: object) => {
    const js = `document.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      JSON.stringify(data),
    )}}));true;`;
    webviewRef.current?.injectJavaScript(js);
  }, []);

  // 1. Escuchar solicitudes pendientes (estado == 'buscando')
  useEffect(() => {
    const unsub = firestore()
      .collection('solicitudes')
      .where('estado', '==', 'buscando')
      .onSnapshot((snap) => {
        if (snap) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Ride[];
          setPendingRides(list);
        }
      });
    return unsub;
  }, []);

  // 2. Escuchar viaje activo del conductor actual
  useEffect(() => {
    if (!uid) return;
    let isFirst = true;
    const unsub = firestore()
      .collection('solicitudes')
      .where('conductorId', '==', uid)
      .where('estado', 'in', ['aceptado', 'llegado', 'en_curso'])
      .limit(1)
      .onSnapshot((snap) => {
        if (snap && !snap.empty) {
          const doc = snap.docs[0];
          setActiveRide({ id: doc.id, ...(doc.data() as any) } as Ride);
          setSelectedPreviewRide(null); // Limpiar preview al haber viaje activo
          isFirst = false;
        } else {
          setActiveRide(null);
          if (!isFirst) {
            // El viaje activo desapareció de forma inesperada (se canceló o finalizó)
            // Aseguramos que el conductor vuelva a estar disponible en Firestore y regrese a Home
            firestore().collection('conductores').doc(uid).update({
              status: 'available',
              updatedAt: firestore.FieldValue.serverTimestamp(),
            }).catch(() => {});
            
            Alert.alert('Viaje Finalizado/Cancelado', 'El viaje activo ya no está disponible.');
            navigation.navigate('DriverHome');
          }
        }
      });
    return unsub;
  }, [uid, navigation]);

  // 3. Monitorear ubicación del conductor y actualizar Firestore
  useEffect(() => {
    let watchId: number | null = null;
    (async () => {
      const permission = await requestLocationPermission();
      if (permission === 'granted') {
        try {
          const initialPos = await getCurrentPosition();
          setDriverLocation(initialPos);
          setLoadingLocation(false);
          sendToMap({ type: 'driverLocation', lat: initialPos.lat, lng: initialPos.lng });
          sendToMap({ type: 'center', lat: initialPos.lat, lng: initialPos.lng });
        } catch (e) {
          console.log('Error al obtener ubicación inicial:', e);
          setLoadingLocation(false);
        }

        // Seguir posición
        watchId = watchPosition((loc) => {
          setDriverLocation(loc);
          sendToMap({ type: 'driverLocation', lat: loc.lat, lng: loc.lng });

          // Actualizar conductores/uid en Firestore
          if (uid) {
            firestore().collection('conductores').doc(uid).update({
              lat: loc.lat,
              lng: loc.lng,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            }).catch(() => { });
          }

          // Si hay viaje activo, actualizar conductorUbicacion en la solicitud
          if (activeRide) {
            updateDriverLocationOnRide(activeRide.id, loc);
          }
        });
      } else {
        setLoadingLocation(false);
      }
    })();

    return () => {
      if (watchId !== null) {
        clearWatch(watchId);
      }
    };
  }, [uid, activeRide?.id]);

  // 4. Calcular y trazar ruta del viaje activo
  useEffect(() => {
    if (!activeRide || !driverLocation) {
      if (!activeRide) {
        sendToMap({ type: 'clear' });
      }
      return;
    }

    const calcRoute = async () => {
      let from: LatLng;
      let to: LatLng;
      let color: string;

      if (activeRide.estado === 'aceptado') {
        from = driverLocation;
        to = activeRide.origen;
        color = C.azulTalavera; // Azul para recoger al pasajero
      } else if (activeRide.estado === 'en_curso') {
        from = activeRide.origen;
        to = activeRide.destino;
        color = C.verde; // Verde para destino final
      } else {
        // En estado 'llegado', ya está con el pasajero en origen -> limpiar ruta y mostrar pines
        sendToMap({ type: 'clear' });
        sendToMap({ type: 'showPickup', lat: activeRide.origen.lat, lng: activeRide.origen.lng });
        sendToMap({ type: 'showDest', lat: activeRide.destino.lat, lng: activeRide.destino.lng });
        sendToMap({ type: 'fitAll' });
        return;
      }

      const result = await fetchDrivingRoute(from, to);
      if (result) {
        sendToMap({
          type: 'route',
          coords: result.coords,
          color,
        });
        sendToMap({ type: 'showPickup', lat: activeRide.origen.lat, lng: activeRide.origen.lng });
        sendToMap({ type: 'showDest', lat: activeRide.destino.lat, lng: activeRide.destino.lng });
        sendToMap({ type: 'fitAll' });
        setActiveRideRouteStats({
          distance: result.distanceKm ?? 0,
          duration: result.durationMin ?? 0,
        });
      }
    };

    calcRoute();
  }, [activeRide?.id, activeRide?.estado, driverLocation?.lat, driverLocation?.lng]);

  // 5. Mostrar preview de una solicitud seleccionada
  useEffect(() => {
    if (activeRide || !selectedPreviewRide) return;

    const calcPreview = async () => {
      const result = await fetchDrivingRoute(selectedPreviewRide.origen, selectedPreviewRide.destino);
      if (result) {
        sendToMap({
          type: 'route',
          coords: result.coords,
          color: C.amarillo,
        });
        sendToMap({ type: 'showPickup', lat: selectedPreviewRide.origen.lat, lng: selectedPreviewRide.origen.lng });
        sendToMap({ type: 'showDest', lat: selectedPreviewRide.destino.lat, lng: selectedPreviewRide.destino.lng });
      }
    };

    calcPreview();
  }, [selectedPreviewRide?.id, activeRide]);

  // Acciones
  const handleAccept = async (rideId: string) => {
    if (!uid) return;
    setBusy(true);
    try {
      const success = await acceptRide(rideId, uid);
      if (success) {
        Alert.alert('Viaje Aceptado', 'Dirígete al punto de origen para recoger al pasajero.');
      } else {
        Alert.alert('Error', 'No se pudo aceptar la solicitud. Quizás ya la tomó otro taxista.');
      }
    } catch (e) {
      console.log('Error al aceptar viaje:', e);
      Alert.alert('Error', 'No se pudo conectar.');
    } finally {
      setBusy(false);
    }
  };

  const handleArrived = async () => {
    if (!activeRide) return;
    setBusy(true);
    try {
      await markDriverArrived(activeRide.id);
      Alert.alert('Notificación Enviada', 'El pasajero ha sido informado de tu llegada.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo notificar la llegada.');
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    if (!activeRide) return;
    setBusy(true);
    try {
      await startRide(activeRide.id);
      Alert.alert('Viaje Iniciado', 'Dirígete al destino del pasajero.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar el viaje.');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!activeRide || !uid) return;
    const finalPrice = parseFloat(priceInput);
    if (!priceInput || isNaN(finalPrice) || finalPrice <= 0) {
      Alert.alert('Precio Requerido', 'Por favor ingresa un precio acordado válido para finalizar el viaje.');
      return;
    }

    Alert.alert('Finalizar viaje', `¿Confirmas finalizar el viaje por un precio de $${finalPrice}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setBusy(true);
          try {
            await completeRide(activeRide.id, uid, finalPrice);
            setPriceInput('');
            Alert.alert('Viaje Completado', 'El viaje ha finalizado con éxito.');
          } catch (e) {
            Alert.alert('Error', 'No se pudo finalizar el viaje.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    if (!activeRide) return;
    Alert.alert('Cancelar viaje', '¿Estás seguro que deseas cancelar este viaje? Esto afectará tu reputación.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelRide(activeRide.id, 'driver', uid ?? undefined);
            Alert.alert('Cancelado', 'Has cancelado el viaje.');
          } catch {
            Alert.alert('Error', 'No se pudo cancelar el viaje.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const openChat = () => {
    if (activeRide) {
      navigation.navigate('Chat', { solicitudId: activeRide.id });
    }
  };

  // Renderizados del panel
  const renderActiveRidePanel = () => {
    if (!activeRide) return null;

    let statusText = '';
    let statusBg = C.azulTalavera;
    let buttonAction: () => void = () => { };
    let buttonLabel = '';

    if (activeRide.estado === 'aceptado') {
      statusText = 'Yendo al punto de encuentro';
      statusBg = C.azulTalavera;
      buttonLabel = 'MARCAR QUE LLEGUÉ';
      buttonAction = handleArrived;
    } else if (activeRide.estado === 'llegado') {
      statusText = 'Esperando al pasajero';
      statusBg = C.amarillo;
      buttonLabel = 'INICIAR VIAJE';
      buttonAction = handleStart;
    } else if (activeRide.estado === 'en_curso') {
      statusText = 'Viaje en curso al destino';
      statusBg = C.verde;
      buttonLabel = 'FINALIZAR VIAJE';
      buttonAction = handleComplete;
    }

    return (
      <View style={styles.activeCard}>
        {/* Encabezado Estado */}
        <View style={[styles.activeHeader, { backgroundColor: statusBg }]}>
          <Text style={styles.activeHeaderTitle}>{statusText.toUpperCase()}</Text>
          {activeRideRouteStats && activeRide.estado !== 'llegado' && (
            <Text style={styles.activeHeaderSub}>
              {activeRideRouteStats.distance.toFixed(1)} km • {Math.round(activeRideRouteStats.duration)} min
            </Text>
          )}
        </View>

        {/* Detalles del viaje */}
        <View style={styles.activeBody}>
          <View style={styles.activeUserRow}>
            <View style={styles.avatarCircle}>
              <User size={20} color={C.azulTalavera} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>{activeRide.pasajeroNombre}</Text>
              <Text style={styles.passengerLabel}>Pasajero de TaxiTex</Text>
            </View>
            <TouchableOpacity style={styles.activeChatBtn} onPress={openChat}>
              <MessageCircle size={22} color={C.azulTalavera} />
            </TouchableOpacity>
          </View>

          {/* Ubicaciones */}
          <View style={styles.addressList}>
            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: C.azulTalavera }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressTitle}>Punto de origen</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {activeRide.origen.label}
                </Text>
              </View>
            </View>
            <View style={styles.addressLine} />
            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: C.amarillo }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressTitle}>Destino</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {activeRide.destino.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Entrada de costo final al estar en curso */}
          {activeRide.estado === 'en_curso' && (
            <View style={styles.priceInputContainer}>
              <Text style={styles.priceLabel}>Monto acordado (MXN):</Text>
              <View style={styles.priceRow}>
                <Text style={styles.currencySign}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={C.gris}
                  value={priceInput}
                  onChangeText={setPriceInput}
                />
              </View>
            </View>
          )}

          {/* Botones de acción */}
          <View style={styles.activeActions}>
            <TouchableOpacity
              style={styles.actionMainBtn}
              onPress={buttonAction}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={styles.actionMainBtnText}>{buttonLabel}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCancelBtn} onPress={handleCancel} disabled={busy}>
              <Trash2 size={20} color={C.rojo} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderPendingRidesList = () => {
    if (activeRide) return null;

    return (
      <View style={styles.pendingCard}>
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingHeaderTitle}>Solicitudes Disponibles</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{pendingRides.length}</Text>
          </View>
        </View>

        {pendingRides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={C.azulTalavera} />
            <Text style={styles.emptyText}>Esperando solicitudes en San Martín...</Text>
          </View>
        ) : (
          <FlatList
            data={pendingRides}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.pendingList}
            contentContainerStyle={{ paddingBottom: 10 }}
            renderItem={({ item }) => {
              const isSelected = selectedPreviewRide?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.rideItem, isSelected && styles.rideItemSelected]}
                  onPress={() => setSelectedPreviewRide(item)}
                >
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
                      <MapPin size={12} color={C.azulTalavera} />
                      <Text style={styles.rideAddressLabel} numberOfLines={1}>
                        <Text style={{ fontWeight: 'bold' }}>Origen:</Text> {item.origen.label}
                      </Text>
                    </View>
                    <View style={styles.rideAddressItem}>
                      <MapPin size={12} color={C.amarillo} />
                      <Text style={styles.rideAddressLabel} numberOfLines={1}>
                        <Text style={{ fontWeight: 'bold' }}>Destino:</Text> {item.destino.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rideItemActions}>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => {
                        setSelectedPreviewRide(item);
                        sendToMap({ type: 'fitAll' });
                      }}
                    >
                      <Text style={styles.previewBtnText}>Ver mapa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(item.id)}
                      disabled={busy}
                    >
                      <Text style={styles.acceptBtnText}>Aceptar</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.carbon} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={C.blanco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MAPA DE OPERACIONES</Text>
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => Alert.alert('🚨 SOS', 'Enviando alerta a seguridad...')}
        >
          <ShieldAlert size={24} color={C.rojo} />
        </TouchableOpacity>
      </View>

      {/* Map Wrapper */}
      <View style={styles.mapWrapper}>
        <WebView
          ref={webviewRef}
          source={{ html: MAP_HTML, baseUrl: 'https://localhost' }}
          style={[styles.map, { width: '100%', height: '100%' }]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          androidHardwareAccelerationDisabled={false}
          onMessage={handleWebViewMessage}
          onLoadEnd={() => {
            setIsMapReady(true);
            if (driverLocation) {
              sendToMap({ type: 'driverLocation', lat: driverLocation.lat, lng: driverLocation.lng });
              sendToMap({ type: 'center', lat: driverLocation.lat, lng: driverLocation.lng });
            }
          }}
        />

        {loadingLocation && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={C.azulTalavera} />
            <Text style={styles.loaderText}>Localizando satélite GPS...</Text>
          </View>
        )}
      </View>

      {/* Panels (Active Ride / Pending Rides) */}
      <View style={styles.bottomContainer}>
        {activeRide ? renderActiveRidePanel() : renderPendingRidesList()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.carbon },
  header: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: C.carbon,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.blanco, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  sosBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapWrapper: { flex: 1, backgroundColor: '#eee' },
  map: { flex: 1 },
  mapLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: { marginTop: 10, fontSize: 14, color: C.carbon, fontWeight: '700' },
  bottomContainer: {
    backgroundColor: C.blanco,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.base,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    ...Shadows.lg,
    maxHeight: height * 0.45,
  },

  // Estilos Viaje Activo
  activeCard: { backgroundColor: C.blanco, borderRadius: Radius.lg, overflow: 'hidden' },
  activeHeader: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  activeHeaderTitle: { color: C.blanco, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  activeHeaderSub: { color: C.blanco, fontSize: 11, fontWeight: '600', marginTop: 2 },
  activeBody: { paddingTop: 16, gap: 14 },
  activeUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.azulTalavera + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerName: { fontSize: 16, fontWeight: '800', color: C.carbon },
  passengerLabel: { fontSize: 12, color: C.gris, fontWeight: '600' },
  activeChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.azulTalavera + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressList: { paddingLeft: 10, gap: 8, marginVertical: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addressTitle: { fontSize: 10, color: C.gris, fontWeight: '700', textTransform: 'uppercase' },
  addressText: { fontSize: 13, color: C.carbon, fontWeight: '600', marginTop: 2 },
  addressLine: { width: 1, height: 16, backgroundColor: C.gris, marginLeft: 3 },
  activeActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionMainBtn: {
    flex: 1,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: C.carbon,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  actionMainBtnText: { color: C.blanco, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  actionCancelBtn: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.rojo + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceInputContainer: {
    backgroundColor: C.crema,
    borderWidth: 1,
    borderColor: C.cremaBorde,
    borderRadius: Radius.md,
    padding: 10,
  },
  priceLabel: { fontSize: 12, fontWeight: '700', color: C.carbon, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencySign: { fontSize: 20, fontWeight: '800', color: C.carbon },
  priceInput: {
    flex: 1,
    height: 40,
    fontSize: 18,
    fontWeight: '800',
    color: C.carbon,
    padding: 0,
  },

  // Estilos Solicitudes Pendientes
  pendingCard: { flex: 1 },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pendingHeaderTitle: { fontSize: 16, fontWeight: '900', color: C.carbon },
  badgeCount: {
    backgroundColor: C.azulTalavera,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: { color: C.blanco, fontSize: 11, fontWeight: '800' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 12, color: C.gris, fontWeight: '600', textAlign: 'center' },
  pendingList: { flex: 1 },
  rideItem: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#eef0f2',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  rideItemSelected: { borderColor: C.azulTalavera, borderWidth: 1.5, backgroundColor: C.azulTalavera + '05' },
  rideItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rideItemUser: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rideItemUserIcon: { fontSize: 16 },
  rideItemUserName: { fontSize: 14, fontWeight: '800', color: C.carbon },
  rideItemDistance: { fontSize: 12, fontWeight: '800', color: C.azulTalavera },
  rideItemAddresses: { gap: 6, marginVertical: 4 },
  rideAddressItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rideAddressLabel: { flex: 1, fontSize: 12, color: C.carbon, fontWeight: '500' },
  rideItemActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  previewBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: C.gris + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnText: { color: C.gris, fontSize: 12, fontWeight: '700' },
  acceptBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: C.azulTalavera,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  acceptBtnText: { color: C.blanco, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
});