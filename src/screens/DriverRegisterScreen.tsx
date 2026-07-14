import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DriverRegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Registro Conductor</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#2B7DB4', fontSize: 24, fontWeight: '700' },
});