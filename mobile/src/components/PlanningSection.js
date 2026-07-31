import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, IconButton, Row } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, isoToDisplay, displayToIso, formatDateInput, getCountdown } from '../utils/dates';

const emptyForm = { motif: '', date: '', heure: '', lieu: '', notes: '' };

export default function PlanningSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, date: isoToDisplay(todayStr()) });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: isoToDisplay(todayStr()) });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ motif: r.motif || '', date: isoToDisplay(r.date) || '', heure: r.heure || '', lieu: r.lieu || '', notes: r.notes || '' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.motif || !form.date) return;
    const payload = { motif: form.motif, date: displayToIso(form.date), heure: form.heure, lieu: form.lieu, notes: form.notes };
    if (editingId) {
      updateAnimalItem(animal, 'rdvs', editingId, payload);
    } else {
      addAnimalItem(animal, 'rdvs', payload);
    }
    setEditingId(null);
    setForm({ ...emptyForm, date: isoToDisplay(todayStr()) });
    setShowForm(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: isoToDisplay(todayStr()) });
    setShowForm(false);
  };

  const rdvs = animal.rdvs || [];
  const sorted = [...rdvs].sort((a, b) => `${a.date}T${a.heure || '00:00'}`.localeCompare(`${b.date}T${b.heure || '00:00'}`));
  const now = new Date();
  const upcoming = sorted.filter((r) => new Date(`${r.date}T${r.heure || '00:00'}`) >= now);
  const past = sorted.filter((r) => new Date(`${r.date}T${r.heure || '00:00'}`) < now).reverse();

  const renderRdv = (r, faded) => {
    const c = getCountdown(r.date);
    const isEditing = editingId === r.id;
    return (
      <Card key={r.id} accentColor={isEditing ? colors.yellow : colors.primary} style={[faded ? { opacity: 0.6 } : null, isEditing ? { borderWidth: 2, borderColor: colors.yellow } : null]}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle}>{r.motif}</Text>
              {c ? (
                <View style={[styles.badge, { backgroundColor: `${c.color}1a` }]}>
                  <Text style={[styles.badgeText, { color: c.color }]}>{c.label}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.itemMeta}>📅 {formatDate(r.date)}{r.heure ? ` à ${r.heure}` : ''}</Text>
            {r.lieu ? <Text style={styles.itemMeta}>📍 {r.lieu}</Text> : null}
            {r.notes ? <Text style={[styles.itemMeta, { fontStyle: 'italic', marginTop: 4 }]}>📝 {r.notes}</Text> : null}
          </View>
          {r.id ? (
            <Row style={{ gap: 4 }}>
              <IconButton title="✏️" color={colors.yellow} bg="#fef9c3" onPress={() => openEdit(r)} />
              <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'rdvs', r.id)} />
            </Row>
          ) : null}
        </View>
      </Card>
    );
  };

  return (
    <View>
      <Text style={styles.title}>📅 Rendez-vous de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: editingId ? colors.yellow : colors.primary }}>
          <Field label="Motif">
            <Input value={form.motif} onChangeText={(v) => set('motif', v)} placeholder="ex. Vaccination, Consultation…" />
          </Field>
          <Field label="Date">
            <Input
              value={form.date}
              onChangeText={(v) => set('date', formatDateInput(v))}
              placeholder="JJ/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
          </Field>
          <Field label="Heure">
            <Input value={form.heure} onChangeText={(v) => set('heure', v)} placeholder="HH:MM" />
          </Field>
          <Field label="Lieu">
            <Input value={form.lieu} onChangeText={(v) => set('lieu', v)} placeholder="ex. Clinique Saint-Germain" />
          </Field>
          <Field label="Notes / check-list consultation">
            <Input value={form.notes} onChangeText={(v) => set('notes', v)} placeholder="Observations, questions à poser…" multiline style={{ minHeight: 64 }} />
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Button
              title={editingId ? '✏️ Modifier' : '➕ Ajouter'}
              onPress={handleSave}
              color={editingId ? colors.yellow : colors.primary}
              textColor={editingId ? '#92400e' : undefined}
              style={{ flex: 1 }}
            />
            <Button title="Annuler" onPress={handleCancel} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter un rendez-vous" onPress={openAdd} color={colors.primary} style={{ marginBottom: spacing.lg }} />
      )}

      <Text style={styles.sectionLabel}>À venir</Text>
      {upcoming.length > 0 ? upcoming.map((r) => renderRdv(r, false)) : <Text style={styles.empty}>Aucun rendez-vous à venir</Text>}

      {past.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: spacing.lg }]}>Passés</Text>
          {past.map((r) => renderRdv(r, true))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl, backgroundColor: colors.white, borderRadius: 8 },
});
