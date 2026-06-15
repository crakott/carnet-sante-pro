import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, IconButton } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr } from '../utils/dates';

// Chirurgies / interventions for one animal (mirrors ChirurgiesTab in the web app)
export default function ChirurgiesSection({ animal, addAnimalItem, deleteAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (nom && date) {
      addAnimalItem(animal, 'chirurgies', { nom, date, notes });
      setNom('');
      setDate(todayStr());
      setNotes('');
      setShowForm(false);
    }
  };

  const sortedDesc = [...(animal.chirurgies || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <View>
      <Text style={styles.title}>🔪 Chirurgies de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.rose }}>
          <Field label="Type d'intervention">
            <Input value={nom} onChangeText={setNom} placeholder="ex. Stérilisation, Détartrage, Extraction dentaire…" />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChangeText={setNotes} placeholder="Déroulement, suites opératoires, anesthésie…" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} />
          </Field>
          <View style={styles.actions}>
            <Button title="➕ Ajouter" onPress={handleAdd} color={colors.rose} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title="➕ Ajouter une chirurgie / intervention" onPress={() => setShowForm(true)} color={colors.rose} style={{ marginBottom: spacing.lg }} />
      )}

      {sortedDesc.length > 0 ? (
        sortedDesc.map((c, i) => (
          <Card key={c.id || i} accentColor={colors.rose}>
            <View style={styles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{c.nom}</Text>
                <Text style={styles.itemMeta}>{formatDate(c.date)}</Text>
              </View>
              {c.id ? <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'chirurgies', c.id)} /> : null}
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
  actions: { flexDirection: 'row', gap: spacing.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 12, marginTop: 2 },
  notes: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
