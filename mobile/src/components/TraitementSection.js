import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, IconButton } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, isoToDisplay, displayToIso, formatDateInput, addMonths } from '../utils/dates';

// Antiparasitaires / Vermifuges section (mirrors TraitementSection in the web app)
export default function TraitementSection({ title, emoji, color, items, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [dernierTraitement, setDernierTraitement] = useState(isoToDisplay(todayStr()));
  const [intervalMois, setIntervalMois] = useState('3');

  const handleAdd = () => {
    if (dernierTraitement) {
      const dernierIso = displayToIso(dernierTraitement);
      onAdd({
        nom: nom || title,
        dernierTraitement: dernierIso,
        intervalMois: parseInt(intervalMois, 10),
        prochainTraitement: addMonths(dernierIso, intervalMois),
      });
      setNom('');
      setDernierTraitement(isoToDisplay(todayStr()));
      setIntervalMois('3');
      setShowForm(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color }]}>{emoji} {title}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: color }}>
          <Field label="Nom du produit">
            <Input value={nom} onChangeText={setNom} placeholder="ex. Frontline, Milbemax…" />
          </Field>
          <Field label="Date du dernier traitement">
            <Input value={dernierTraitement} onChangeText={(v) => setDernierTraitement(formatDateInput(v))} placeholder="JJ/MM/AAAA" keyboardType="numeric" maxLength={10} />
          </Field>
          <Field label="Fréquence (tous les X mois)" hint={`Prochain traitement calculé : ${formatDate(addMonths(displayToIso(dernierTraitement), intervalMois))}`}>
            <Input value={intervalMois} onChangeText={setIntervalMois} keyboardType="numeric" />
          </Field>
          <View style={styles.actions}>
            <Button title="➕ Ajouter" onPress={handleAdd} color={color} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title="➕ Ajouter un traitement" onPress={() => setShowForm(true)} color={color} style={{ marginBottom: spacing.md }} />
      )}

      <Card>
        {items && items.length > 0 ? (
          items.map((t, i) => (
            <View key={t.id || i} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{t.nom}</Text>
                <Text style={styles.itemMeta}>
                  Dernier : {formatDate(t.dernierTraitement)} · Prochain : <Text style={{ color, fontWeight: '700' }}>{formatDate(t.prochainTraitement)}</Text>
                </Text>
                <Text style={styles.itemSub}>Tous les {t.intervalMois} mois</Text>
              </View>
              {t.id ? <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => onDelete(t.id)} /> : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucun traitement enregistré</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl },
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
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
  itemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textMuted },
});
