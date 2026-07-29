import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, ScrollView } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Screen, Button, Field, Input, EmptyState } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { isoToDisplay, displayToIso, formatDateInput } from '../../utils/dates';

const EMPTY_FORM = {
  compagnie: '',
  numeroContrat: '',
  telephone: '',
  dateDebut: '',
  dateFin: '',
  franchise: '',
  plafond: '',
  notes: '',
};

export default function AssuranceScreen() {
  const { animals, selectedAnimal, updateAnimalFields } = useAnimals();

  const [selectedId, setSelectedId] = useState(selectedAnimal);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedId && animals.length > 0) {
      setSelectedId(animals[0].id);
    }
  }, [animals, selectedId]);

  // Load insurance data from animal when selection changes
  useEffect(() => {
    if (!selectedId) return;
    const animal = animals.find(a => a.id === selectedId);
    if (!animal) return;
    const ins = animal.assurance || {};
    setForm({
      compagnie: ins.compagnie || '',
      numeroContrat: ins.numeroContrat || '',
      telephone: ins.telephone || '',
      dateDebut: ins.dateDebut ? isoToDisplay(ins.dateDebut) : '',
      dateFin: ins.dateFin ? isoToDisplay(ins.dateFin) : '',
      franchise: ins.franchise || '',
      plafond: ins.plafond || '',
      notes: ins.notes || '',
    });
  }, [selectedId, animals]);

  const animal = animals.find(a => a.id === selectedId) || null;

  const set = (field) => (value) => setForm(f => ({ ...f, [field]: value }));

  const renewalWarning = useMemo(() => {
    if (!form.dateFin) return null;
    const finDate = new Date(displayToIso(form.dateFin));
    if (isNaN(finDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    finDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((finDate - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { type: 'expired', message: '❌ Contrat expiré !' };
    if (daysLeft <= 30) return { type: 'warning', message: `⚠️ Renouvellement dans ${daysLeft} jour${daysLeft !== 1 ? 's' : ''} !` };
    return null;
  }, [form.dateFin]);

  const handleSave = async () => {
    if (!animal) return;
    setSaving(true);
    try {
      await updateAnimalFields(animal, { assurance: { ...form, dateDebut: displayToIso(form.dateDebut), dateFin: displayToIso(form.dateFin) } });
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les informations.');
    } finally {
      setSaving(false);
    }
  };

  const callPhone = () => {
    const number = form.telephone.replace(/\s/g, '');
    if (number) Linking.openURL(`tel:${number}`);
  };

  return (
    <Screen>
      <Text style={styles.title}>🛡️ Assurance</Text>

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

      {!animal ? (
        <EmptyState>Sélectionnez un animal pour gérer son assurance.</EmptyState>
      ) : (
        <>
          {renewalWarning && (
            <View style={[
              styles.warningBanner,
              renewalWarning.type === 'expired' ? styles.bannerExpired : styles.bannerWarning,
            ]}>
              <Text style={[
                styles.warningBannerText,
                renewalWarning.type === 'expired' ? styles.bannerTextExpired : styles.bannerTextWarning,
              ]}>
                {renewalWarning.message}
              </Text>
            </View>
          )}

          <View style={styles.formCard}>
            <Field label="Compagnie d'assurance">
              <Input
                value={form.compagnie}
                onChangeText={set('compagnie')}
                placeholder="Ex : Santévet, Agria, Bulle Bleue…"
              />
            </Field>

            <Field label="N° de contrat">
              <Input
                value={form.numeroContrat}
                onChangeText={set('numeroContrat')}
                placeholder="Ex : 123456789"
                autoCapitalize="none"
              />
            </Field>

            <Field label="Téléphone">
              <View style={styles.phoneRow}>
                <Input
                  value={form.telephone}
                  onChangeText={set('telephone')}
                  placeholder="Ex : 01 23 45 67 89"
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
                {form.telephone.length > 0 && (
                  <TouchableOpacity
                    onPress={callPhone}
                    activeOpacity={0.7}
                    style={styles.callBtn}
                  >
                    <Text style={styles.callBtnText}>📞</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Field>

            <Field label="Date de début">
              <Input
                value={form.dateDebut}
                onChangeText={(v) => set('dateDebut')(formatDateInput(v))}
                placeholder="JJ/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
              />
            </Field>

            <Field label="Date de renouvellement">
              <Input
                value={form.dateFin}
                onChangeText={(v) => set('dateFin')(formatDateInput(v))}
                placeholder="JJ/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
              />
            </Field>

            <Field label="Franchise (€)">
              <Input
                value={form.franchise}
                onChangeText={set('franchise')}
                placeholder="Ex : 100"
                keyboardType="numeric"
              />
            </Field>

            <Field label="Plafond annuel (€)">
              <Input
                value={form.plafond}
                onChangeText={set('plafond')}
                placeholder="Ex : 3000"
                keyboardType="numeric"
              />
            </Field>

            <Field label="Notes">
              <Input
                value={form.notes}
                onChangeText={set('notes')}
                placeholder="Garanties couvertes, exclusions, remboursements…"
                multiline
                numberOfLines={3}
                style={styles.notesInput}
                textAlignVertical="top"
              />
            </Field>
          </View>

          <Button
            title={saving ? 'Enregistrement…' : '💾 Enregistrer'}
            onPress={handleSave}
            disabled={saving}
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
  warningBanner: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  bannerWarning: {
    backgroundColor: colors.yellowLight,
    borderColor: colors.yellowBorder,
  },
  bannerExpired: {
    backgroundColor: colors.redLight,
    borderColor: colors.red,
  },
  warningBannerText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  bannerTextWarning: {
    color: colors.brown,
  },
  bannerTextExpired: {
    color: colors.red,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phoneInput: {
    flex: 1,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    flexShrink: 0,
  },
  callBtnText: {
    fontSize: 20,
  },
  notesInput: {
    minHeight: 80,
  },
});
