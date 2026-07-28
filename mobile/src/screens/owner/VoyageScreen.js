import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Screen, Button, Field, Input, EmptyState } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';

const CHECKLISTS = {
  france: [
    { label: 'Carnet de santé / carnet vaccinal', requis: true },
    { label: 'Puce électronique (identification)', requis: true },
    { label: 'Médicaments en cours avec ordonnance', requis: false },
    { label: 'Vaccin rage à jour', requis: false },
    { label: 'Antiparasitaire récent (puces/tiques)', requis: false },
    { label: 'Gamelles eau et nourriture', requis: false },
    { label: 'Litière / coussin / cage de transport', requis: false },
    { label: 'Jouets et accessoires familiers', requis: false },
    { label: 'Numéro vétérinaire de garde', requis: false },
  ],
  europe: [
    { label: 'Passeport européen pour animaux de compagnie', requis: true },
    { label: 'Puce électronique ISO 11784/11785', requis: true },
    { label: 'Vaccin antirabique à jour', requis: true },
    { label: 'Traitement antiparasitaire certifié', requis: false },
    { label: 'Médicaments avec ordonnance (traduite)', requis: false },
    { label: 'Assurance santé voyage', requis: false },
    { label: "Photo récente de l'animal", requis: false },
    { label: 'Coordonnées vétérinaire sur place', requis: false },
    { label: 'Carnet de santé international', requis: false },
    { label: "Numéro d'urgence européen : 112", requis: false },
  ],
  international: [
    { label: 'Certificat sanitaire officiel', requis: true },
    { label: 'Puce électronique', requis: true },
    { label: 'Vaccin antirabique + attestation officielle', requis: true },
    { label: 'Test sérologique antirabique (selon pays)', requis: true },
    { label: 'Passeport international pour animaux', requis: false },
    { label: 'Quarantaine à prévoir (vérifier)', requis: false },
    { label: 'Assurance voyage internationale', requis: false },
    { label: 'Ordonnances en anglais', requis: false },
    { label: 'Coordonnées vétérinaire local', requis: false },
    { label: 'Réglementation pays de destination vérifiée', requis: false },
    { label: "Délai d'entrée respecté (certains pays = 6 mois)", requis: false },
  ],
};

const DEST_LABELS = {
  france: '🇫🇷 France',
  europe: '🇪🇺 Europe',
  international: '🌍 International',
};

const DEST_KEYS = ['france', 'europe', 'international'];

export default function VoyageScreen() {
  const { animals, selectedAnimal, updateAnimalFields } = useAnimals();

  const [selectedId, setSelectedId] = useState(selectedAnimal);
  const [selectedDest, setSelectedDest] = useState('france');
  const [completed, setCompleted] = useState(new Set());
  const [notes, setNotes] = useState('');

  // Keep notes in a ref so autosave callbacks always read the latest value
  const notesRef = useRef('');
  notesRef.current = notes;

  useEffect(() => {
    if (!selectedId && animals.length > 0) {
      setSelectedId(animals[0].id);
    }
  }, [animals, selectedId]);

  // Load checklist state from animal data whenever animal or destination changes
  useEffect(() => {
    if (!selectedId) return;
    const animal = animals.find(a => a.id === selectedId);
    if (!animal) return;
    const data = animal.voyage?.[selectedDest] || {};
    setCompleted(new Set(data.completed || []));
    setNotes(data.notes || '');
  }, [selectedId, selectedDest, animals]);

  const animal = animals.find(a => a.id === selectedId) || null;
  const checklist = CHECKLISTS[selectedDest];

  const totalCompleted = checklist.filter((_, i) => completed.has(i)).length;
  const progress = checklist.length > 0 ? totalCompleted / checklist.length : 0;
  const requiredIndices = checklist.reduce((acc, item, i) => (item.requis ? [...acc, i] : acc), []);
  const allRequiredDone = requiredIndices.length > 0 && requiredIndices.every(i => completed.has(i));

  const buildVoyageUpdate = (nextCompleted, currentNotes) => ({
    ...(animal?.voyage || {}),
    [selectedDest]: {
      ...(animal?.voyage?.[selectedDest] || {}),
      completed: Array.from(nextCompleted),
      notes: currentNotes,
    },
  });

  const toggleItem = (index) => {
    if (!animal) return;
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      updateAnimalFields(animal, { voyage: buildVoyageUpdate(next, notesRef.current) });
      return next;
    });
  };

  const saveNotes = () => {
    if (!animal) return;
    updateAnimalFields(animal, { voyage: buildVoyageUpdate(completed, notes) });
  };

  return (
    <Screen>
      <Text style={styles.title}>✈️ Voyage</Text>

      {/* Animal picker */}
      {animals.length === 0 ? (
        <EmptyState>Aucun animal enregistré.</EmptyState>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.animalPickerRow}
          contentContainerStyle={styles.animalPickerContent}
        >
          {animals.map(a => {
            const isSelected = a.id === selectedId;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedId(a.id)}
                activeOpacity={0.7}
                style={[styles.animalPill, isSelected && styles.animalPillSelected]}
              >
                <Text style={[styles.animalPillText, isSelected && styles.animalPillTextSelected]}>
                  {a.nom || 'Animal'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {animal && (
        <>
          <Text style={styles.sectionTitle}>✈️ Fiche voyage — {animal.nom}</Text>

          {/* Destination segmented control */}
          <View style={styles.destTabs}>
            {DEST_KEYS.map(dest => (
              <TouchableOpacity
                key={dest}
                onPress={() => setSelectedDest(dest)}
                activeOpacity={0.7}
                style={[styles.destTab, selectedDest === dest && styles.destTabActive]}
              >
                <Text style={[styles.destTabText, selectedDest === dest && styles.destTabTextActive]}>
                  {DEST_LABELS[dest]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {totalCompleted}/{checklist.length} — {Math.round(progress * 100)}%
            </Text>
          </View>

          {/* Success banner */}
          {allRequiredDone && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>🎉 Documents obligatoires complétés !</Text>
            </View>
          )}

          {/* Checklist */}
          <View style={styles.checklist}>
            {checklist.map((item, index) => {
              const isChecked = completed.has(index);
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleItem(index)}
                  activeOpacity={0.7}
                  style={[
                    styles.checkItem,
                    index === checklist.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text
                    style={[styles.checkLabel, isChecked && styles.checkLabelChecked]}
                    numberOfLines={3}
                  >
                    {item.label}
                  </Text>
                  {item.requis && (
                    <View style={styles.resuisBadge}>
                      <Text style={styles.resuisBadgeText}>REQUIS</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notes */}
          <Text style={styles.notesTitle}>📝 Notes de voyage</Text>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Informations utiles, adresses, consignes spéciales…"
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            textAlignVertical="top"
          />
          <Button
            title="💾 Enregistrer les notes"
            onPress={saveNotes}
            style={styles.saveBtn}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  animalPickerRow: {
    marginBottom: spacing.lg,
  },
  animalPickerContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  animalPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
  },
  animalPillSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.greenLighter,
  },
  animalPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  animalPillTextSelected: {
    color: colors.primaryDark,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  destTabs: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  destTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  destTabActive: {
    backgroundColor: colors.primary,
  },
  destTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  destTabTextActive: {
    color: colors.white,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600',
    textAlign: 'right',
  },
  successBanner: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  successBannerText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
  checklist: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  checkLabelChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  resuisBadge: {
    backgroundColor: colors.redLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    flexShrink: 0,
  },
  resuisBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.red,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 100,
    marginBottom: spacing.md,
  },
  saveBtn: {
    marginBottom: spacing.md,
  },
});
