import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
  Image,
} from 'react-native';
import { Colors, Typography, Spacing, Shadows } from '../theme';
import Svg, { Path, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  // Animation Values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  // Rotation for the loading ring
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Entrance animations for the background shapes
  const headerMove = useRef(new Animated.Value(-300)).current;
  const footerMove = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    // 1. Entrance Sequence
    Animated.parallel([
      // Animate organic background shapes
      Animated.spring(headerMove, {
        toValue: 0,
        tension: 8,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(footerMove, {
        toValue: 0,
        tension: 8,
        friction: 5,
        useNativeDriver: true,
      }),
      // Animate branding content
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 20,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. Smooth Linear Rotation for the loading ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* -- Header Blanco (Curvatura Orgánica Realizada con SVG) -- */}
      <Animated.View style={[styles.svgWrapper, { top: 0, transform: [{ translateY: headerMove }] }]}>
        <Svg height="240" width={width} viewBox={`0 0 ${width} 240`} preserveAspectRatio="none">
          <Path
            d={`M0,0 L${width},0 L${width},160 C${width * 0.7},220 ${width * 0.3},100 0,180 Z`}
            fill={Colors.white}
          />
        </Svg>
      </Animated.View>

      {/* -- Footer Amarillo (Curvatura Orgánica Realizada con SVG) -- */}
      <Animated.View style={[styles.svgWrapper, { bottom: 0, transform: [{ translateY: footerMove }] }]}>
        <Svg height="260" width={width} viewBox={`0 0 ${width} 260`} preserveAspectRatio="none">
          <Path
            d={`M0,120 C${width * 0.3},200 ${width * 0.7},40 ${width},140 L${width},260 L0,260 Z`}
            fill={Colors.primary}
          />
        </Svg>
      </Animated.View>

      {/* -- Middle Content -- */}
      <View style={styles.content}>
        <View style={styles.logoAndLoader}>
          {/* Polished Rotating Arc using SVG for perfect circles */}
          <Animated.View style={[styles.loader, { transform: [{ rotate: spin }] }]}>
            <Svg height="220" width="220" viewBox="0 0 100 100">
              <Circle
                cx="50"
                cy="50"
                r="46"
                stroke={Colors.primary}
                strokeWidth="5"
                strokeDasharray="160 300"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* Logo Circle */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </View>

        {/* Branding */}
        <Animated.View style={[styles.textContainer, { opacity: contentOpacity }]}>
          <Text style={styles.appName}>TAXITEX</Text>
          <Text style={styles.tagline}>TU TAXI DE CONFIANZA</Text>
        </Animated.View>
      </View>

      {/* Footer Text */}
      <View style={styles.footerInfo}>
        <Text style={styles.location}>SAN MARTÍN TEXMELUCAN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary, // Azul vibrante del tema
  },
  svgWrapper: {
    position: 'absolute',
    width: width,
    zIndex: 5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoAndLoader: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    position: 'absolute',
    width: 220,
    height: 220,
  },
  logoWrapper: {
    ...Shadows.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
  },
  logoCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logo: {
    width: '70%',
    height: '70%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  appName: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.white,
    letterSpacing: 4,
    opacity: 0.9,
    marginTop: 4,
  },
  footerInfo: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    zIndex: 20,
  },
  location: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
    letterSpacing: 3,
    opacity: 0.8,
  },
});
