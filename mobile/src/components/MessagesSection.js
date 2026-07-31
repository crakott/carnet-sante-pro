import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Image, StyleSheet, ScrollView } from 'react-native';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../firebase/config';
import { Button, IconButton } from './ui';
import { colors, spacing, radius } from '../theme';

// Realtime chat with the vétérinaire for one animal (mirrors MessagesTab in the web app)
export default function MessagesSection({ animal }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [fileError, setFileError] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'animals', animal.id, 'messages'), orderBy('date'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => setFileError('Erreur lors du chargement des messages : ' + err.message));
    return unsub;
  }, [animal.id]);

  const pickPhoto = async () => {
    setFileError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setFileError("Permission d'accès aux photos refusée."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !photoBase64) return;
    setSending(true);
    setFileError('');
    try {
      await addDoc(collection(db, 'animals', animal.id, 'messages'), {
        from: 'proprietaire',
        authorNom: '',
        authorPrenom: '',
        text: text.trim(),
        photo: photoBase64 || null,
        date: new Date().toISOString(),
      });
      setText('');
      setPhotoBase64('');
    } catch (err) {
      setFileError("Erreur lors de l'envoi : " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💬 Messagerie vétérinaire — {animal.nom}</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <Text style={styles.empty}>Aucun message pour le moment. Posez une question au vétérinaire, avec une photo si besoin.</Text>
        ) : (
          messages.map((m) => {
            const mine = m.from === 'proprietaire';
            const authorName = [m.authorPrenom, m.authorNom].filter(Boolean).join(' ');
            return (
              <View key={m.id} style={[styles.messageWrap, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {!mine ? (
                    <Text style={[styles.author, { color: m.from === 'veterinaire' ? colors.primaryDark : colors.text }]}>
                      {m.from === 'veterinaire' ? `🩺 Dr. ${authorName || 'Vétérinaire'}` : (authorName || 'Propriétaire')}
                    </Text>
                  ) : null}
                  {m.text ? <Text style={[styles.messageText, mine ? styles.messageTextMine : null]}>{m.text}</Text> : null}
                  {m.photo ? <Image source={{ uri: m.photo }} style={styles.messagePhoto} /> : null}
                </View>
                <Text style={[styles.date, { textAlign: mine ? 'right' : 'left' }]}>{new Date(m.date).toLocaleString('fr-FR')}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {fileError ? <Text style={styles.error}>{fileError}</Text> : null}

      {photoBase64 ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: photoBase64 }} style={styles.previewImage} />
          <IconButton title="✕" color={colors.red} bg={colors.redLight} onPress={() => setPhotoBase64('')} />
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <IconButton title="📎" color={colors.text} bg={colors.background} onPress={pickPhoto} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écrire un message…"
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
        />
        <Button title="Envoyer" onPress={handleSend} disabled={sending || (!text.trim() && !photoBase64)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  thread: { flexGrow: 0, maxHeight: 420, backgroundColor: colors.white, borderRadius: radius.md, marginBottom: spacing.md },
  threadContent: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', margin: 'auto', padding: spacing.lg },
  messageWrap: { maxWidth: '80%', marginBottom: spacing.sm },
  bubble: { borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.background },
  author: { fontWeight: '700', fontSize: 12, marginBottom: spacing.xs },
  messageText: { fontSize: 14, color: colors.text },
  messageTextMine: { color: colors.white },
  messagePhoto: { width: 200, height: 150, borderRadius: radius.sm, marginTop: spacing.xs, resizeMode: 'cover' },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 4, marginHorizontal: spacing.xs },
  error: { color: colors.red, fontSize: 13, marginBottom: spacing.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  previewImage: { width: 60, height: 60, borderRadius: radius.sm, resizeMode: 'cover' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.text, maxHeight: 100 },
});
