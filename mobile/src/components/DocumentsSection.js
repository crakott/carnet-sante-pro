import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Card, Button, Field, Input, Select, IconButton, Row } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, isoToDisplay, displayToIso, formatDateInput } from '../utils/dates';
import { DOCUMENT_TYPES, MAX_DOCUMENT_PDF_SIZE } from '../constants';

// Documents (carnet de vaccination, ordonnances, certificats...) for one animal (mirrors DocumentsTab in the web app)
export default function DocumentsSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('vaccin');
  const [nom, setNom] = useState('');
  const [date, setDate] = useState(isoToDisplay(todayStr()));
  const [photoBase64, setPhotoBase64] = useState('');
  const [fileError, setFileError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setType('vaccin');
    setNom('');
    setDate(isoToDisplay(todayStr()));
    setPhotoBase64('');
    setFileError('');
    setShowForm(false);
  };

  const openEdit = (d) => {
    setEditingId(d.id);
    setType(d.type || 'vaccin');
    setNom(d.nom || '');
    setDate(isoToDisplay(d.date) || isoToDisplay(todayStr()));
    setPhotoBase64('');
    setFileError('');
    setShowForm(true);
  };

  const pickPhoto = async () => {
    setFileError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setFileError("Permission d'accès aux photos refusée."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    setFileError('');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setFileError("Permission d'accès à la caméra refusée."); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickPdf = async () => {
    setFileError('');
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    if (file.size && file.size > MAX_DOCUMENT_PDF_SIZE) {
      setFileError(`PDF trop volumineux (max ${Math.round(MAX_DOCUMENT_PDF_SIZE / 1024)} Ko). Essayez de le compresser ou de photographier les pages.`);
      return;
    }
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      setPhotoBase64(`data:application/pdf;base64,${base64}`);
    } catch (err) {
      setFileError('Impossible de lire ce fichier.');
    }
  };

  const handleSave = () => {
    if (editingId) {
      const updates = { type, nom, date: displayToIso(date) };
      if (photoBase64) updates.photo = photoBase64;
      updateAnimalItem(animal, 'documents', editingId, updates);
      resetForm();
    } else if (photoBase64) {
      addAnimalItem(animal, 'documents', { type, nom, date: displayToIso(date), photo: photoBase64 });
      resetForm();
    }
  };

  const openPdf = async (dataUri, filename) => {
    try {
      const base64 = dataUri.split(',')[1];
      const fileUri = `${FileSystem.cacheDirectory}${filename}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Partage indisponible', "L'ouverture de fichiers n'est pas disponible sur cet appareil.");
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ouvrir ce document.");
    }
  };

  const documents = [...(animal.documents || [])].reverse();

  return (
    <View>
      <Text style={styles.title}>📄 Documents de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.indigo }}>
          <Field label="Type">
            <Select selectedValue={type} onValueChange={setType} items={Object.entries(DOCUMENT_TYPES).map(([k, l]) => ({ label: l, value: k }))} />
          </Field>
          <Field label="Description (optionnel)">
            <Input value={nom} onChangeText={setNom} placeholder="Description..." />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={(v) => setDate(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="numeric" maxLength={10} />
          </Field>

          <Field label={`📷 Scanner une photo ou 📄 importer un PDF (max ${Math.round(MAX_DOCUMENT_PDF_SIZE / 1024)} Ko)`}>
            <Row style={{ gap: spacing.sm }}>
              <Button title="📸 Appareil" onPress={takePhoto} color={colors.indigo} outline style={{ flex: 1 }} />
              <Button title="🖼️ Galerie" onPress={pickPhoto} color={colors.indigo} outline style={{ flex: 1 }} />
              <Button title="📄 PDF" onPress={pickPdf} color={colors.indigo} outline style={{ flex: 1 }} />
            </Row>
            {photoBase64 ? (
              photoBase64.startsWith('data:application/pdf') ? (
                <Text style={styles.success}>✓ PDF sélectionné</Text>
              ) : (
                <>
                  <Text style={styles.success}>✓ Photo sélectionnée</Text>
                  <Image source={{ uri: photoBase64 }} style={styles.previewImage} />
                </>
              )
            ) : null}
          </Field>

          {fileError ? <Text style={styles.error}>{fileError}</Text> : null}
          {editingId && !photoBase64 ? (
            <Text style={styles.editHint}>📎 Laissez vide pour conserver le fichier existant</Text>
          ) : null}

          <Row style={{ gap: spacing.sm }}>
            <Button title={editingId ? '✏️ Modifier' : '➕ Ajouter'} onPress={handleSave} color={colors.indigo} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={resetForm} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter un document" onPress={resetForm} color={colors.indigo} style={{ marginBottom: spacing.lg }} />
      )}

      {documents.length > 0 ? (
        documents.map((d, i) => (
          <Card key={d.id || i} accentColor={colors.indigo}>
            {d.photo ? (
              d.photo.startsWith('data:application/pdf') ? (
                <Button title="📄 Ouvrir le PDF" onPress={() => openPdf(d.photo, `document-${animal.nom}-${d.date}`)} color={colors.indigoLight} textColor={colors.indigo} style={{ marginBottom: spacing.sm }} />
              ) : (
                <Image source={{ uri: d.photo }} style={styles.previewImage} />
              )
            ) : null}
            <View style={styles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{DOCUMENT_TYPES[d.type] || d.type}</Text>
                {d.nom ? <Text style={styles.itemDesc}>{d.nom}</Text> : null}
                <Text style={styles.itemMeta}>{formatDate(d.date)}</Text>
                {d.source === 'veterinaire' ? (
                  <View style={styles.vetBadge}>
                    <Text style={styles.vetBadgeText}>
                      🩺 Émis par Dr. {[d.veterinaire?.prenom, d.veterinaire?.nom].filter(Boolean).join(' ') || 'vétérinaire'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Row style={{ gap: 4 }}>
                <IconButton title="✏️" color={colors.indigo} bg={colors.indigoLight} onPress={() => openEdit(d)} />
                <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'documents', d.id)} />
              </Row>
            </View>
          </Card>
        ))
      ) : (
        <Text style={styles.empty}>Aucun document enregistré</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { fontWeight: '600', color: colors.text, fontSize: 14 },
  itemDesc: { fontSize: 13, color: colors.text, marginTop: 2 },
  itemMeta: { color: colors.textLight, fontSize: 12, marginTop: 2 },
  previewImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: spacing.sm, resizeMode: 'cover' },
  success: { color: colors.primary, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.red, fontSize: 13, marginBottom: spacing.sm },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
  vetBadge: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.pillGreenBg },
  vetBadgeText: { fontSize: 11, fontWeight: '700', color: colors.pillGreenText },
  editHint: { fontSize: 12, color: colors.textLight, marginBottom: spacing.sm },
});
