import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, ScreenTitle, Card, Button, Field, Input, Select, IconButton, ModalSheet } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';
import { ESPECES, EMOJIS_ESPECE } from '../../constants';
import { getReminders } from '../../utils/reminders';

const emptyAnimal = { nom: '', espece: '', dateNaissance: '', sexe: '', race: '', sterilise: false, identifiant: '' };

export default function AccueilScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, saveAnimal, deleteAnimal } = useAnimals();
  const { reminderSettings } = useAuth();
  const navigation = useNavigation();
  const [showAdd, setShowAdd] = useState(false);
  const [newAnimal, setNewAnimal] = useState(emptyAnimal);
  const [editingAnimal, setEditingAnimal] = useState(null);

  const reminders = getReminders(animals, reminderSettings);

  const handleAddAnimal = async () => {
    if (newAnimal.nom && newAnimal.espece) {
      await saveAnimal({ ...newAnimal, vaccins: [], aliments: [], medicaments: [], observations: [], poids: [], budget: [], veterinaire: null, partages: [] });
      setNewAnimal(emptyAnimal);
      setShowAdd(false);
    }
  };

  const handleEditAnimal = async () => {
    if (editingAnimal && editingAnimal.nom && editingAnimal.espece) {
      await saveAnimal(editingAnimal);
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

      {animals.map((animal) => (
        <TouchableOpacity
          key={animal.id}
          activeOpacity={0.8}
          onPress={() => { setSelectedAnimal(animal.id); navigation.navigate('Sante'); }}
        >
          <Card selected={selectedAnimal === animal.id}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.animalName}>
                  {EMOJIS_ESPECE[animal.espece] || '🐾'} {animal.nom}
                </Text>
                <Text style={styles.animalMeta}>{animal.espece}</Text>
                {animal.race ? <Text style={styles.animalMeta}>Race: {animal.race}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <IconButton title="✏️" color={colors.blue} bg={colors.blueLight} onPress={() => setEditingAnimal({ ...animal })} />
                <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => confirmDelete(animal)} />
              </View>
            </View>

            {animal.sexe ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>Sexe: <Text style={styles.infoBold}>{animal.sexe === 'male' ? '♂️ Mâle' : '♀️ Femelle'}</Text></Text>
                <Text style={styles.infoText}>Stérilisé: <Text style={styles.infoBold}>{animal.sterilise ? '✅ Oui' : '❌ Non'}</Text></Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.greenLight }]}>
                <Text style={styles.statLabel}>💉 Vaccins</Text>
                <Text style={styles.statValue}>{(animal.vaccins || []).length}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.greenLighter }]}>
                <Text style={styles.statLabel}>💊 Médicaments</Text>
                <Text style={styles.statValue}>{(animal.medicaments || []).length}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.yellowLight }]}>
                <Text style={styles.statLabel}>💰 Budget</Text>
                <Text style={[styles.statValue, { color: colors.yellow }]}>
                  {(animal.budget || []).reduce((s, b) => s + b.montant, 0).toFixed(0)}€
                </Text>
              </View>
            </View>

            {animal.identifiant ? (
              <View style={styles.identifiantRow}>
                <Text style={styles.identifiantText}>
                  🩺 ID vétérinaire: <Text style={styles.infoBold}>{animal.identifiant}</Text>
                </Text>
              </View>
            ) : null}
          </Card>
        </TouchableOpacity>
      ))}

      <Button title="➕ Ajouter un animal" onPress={() => setShowAdd(true)} />

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
  return (
    <>
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
        <Input value={animal.dateNaissance || ''} onChangeText={(v) => setAnimal({ ...animal, dateNaissance: v })} placeholder="AAAA-MM-JJ" />
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  animalName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  animalMeta: {
    color: colors.textLight,
    fontSize: 14,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: 12,
    color: colors.textLight,
  },
  infoBold: {
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textLight,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  identifiantRow: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  identifiantText: {
    fontSize: 12,
    color: colors.textLight,
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
