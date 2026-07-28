import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, IconButton, Row } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr } from '../utils/dates';

const emptyForm = { nom: '', date: todayStr(), notes: '' };

export default function ChirurgiesSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: todayStr() });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({ nom: c.nom, date: c.date, notes: c.notes || '' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.nom || !form.date) return;
    if (editingId) {
      updateAnimalItem(animal, 'chirurgies', editingId, { nom: form.nom, date: form.date, notes: form.notes });
    } else {
      addAnimalItem(animal, 'chirurgies', { nom: form.nom, date: form.date, notes: form.notes });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
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
            <Input value={form.date} onChangeText={(v) => set('date', v)} placeholder="AAAA-MM-JJ" />
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
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
