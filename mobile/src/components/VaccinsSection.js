import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, Select, IconButton, Row } from './ui';
import TraitementSection from './TraitementSection';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, addDays } from '../utils/dates';
import { VACCINS_COURANTS } from '../constants';

const RAPPEL_INTERVALS = [
  { label: '6 mois', value: 182 },
  { label: '1 an', value: 365 },
  { label: '18 mois', value: 548 },
  { label: '2 ans', value: 730 },
  { label: '3 ans', value: 1095 },
];

const emptyForm = { nom: '', date: todayStr(), intervalDays: 365 };

export default function VaccinsSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (v) => {
    setEditingId(v.id);
    const intervalDays = v.rappel
      ? Math.round((new Date(v.rappel) - new Date(v.date)) / 86400000)
      : 365;
    setForm({ nom: v.nom, date: v.date, intervalDays });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.nom || !form.date) return;
    const rappel = addDays(form.date, form.intervalDays);
    if (editingId) {
      updateAnimalItem(animal, 'vaccins', editingId, { nom: form.nom, date: form.date, rappel });
    } else {
      addAnimalItem(animal, 'vaccins', { nom: form.nom, date: form.date, rappel });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const vaccinsCourants = VACCINS_COURANTS[animal.espece] || [];

  return (
    <View>
      <Text style={styles.title}>💉 Vaccins de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.primary }}>
          {!editingId && vaccinsCourants.length > 0 && (
            <Field label="Vaccins courants">
              <Select
                selectedValue=""
                onValueChange={(v) => v && set('nom', v)}
                placeholder="Choisir un vaccin courant"
                items={vaccinsCourants.map((v) => ({ label: v, value: v }))}
              />
            </Field>
          )}
          <Field label="Nom du vaccin">
            <Input value={form.nom} onChangeText={(v) => set('nom', v)} placeholder="Nom du vaccin" />
          </Field>
          <Field label="Date">
            <Input value={form.date} onChangeText={(v) => set('date', v)} placeholder="AAAA-MM-JJ" />
          </Field>
          <Field label="Intervalle de rappel">
            <Select
              selectedValue={form.intervalDays}
              onValueChange={(v) => set('intervalDays', v)}
              items={RAPPEL_INTERVALS.map((r) => ({ label: r.label, value: r.days || r.value }))}
            />
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Button title={editingId ? '✏️ Modifier' : '➕ Ajouter'} onPress={handleSave} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter un vaccin" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
      )}

      <Card>
        {animal.vaccins && animal.vaccins.length > 0 ? (
          animal.vaccins.map((v, i) => (
            <View key={v.id || i} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{v.nom}</Text>
                <Text style={styles.itemMeta}>
                  Fait : {formatDate(v.date)}
                  {v.rappel ? ` | Rappel : ${formatDate(v.rappel)}` : ''}
                </Text>
              </View>
              {v.id ? (
                <Row style={{ gap: 4 }}>
                  <IconButton title="✏️" color={colors.primary} bg={colors.greenLight} onPress={() => openEdit(v)} />
                  <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'vaccins', v.id)} />
                </Row>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucun vaccin</Text>
        )}
      </Card>

      <TraitementSection
        title="Antiparasitaires"
        emoji="🦟"
        color={colors.purple}
        items={animal.antiparasitaires}
        onAdd={(item) => addAnimalItem(animal, 'antiparasitaires', item)}
        onDelete={(id) => deleteAnimalItem(animal, 'antiparasitaires', id)}
        onUpdate={(id, updates) => updateAnimalItem(animal, 'antiparasitaires', id, updates)}
      />

      <TraitementSection
        title="Vermifuges"
        emoji="🪱"
        color={colors.brown}
        items={animal.vermifuges}
        onAdd={(item) => addAnimalItem(animal, 'vermifuges', item)}
        onDelete={(id) => deleteAnimalItem(animal, 'vermifuges', id)}
        onUpdate={(id, updates) => updateAnimalItem(animal, 'vermifuges', id, updates)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 14, marginTop: 2 },
  empty: { color: colors.textMuted },
});
