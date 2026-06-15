import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Screen, Card, Button, Input } from '../../components/ui';
import { db, functions } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import VaccinsSection from '../../components/VaccinsSection';
import MedicamentsSection from '../../components/MedicamentsSection';
import NotesSection from '../../components/NotesSection';
import PoidsSection from '../../components/PoidsSection';
import { EMOJIS_ESPECE, VET_TABS } from '../../constants';
import { formatDate } from '../../utils/dates';
import { colors, spacing, radius } from '../../theme';

const TAB_COMPONENTS = {
  vaccins: VaccinsSection,
  medicaments: MedicamentsSection,
  notes: NotesSection,
  poids: PoidsSection,
};

// Search an animal by its identifiant and edit its medical record
// (mirrors the subStatus === 'active' branch of VetApp in the web app)
export default function VetSearchScreen() {
  const { logout } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
  const [animal, setAnimal] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('vaccins');
  const [billingError, setBillingError] = useState('');

  const handleManageSubscription = async () => {
    setBillingError('');
    try {
      const createPortalSession = httpsCallable(functions, 'createPortalSession');
      const result = await createPortalSession();
      await Linking.openURL(result.data.url);
    } catch (err) {
      setBillingError('Erreur : ' + err.message);
    }
  };

  const handleSearch = async () => {
    const id = identifiant.trim();
    setError('');
    setAnimal(null);
    if (!id) return;
    setSearching(true);
    try {
      const q = query(collection(db, 'animals'), where('identifiant', '==', id));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError('Aucun animal trouvé avec cet identifiant.');
      } else {
        const docSnap = snap.docs[0];
        setAnimal({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (err) {
      setError('Erreur lors de la recherche : ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const saveAnimal = async (animalData) => {
    try {
      const { id, ...data } = animalData;
      await updateDoc(doc(db, 'animals', id), data);
      setAnimal(animalData);
    } catch (err) {
      setError("Erreur lors de l'enregistrement : " + err.message);
    }
  };

  const addAnimalItem = (animalObj, type, item) => {
    saveAnimal({ ...animalObj, [type]: [...(animalObj[type] || []), { ...item, id: Date.now() }] });
  };

  const deleteAnimalItem = (animalObj, type, itemId) => {
    saveAnimal({ ...animalObj, [type]: (animalObj[type] || []).filter((i) => i.id !== itemId) });
  };

  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🩺 Espace Vétérinaire</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleManageSubscription}><Text style={styles.headerLink}>⚙️ Abonnement</Text></TouchableOpacity>
          <TouchableOpacity onPress={logout}><Text style={styles.headerLink}>Déconnexion</Text></TouchableOpacity>
        </View>
      </View>

      <Screen>
        {billingError ? <Text style={styles.error}>{billingError}</Text> : null}

        <Card>
          <Text style={styles.cardTitle}>🔍 Rechercher un animal par identifiant</Text>
          <Text style={styles.cardHint}>Saisissez l'identifiant vétérinaire (puce électronique…) renseigné par le propriétaire dans le profil de l'animal.</Text>
          <View style={styles.searchRow}>
            <Input value={identifiant} onChangeText={setIdentifiant} placeholder="Identifiant vétérinaire" style={{ flex: 1 }} onSubmitEditing={handleSearch} />
            <Button title={searching ? 'Recherche…' : 'Rechercher'} onPress={handleSearch} disabled={searching} style={{ marginLeft: spacing.sm }} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>

        {animal ? (
          <View>
            <Card>
              <Text style={styles.animalName}>{EMOJIS_ESPECE[animal.espece] || '🐾'} {animal.nom}</Text>
              <Text style={styles.animalMeta}>
                {animal.espece}{animal.race ? ` • ${animal.race}` : ''}{animal.sexe ? ` • ${animal.sexe === 'male' ? 'Mâle' : 'Femelle'}` : ''}
              </Text>
              {animal.dateNaissance ? <Text style={styles.animalMeta}>Né(e) le : {formatDate(animal.dateNaissance)}</Text> : null}
            </Card>

            <View style={styles.tabsRow}>
              {VET_TABS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setActiveTab(t.id)}
                  style={[styles.tabButton, activeTab === t.id ? styles.tabButtonActive : null]}
                >
                  <Text style={[styles.tabLabel, activeTab === t.id ? styles.tabLabelActive : null]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ActiveTabComponent animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} />
          </View>
        ) : null}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontWeight: '800', fontSize: 16, color: colors.primary },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  headerLink: { color: colors.text, fontWeight: '600', fontSize: 13 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  cardHint: { color: colors.textLight, fontSize: 13, marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  error: { color: colors.red, fontSize: 13, marginTop: spacing.sm },
  animalName: { fontSize: 18, fontWeight: '700', color: colors.text },
  animalMeta: { color: colors.textLight, fontSize: 14, marginTop: 4 },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tabButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  tabButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  tabLabelActive: { color: colors.white },
});
