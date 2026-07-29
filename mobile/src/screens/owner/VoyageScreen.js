import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, spacing, radius } from '../../theme';
import { Screen, Button, Field, Input, EmptyState } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { computeAge } from '../../utils/dates';

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

function buildVoyageHtml(animal, dest, checklist, completed, notes) {
  const destName = { france: 'France', europe: 'Europe', international: 'International' }[dest] || dest;
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalDone = checklist.filter((_, i) => completed.has(i)).length;
  const rows = checklist.map((item, i) => {
    const checked = completed.has(i);
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="padding:8px 12px;font-size:15px;text-align:center;">${checked ? '✅' : '☐'}</td>
      <td style="padding:8px 12px;font-size:13px;color:${checked ? '#9ca3af' : '#1f2937'};${checked ? 'text-decoration:line-through;' : ''}">${item.label}</td>
      <td style="padding:8px 12px;text-align:center;">${item.requis ? '<span style="background:#fee2e2;color:#dc2626;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;">REQUIS</span>' : ''}</td>
    </tr>`;
  }).join('');
  const safeNotes = notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1f2937;max-width:680px;margin:0 auto}
  h1{color:#059669;font-size:22px;margin:0 0 4px}
  .meta{color:#6b7280;font-size:11px;margin-bottom:20px}
  .card{background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:14px;margin-bottom:20px}
  .name{font-size:18px;font-weight:700;color:#059669}
  .sub{color:#6b7280;font-size:13px;margin-top:2px}
  .dest{display:inline-block;background:#10b981;color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;margin-top:6px}
  .prog{color:#6b7280;font-size:12px;margin-top:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
  th{background:#059669;color:#fff;padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .notes{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:20px}
  .nt{font-weight:700;color:#1f2937;margin-bottom:8px;font-size:14px}
  .nb{color:#374151;line-height:1.6;white-space:pre-wrap;font-size:13px}
  .footer{border-top:1px solid #e5e7eb;padding-top:12px;color:#9ca3af;font-size:10px;text-align:center}
</style></head><body>
<h1>✈️ Fiche Voyage</h1>
<div class="meta">Générée le ${today} · Carnet Santé PRO</div>
<div class="card">
  <div class="name">${animal.nom || 'Animal'}</div>
  ${animal.espece ? `<div class="sub">${animal.espece}${animal.race ? ` · ${animal.race}` : ''}</div>` : ''}
  <div class="dest">${destName}</div>
  <div class="prog">${totalDone}/${checklist.length} éléments complétés</div>
</div>
<table>
  <thead><tr><th style="width:40px;text-align:center;"></th><th>Élément de la checklist</th><th style="width:80px;text-align:center;">Requis</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
${safeNotes.trim() ? `<div class="notes"><div class="nt">📝 Notes de voyage</div><div class="nb">${safeNotes}</div></div>` : ''}
<div class="footer">Carnet Santé PRO — Fiche voyage de ${animal.nom || "l'animal"}</div>
</body></html>`;
}

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

  const handleShareVoyage = async () => {
    if (!animal) return;
    try {
      const html = buildVoyageHtml(animal, selectedDest, checklist, completed, notes);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Fiche voyage — ${animal.nom}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer la fiche voyage.');
    }
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
                {a.photo ? (
                  <Image source={{ uri: a.photo }} style={styles.animalPillPhoto} />
                ) : (
                  <View style={[styles.animalPillPhoto, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : '#d1fae5', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 11, color: isSelected ? '#fff' : colors.primary }}>{a.espece?.[0] || '🐾'}</Text>
                  </View>
                )}
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
          {/* Animal card */}
          <View style={styles.animalCard}>
            {animal.photo ? (
              <Image source={{ uri: animal.photo }} style={styles.animalCardPhoto} />
            ) : (
              <View style={[styles.animalCardPhoto, styles.animalCardPhotoFallback]}>
                <Text style={{ fontSize: 28, color: '#fff' }}>{animal.espece?.[0] || '🐾'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.animalCardName}>{animal.nom}</Text>
              {computeAge(animal.dateNaissance) ? (
                <Text style={styles.animalCardAge}>{computeAge(animal.dateNaissance)}</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.sectionTitle}>✈️ Fiche voyage</Text>

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

          {/* Share / Print */}
          <Button
            title="🖨️ Partager / Imprimer la fiche"
            onPress={handleShareVoyage}
            style={styles.shareBtn}
          />

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
  animalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  animalCardPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  animalCardPhotoFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  animalCardAge: {
    fontSize: 14,
    color: colors.textLight,
  },
  animalPickerRow: {
    marginBottom: spacing.lg,
  },
  animalPickerContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  animalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
  },
  animalPillPhoto: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
  shareBtn: {
    marginBottom: spacing.lg,
    backgroundColor: '#0369a1',
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
