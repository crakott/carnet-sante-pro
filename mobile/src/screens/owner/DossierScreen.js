import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import { useNavigation } from '@react-navigation/native';
import { Screen, EmptyState, Card, Button, Input, Avatar, ListGroup, ListRow, GroupLabel } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { getAnimalDossier } from '../../utils/reminders';
import { buildDossierEmailBody, buildDossierHtml, DOSSIER_GROUPS, DOSSIER_CARDS, getDossierCardStatus, getDossierStatusPillStyle } from '../../utils/dossier';
import { computeAge } from '../../utils/dates';
import { colors, spacing } from '../../theme';

export default function DossierScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem } = useAnimals();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');

  if (animals.length === 0) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

  const animal = animals.find((a) => a.id === selectedAnimal) || animals[0];
  const dossier = getAnimalDossier(animal);
  const age = computeAge(animal.dateNaissance);
  const subtitle = [animal.race, age].filter(Boolean).join(' — ');

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
    <Screen>
      {animals.length > 1 && (
        <View style={styles.switcher}>
          {animals.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setSelectedAnimal(a.id)}
              style={[styles.switcherItem, a.id === animal.id ? styles.switcherItemActive : null]}
              activeOpacity={0.7}
            >
              <Avatar animal={a} size={18} />
              <Text style={[styles.switcherText, a.id === animal.id ? styles.switcherTextActive : null]}>{a.nom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Card style={styles.profileCard}>
        <Avatar animal={animal} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{animal.nom}</Text>
          {subtitle ? <Text style={styles.profileSubtitle}>{subtitle}</Text> : null}
        </View>
      </Card>

      {DOSSIER_GROUPS.map((group) => {
        const cards = DOSSIER_CARDS.filter((c) => c.group === group);
        return (
          <View key={group}>
            <GroupLabel>{group}</GroupLabel>
            <ListGroup>
              {cards.map((card, i) => {
                const status = getDossierCardStatus(animal, card.id);
                const pillStyle = getDossierStatusPillStyle(status);
                return (
                  <ListRow
                    key={card.id}
                    last={i === cards.length - 1}
                    left={<View style={[styles.cardIcon, { backgroundColor: card.bg }]}><Text style={{ fontSize: 17 }}>{card.emoji}</Text></View>}
                    title={card.label}
                    pill={{ text: status.text, bg: pillStyle.bg, color: pillStyle.color }}
                    onPress={() => { setSelectedAnimal(animal.id); navigation.navigate(card.id); }}
                  />
                );
              })}
            </ListGroup>
          </View>
        );
      })}

      <Card style={styles.shareBlock}>
        <Text style={styles.shareTitle}>📤 Partage Vétérinaire</Text>
        <Text style={styles.shareHint}>Envoie un e-mail au vétérinaire avec le dossier complet de l'animal (vaccins, poids, médicaments, observations écrites)</Text>

        <Button title="🖨️ Voir / imprimer le dossier complet (avec photos et audio)" onPress={handlePrint} color={colors.border} textColor={colors.text} style={{ marginBottom: spacing.sm }} />

        {dossier.vaccinNames.length === 0 && dossier.currentMedications.length === 0 && !dossier.lastWeight ? (
          <Text style={styles.shareHint}>Astuce : complétez les vaccins, le poids et les médicaments pour un dossier plus utile au vétérinaire.</Text>
        ) : null}

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
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  switcherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  switcherItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.greenLight,
  },
  switcherText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  switcherTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  profileSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBlock: {
    marginTop: spacing.sm,
  },
  shareTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, color: colors.text },
  shareHint: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.sm },
  partageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.greenLight, borderRadius: 4, padding: 6, marginBottom: 4 },
  partageEmail: { fontSize: 11, color: colors.text },
  partageDelete: { fontSize: 12, color: colors.red, paddingHorizontal: 6 },
  noPartage: { fontSize: 11, color: colors.textMuted },
  shareRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
});
