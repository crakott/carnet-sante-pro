import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Screen, EmptyState, Card, Button, Field, Input, Select, IconButton, Row } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import { useAnimals } from '../../context/AnimalsContext';
import { colors, spacing } from '../../theme';

const UNITES = ['g', 'kg', 'ml', 'L'].map((u) => ({ label: u, value: u }));
const emptyForm = { nom: '', quantite: '', unite: 'g', horaire: '12:00' };

export default function AlimentScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem } = useAnimals();
  const animal = animals.find((a) => a.id === selectedAnimal);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    const parts = (a.quantite || '').split(' ');
    setForm({
      nom: a.nom,
      quantite: parts[0] || '',
      unite: parts[1] || 'g',
      horaire: a.horaire || '12:00',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.nom || !form.quantite) return;
    const payload = { nom: form.nom, quantite: `${form.quantite} ${form.unite}`, horaire: form.horaire };
    if (editingId) {
      updateAnimalItem(animal, 'aliments', editingId, payload);
    } else {
      addAnimalItem(animal, 'aliments', payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  if (animals.length === 0) {
    return <Screen><EmptyState>Aucun animal enregistré</EmptyState></Screen>;
  }

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
            <Button title="➕ Ajouter un aliment" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
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
              <Text style={styles.empty}>Aucun aliment</Text>
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
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: '#1f2937' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemTitle: { fontWeight: '600', color: '#1f2937' },
  itemMeta: { color: '#6b7280', fontSize: 14, marginTop: 2 },
  empty: { color: '#9ca3af' },
});
