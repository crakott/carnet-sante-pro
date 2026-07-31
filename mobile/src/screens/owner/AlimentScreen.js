import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Screen, EmptyState, Card, Button, Field, Input, Select, IconButton, Row } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import { useAnimals } from '../../context/AnimalsContext';
import { colors, spacing } from '../../theme';

const TYPES_ALIMENT = [
  { label: 'Croquettes', value: 'Croquettes' },
  { label: 'Pâtée', value: 'Pâtée' },
  { label: 'BARF (cru)', value: 'BARF' },
  { label: 'Mixte', value: 'Mixte' },
  { label: 'Fait maison', value: 'Fait maison' },
  { label: 'Autre', value: 'Autre' },
];
const UNITES = ['g', 'kg', 'ml', 'L'].map((u) => ({ label: u, value: u }));

const emptyProfil = { type: '', marque: '', portions: '', frequence: '', allergies: '', complements: '' };
const emptyForm = { nom: '', quantite: '', unite: 'g', horaire: '12:00' };

export default function AlimentScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem, updateAnimalFields } = useAnimals();
  const animal = animals.find((a) => a.id === selectedAnimal);

  const [showProfilForm, setShowProfilForm] = useState(false);
  const [profil, setProfil] = useState(emptyProfil);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setProfil(animal?.alimentationProfil ? { ...emptyProfil, ...animal.alimentationProfil } : emptyProfil);
    setShowProfilForm(false);
  }, [animal?.id]);

  const setProfKey = (key, val) => setProfil((p) => ({ ...p, [key]: val }));
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSaveProfil = () => {
    updateAnimalFields(animal, { alimentationProfil: profil });
    setShowProfilForm(false);
  };

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (a) => {
    setEditingId(a.id);
    const parts = (a.quantite || '').split(' ');
    setForm({ nom: a.nom, quantite: parts[0] || '', unite: parts[1] || 'g', horaire: a.horaire || '12:00' });
    setShowForm(true);
  };
  const handleSave = () => {
    if (!form.nom || !form.quantite) return;
    const payload = { nom: form.nom, quantite: `${form.quantite} ${form.unite}`, horaire: form.horaire };
    if (editingId) updateAnimalItem(animal, 'aliments', editingId, payload);
    else addAnimalItem(animal, 'aliments', payload);
    setForm(emptyForm); setEditingId(null); setShowForm(false);
  };

  if (animals.length === 0) return <Screen><EmptyState>Aucun animal enregistré</EmptyState></Screen>;

  const hasProfilData = profil.type || profil.marque || profil.portions || profil.frequence || profil.allergies || profil.complements;

  return (
    <Screen>
      {animal && (
        <View style={styles.animalHeader}>
          {animal.photo ? (
            <Image source={{ uri: animal.photo }} style={styles.animalPhoto} />
          ) : (
            <View style={[styles.animalPhoto, styles.animalPhotoFallback]}>
              <Text style={{ color: '#fff', fontSize: 18 }}>{animal.espece?.[0] || '🐾'}</Text>
            </View>
          )}
          <Text style={styles.animalName}>{animal.nom || 'Animal'}</Text>
        </View>
      )}
      <AnimalPicker animals={animals} selectedAnimal={selectedAnimal} onSelect={setSelectedAnimal} />

      {!animal ? (
        <EmptyState>Sélectionnez un animal</EmptyState>
      ) : (
        <View>
          <Text style={styles.title}>🍎 Alimentation de {animal.nom}</Text>

          {/* ── Profil alimentaire ─────────────────────────────────────── */}
          <Card style={styles.profilCard}>
            <View style={styles.profilHeader}>
              <Text style={styles.profilTitle}>🍽️ Profil alimentaire</Text>
              <Button
                title={showProfilForm ? 'Annuler' : (hasProfilData ? '✏️ Modifier' : '➕ Renseigner')}
                onPress={() => setShowProfilForm((v) => !v)}
                color={showProfilForm ? colors.border : colors.yellow}
                textColor={showProfilForm ? colors.text : '#92400e'}
                style={styles.profilEditBtn}
              />
            </View>

            {!showProfilForm && hasProfilData && (
              <View style={styles.profilSummary}>
                {profil.type ? <View style={styles.profilChip}><Text style={styles.profilChipText}>{profil.type}</Text></View> : null}
                {profil.marque ? <Text style={styles.profilLine}>🏷️ {profil.marque}</Text> : null}
                {profil.portions ? <Text style={styles.profilLine}>⚖️ {profil.portions}</Text> : null}
                {profil.frequence ? <Text style={styles.profilLine}>🕐 {profil.frequence}</Text> : null}
                {profil.complements ? <Text style={styles.profilLine}>💊 {profil.complements}</Text> : null}
                {profil.allergies ? (
                  <View style={styles.allergyRow}>
                    <Text style={styles.allergyLabel}>⚠️ Allergies :</Text>
                    <Text style={styles.allergyText}>{profil.allergies}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {!showProfilForm && !hasProfilData && (
              <Text style={styles.profilEmpty}>Type, marque, portions, fréquence, allergies…</Text>
            )}

            {showProfilForm && (
              <View style={{ marginTop: spacing.sm }}>
                <Field label="Type d'alimentation">
                  <Select
                    selectedValue={profil.type}
                    onValueChange={(v) => setProfKey('type', v)}
                    items={TYPES_ALIMENT}
                    placeholder="Sélectionner…"
                  />
                </Field>
                <Field label="Marque">
                  <Input value={profil.marque} onChangeText={(v) => setProfKey('marque', v)} placeholder="ex : Royal Canin, Orijen…" />
                </Field>
                <Row style={{ gap: spacing.sm }}>
                  <Field label="Portions" style={{ flex: 1 }}>
                    <Input value={profil.portions} onChangeText={(v) => setProfKey('portions', v)} placeholder="ex : 80g par repas" />
                  </Field>
                  <Field label="Fréquence" style={{ flex: 1 }}>
                    <Input value={profil.frequence} onChangeText={(v) => setProfKey('frequence', v)} placeholder="ex : 2 fois/jour" />
                  </Field>
                </Row>
                <Field label="⚠️ Allergies / intolérances">
                  <Input
                    value={profil.allergies}
                    onChangeText={(v) => setProfKey('allergies', v)}
                    placeholder="ex : Poulet, Blé, Lactose…"
                  />
                </Field>
                <Field label="Compléments / suppléments">
                  <Input value={profil.complements} onChangeText={(v) => setProfKey('complements', v)} placeholder="ex : Oméga 3, Probiotiques…" />
                </Field>
                <Button title="💾 Enregistrer le profil" onPress={handleSaveProfil} color={colors.yellow} />
              </View>
            )}
          </Card>

          {/* ── Repas ──────────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>🍖 Repas planifiés</Text>

          {showForm ? (
            <Card style={{ borderWidth: 2, borderColor: colors.yellow }}>
              <Field label="Nom de l'aliment">
                <Input value={form.nom} onChangeText={(v) => set('nom', v)} placeholder="Nom de l'aliment" />
              </Field>
              <Row style={{ gap: spacing.sm }}>
                <Field label="Quantité" hint=" " style={{ flex: 1 }}>
                  <Input value={form.quantite} onChangeText={(v) => set('quantite', v)} placeholder="Quantité" keyboardType="numeric" />
                </Field>
                <View style={{ width: 90 }}>
                  <Field label="Unité" hint=" ">
                    <Select selectedValue={form.unite} onValueChange={(v) => set('unite', v)} items={UNITES} />
                  </Field>
                </View>
              </Row>
              <Field label="Horaire">
                <Input value={form.horaire} onChangeText={(v) => set('horaire', v)} placeholder="HH:MM" />
              </Field>
              <Row style={{ gap: spacing.sm }}>
                <Button title={editingId ? '✏️ Modifier' : '➕ Ajouter'} onPress={handleSave} color={colors.yellow} style={{ flex: 1 }} />
                <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
              </Row>
            </Card>
          ) : (
            <Button title="➕ Ajouter un repas" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
          )}

          <Card>
            {animal.aliments && animal.aliments.length > 0 ? (
              animal.aliments.map((a, i) => (
                <View key={a.id || i} style={styles.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{a.nom}</Text>
                    <Text style={styles.itemMeta}>{a.quantite} • {a.horaire}</Text>
                  </View>
                  {a.id ? (
                    <Row style={{ gap: 4 }}>
                      <IconButton title="✏️" color={colors.yellow} bg="#fef9c3" onPress={() => openEdit(a)} />
                      <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'aliments', a.id)} />
                    </Row>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Aucun repas planifié</Text>
            )}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  animalHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#d1fae5' },
  animalPhoto: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  animalPhotoFallback: { backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  animalName: { fontWeight: '700', fontSize: 16, color: '#064e3b' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.md, color: '#1f2937' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, marginTop: spacing.md },
  profilCard: { marginBottom: spacing.md },
  profilHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profilTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  profilEditBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  profilSummary: { marginTop: spacing.sm, gap: 4 },
  profilChip: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 2 },
  profilChipText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  profilLine: { fontSize: 13, color: '#374151' },
  profilEmpty: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  allergyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  allergyLabel: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  allergyText: { fontSize: 12, color: '#7f1d1d', flex: 1 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  itemTitle: { fontWeight: '600', color: '#1f2937' },
  itemMeta: { color: '#6b7280', fontSize: 14, marginTop: 2 },
  empty: { color: '#9ca3af' },
});
