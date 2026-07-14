import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows, Layout } from '../theme';
import { User, Car, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* -- Hero Section ------------------------------------------------- */}
      <View style={styles.hero}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>TAXITEX</Text>
        <Text style={styles.tagline}>Tu taxi de confianza en San Martín Texmelucan</Text>

        <View style={styles.accentRow}>
          <View style={[styles.accentLine, { backgroundColor: Colors.primary }]} />
          <View style={[styles.accentDot, { backgroundColor: Colors.secondary }]} />
          <View style={[styles.accentLine, { backgroundColor: Colors.primary }]} />
        </View>
      </View>

      {/* -- Actions Section ----------------------------------------------- */}
      <View style={styles.actionsSection}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sectionTitle}>¿Cómo deseas continuar?</Text>

        {/* Botón Pasajero */}
        <TouchableOpacity
          style={styles.passengerBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PassengerLogin')}
        >
          <View style={styles.btnIconWrap}>
            <User size={28} color={Colors.textOnPrimary} strokeWidth={2.5} />
          </View>
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Soy pasajero</Text>
            <Text style={styles.btnSubtitle}>Solicita un taxi de forma segura</Text>
          </View>
          <ChevronRight size={24} color={Colors.textOnPrimary} strokeWidth={3} />
        </TouchableOpacity>

        {/* Botón Conductor */}
        <TouchableOpacity
          style={styles.driverBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('DriverLogin')}
        >
          <View style={[styles.btnIconWrap, styles.driverIconWrap]}>
            <Car size={28} color={Colors.textOnSecondary} strokeWidth={2.5} />
          </View>
          <View style={styles.btnTextWrap}>
            <Text style={[styles.btnTitle, styles.driverBtnTitle]}>Soy conductor</Text>
            <Text style={[styles.btnSubtitle, styles.driverBtnSubtitle]}>Gestiona tus viajes y ganancias</Text>
          </View>
          <ChevronRight size={24} color={Colors.textOnSecondary} strokeWidth={3} />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footnote}>TAXITEX • 2024</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // -- Hero --
  hero: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Layout.headerPaddingTop,
    paddingHorizontal: Spacing.xl,
  },
  logoWrapper: {
    width: width * 0.38,
    height: width * 0.38,
    borderRadius: (width * 0.38) / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
    ...Shadows.lg,
    shadowColor: Colors.primaryDark,
    marginBottom: Spacing.xl,
  },
  logo: {
    width: '75%',
    height: '75%',
  },
  appName: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: 4,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accentLine: {
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // -- Acciones --
  actionsSection: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    ...Shadows.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  // Botón Pasajero (Amarillo)
  passengerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.primary,
    minHeight: 90,
  },
  btnIconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  btnTextWrap: {
    flex: 1,
  },
  btnTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  btnSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textOnPrimary,
    opacity: 0.8,
    marginTop: 2,
  },

  // Botón Conductor (Azul)
  driverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.secondary,
    minHeight: 90,
  },
  driverIconWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  driverBtnTitle: {
    color: Colors.textOnSecondary,
  },
  driverBtnSubtitle: {
    color: Colors.textOnSecondary,
    opacity: 0.85,
  },

  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footnote: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
