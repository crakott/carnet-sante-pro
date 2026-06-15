import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAudioRecorder, useAudioPlayer, AudioModule, RecordingPresets } from 'expo-audio';
import { Card, Button, Field, Input, Select, IconButton, Row } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr } from '../utils/dates';
import { TYPE_LABELS } from '../constants';

// Observations for one animal: text, photo and audio recording (mirrors NotesTab in the web app)
export default function NotesSection({ animal, addAnimalItem, deleteAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('comportement');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr());
  const [photo, setPhoto] = useState('');
  const [audio, setAudio] = useState('');
  const [fileError, setFileError] = useState('');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const resetForm = () => {
    setType('comportement'); setDescription(''); setDate(todayStr());
    setPhoto(''); setAudio(''); setFileError(''); setShowForm(false);
  };

  const pickPhoto = async () => {
    setFileError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setFileError("Permission d'accès aux photos refusée."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      setPhoto(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const startRecording = async () => {
    setFileError('');
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) { setFileError("Permission d'accès au micro refusée."); return; }
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) return;
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setAudio(`data:audio/m4a;base64,${base64}`);
    } catch (err) {
      setFileError("Impossible de lire l'enregistrement audio.");
    }
  };

  const handleAdd = () => {
    if (description || photo || audio) {
      addAnimalItem(animal, 'observations', { type, description, date, photo, audio });
      resetForm();
    }
  };

  const shareMedia = async (dataUri, extension, filename) => {
    try {
      const base64 = dataUri.split(',')[1];
      const fileUri = `${FileSystem.cacheDirectory}${filename}.${extension}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Partage indisponible', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible de partager ce fichier.");
    }
  };

  return (
    <View>
      <Text style={styles.title}>📋 Observations de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.cyan }}>
          <Field label="Type">
            <Select selectedValue={type} onValueChange={setType} items={Object.entries(TYPE_LABELS).map(([k, l]) => ({ label: l, value: k }))} />
          </Field>
          <Field label="Description">
            <Input value={description} onChangeText={setDescription} placeholder="Description..." multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>

          <Field label="📸 Photo">
            <Button title={photo ? '✓ Photo sélectionnée — changer' : 'Choisir une photo'} onPress={pickPhoto} color={colors.cyan} outline />
            {photo ? <Image source={{ uri: photo }} style={styles.previewImage} /> : null}
          </Field>

          <Field label="🎙️ Audio">
            {recorder.isRecording ? (
              <Button title="⏹ Arrêter l'enregistrement" onPress={stopRecording} color={colors.red} />
            ) : (
              <Button title={audio ? '✓ Audio enregistré — recommencer' : '🎙️ Démarrer l\'enregistrement'} onPress={startRecording} color={colors.cyan} outline />
            )}
          </Field>

          {fileError ? <Text style={styles.error}>{fileError}</Text> : null}

          <Row style={{ gap: spacing.sm }}>
            <Button title="➕ Ajouter" onPress={handleAdd} color={colors.cyan} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={resetForm} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter une observation" onPress={() => setShowForm(true)} style={{ marginBottom: spacing.lg }} />
      )}

      {animal.observations && animal.observations.length > 0 ? (
        [...animal.observations].reverse().map((o, i) => (
          <Card key={o.id || i} accentColor={colors.cyan}>
            <View style={styles.itemHeader}>
              <View>
                <Text style={styles.itemTitle}>{TYPE_LABELS[o.type] || o.type}</Text>
                <Text style={styles.itemMeta}>{formatDate(o.date)}</Text>
              </View>
              {o.id ? <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'observations', o.id)} /> : null}
            </View>
            {o.description ? <Text style={styles.description}>{o.description}</Text> : null}
            {o.photo ? (
              <View>
                <Image source={{ uri: o.photo }} style={styles.previewImage} />
                <Button title="📤 Partager cette photo" onPress={() => shareMedia(o.photo, 'jpg', `photo-${animal.nom}-${o.date}`)} color={colors.blueLight} textColor={colors.blue} style={{ marginTop: spacing.sm }} />
              </View>
            ) : null}
            {o.audio ? (
              <View style={{ marginTop: spacing.sm }}>
                <AudioPlayerRow uri={o.audio} />
                <Button title="📤 Partager cet audio" onPress={() => shareMedia(o.audio, 'm4a', `audio-${animal.nom}-${o.date}`)} color={colors.blueLight} textColor={colors.blue} style={{ marginTop: spacing.sm }} />
              </View>
            ) : null}
          </Card>
        ))
      ) : (
        <Text style={styles.empty}>Aucune observation</Text>
      )}
    </View>
  );
}

function AudioPlayerRow({ uri }) {
  const player = useAudioPlayer(uri);
  return <Button title="▶️ Écouter l'enregistrement" onPress={() => player.play()} color={colors.cyan} outline />;
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 12, marginTop: 2 },
  description: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginTop: spacing.sm, resizeMode: 'cover' },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
  error: { color: colors.red, fontSize: 13, marginBottom: spacing.sm },
});
