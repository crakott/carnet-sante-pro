import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearch } from '../context/SearchContext';
import { useAnimals } from '../context/AnimalsContext';
import { colors, spacing, radius } from '../theme';

const RECORD_TYPES = [
  { key: 'vaccins', nameKey: 'nom', label: 'Vaccin', color: '#0369a1', bg: '#e0f2fe', screen: 'Vaccins' },
  { key: 'medicaments', nameKey: 'nom', label: 'Médicament', color: '#7c3aed', bg: '#ede9fe', screen: 'Medicaments' },
  { key: 'antiparasitaires', nameKey: 'produit', label: 'Antiparasitaire', color: '#b45309', bg: '#fef3c7', screen: 'Medicaments' },
  { key: 'vermifuges', nameKey: 'produit', label: 'Vermifuge', color: '#047857', bg: '#d1fae5', screen: 'Medicaments' },
  { key: 'chirurgies', nameKey: 'type', label: 'Chirurgie', color: '#dc2626', bg: '#fee2e2', screen: 'Chirurgies' },
  { key: 'observations', nameKey: 'contenu', label: 'Observation', color: '#6b7280', bg: '#f3f4f6', screen: 'Notes' },
  { key: 'rdvs', nameKey: 'motif', label: 'Rendez-vous', color: '#10b981', bg: '#ecfdf5', screen: 'Planning' },
];

function buildResults(animals, query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results = [];

  animals.forEach(animal => {
    const animalMatch =
      animal.nom?.toLowerCase().includes(q) ||
      animal.espece?.toLowerCase().includes(q) ||
      animal.race?.toLowerCase().includes(q);

    if (animalMatch) {
      results.push({
        id: `animal-${animal.id}`,
        animalId: animal.id,
        animalName: animal.nom || 'Animal',
        label: [animal.espece, animal.race].filter(Boolean).join(' · ') || animal.nom || '',
        typeLabel: 'Animal',
        typeColor: colors.primaryDark,
        typeBg: colors.greenLighter,
        screen: 'DossierMain',
        date: '',
      });
    }

    RECORD_TYPES.forEach(({ key, nameKey, label, color, bg, screen }) => {
      (animal[key] || []).forEach((item, idx) => {
        const text = item[nameKey]?.toLowerCase() || '';
        if (text.includes(q)) {
          results.push({
            id: `${key}-${animal.id}-${idx}`,
            animalId: animal.id,
            animalName: animal.nom || 'Animal',
            label: item[nameKey] || '',
            date: item.date || item.rappel || item.prochaine || '',
            typeLabel: label,
            typeColor: color,
            typeBg: bg,
            screen,
          });
        }
      });
    });
  });

  return results.slice(0, 50);
}

export default function SearchModal() {
  const { open, setOpen } = useSearch();
  const { animals, setSelectedAnimal } = useAnimals();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo(() => buildResults(animals, query), [animals, query]);

  const handleClose = useCallback(() => {
    setQuery('');
    setOpen(false);
  }, [setOpen]);

  const handlePress = useCallback((item) => {
    setSelectedAnimal(item.animalId);
    handleClose();
    if (item.screen === 'DossierMain') {
      navigation.navigate('Dossier');
    } else {
      navigation.navigate('Dossier', { screen: item.screen });
    }
  }, [navigation, setSelectedAnimal, handleClose]);

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Vaccins, médicaments, rendez-vous…"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {query.trim().length === 0 ? (
          <View style={styles.hint}>
            <Text style={styles.hintIcon}>🐾</Text>
            <Text style={styles.hintTitle}>Recherche globale</Text>
            <Text style={styles.hintSub}>
              Cherchez dans tous vos dossiers : vaccins, médicaments, chirurgies, rendez-vous, observations…
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.hint}>
            <Text style={styles.hintIcon}>🔎</Text>
            <Text style={styles.hintTitle}>Aucun résultat</Text>
            <Text style={styles.hintSub}>Aucun résultat pour « {query} »</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.result} onPress={() => handlePress(item)} activeOpacity={0.7}>
                <View style={[styles.badge, { backgroundColor: item.typeBg }]}>
                  <Text style={[styles.badgeText, { color: item.typeColor }]}>{item.typeLabel}</Text>
                </View>
                <View style={styles.resultBody}>
                  <Text style={styles.resultAnimal}>{item.animalName}</Text>
                  <Text style={styles.resultLabel} numberOfLines={1}>{item.label}</Text>
                </View>
                {item.date ? <Text style={styles.resultDate}>{item.date}</Text> : null}
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 18 },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: 44,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '700',
  },
  hint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hintIcon: { fontSize: 52, marginBottom: spacing.md },
  hintTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  hintSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  list: { paddingVertical: spacing.xs },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 12 + spacing.sm },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  resultBody: { flex: 1 },
  resultAnimal: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  resultLabel: { fontSize: 14, color: colors.text },
  resultDate: { fontSize: 11, color: colors.textMuted, flexShrink: 0 },
  arrow: { fontSize: 20, color: colors.textMuted, marginLeft: 2 },
});
