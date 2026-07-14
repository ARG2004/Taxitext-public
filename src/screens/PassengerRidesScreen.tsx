import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { ArrowLeft, MapPin, Calendar, CreditCard, ChevronRight, User } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows } from '../theme';
import type { Ride } from '../types/rideTypes';

const DARK = '#1A1A2E';
const AZUL = '#2B7DB4';
const YELLOW = '#F5C200';
const VERDE = '#34C759';
const ROJO = '#E53935';

export default function PassengerRidesScreen({ navigation }: any) {
  const uid = auth().currentUser?.uid;
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const unsub = firestore()
      .collection('solicitudes')
      .where('pasajeroId', '==', uid)
      .orderBy('creadoEn', 'desc')
      .onSnapshot(
        (snap) => {
          if (snap) {
            const list = snap.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as any),
            })) as Ride[];
            setRides(list);
          }
          setLoading(false);
        },
        (error) => {
          console.log('Error al consultar historial de viajes:', error);
          setLoading(false);
        }
      );

    return unsub;
  }, [uid]);

  const getStatusBadge = (status: string) => {
    let label = 'Desconocido';
    let bg = '#ccc';
    let color = '#fff';

    switch (status) {
      case 'buscando':
        label = 'Buscando Taxi';
        bg = AZUL + '15';
        color = AZUL;
        break;
      case 'aceptado':
        label = 'Aceptado';
        bg = AZUL + '15';
        color = AZUL;
        break;
      case 'llegado':
        label = 'En Origen';
        bg = YELLOW + '15';
        color = YELLOW;
        break;
      case 'en_curso':
        label = 'En Curso';
        bg = VERDE + '15';
        color = VERDE;
        break;
      case 'completado':
        label = 'Completado';
        bg = VERDE + '15';
        color = VERDE;
        break;
      case 'cancelado':
        label = 'Cancelado';
        bg = ROJO + '15';
        color = ROJO;
        break;
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{label.toUpperCase()}</Text>
      </View>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Reciente';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Viajes</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AZUL} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconBg}>
            <MapPin size={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Aún no tienes viajes</Text>
          <Text style={styles.emptySub}>
            Las solicitudes de taxi que realices aparecerán listadas aquí.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('PassengerHome')}
          >
            <Text style={styles.actionBtnText}>Pedir mi primer taxi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (['buscando', 'aceptado', 'llegado', 'en_curso'].includes(item.estado)) {
                  navigation.navigate('PassengerRide', {
                    rideId: item.id,
                    originLat: item.origen.lat,
                    originLng: item.origen.lng,
                  });
                }
              }}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.dateRow}>
                  <Calendar size={14} color={Colors.textMuted} />
                  <Text style={styles.dateText}>{formatDate(item.creadoEn)}</Text>
                </View>
                {getStatusBadge(item.estado)}
              </View>

              {/* Card Addresses */}
              <View style={styles.addressSection}>
                <View style={styles.addressItem}>
                  <View style={[styles.dot, { backgroundColor: AZUL }]} />
                  <Text style={styles.addressTextLine} numberOfLines={1}>
                    {item.origen.label}
                  </Text>
                </View>
                <View style={styles.addressLine} />
                <View style={styles.addressItem}>
                  <View style={[styles.dot, { backgroundColor: YELLOW }]} />
                  <Text style={styles.addressTextLine} numberOfLines={1}>
                    {item.destino.label}
                  </Text>
                </View>
              </View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                {item.conductorNombre ? (
                  <View style={styles.driverRow}>
                    <User size={14} color={Colors.textMuted} />
                    <Text style={styles.driverText} numberOfLines={1}>
                      {item.conductorNombre} • U. {item.conductorUnidad || 'N/A'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noDriverText}>Sin conductor asignado</Text>
                )}

                {item.precioFinal != null && (
                  <View style={styles.priceRow}>
                    <CreditCard size={14} color={Colors.textMuted} />
                    <Text style={styles.priceText}>${item.precioFinal} MXN</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    ...Shadows.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: DARK },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: DARK, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  actionBtn: {
    backgroundColor: AZUL,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef0f2',
    ...Shadows.xs,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  badgeText: { fontSize: 10, fontWeight: '800' },
  addressSection: { paddingLeft: 6, gap: 6, marginBottom: 14 },
  addressItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addressTextLine: { flex: 1, fontSize: 14, fontWeight: '600', color: DARK },
  addressLine: { width: 1, height: 14, backgroundColor: '#ccc', marginLeft: 3 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  driverText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  noDriverText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', italic: true } as any,
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceText: { fontSize: 14, fontWeight: '800', color: DARK },
});
