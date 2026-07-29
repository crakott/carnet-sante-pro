import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, ScreenTitle, Card, Button, Field, Input, Select, ModalSheet, Avatar, ListGroup, ListRow } from '../../components/ui';
import AdBanner from '../../components/AdBanner';
import TutorialOverlay from '../../components/TutorialOverlay';
import SearchModal from '../../components/SearchModal';
import { useAnimals } from '../../context/AnimalsContext';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';
import { ESPECES, EMOJIS_ESPECE } from '../../constants';
import { getReminders } from '../../utils/reminders';
import { computeAge, isoToDisplay, displayToIso, formatDateInput } from '../../utils/dates';

const TUTORIAL_STEPS = [
  {
    icon: '🐾',
    title: 'Ajoutez votre premier animal',
    description: 'Appuyez sur ➕ Ajouter un animal pour créer son profil et commencer son suivi santé.',
    arrow: 'up',
  },
  {
    icon: '📋',
    title: 'Carnet de santé complet',
    description: 'Appuyez sur un animal de la liste pour consulter ses vaccins, médicaments, pesées et ajouter de nouveaux soins.',
    arrow: 'up',
  },
  {
    icon: '🔔',
    title: 'Rappels intelligents',
    description: 'Ne ratez plus aucune échéance ! Activez les rappels pour recevoir des notifications avant chaque vaccin ou traitement.',
    arrow: 'down',
  },
  {
    icon: '🏥',
    title: 'Vétérinaires à proximité',
    description: "L'onglet Vétérinaires vous géolocalise et liste les cliniques les plus proches pour les appeler directement.",
    arrow: 'down',
  },
];

const emptyAnimal = { nom: '', espece: '', dateNaissance: '', sexe: '', race: '', sterilise: false, identifiant: '', photo: '', veterinaire: { nom: '', adresse: '', telephone: '' } };

function VetBlock({ vet, isLast }) {
  const hasPhone = vet?.telephone?.trim();
  const hasAddr = vet?.adresse?.trim();
  return (
    <View style={[styles.vetBlock, !isLast && styles.vetBlockBorder]}>
      <View style={styles.vetRow}>
        <View style={styles.vetInfo}>
          <Text style={styles.vetName}>🏥 {vet.nom}</Text>
          {hasAddr ? <Text style={styles.vetAddr}>📍 {vet.adresse}</Text> : null}
        </View>
        {hasPhone ? (
          <TouchableOpacity
            style={styles.vetCallBtn}
            onPress={() => Linking.openURL(`tel:${vet.telephone.replace(/\s/g, '')}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.vetCallIcon}>📞</Text>
            <Text style={styles.vetCallText}>{vet.telephone}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function AccueilScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, saveAnimal, deleteAnimal } = useAnimals();
  const { reminderSettings } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [showAdd, setShowAdd] = useState(false);
  const [newAnimal, setNewAnimal] = useState(emptyAnimal);
  const [editingAnimal, setEditingAnimal] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [search, setSearch] = useState('');

  const lastOpenAdd = useRef(null);
  useEffect(() => {
    const ts = route.params?.openAdd;
    if (ts && ts !== lastOpenAdd.current) {
      lastOpenAdd.current = ts;
      setShowAdd(true);
    }
  }, [route.params?.openAdd]);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenTutorialAccueil').then((value) => {
      if (value !== 'true') setShowTutorial(true);
    });
  }, []);

  const reminders = getReminders(animals, reminderSettings);
  const q = search.toLowerCase();
  const filteredAnimals = search.trim()
    ? animals.filter((a) =>
        a.nom?.toLowerCase().includes(q) ||
        a.espece?.toLowerCase().includes(q) ||
        a.race?.toLowerCase().includes(q)
      )
    : animals;

  const handleAddAnimal = async () => {
    if (newAnimal.nom && newAnimal.espece) {
      await saveAnimal({ ...newAnimal, dateNaissance: displayToIso(newAnimal.dateNaissance), vaccins: [], aliments: [], medicaments: [], observations: [], poids: [], budget: [], partages: [] });
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
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="🔍 Rechercher un animal…"
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
        />
      )}

      {filteredAnimals.length > 0 && (
        <ListGroup>
          {filteredAnimals.map((animal, i) => {
            const age = computeAge(animal.dateNaissance);
            const subtitle = [animal.race, age].filter(Boolean).join(' — ');
            const animalReminders = reminders.filter((r) => r.animal === animal.nom);
            const pill = animalReminders.length > 0
              ? { text: `${animalReminders.length} rappel${animalReminders.length > 1 ? 's' : ''}`, bg: colors.redLight, color: colors.pillRedText }
              : { text: 'À jour', bg: colors.pillGreenBg, color: colors.pillGreenText };
            const vet = animal.veterinaire;
            const hasVet = vet?.nom?.trim();
            const isLast = i === filteredAnimals.length - 1;
            return (
              <React.Fragment key={animal.id}>
                <ListRow
                  last={!hasVet && isLast}
                  left={<Avatar animal={animal} size={44} />}
                  title={animal.nom}
                  subtitle={subtitle}
                  pill={pill}
                  onPress={() => { setSelectedAnimal(animal.id); navigation.navigate('Dossier'); }}
                  actions={
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => setEditingAnimal({ ...animal, dateNaissance: isoToDisplay(animal.dateNaissance) })} style={styles.btnEdit}>
                        <Text style={styles.btnEditText}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelete(animal)} style={styles.btnDelete}>
                        <Text style={styles.btnDeleteText}>✖</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
                {hasVet && <VetBlock vet={vet} isLast={isLast} />}
              </React.Fragment>
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

      <TutorialOverlay
        steps={TUTORIAL_STEPS}
        storageKey="hasSeenTutorialAccueil"
        visible={showTutorial}
        onDone={() => setShowTutorial(false)}
      />
      <SearchModal />
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
      <Text style={styles.vetSectionTitle}>🏥 Vétérinaire attitré</Text>
      <Field label="Nom du vétérinaire">
        <Input
          value={animal.veterinaire?.nom || ''}
          onChangeText={(v) => setAnimal({ ...animal, veterinaire: { ...(animal.veterinaire || {}), nom: v } })}
          placeholder="Dr. Dupont"
        />
      </Field>
      <Field label="Adresse">
        <Input
          value={animal.veterinaire?.adresse || ''}
          onChangeText={(v) => setAnimal({ ...animal, veterinaire: { ...(animal.veterinaire || {}), adresse: v } })}
          placeholder="12 rue des Lilas, 75001 Paris"
        />
      </Field>
      <Field label="Téléphone">
        <Input
          value={animal.veterinaire?.telephone || ''}
          onChangeText={(v) => setAnimal({ ...animal, veterinaire: { ...(animal.veterinaire || {}), telephone: v } })}
          placeholder="06 12 34 56 78"
          keyboardType="phone-pad"
        />
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
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
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
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEditText: { color: colors.blue, fontSize: 16, fontWeight: '700' },
  btnDelete: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteText: { color: colors.red, fontSize: 16, fontWeight: '700' },
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
  vetSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vetBlock: {
    backgroundColor: '#f0fdf4',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  vetBlockBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 2,
  },
  vetAddr: {
    fontSize: 11,
    color: colors.textLight,
    lineHeight: 15,
  },
  vetCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    flexShrink: 0,
  },
  vetCallIcon: {
    fontSize: 13,
  },
  vetCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
});
