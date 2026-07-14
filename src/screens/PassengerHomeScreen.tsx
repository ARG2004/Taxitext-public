import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  Search,
  Home,
  User,
  Bell,
  LogOut,
  Star,
  X,
  ShieldAlert,
  ChevronRight,
  MapPin,
  Clock,
  History,
  Briefcase,
  Plus,
  Navigation,
  ArrowRight
} from 'lucide-react-native';

import { Colors, Typography, Spacing, Radius, Shadows, Layout } from '../theme';
import { requestLocationPermission, getCurrentPosition, LatLng } from '../utils/location';
import { geocodeSearch, fetchDrivingRoute } from '../utils/ors';
import { createRide } from '../services/rideService';
import type { Ride } from '../types/rideTypes';

const { width, height } = Dimensions.get('window');

type Tab = 'inicio' | 'reservas' | 'perfil';

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,div[id="map"] { width:100%; height:100%; background: white; }
    .user-marker {
      width:24px; height:24px; border-radius:50%;
      background: rgb(3,155,229); border: 3px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
      position: relative;
    }
    .user-marker::after {
      content: ''; position: absolute; width: 40px; height: 40px;
      background: rgba(3,155,229,0.2); border-radius: 50%;
      top: -11px; left: -11px; animation: ripple 2s infinite;
    }
    @keyframes ripple {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    .dest-marker { font-size: 32px; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3)); }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { center:[19.2853,-98.4382], zoom:15, zoomControl:false, attributionControl:false });

  // OSM Estándar (Contributors) sin filtros
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var userIcon = L.divIcon({ className:'', html:'<div class="user-marker"></div>', iconSize:[24,24], iconAnchor:[12,12] });
  var destIcon = L.divIcon({ className:'', html:'<div class="dest-marker">📍</div>', iconSize:[32,40], iconAnchor:[16,40] });

  var userMarker = L.marker([19.2853,-98.4382], {icon:userIcon}).addTo(map);
  var routeLayer = null;
  var destMarker = null;

  window.handleMapAction = function(data) {
    if (data.type === 'center') {
      map.flyTo([data.lat, data.lng], 16, { animate: true, duration: 1.5 });
      userMarker.setLatLng([data.lat, data.lng]);
    } else if (data.type === 'route') {
      if (routeLayer) map.removeLayer(routeLayer);
      if (destMarker) map.removeLayer(destMarker);
      var coords = data.coords.map(function(c){ return [c[1],c[0]]; });
      routeLayer = L.polyline(coords, { color:'rgb(255,202,40)', weight:6, opacity:0.9, lineCap:'round' }).addTo(map);
      destMarker = L.marker([data.destLat, data.destLng], {icon:destIcon}).addTo(map);
      map.fitBounds(routeLayer.getBounds(), { padding:[60,60], animate: true });
    } else if (data.type === 'clear') {
      if (routeLayer) { map.removeLayer(routeLayer); routeLayer=null; }
      if (destMarker) { map.removeLayer(destMarker); destMarker=null; }
      map.setZoom(15, { animate: true });
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

export default function PassengerHomeScreen({ navigation }: any) {
  const webviewRef = useRef<any>(null);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [hasRoute, setHasRoute] = useState(false);
  const [userName, setUserName] = useState('');
  const [passengerLocation, setPassengerLocation] = useState<LatLng>({ lat: 19.2853, lng: -98.4382 });
  const [destinationGeo, setDestinationGeo] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [routeStats, setRouteStats] = useState<{ distance: number; duration: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Notificaciones
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: '1',
      title: '¡Bienvenido a TaxiTex! ✨',
      desc: 'Gracias por registrarte. Pide tu taxi rápido y seguro en San Martín Texmelucan.',
      time: 'Hace 5m',
      read: false,
      type: 'welcome',
    },
    {
      id: '2',
      title: 'Descuento del 10% Activo 🎁',
      desc: 'Usa el código TAXITEX10 para un 10% de descuento en tu siguiente viaje.',
      time: 'Hace 2h',
      read: false,
      type: 'discount',
    },
    {
      id: '3',
      title: 'Aviso de Seguridad 🛡️',
      desc: 'Verifica siempre el número de unidad y las placas del taxi antes de abordar.',
      time: 'Hace 1d',
      read: true,
      type: 'security',
    },
  ]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Animaciones
  const panelAnim = useRef(new Animated.Value(height * 0.4)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  // Favoritos Mock
  const favorites = [
    { id: '1', label: 'Casa', icon: Home, color: '#4CAF50', address: 'Mi casa' },
    { id: '2', label: 'Trabajo', icon: Briefcase, color: '#2196F3', address: 'Mi oficina' },
    { id: '3', label: 'Centro', icon: Star, color: '#FF9800', address: 'Zócalo San Martín' },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(panelAnim, { toValue: 0, tension: 20, friction: 8, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    const user = auth().currentUser;
    if (user?.displayName) {
      setUserName(user.displayName.split(' ')[0]);
    }

    if (!user) return;

    const unsub = firestore()
      .collection('solicitudes')
      .where('pasajeroId', '==', user.uid)
      .where('estado', 'in', ['buscando', 'aceptado', 'llegado', 'en_curso'])
      .limit(1)
      .onSnapshot(
        (snap) => {
          if (snap && !snap.empty) {
            const doc = snap.docs[0];
            const rideData = doc.data() as Ride;
            navigation.navigate('PassengerRide', {
              rideId: doc.id,
              originLat: rideData.origen.lat,
              originLng: rideData.origen.lng,
            });
          }
        },
        (error) => {
          console.log('Error en solicitudes en tiempo real:', error);
        }
      );

    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      const permission = await requestLocationPermission();
      if (permission === 'granted') {
        try {
          const pos = await getCurrentPosition();
          setPassengerLocation(pos);
          sendToMap({ type: 'center', lat: pos.lat, lng: pos.lng });
        } catch (e) {
          console.log('Location error:', e);
        }
      }
      setLoadingLocation(false);
    })();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => {
          await auth().signOut();
          navigation.replace('Welcome');
      }},
    ]);
  };

  const sendToMap = (data: object) => {
    const js = `document.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      JSON.stringify(data),
    )}}));true;`;
    webviewRef.current?.injectJavaScript(js);
  };

  const searchAddress = async (queryAddress?: string) => {
    const query = queryAddress || searchText;
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const result = await geocodeSearch(query, passengerLocation);
      if (result) {
        setDestinationGeo(result);
        await fetchRoute(passengerLocation.lat, passengerLocation.lng, result.lat, result.lng);
      } else {
        Alert.alert('Taxitex', 'No encontramos esa ubicación.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchRoute = async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
      try {
        const result = await fetchDrivingRoute({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
        if (result) {
          sendToMap({ type: 'route', coords: result.coords, destLat: toLat, destLng: toLng });
          setHasRoute(true);
          setRouteStats({ distance: result.distanceKm ?? 0, duration: result.durationMin ?? 0 });
        } else {
          Alert.alert(
            'Taxitex',
            'El servicio de rutas está tardando más de lo normal. Intenta de nuevo en unos segundos.'
          );
          setHasRoute(false);
        }
      } catch (error) {
        console.error('[PassengerHomeScreen] fetchRoute excepción:', error);
        Alert.alert('Error', 'No se pudo calcular la ruta.');
        setHasRoute(false);
      }
    };

  const clearRoute = () => {
    sendToMap({ type: 'clear' });
    setHasRoute(false);
    setSearchText('');
    setDestinationGeo(null);
    setRouteStats(null);
  };

  const handleSolicitarViaje = async () => {
    const user = auth().currentUser;
    if (!user || !destinationGeo) return;
    setIsSearching(true);
    try {
      const rideId = await createRide({
        passengerId: user.uid,
        passengerName: user.displayName || 'Pasajero',
        origin: { lat: passengerLocation.lat, lng: passengerLocation.lng, label: 'Mi ubicación actual' },
        destination: destinationGeo,
        distanceKm: routeStats?.distance ?? null,
        durationMin: routeStats?.duration ?? null,
      });
      navigation.navigate('PassengerRide', { rideId, originLat: passengerLocation.lat, originLng: passengerLocation.lng });
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la solicitud.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* -- Header Polished -- */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('PassengerProfile')}>
          <User size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.brandName}>TAXITEX</Text>
          {userName && <Text style={styles.headerGreet}>Hola, {userName} ✨</Text>}
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setShowNotifications(true)}
        >
          <Bell size={24} color={Colors.textPrimary} strokeWidth={2.5} />
          {notifications.some(n => !n.read) && <View style={styles.notifBadge} />}
        </TouchableOpacity>
      </Animated.View>

      {/* -- Map Section -- */}
      <View style={styles.mapWrapper}>
        <WebView
          ref={webviewRef}
          source={{ html: MAP_HTML }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          androidHardwareAccelerationDisabled={true}
          onLoadEnd={() => {
            if (passengerLocation) sendToMap({ type: 'center', lat: passengerLocation.lat, lng: passengerLocation.lng });
          }}
        />

        {loadingLocation && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loaderText}>Localizando...</Text>
          </View>
        )}

        {hasRoute && (
          <TouchableOpacity style={styles.clearRouteFloating} onPress={clearRoute}>
            <X size={16} color={Colors.textPrimary} strokeWidth={3} />
            <Text style={styles.clearRouteText}>Limpiar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => Alert.alert('🚨 S.O.S', 'Enviando alerta a seguridad...')}
        >
          <ShieldAlert size={32} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* -- Action Bottom Sheet -- */}
      <Animated.View style={[styles.bottomPanel, { transform: [{ translateY: panelAnim }] }]}>
        <View style={styles.panelHandle} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Search Input with Search Button */}
          {!hasRoute && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color={Colors.textMuted} style={{ marginLeft: 12 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="¿A dónde quieres ir?"
                  placeholderTextColor={Colors.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={() => searchAddress()}
                  returnKeyType="search"
                />
                <View style={styles.searchActions}>
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchBtn}>
                      <X size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.goButton}
                    onPress={() => searchAddress()}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                    ) : (
                      <ArrowRight size={22} color={Colors.textOnPrimary} strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Route Info Stats */}
          {hasRoute && routeStats && (
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Navigation size={18} color={Colors.secondary} />
                <Text style={styles.statValue}>{routeStats.distance.toFixed(1)} km</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Clock size={18} color={Colors.primaryDark} />
                <Text style={styles.statValue}>{Math.round(routeStats.duration)} min</Text>
              </View>
            </View>
          )}

          {/* Main Action Area */}
          <View style={styles.mainActions}>
            {hasRoute ? (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSolicitarViaje}
                disabled={isSearching}
              >
                {isSearching ? <ActivityIndicator color={Colors.white} /> : (
                  <>
                    <Text style={styles.confirmBtnText}>CONFIRMAR TAXITEX</Text>
                    <ChevronRight size={24} color={Colors.white} strokeWidth={3} />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Favoritos</Text>
                <View style={styles.favoritesGrid}>
                  {favorites.map((fav) => {
                    const Icon = fav.icon;
                    return (
                      <TouchableOpacity
                        key={fav.id}
                        style={styles.favItem}
                        onPress={() => searchAddress(fav.address)}
                      >
                        <View style={[styles.favIconBg, { backgroundColor: fav.color + '15' }]}>
                          <Icon size={22} color={fav.color} />
                        </View>
                        <Text style={styles.favLabel} numberOfLines={1}>{fav.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.favItem} onPress={() => Alert.alert('Favoritos', 'Nueva ubicación.')}>
                    <View style={styles.addFavBg}>
                      <Plus size={22} color={Colors.textMuted} />
                    </View>
                    <Text style={[styles.favLabel, {color: Colors.textMuted}]}>Nuevo</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recientes</Text>
                <TouchableOpacity style={styles.recentItem} onPress={() => searchAddress('Centro San Martín')}>
                   <History size={20} color={Colors.textMuted} />
                   <View style={styles.recentInfo}>
                      <Text style={styles.recentTitle}>Centro Histórico</Text>
                      <Text style={styles.recentSub}>San Martín Texmelucan, Pue.</Text>
                   </View>
                   <ChevronRight size={16} color={Colors.border} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>

        {/* -- Polished Tab Bar -- */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('PassengerRides')}>
            <History size={24} color={activeTab === 'reservas' ? Colors.secondary : Colors.textMuted} strokeWidth={2} />
            <Text style={[styles.tabLabel, activeTab === 'reservas' && styles.tabLabelActive]}>Viajes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('inicio')}>
             <View style={[styles.activeTabCircle, activeTab === 'inicio' && styles.activeTabCircleSelected]}>
                <Home size={26} color={activeTab === 'inicio' ? Colors.white : Colors.textMuted} />
             </View>
             <Text style={[styles.tabLabel, activeTab === 'inicio' && styles.tabLabelActive]}>Inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={handleLogout}>
            <LogOut size={24} color={Colors.textMuted} />
            <Text style={styles.tabLabel}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* -- Modal de Notificaciones -- */}
        <Modal
          visible={showNotifications}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowNotifications(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notificaciones</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNotifications(false)}>
                  <X size={22} color={Colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {notifications.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>No tienes avisos en este momento.</Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.notifItem, !item.read && styles.notifItemUnread]}
                      onPress={() => markAsRead(item.id)}
                    >
                      <View style={styles.notifIconRow}>
                        <View style={[styles.notifIconBg, { backgroundColor: item.read ? '#f1f3f5' : '#2B7DB415' }]}>
                          <Bell size={18} color={item.read ? Colors.textMuted : '#2B7DB4'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
                            {item.title}
                          </Text>
                          <Text style={styles.notifDesc}>{item.desc}</Text>
                          <Text style={styles.notifTime}>{item.time}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity style={styles.modalMarkAllBtn} onPress={markAllAsRead}>
                <Text style={styles.modalMarkAllText}>Marcar todo como leído</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', height: 70, alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, backgroundColor: Colors.white,
    ...Shadows.sm, zIndex: 100,
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f7fa',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 2 },
  headerGreet: { fontSize: 10, color: Colors.textSecondary, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  notifBadge: {
    position: 'absolute', top: 10, right: 10, width: 8, height: 8,
    borderRadius: 4, backgroundColor: Colors.error, borderWidth: 1.5, borderColor: '#fff',
  },
  mapWrapper: { flex: 1, backgroundColor: '#f8f9fa' },
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
  loaderText: { marginTop: 10, fontSize: 14, color: Colors.textPrimary, fontWeight: '700' },
  clearRouteFloating: {
    position: 'absolute', top: 20, left: 20, backgroundColor: Colors.white,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, ...Shadows.md,
  },
  clearRouteText: { marginLeft: 6, fontWeight: 'bold', fontSize: 13, color: Colors.textPrimary },
  sosBtn: {
    position: 'absolute', bottom: 20, right: 16, width: 64, height: 64,
    borderRadius: 32, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    ...Shadows.lg, elevation: 8,
  },
  bottomPanel: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    ...Shadows.lg, marginTop: -30,
  },
  panelHandle: {
    width: 40, height: 5, backgroundColor: Colors.border,
    borderRadius: 3, alignSelf: 'center', marginVertical: 12,
  },
  scrollContent: { paddingHorizontal: Spacing.base, paddingBottom: 20 },
  searchContainer: { marginBottom: 20 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f5',
    borderRadius: Radius.lg, paddingRight: 6, height: 56,
    borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden'
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.textPrimary, fontWeight: '600', paddingHorizontal: 10 },
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearSearchBtn: { padding: 4 },
  goButton: {
    backgroundColor: Colors.primary,
    width: 46, height: 46, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4, ...Shadows.sm
  },
  routeStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight, padding: 16, borderRadius: Radius.lg, marginBottom: 20,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 25 },
  mainActions: { paddingVertical: 10 },
  confirmBtn: {
    backgroundColor: Colors.primary, height: 64, borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    ...Shadows.primary, marginBottom: 20,
  },
  confirmBtnText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 15 },
  favoritesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  favItem: { alignItems: 'center', width: (width - 60) / 4 },
  favIconBg: {
    width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center',
    justifyContent: 'center', marginBottom: 8, ...Shadows.xs,
  },
  addFavBg: {
    width: 56, height: 56, borderRadius: Radius.md, backgroundColor: '#f5f7fa',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border,
  },
  favLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#f8f9fa',
  },
  recentInfo: { flex: 1 },
  recentTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  recentSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tabBar: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f3f5',
    paddingVertical: 10, height: 75, marginTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
  tabLabelActive: { color: Colors.secondary, fontWeight: '800' },
  activeTabCircle: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    marginTop: -30, backgroundColor: Colors.white, ...Shadows.sm,
  },
  activeTabCircleSelected: { backgroundColor: Colors.secondary, ...Shadows.secondary },
  
  // Modal de Notificaciones Estilizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  modalCloseBtn: { padding: 4 },
  modalEmpty: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  modalEmptyText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  notifItem: {
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  notifItemUnread: {
    backgroundColor: '#2B7DB405',
    borderColor: '#2B7DB433',
    borderWidth: 1,
  },
  notifIconRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  notifIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  notifTitleUnread: { color: '#2B7DB4' },
  notifDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },
  notifTime: { fontSize: 10, color: Colors.textMuted, marginTop: 6, fontWeight: '600' },
  modalMarkAllBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMarkAllText: { fontSize: 13, color: '#2B7DB4', fontWeight: '800' },
});