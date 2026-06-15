import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, IconButton } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, getCountdown } from '../utils/dates';

// Upcoming/past appointments for one animal (mirrors PlanningTab in the web app)
export default function PlanningSection({ animal, addAnimalItem, deleteAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [motif, setMotif] = useState('');
  const [date, setDate] = useState(todayStr());
  const [heure, setHeure] = useState('');
  const [lieu, setLieu] = useState('');

  const handleAdd = () => {
    if (motif && date) {
      addAnimalItem(animal, 'rdvs', { motif, date, heure, lieu });
      setMotif('');
      setDate(todayStr());
      setHeure('');
      setLieu('');
      setShowForm(false);
    }
  };

  const rdvs = animal.rdvs || [];
  const sorted = [...rdvs].sort((a, b) => `${a.date}T${a.heure || '00:00'}`.localeCompare(`${b.date}T${b.heure || '00:00'}`));
  const now = new Date();
  const upcoming = sorted.filter((r) => new Date(`${r.date}T${r.heure || '00:00'}`) >= now);
  const past = sorted.filter((r) => new Date(`${r.date}T${r.heure || '00:00'}`) < now).reverse();

  const renderRdv = (r, faded) => {
    const c = getCountdown(r.date);
    return (
      <Card key={r.id} accentColor={colors.primary} style={faded ? { opacity: 0.6 } : null}>
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
          </View>
          <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'rdvs', r.id)} />
        </View>
      </Card>
    );
  };

  return (
    <View>
      <Text style={styles.title}>📅 Rendez-vous de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.primary }}>
          <Field label="Motif">
            <Input value={motif} onChangeText={setMotif} placeholder="ex. Vaccination, Consultation…" />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>
          <Field label="Heure">
            <Input value={heure} onChangeText={setHeure} placeholder="HH:MM" />
          </Field>
          <Field label="Lieu">
            <Input value={lieu} onChangeText={setLieu} placeholder="ex. Clinique Saint-Germain" />
          </Field>
          <View style={styles.actions}>
            <Button title="➕ Ajouter" onPress={handleAdd} color={colors.primary} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title="➕ Ajouter un rendez-vous" onPress={() => setShowForm(true)} color={colors.primary} style={{ marginBottom: spacing.lg }} />
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
  actions: { flexDirection: 'row', gap: spacing.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl, backgroundColor: colors.white, borderRadius: 8 },
});
