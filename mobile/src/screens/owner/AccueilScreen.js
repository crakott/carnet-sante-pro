import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, ScreenTitle, Card, Button, Field, Input, Select, ModalSheet, Avatar, ListGroup, ListRow } from '../../components/ui';
import AdBanner from '../../components/AdBanner';
import { useAnimals } from '../../context/AnimalsContext';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';
import { ESPECES, EMOJIS_ESPECE } from '../../constants';
import { getReminders } from '../../utils/reminders';
import { computeAge, isoToDisplay, displayToIso, formatDateInput } from '../../utils/dates';

const emptyAnimal = { nom: '', espece: '', dateNaissance: '', sexe: '', race: '', sterilise: false, identifiant: '', photo: '' };

export default function AccueilScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, saveAnimal, deleteAnimal } = useAnimals();
  const { reminderSettings } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [showAdd, setShowAdd] = useState(false);
  const [newAnimal, setNewAnimal] = useState(emptyAnimal);
  const [editingAnimal, setEditingAnimal] = useState(null);

  // Open add modal when triggered by the FAB in the bottom tab bar
  const lastOpenAdd = useRef(null);
  useEffect(() => {
    const ts = route.params?.openAdd;
    if (ts && ts !== lastOpenAdd.current) {
      lastOpenAdd.current = ts;
      setShowAdd(true);
    }
  }, [route.params?.openAdd]);

  const reminders = getReminders(animals, reminderSettings);

  const handleAddAnimal = async () => {
    if (newAnimal.nom && newAnimal.espece) {
      await saveAnimal({ ...newAnimal, dateNaissance: displayToIso(newAnimal.dateNaissance), vaccins: [], aliments: [], medicaments: [], observations: [], poids: [], budget: [], veterinaire: null, partages: [] });
      setNewAnimal(emptyAnimal);
      setShowAdd(false);
    }
  };

  const handleEditAnimal = async () => {
    if (editingAnimal && editingAnimal.nom && editingAnimal.espece) {
      await saveAnimal({ ...editingAnimal, dateNaissance: displayToIso(editingAnimal.dateNaissance) });
      setEditingAnimal(null);
    }
  };

  const confirmDelete = (animal) => {
    Alert.alert('Supprimer', `Supprimer ${animal.nom} et tout son dossier ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteAnimal(animal.id) },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle>Mes animaux ({animals.length})</ScreenTitle>

      {reminders.length > 0 && (
        <Card style={styles.reminderBanner}>
          <Text style={styles.reminderTitle}>⚠️ À faire urgemment ({reminders.length})</Text>
          {reminders.slice(0, 3).map((r, i) => (
            <Text key={i} style={styles.reminderItem}>
              {r.nom} ({r.animal}) — {r.daysUntil} jours restants{r.urgent ? ' · URGENT' : ''}
            </Text>
          ))}
          <TouchableOpacity onPress={() => navigation.navigate('Rappels')}>
            <Text style={styles.reminderLink}>Voir tous les rappels →</Text>
          </TouchableOpacity>
        </Card>
      )}

      {animals.length > 0 && (
        <ListGroup>
          {animals.map((animal, i) => {
            const age = computeAge(animal.dateNaissance);
            const subtitle = [animal.race, age].filter(Boolean).join(' — ');
            const animalReminders = reminders.filter((r) => r.animal === animal.nom);
            const pill = animalReminders.length > 0
              ? { text: `${animalReminders.length} rappel${animalReminders.length > 1 ? 's' : ''}`, bg: colors.redLight, color: colors.pillRedText }
              : { text: 'À jour', bg: colors.pillGreenBg, color: colors.pillGreenText };
            return (
              <ListRow
                key={animal.id}
                last={i === animals.length - 1}
                left={<Avatar animal={animal} size={44} />}
                title={animal.nom}
                subtitle={subtitle}
                pill={pill}
                onPress={() => { setSelectedAnimal(animal.id); navigation.navigate('Dossier'); }}
                actions={
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => setEditingAnimal({ ...animal, dateNaissance: isoToDisplay(animal.dateNaissance) })} style={styles.btnEdit}>
                      <Text style={styles.btnEditText}>✏️ Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(animal)} style={styles.btnDelete}>
                      <Text style={styles.btnDeleteText}>🗑️ Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            );
          })}
        </ListGroup>
      )}

      <Button title="➕ Ajouter un animal" onPress={() => setShowAdd(true)} />

      <AdBanner />

      <ModalSheet visible={showAdd} onClose={() => setShowAdd(false)}>
        <Text style={styles.modalTitle}>Ajouter un animal</Text>
        <AnimalForm animal={newAnimal} setAnimal={setNewAnimal} />
        <View style={styles.modalActions}>
          <Button title="➕ Ajouter" onPress={handleAddAnimal} style={{ flex: 1 }} />
          <Button title="Annuler" onPress={() => setShowAdd(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
        </View>
      </ModalSheet>

      <ModalSheet visible={!!editingAnimal} onClose={() => setEditingAnimal(null)}>
        {editingAnimal ? (
          <>
            <Text style={styles.modalTitle}>✏️ Modifier {editingAnimal.nom}</Text>
            <AnimalForm animal={editingAnimal} setAnimal={setEditingAnimal} />
            <View style={styles.modalActions}>
              <Button title="✅ Enregistrer" onPress={handleEditAnimal} style={{ flex: 1 }} />
              <Button title="Annuler" onPress={() => setEditingAnimal(null)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
            </View>
          </>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}

function AnimalForm({ animal, setAnimal }) {
  const [photoError, setPhotoError] = useState('');

  const pickPhoto = async () => {
    setPhotoError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setPhotoError("Permission d'accès aux photos refusée."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setAnimal({ ...animal, photo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  return (
    <>
      <Field label="📷 Photo (optionnel)">
        <View style={styles.photoRow}>
          <Avatar animal={animal} size={48} />
          <Button title={animal.photo ? 'Changer la photo' : 'Choisir une photo'} onPress={pickPhoto} color={colors.blueLight} textColor={colors.blue} style={{ flex: 1 }} />
          {animal.photo ? (
              <TouchableOpacity onPress={() => setAnimal({ ...animal, photo: '' })} style={{ padding: 8, borderRadius: 6, backgroundColor: colors.redLight }}>
                <Text style={{ color: colors.red, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            ) : null}
        </View>
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
      </Field>
      <Field label="Nom">
        <Input value={animal.nom} onChangeText={(v) => setAnimal({ ...animal, nom: v })} placeholder="Nom" />
      </Field>
      <Field label="Espèce">
        <Select
          selectedValue={animal.espece}
          onValueChange={(v) => setAnimal({ ...animal, espece: v })}
          placeholder="Espèce"
          items={ESPECES.map((e) => ({ label: `${EMOJIS_ESPECE[e]} ${e}`, value: e }))}
        />
      </Field>
      <Field label="Race (optionnel)">
        <Input value={animal.race || ''} onChangeText={(v) => setAnimal({ ...animal, race: v })} placeholder="Race" />
      </Field>
      <Field label="Sexe">
        <Select
          selectedValue={animal.sexe || ''}
          onValueChange={(v) => setAnimal({ ...animal, sexe: v })}
          placeholder="Sexe"
          items={[{ label: '♂️ Mâle', value: 'male' }, { label: '♀️ Femelle', value: 'femelle' }]}
        />
      </Field>
      <Field label="Date de naissance">
        <Input
          value={animal.dateNaissance || ''}
          onChangeText={(v) => setAnimal({ ...animal, dateNaissance: formatDateInput(v) })}
          placeholder="JJ/MM/AAAA"
          keyboardType="numeric"
          maxLength={10}
        />
      </Field>
      <TouchableOpacity style={styles.checkboxRow} onPress={() => setAnimal({ ...animal, sterilise: !animal.sterilise })} activeOpacity={0.7}>
        <View style={[styles.checkbox, animal.sterilise ? styles.checkboxChecked : null]}>
          {animal.sterilise ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxLabel}>Stérilisé/Castré</Text>
      </TouchableOpacity>
      <Field label="Identifiant vétérinaire (puce électronique, optionnel)">
        <Input value={animal.identifiant || ''} onChangeText={(v) => setAnimal({ ...animal, identifiant: v })} placeholder="Identifiant" />
      </Field>
    </>
  );
}

const styles = StyleSheet.create({
  reminderBanner: {
    backgroundColor: colors.yellowLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.yellow,
  },
  reminderTitle: {
    color: '#d97706',
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  reminderItem: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  reminderLink: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
    marginTop: spacing.xs,
  },
  cardActions: {
    flexDirection: 'column',
    gap: 4,
  },
  btnEdit: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.blueLight,
  },
  btnEditText: { color: colors.blue, fontSize: 11, fontWeight: '600' },
  btnDelete: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.redLight,
  },
  btnDeleteText: { color: colors.red, fontSize: 11, fontWeight: '600' },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: colors.white,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
});
