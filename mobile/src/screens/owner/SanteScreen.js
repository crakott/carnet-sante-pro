import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import { Screen, ScreenTitle, EmptyState, Card, Button, Input } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { getAnimalDossier } from '../../utils/reminders';
import { buildDossierEmailBody, buildDossierHtml } from '../../utils/dossier';
import { EMOJIS_ESPECE, TYPE_LABELS } from '../../constants';
import { colors, spacing } from '../../theme';

export default function SanteScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem } = useAnimals();

  if (animals.length === 0) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenTitle>💪 Tableau de Santé</ScreenTitle>
      {animals.map((animal) => (
        <SanteCard
          key={animal.id}
          animal={animal}
          selected={selectedAnimal === animal.id}
          onSelect={() => setSelectedAnimal(animal.id)}
          addAnimalItem={addAnimalItem}
          deleteAnimalItem={deleteAnimalItem}
        />
      ))}
    </Screen>
  );
}

function SanteCard({ animal, selected, onSelect, addAnimalItem, deleteAnimalItem }) {
  const [email, setEmail] = useState('');
  const dossier = getAnimalDossier(animal);

  // Record the share, then open the email client with the dossier pre-filled for the vétérinaire
  const handleShare = async () => {
    if (email && email.includes('@')) {
      addAnimalItem(animal, 'partages', { email });
      const subject = `Dossier santé de ${animal.nom}`;
      const body = buildDossierEmailBody(animal);
      const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await Linking.openURL(url);
      setEmail('');
    }
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: buildDossierHtml(animal) });
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ouvrir le dossier.");
    }
  };

  return (
    <Card onPress={onSelect} selected={selected} accentColor={colors.primary}>
      <Text style={styles.name}>{EMOJIS_ESPECE[animal.espece] || '🐾'} {animal.nom}</Text>

      <View style={styles.infoBlock}>
        <Text style={styles.infoLine}><Text style={styles.bold}>💉 Vaccins : </Text>{dossier.vaccinNames.length > 0 ? dossier.vaccinNames.join(', ') : 'aucun'}</Text>
        <Text style={styles.infoLine}><Text style={styles.bold}>⚖️ Poids actuel : </Text>{dossier.lastWeight ? `${dossier.lastWeight.valeur} kg (${dossier.lastWeight.date})` : 'non renseigné'}</Text>
        <Text style={styles.infoLine}><Text style={styles.bold}>💊 Médicaments en cours : </Text>{dossier.currentMedications.length > 0 ? dossier.currentMedications.map((m) => m.nom).join(', ') : 'aucun'}</Text>
        <Text style={styles.infoLine}><Text style={styles.bold}>📋 Observations : </Text>{dossier.observationTypes.length > 0 ? dossier.observationTypes.map((t) => (TYPE_LABELS[t] || t)).join(', ') : 'aucune'}</Text>
      </View>

      <View style={styles.shareBlock}>
        <Text style={styles.shareTitle}>📤 Partage Vétérinaire</Text>
        <Text style={styles.shareHint}>Envoie un e-mail au vétérinaire avec le dossier complet de l'animal (vaccins, poids, médicaments, observations écrites)</Text>

        <Button title="🖨️ Voir / imprimer le dossier complet (avec photos et audio)" onPress={handlePrint} color={colors.border} textColor={colors.text} style={{ marginBottom: spacing.sm }} />

        {(animal.partages && animal.partages.length > 0) ? (
          animal.partages.map((p) => (
            <View key={p.id} style={styles.partageRow}>
              <Text style={styles.partageEmail}>✉️ {p.email}</Text>
              <Text style={styles.partageDelete} onPress={() => deleteAnimalItem(animal, 'partages', p.id)}>✕</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noPartage}>Aucun partage</Text>
        )}

        <View style={styles.shareRow}>
          <Input value={email} onChangeText={setEmail} placeholder="Email vétérinaire" keyboardType="email-address" autoCapitalize="none" style={{ flex: 1 }} />
          <Button title="📧 Partager" onPress={handleShare} style={{ marginLeft: spacing.sm }} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  infoBlock: { marginTop: spacing.md, gap: 6 },
  infoLine: { fontSize: 13, color: '#374151' },
  bold: { fontWeight: '700' },
  shareBlock: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  shareTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, color: colors.text },
  shareHint: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.sm },
  partageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.greenLight, borderRadius: 4, padding: 6, marginBottom: 4 },
  partageEmail: { fontSize: 11, color: colors.text },
  partageDelete: { fontSize: 12, color: colors.red, paddingHorizontal: 6 },
  noPartage: { fontSize: 11, color: colors.textMuted },
  shareRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
});
