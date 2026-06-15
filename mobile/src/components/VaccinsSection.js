import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, Select, IconButton } from './ui';
import TraitementSection from './TraitementSection';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, addDays } from '../utils/dates';
import { VACCINS_COURANTS } from '../constants';

// Vaccins + Antiparasitaires + Vermifuges for one animal (mirrors VaccinsTab in the web app)
export default function VaccinsSection({ animal, addAnimalItem, deleteAnimalItem }) {
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [date, setDate] = useState(todayStr());

  const handleAdd = () => {
    if (nom && date) {
      const rappel = addDays(date, 365);
      addAnimalItem(animal, 'vaccins', { nom, date, rappel });
      setNom('');
      setDate(todayStr());
      setShowForm(false);
    }
  };

  const vaccinsCourants = VACCINS_COURANTS[animal.espece] || [];

  return (
    <View>
      <Text style={styles.title}>💉 Vaccins de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.primary }}>
          {vaccinsCourants.length > 0 && (
            <Field label="Vaccins courants">
              <Select selectedValue="" onValueChange={(v) => v && setNom(v)} placeholder="Choisir un vaccin courant" items={vaccinsCourants.map((v) => ({ label: v, value: v }))} />
            </Field>
          )}
          <Field label="Nom du vaccin">
            <Input value={nom} onChangeText={setNom} placeholder="Nom du vaccin" />
          </Field>
          <Field label="Date" hint="Le rappel sera calculé automatiquement 1 an après la date du vaccin.">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>
          <View style={styles.actions}>
            <Button title="➕ Ajouter" onPress={handleAdd} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title="➕ Ajouter un vaccin" onPress={() => setShowForm(true)} style={{ marginBottom: spacing.lg }} />
      )}

      <Card>
        {animal.vaccins && animal.vaccins.length > 0 ? (
          animal.vaccins.map((v, i) => (
            <View key={v.id || i} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{v.nom}</Text>
                <Text style={styles.itemMeta}>Fait: {formatDate(v.date)}{v.rappel ? ` | Rappel: ${formatDate(v.rappel)}` : ''}</Text>
              </View>
              {v.id ? <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'vaccins', v.id)} /> : null}
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
      />

      <TraitementSection
        title="Vermifuges"
        emoji="🪱"
        color={colors.brown}
        items={animal.vermifuges}
        onAdd={(item) => addAnimalItem(animal, 'vermifuges', item)}
        onDelete={(id) => deleteAnimalItem(animal, 'vermifuges', id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm },
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
