import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Screen, ScreenTitle, EmptyState, Card, Button, Field, Input, Select, IconButton, Row } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { formatDate, todayStr } from '../../utils/dates';
import { EMOJIS_ESPECE, CATEGORIES_BUDGET, CATEGORY_EMOJIS } from '../../constants';
import { colors, spacing, radius } from '../../theme';

const PERIODS = [
  { id: 'tout', label: 'Tout' },
  { id: 'semaine', label: 'Cette semaine' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'annee', label: 'Cette année' },
];

export default function BudgetScreen() {
  const { animals, budgetFilter, setBudgetFilter, getFilteredBudget, addAnimalItem, deleteAnimalItem } = useAnimals();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('Vétérinaire');
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(todayStr());
  const [budgetAnimalFilter, setBudgetAnimalFilter] = useState('tous');

  if (animals.length === 0) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

  const handleAdd = () => {
    const m = parseFloat(montant);
    if (type && m) {
      const animal = animals.find((a) => a.id === budgetAnimalFilter) || animals[0];
      addAnimalItem(animal, 'budget', { type, montant: m, date });
      setMontant(''); setDate(todayStr()); setShowForm(false);
    }
  };

  // Tag every expense with its animal so they can be combined and sorted by animal
  const taggedEntries = (a) => getFilteredBudget(a.budget || []).map((b) => ({ ...b, animalId: a.id, animalNom: a.nom, animalEmoji: EMOJIS_ESPECE[a.espece] || '🐾' }));
  const allEntries = animals.flatMap(taggedEntries);
  const entries = budgetAnimalFilter === 'tous' ? allEntries : allEntries.filter((b) => b.animalId === budgetAnimalFilter);
  const total = entries.reduce((s, b) => s + b.montant, 0);
  const perAnimalTotals = animals
    .map((a) => ({ id: a.id, nom: a.nom, emoji: EMOJIS_ESPECE[a.espece] || '🐾', total: taggedEntries(a).reduce((s, b) => s + b.montant, 0) }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);

  const filteredAnimal = animals.find((a) => a.id === budgetAnimalFilter);
  const titleSuffix = budgetAnimalFilter === 'tous' ? 'de tous mes animaux' : `de ${filteredAnimal ? filteredAnimal.nom : ''}`;

  const exportCSV = async () => {
    const rows = [
      ['Date', 'Animal', 'Catégorie', 'Montant (€)'],
      ...entries.map((b) => [b.date, b.animalNom, b.type, b.montant.toFixed(2)]),
    ];
    const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const fileName = `budget-${titleSuffix.replace(/[^a-z0-9]/gi, '-')}-${todayStr()}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Partage indisponible', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'exporter le CSV.");
    }
  };

  const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  const selectedAnimalObj = animals.find((a) => a.id !== undefined && budgetAnimalFilter !== 'tous' && a.id === budgetAnimalFilter) || null;

  return (
    <Screen>
      {selectedAnimalObj && (
        <View style={{ flexDirection:'row', alignItems:'center', padding:12, backgroundColor:'#f0fdf4', borderBottomWidth:1, borderBottomColor:'#d1fae5' }}>
          {selectedAnimalObj.photo ? (
            <Image source={{ uri: selectedAnimalObj.photo }} style={{ width:40, height:40, borderRadius:20, marginRight:10 }} />
          ) : (
            <View style={{ width:40, height:40, borderRadius:20, backgroundColor:'#10b981', marginRight:10, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ color:'#fff', fontSize:18 }}>{selectedAnimalObj.espece?.[0] || '🐾'}</Text>
            </View>
          )}
          <Text style={{ fontWeight:'700', fontSize:16, color:'#064e3b' }}>{selectedAnimalObj.nom || 'Animal'}</Text>
        </View>
      )}
      <ScreenTitle>💰 Budget {titleSuffix}</ScreenTitle>

      <Field label="Trier par animal" hint=" ">
        <Select
          selectedValue={budgetAnimalFilter}
          onValueChange={setBudgetAnimalFilter}
          items={[{ label: '🐾 Tous les animaux', value: 'tous' }, ...animals.map((a) => ({ label: `${EMOJIS_ESPECE[a.espece] || '🐾'} ${a.nom}`, value: a.id }))]}
        />
      </Field>

      <Row style={{ gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.lg }}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => setBudgetFilter(p.id)}
            style={[styles.periodChip, { backgroundColor: budgetFilter === p.id ? colors.primary : colors.border }]}
          >
            <Text style={{ color: budgetFilter === p.id ? colors.white : colors.text, fontWeight: '600', fontSize: 12 }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </Row>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.yellow }}>
          <Field label="Catégorie">
            <Select selectedValue={type} onValueChange={setType} items={CATEGORIES_BUDGET.map((c) => ({ label: `${CATEGORY_EMOJIS[c]} ${c}`, value: c }))} />
          </Field>
          <Field label="Montant (€)">
            <Input value={montant} onChangeText={setMontant} placeholder="Montant (€)" keyboardType="numeric" />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Button title="➕ Ajouter" onPress={handleAdd} color={colors.yellow} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Row style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          <Button title="➕ Ajouter une dépense" onPress={() => setShowForm(true)} color={colors.primary} style={{ flex: 1 }} />
          {entries.length > 0 ? <Button title="📊 Exporter CSV" onPress={exportCSV} color={colors.indigo} style={{ flex: 1 }} /> : null}
        </Row>
      )}

      {entries.length > 0 ? (
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total {titleSuffix}</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)}€</Text>
        </Card>
      ) : null}

      {budgetAnimalFilter === 'tous' && perAnimalTotals.length > 1 ? (
        <Card>
          <Text style={styles.cardHeading}>Répartition par animal</Text>
          {perAnimalTotals.map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setBudgetAnimalFilter(t.id)} style={styles.repartitionRow}>
              <Text style={{ fontSize: 13 }}>{t.emoji} {t.nom}</Text>
              <Text style={styles.repartitionTotal}>{t.total.toFixed(2)}€</Text>
            </TouchableOpacity>
          ))}
        </Card>
      ) : null}

      {sortedEntries.length === 0 ? (
        <Text style={styles.empty}>Aucune dépense</Text>
      ) : (
        sortedEntries.map((b, i) => (
          <Card key={b.id || i} accentColor={colors.yellow} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Row style={{ flexWrap: 'wrap' }}>
                <Text style={styles.itemTitle}>{CATEGORY_EMOJIS[b.type] || ''} {b.type}</Text>
                {budgetAnimalFilter === 'tous' ? (
                  <View style={styles.animalBadge}>
                    <Text style={styles.animalBadgeText}>{b.animalEmoji} {b.animalNom}</Text>
                  </View>
                ) : null}
              </Row>
              <Text style={styles.itemMeta}>{formatDate(b.date)}</Text>
              <Text style={styles.itemAmount}>{b.montant.toFixed(2)}€</Text>
            </View>
            {b.id ? <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animals.find((a) => a.id === b.animalId), 'budget', b.id)} /> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm },
  totalCard: { backgroundColor: colors.yellowLight, alignItems: 'center' },
  totalLabel: { color: '#92400e', fontSize: 13 },
  totalValue: { fontSize: 36, fontWeight: '700', color: colors.brown, marginTop: 4 },
  cardHeading: { fontSize: 13, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  repartitionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.background, borderRadius: radius.sm, marginBottom: spacing.xs },
  repartitionTotal: { fontSize: 14, fontWeight: '700', color: colors.yellow },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  itemAmount: { fontSize: 18, fontWeight: '700', color: colors.yellow, marginTop: 4 },
  animalBadge: { marginLeft: spacing.sm, backgroundColor: colors.greenLight, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  animalBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
