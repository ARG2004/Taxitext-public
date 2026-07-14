import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Colors, Typography, Spacing, Radius, Layout, Shadows } from '../theme';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ChevronLeft,
  ArrowRight,
  UserPlus,
  LogIn
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Habilitar LayoutAnimation para Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PassengerLoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // -- Refs de Animación --
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerMove = useRef(new Animated.Value(-height * 0.1)).current;
  const avatarScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(headerMove, {
        toValue: 0,
        tension: 10,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        tension: 30,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleAuthMode = (mode: boolean) => {
    if (mode !== isLogin) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsLogin(mode);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos vacíos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password.trim());
      const uid = auth().currentUser?.uid;
      if (uid) {
        const doc = await firestore().collection('usuarios').doc(uid).get();
        if (doc.exists() && doc.data()?.rol === 'pasajero') {
          navigation.replace('PassengerHome');
        } else {
          await auth().signOut();
          Alert.alert('Acceso denegado', 'Esta cuenta no es de pasajero. Usa el login de conductor.');
        }
      }
    } catch (error: any) {
      let msg = 'No se pudo iniciar sesión.';
      if (error.code === 'auth/user-not-found') msg = 'No existe una cuenta con ese correo.';
      else if (error.code === 'auth/wrong-password') msg = 'Contraseña incorrecta.';
      else if (error.code === 'auth/invalid-email') msg = 'Correo electrónico no válido.';
      else if (error.code === 'auth/invalid-credential') msg = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim() || !telefono.trim()) {
      Alert.alert('Campos vacíos', 'Completa todos los campos para registrarte.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const cred = await auth().createUserWithEmailAndPassword(email.trim(), password.trim());
      await cred.user.updateProfile({ displayName: nombre.trim() });
      await firestore().collection('usuarios').doc(cred.user.uid).set({
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        rol: 'pasajero',
        creadoEn: firestore.FieldValue.serverTimestamp(),
        verificado: true,
      });
      navigation.replace('PassengerHome');
    } catch (error: any) {
      let msg = 'No se pudo crear la cuenta.';
      if (error.code === 'auth/email-already-in-use') msg = 'Ya existe una cuenta con ese correo.';
      else if (error.code === 'auth/invalid-email') msg = 'Correo electrónico no válido.';
      else if (error.code === 'auth/weak-password') msg = 'La contraseña es muy débil.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* -- Header con Curvatura SVG Animado -- */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerMove }] }]}>
        <Svg height={height * 0.3} width={width} viewBox={`0 0 ${width} 240`} style={styles.headerSvg} preserveAspectRatio="none">
          <Path
            d={`M0,0 L${width},0 L${width},160 C${width * 0.7},220 ${width * 0.3},100 0,180 Z`}
            fill={Colors.primary}
          />
        </Svg>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={28} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Animated.View style={[styles.avatarCircle, { transform: [{ scale: avatarScale }] }]}>
             {isLogin ? (
               <LogIn size={38} color={Colors.primary} strokeWidth={2.5} />
             ) : (
               <UserPlus size={38} color={Colors.primary} strokeWidth={2.5} />
             )}
          </Animated.View>
          <Animated.Text style={[styles.headerTitle, { opacity: fadeAnim }]}>
            {isLogin ? 'Acceso Pasajero' : 'Registro Pasajero'}
          </Animated.Text>
          <Animated.Text style={[styles.headerSub, { opacity: fadeAnim }]}>
            {isLogin ? 'Inicia sesión para pedir tu taxi' : 'Crea tu cuenta en Taxitex'}
          </Animated.Text>
        </View>
      </Animated.View>

      {/* Formulario Animado */}
      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Toggle Tab */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
              onPress={() => toggleAuthMode(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                Ingresar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
              onPress={() => toggleAuthMode(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                Registrarse
              </Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View>
              <Text style={styles.inputLabel}>Nombre completo</Text>
              <View style={styles.inputWrap}>
                <User size={20} color={Colors.textSecondary} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre completo"
                  placeholderTextColor={Colors.textMuted}
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Teléfono</Text>
              <View style={styles.inputWrap}>
                <Phone size={20} color={Colors.textSecondary} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 2221234567"
                  placeholderTextColor={Colors.textMuted}
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          <Text style={styles.inputLabel}>Correo electrónico</Text>
          <View style={styles.inputWrap}>
            <Mail size={20} color={Colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.inputLabel}>Contraseña</Text>
          <View style={styles.inputWrap}>
            <Lock size={20} color={Colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff size={20} color={Colors.textSecondary} />
              ) : (
                <Eye size={20} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.mainBtn, loading && styles.mainBtnDisabled]}
            activeOpacity={0.85}
            onPress={isLogin ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnPrimary} size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.mainBtnText}>
                  {isLogin ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
                </Text>
                <ArrowRight size={20} color={Colors.textOnPrimary} strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.sepLine} />
            <Text style={styles.sepText}>o continúa con</Text>
            <View style={styles.sepLine} />
          </View>

          <TouchableOpacity
            onPress={() => toggleAuthMode(!isLogin)}
            style={styles.switchBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? '¿No tienes cuenta? Regístrate aquí'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: height * 0.28,
    position: 'relative',
    zIndex: 10,
  },
  headerSvg: {
    position: 'absolute',
    top: 0,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: Spacing.base,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.extrabold,
    color: Colors.textOnPrimary,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textOnPrimary,
    opacity: 0.8,
    marginTop: 2,
  },
  formWrapper: {
    flex: 1,
  },
  formScroll: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
    shadowColor: Colors.primaryDark,
  },
  toggleText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.bold,
  },
  inputLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    height: Layout.inputHeight,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: Spacing.xs,
  },
  mainBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    height: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    ...Shadows.primary,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainBtnDisabled: {
    opacity: 0.6,
  },
  mainBtnText: {
    fontSize: Typography.md,
    fontWeight: Typography.extrabold,
    color: Colors.textOnPrimary,
    letterSpacing: 2,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  sepText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontWeight: Typography.bold,
    textTransform: 'uppercase',
  },
  switchBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchText: {
    fontSize: Typography.base,
    color: Colors.secondary,
    fontWeight: Typography.bold,
    textDecorationLine: 'underline',
  },
});
