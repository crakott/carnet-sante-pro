import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, Field, Input, IconButton, Row } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, isoToDisplay, displayToIso, formatDateInput } from '../utils/dates';

const freshForm = () => ({ nom: '', date: isoToDisplay(todayStr()), notes: '', photo: '' });

export default function ChirurgiesSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(freshForm());

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm(freshForm());
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({ nom: c.nom, date: isoToDisplay(c.date), notes: c.notes || '', photo: '' });
    setShowForm(true);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const source = perm.granted
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (!source.canceled && source.assets?.[0]?.base64) {
      set('photo', `data:image/jpeg;base64,${source.assets[0].base64}`);
    }
  };

  const handleSave = () => {
    if (!form.nom || !form.date) return;
    const payload = { nom: form.nom, date: displayToIso(form.date), notes: form.notes };
    if (form.photo) payload.photo = form.photo;
    if (editingId) {
      if (!form.photo) delete payload.photo;
      updateAnimalItem(animal, 'chirurgies', editingId, payload);
    } else {
      addAnimalItem(animal, 'chirurgies', payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(freshForm());
  };

  const sortedDesc = [...(animal.chirurgies || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <View>
      <Text style={styles.title}>🔪 Chirurgies de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.rose }}>
          <Field label="Type d'intervention">
            <Input value={form.nom} onChangeText={(v) => set('nom', v)} placeholder="ex. Stérilisation, Détartrage…" />
          </Field>
          <Field label="Date">
            <Input value={form.date} onChangeText={(v) => set('date', formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="numeric" maxLength={10} />
          </Field>
          <Field label="Notes">
            <Input
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              placeholder="Déroulement, suites opératoires…"
              multiline
              numberOfLines={4}
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />
          </Field>
          <Field label="Photo (optionnel)">
            <Button title={form.photo ? '✓ Photo ajoutée' : '📸 Ajouter une photo'} onPress={pickPhoto} color={colors.rose} outline />
            {form.photo ? <Image source={{ uri: form.photo }} style={styles.preview} /> : null}
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Button title={editingId ? '✏️ Modifier' : '➕ Ajouter'} onPress={handleSave} color={colors.rose} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter une chirurgie / intervention" onPress={openAdd} color={colors.rose} style={{ marginBottom: spacing.lg }} />
      )}

      {sortedDesc.length > 0 ? (
        sortedDesc.map((c, i) => (
          <Card key={c.id || i} accentColor={colors.rose}>
            <View style={styles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{c.nom}</Text>
                <Text style={styles.itemMeta}>{formatDate(c.date)}</Text>
              </View>
              {c.id ? (
                <Row style={{ gap: 4 }}>
                  <IconButton title="✏️" color={colors.rose} bg="#fce7f3" onPress={() => openEdit(c)} />
                  <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'chirurgies', c.id)} />
                </Row>
              ) : null}
            </View>
            {c.notes ? <Text style={styles.notes}>{c.notes}</Text> : null}
          {c.photo ? <Image source={{ uri: c.photo }} style={styles.preview} /> : null}
          </Card>
        ))
      ) : (
        <Text style={styles.empty}>Aucune chirurgie ou intervention enregistrée</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 12, marginTop: 2 },
  notes: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  preview: { width: '100%', height: 160, borderRadius: 8, marginTop: spacing.sm, resizeMode: 'cover' },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
