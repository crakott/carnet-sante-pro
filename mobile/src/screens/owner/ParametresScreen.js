import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Screen, ScreenTitle, Card, Field, Input, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAnimals } from '../../context/AnimalsContext';
import { colors, spacing } from '../../theme';

export default function ParametresScreen() {
  const { reminderSettings, saveReminderSettings, householdId } = useAuth();
  const { animals, saveAnimal, createHousehold, joinHousehold, leaveHousehold } = useAnimals();
  const [settings, setSettings] = useState(reminderSettings);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const [householdMembers, setHouseholdMembers] = useState(null);
  const [householdCode, setHouseholdCode] = useState('');
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [householdError, setHouseholdError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!householdId) { setHouseholdMembers(null); return; }
    getDoc(doc(db, 'households', householdId))
      .then((snap) => setHouseholdMembers(snap.exists() ? (snap.data().members || []).length : null))
      .catch(() => setHouseholdMembers(null));
  }, [householdId]);

  const handleCreateHousehold = async () => {
    setHouseholdBusy(true);
    setHouseholdError('');
    try {
      await createHousehold();
    } catch (err) {
      setHouseholdError("Impossible de créer le foyer.");
    }
    setHouseholdBusy(false);
  };

  const handleJoinHousehold = async () => {
    setHouseholdBusy(true);
    setHouseholdError('');
    try {
      await joinHousehold(householdCode);
      setHouseholdCode('');
    } catch (err) {
      setHouseholdError(err.message || "Impossible de rejoindre ce foyer.");
    }
    setHouseholdBusy(false);
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      'Quitter le foyer',
      'Vos animaux ne seront plus partagés avec les autres membres de ce foyer. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            setHouseholdBusy(true);
            setHouseholdError('');
            try {
              await leaveHousehold();
            } catch (err) {
              setHouseholdError('Impossible de quitter le foyer.');
            }
            setHouseholdBusy(false);
          },
        },
      ]
    );
  };

  const copyHouseholdCode = async () => {
    await Clipboard.setStringAsync(householdId);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

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
        <Text style={styles.cardTitle}>🏠 Foyer partagé</Text>

        {householdId ? (
          <>
            <Text style={styles.hint}>
              Vos animaux sont partagés avec {householdMembers ? `${householdMembers} membre${householdMembers > 1 ? 's' : ''}` : 'votre foyer'} (vous inclus(e)). Chaque membre peut consulter et compléter le carnet de santé des animaux du foyer.
            </Text>

            <Field label="Code du foyer (à partager avec un proche)">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Input value={householdId} editable={false} style={{ flex: 1 }} />
                <Button title={codeCopied ? '✅' : '📋 Copier'} onPress={copyHouseholdCode} color={colors.background} textColor={colors.text} />
              </View>
            </Field>

            <Button title="🚪 Quitter le foyer" onPress={handleLeaveHousehold} color={colors.redLight} textColor={colors.red} disabled={householdBusy} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Créez un foyer pour partager vos animaux (vaccins, rendez-vous, observations…) avec un proche, ou rejoignez le foyer d'un proche grâce à son code.
            </Text>

            <Button title="➕ Créer un foyer" onPress={handleCreateHousehold} disabled={householdBusy} style={{ marginTop: spacing.md, marginBottom: spacing.md }} />

            <View style={styles.divider} />

            <Field label="Rejoindre un foyer existant">
              <Input value={householdCode} onChangeText={setHouseholdCode} placeholder="Code du foyer" autoCapitalize="none" />
            </Field>
            <Button title="🔗 Rejoindre" onPress={handleJoinHousehold} disabled={householdBusy || !householdCode.trim()} color={colors.cyan} />
          </>
        )}

        {householdError ? <Text style={[styles.importMsg, { color: colors.red }]}>{householdError}</Text> : null}
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
