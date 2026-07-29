import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, Field, Input, Row } from './ui';
import { colors, spacing, radius } from '../theme';
import { todayStr, formatDate } from '../utils/dates';
import CropModal from './CropModal';

export default function GalerieSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [date, setDate] = useState(todayStr());
  const [cropTarget, setCropTarget] = useState(null);

  const resetForm = () => {
    setCaption('');
    setPhotoBase64('');
    setDate(todayStr());
    setShowForm(false);
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Accès aux photos refusé."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Accès à la caméra refusé."); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = () => {
    if (!photoBase64) return;
    addAnimalItem(animal, 'photos', { photo: photoBase64, caption, date });
    resetForm();
  };

  const confirmDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer cette photo ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteAnimalItem(animal, 'photos', id) },
    ]);
  };

  const photos = [...(animal.photos || [])].reverse();

  return (
    <View>
      <Text style={styles.title}>📷 Photos de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
          <Field label="Photo">
            <Row style={{ gap: spacing.sm }}>
              <Button title="📸 Appareil" onPress={takePhoto} color={colors.pink} outline style={{ flex: 1 }} />
              <Button title="🖼️ Galerie" onPress={pickFromGallery} color={colors.pink} outline style={{ flex: 1 }} />
            </Row>
            {photoBase64 ? <Image source={{ uri: photoBase64 }} style={styles.preview} /> : null}
          </Field>
          <Field label="Légende (optionnel)">
            <Input value={caption} onChangeText={setCaption} placeholder="Décrivez ce moment…" />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Button title="➕ Ajouter" onPress={handleSave} color={colors.pink} style={{ flex: 1 }} disabled={!photoBase64} />
            <Button title="Annuler" onPress={resetForm} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter une photo" onPress={() => setShowForm(true)} color={colors.pink} style={{ marginBottom: spacing.lg }} />
      )}

      {photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((p, i) => (
            <View key={p.id || i} style={styles.gridItem}>
              <Image source={{ uri: p.photo }} style={styles.gridImage} />
              {p.id && updateAnimalItem ? (
                <TouchableOpacity style={styles.cropBtn} onPress={() => setCropTarget(p)}>
                  <Text style={styles.cropBtnText}>✂️</Text>
                </TouchableOpacity>
              ) : null}
              {p.id ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(p.id)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              ) : null}
              {p.caption ? <Text style={styles.caption} numberOfLines={2}>{p.caption}</Text> : null}
              <Text style={styles.dateMeta}>{formatDate(p.date)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Aucune photo enregistrée pour {animal.nom}</Text>
      )}

      <CropModal
        visible={!!cropTarget}
        photo={cropTarget?.photo}
        onSave={(cropped) => {
          if (cropTarget && updateAnimalItem) {
            updateAnimalItem(animal, 'photos', cropTarget.id, { ...cropTarget, photo: cropped });
          }
          setCropTarget(null);
        }}
        onCancel={() => setCropTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  preview: { width: '100%', height: 200, borderRadius: 8, marginTop: spacing.sm, resizeMode: 'cover' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridItem: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridImage: { width: '100%', height: 150, resizeMode: 'cover' },
  cropBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropBtnText: { fontSize: 13 },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(239,68,68,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  caption: { fontSize: 12, color: colors.text, padding: spacing.xs, paddingTop: spacing.sm },
  dateMeta: { fontSize: 11, color: colors.textMuted, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
