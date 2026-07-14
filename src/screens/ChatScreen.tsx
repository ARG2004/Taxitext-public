import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { ArrowLeft, Send } from 'lucide-react-native';

const YELLOW = '#F5C200';
const DARK = '#1A1A2E';

type Msg = { id: string; de: string; texto: string };

export default function ChatScreen({ route, navigation }: any) {
  const { solicitudId } = route.params;
  const uid = auth().currentUser?.uid;
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [texto, setTexto] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = firestore()
      .collection('solicitudes')
      .doc(solicitudId)
      .collection('mensajes')
      .orderBy('creadoEn', 'asc')
      .onSnapshot((snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setMensajes(msgs);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      });
    return unsub;
  }, [solicitudId]);

  const enviar = async () => {
    if (!texto.trim() || !uid) return;
    const t = texto.trim();
    setTexto('');
    await firestore()
      .collection('solicitudes')
      .doc(solicitudId)
      .collection('mensajes')
      .add({ de: uid, texto: t, creadoEn: firestore.FieldValue.serverTimestamp() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat del viaje</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mio = item.de === uid;
          return (
            <View style={[styles.bubble, mio ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={styles.bubbleText}>{item.texto}</Text>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={enviar}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={enviar}>
            <Send size={18} color={DARK} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  list: { padding: 14, gap: 8 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  bubbleMine: { backgroundColor: YELLOW, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#F0F0F0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: DARK },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: DARK,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
});