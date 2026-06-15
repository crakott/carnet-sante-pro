import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Screen, ScreenTitle, Card, Field, Input, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAnimals } from '../../context/AnimalsContext';
import { colors, spacing } from '../../theme';

export default function ParametresScreen() {
  const { reminderSettings, saveReminderSettings } = useAuth();
  const { animals, saveAnimal } = useAnimals();
  const [settings, setSettings] = useState(reminderSettings);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const update = (key, value) => setSettings({ ...settings, [key]: parseInt(value, 10) || 0 });

  const handleSave = async () => {
    try {
      await saveReminderSettings(settings);
      Alert.alert('Paramètres sauvegardés !');
    } catch (error) {
      Alert.alert('Erreur', "Échec de la sauvegarde des paramètres : les règles de sécurité Firestore du projet n'autorisent pas l'écriture dans la collection « settings » pour cet utilisateur.");
    }
  };

  // ── Export JSON ──────────────────────────────────────────────────
  const exportJSON = async (withPhotos) => {
    const clean = animals.map(({ id, userId, createdAt, ...rest }) => {
      if (!withPhotos) {
        const obs = (rest.observations || []).map(({ photo, audio, ...o }) => o);
        return { ...rest, observations: obs };
      }
      return rest;
    });
    const payload = { exportDate: new Date().toISOString(), version: '1.0', animals: clean };
    const fileName = `carnet-sante-export-${new Date().toISOString().split('T')[0]}${withPhotos ? '' : '-sans-photos'}.json`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Partage indisponible', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'exporter les données.");
    }
  };

  // ── Import JSON ──────────────────────────────────────────────────
  const handleImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;

    try {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
      const data = JSON.parse(content);
      if (!Array.isArray(data.animals)) throw new Error('Format de fichier invalide.');
      const n = data.animals.length;

      Alert.alert(
        'Confirmer l\'import',
        `Importer ${n} animal${n > 1 ? 'x' : ''} ? Ils seront ajoutés à votre compte existant.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Importer',
            onPress: async () => {
              setImportMsg(''); setImporting(true);
              try {
                for (const animal of data.animals) {
                  const { id, userId, ...rest } = animal;
                  await saveAnimal({ ...rest });
                }
                setImportMsg(`✅ ${n} animal${n > 1 ? 'x' : ''} importé${n > 1 ? 's' : ''} avec succès !`);
              } catch (err) {
                setImportMsg('❌ Erreur : ' + err.message);
              }
              setImporting(false);
            },
          },
        ]
      );
    } catch (err) {
      setImportMsg('❌ Erreur : ' + err.message);
    }
  };

  return (
    <Screen>
      <ScreenTitle>⚙️ Paramètres</ScreenTitle>

      <Card>
        <Text style={styles.cardTitle}>Délais de rappels (en jours)</Text>

        <Field label="Rappel Vaccins" hint="Recevoir un rappel X jours avant expiration">
          <Input value={String(settings.vaccin)} onChangeText={(v) => update('vaccin', v)} keyboardType="numeric" />
        </Field>

        <Field label="Rappel Médicaments" hint="Recevoir un rappel X jours avant">
          <Input value={String(settings.medicament)} onChangeText={(v) => update('medicament', v)} keyboardType="numeric" />
        </Field>

        <Field label="🦟 Rappel Antiparasitaires" hint="Recevoir un rappel X jours avant le prochain traitement">
          <Input value={String(settings.antiparasitaire)} onChangeText={(v) => update('antiparasitaire', v)} keyboardType="numeric" />
        </Field>

        <Field label="🪱 Rappel Vermifuges" hint="Recevoir un rappel X jours avant le prochain traitement">
          <Input value={String(settings.vermifuge)} onChangeText={(v) => update('vermifuge', v)} keyboardType="numeric" />
        </Field>

        <Button title="💾 Sauvegarder" onPress={handleSave} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>📦 Sauvegarde & restauration</Text>
        <Text style={styles.hint}>Exportez vos données pour les sauvegarder ou les transférer. Le fichier JSON peut ensuite être réimporté.</Text>

        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <Button
            title={`⬇️ Exporter tout (${animals.length} animal${animals.length > 1 ? 'x' : ''}) — avec photos & audios`}
            onPress={() => exportJSON(true)}
            disabled={animals.length === 0}
            color={colors.cyan}
          />
          <Button
            title="⬇️ Exporter sans photos (fichier léger)"
            onPress={() => exportJSON(false)}
            disabled={animals.length === 0}
            color={colors.indigo}
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.hint}>Restaurer depuis un fichier d'export :</Text>
        <Button
          title={importing ? '⏳ Importation en cours…' : '📂 Choisir un fichier .json à importer'}
          onPress={handleImport}
          disabled={importing}
          color={colors.border}
          textColor={colors.text}
        />
        {importMsg ? <Text style={[styles.importMsg, { color: importMsg.startsWith('✅') ? colors.primary : colors.red }]}>{importMsg}</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.md, color: colors.text },
  hint: { fontSize: 13, color: colors.textLight, marginBottom: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, marginVertical: spacing.md },
  importMsg: { marginTop: spacing.sm, fontSize: 14 },
});
