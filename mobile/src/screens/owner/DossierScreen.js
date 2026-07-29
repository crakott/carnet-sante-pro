import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { Screen, EmptyState, Card, Button, Input, Avatar, ListGroup, ListRow, GroupLabel } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { getAnimalDossier } from '../../utils/reminders';
import { buildDossierEmailBody, buildDossierHtml, buildCollarTagHtml, buildLostPosterHtml, DOSSIER_GROUPS, DOSSIER_CARDS, getDossierCardStatus, getDossierStatusPillStyle } from '../../utils/dossier';
import { computeAge } from '../../utils/dates';
import { getVideosForAnimal } from '../../utils/videos';
import { APP_URL } from '../../constants';
import { colors, spacing } from '../../theme';

const SHARE_SECTIONS = [
  { key: 'vaccins',          emoji: '💉', label: 'Vaccins' },
  { key: 'medicaments',      emoji: '💊', label: 'Traitements' },
  { key: 'chirurgies',       emoji: '🔪', label: 'Chirurgies' },
  { key: 'antiparasitaires', emoji: '🐛', label: 'Antiparas.' },
  { key: 'vermifuges',       emoji: '🪱', label: 'Vermifuges' },
  { key: 'poids',            emoji: '⚖️', label: 'Poids' },
  { key: 'rdvs',             emoji: '📅', label: 'Rendez-vous' },
  { key: 'observations',     emoji: '📋', label: 'Observations' },
  { key: 'assurance',        emoji: '🛡️', label: 'Assurance' },
  { key: 'budget',           emoji: '💰', label: 'Budget' },
];

const DEFAULT_SECTIONS = Object.fromEntries(SHARE_SECTIONS.map((s) => [s.key, true]));

export default function DossierScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, saveAnimal, updateAnimalFields } = useAnimals();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [videoCount, setVideoCount] = useState(0);
  const [shareSections, setShareSections] = useState(DEFAULT_SECTIONS);
  const [contactPhone, setContactPhone] = useState('');
  const [lostDate, setLostDate] = useState('');
  const [lostLieu, setLostLieu] = useState('');
  const [lostTel, setLostTel] = useState('');
  const [lostSignes, setLostSignes] = useState('');
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostMode, setLostMode] = useState('perdu');

  const toggleSection = useCallback((key) => {
    setShareSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const animal = animals.find((a) => a.id === selectedAnimal) || animals[0];

  useEffect(() => {
    if (!animal) return;
    getVideosForAnimal(animal.id).then((list) => setVideoCount(list.length)).catch(() => setVideoCount(0));
    setContactPhone(animal.contactPhone || '');
    setLostTel(animal.contactPhone || '');
  }, [animal?.id]);

  if (animals.length === 0) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

  const dossier = getAnimalDossier(animal);
  const age = computeAge(animal.dateNaissance);
  const subtitle = [animal.race, age].filter(Boolean).join(' — ');

  const handleShare = async () => {
    if (email && email.includes('@')) {
      addAnimalItem(animal, 'partages', { email });
      const subject = `Dossier santé de ${animal.nom}`;
      const body = buildDossierEmailBody(animal, shareSections);
      const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await Linking.openURL(url);
      setEmail('');
    }
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: buildDossierHtml(animal, shareSections) });
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ouvrir le dossier.");
    }
  };

  const toggleShare = () => saveAnimal({ ...animal, shareEnabled: !animal.shareEnabled });

  const shareUrl = `${APP_URL}/?share=${animal.id}`;
  const copyShareLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  };

  const handleSaveContactPhone = () => updateAnimalFields(animal, { contactPhone: contactPhone.trim() });

  const handleCollarTag = async () => {
    try {
      const html = buildCollarTagHtml(animal, shareUrl);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Étiquette collier — ${animal.nom}`, UTI: 'com.adobe.pdf' });
    } catch {
      Alert.alert('Erreur', "Impossible de générer l'étiquette collier.");
    }
  };

  const handleLostPoster = async () => {
    try {
      const form = { date: lostDate, lieu: lostLieu, telephone: lostTel, signes: lostSignes, mode: lostMode };
      const label = lostMode === 'perdu' ? 'Perdu' : 'Trouvé';
      const html = buildLostPosterHtml(animal, form, animal.shareEnabled ? shareUrl : '');
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Affiche ${label} — ${animal.nom}`, UTI: 'com.adobe.pdf' });
    } catch {
      Alert.alert('Erreur', "Impossible de générer l'affiche.");
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
                const status = getDossierCardStatus(animal, card.id, videoCount);
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
        <Text style={styles.shareHint}>Choisissez les sections à inclure dans le dossier partagé.</Text>

        <View style={styles.sectionGrid}>
          {SHARE_SECTIONS.map((s) => {
            const active = !!shareSections[s.key];
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => toggleSection(s.key)}
                activeOpacity={0.7}
                style={[styles.sectionChip, active ? styles.sectionChipActive : styles.sectionChipOff]}
              >
                <Text style={styles.sectionChipEmoji}>{s.emoji}</Text>
                <Text style={[styles.sectionChipLabel, active ? styles.sectionChipLabelActive : null]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button title="🖨️ Voir / imprimer le dossier sélectionné" onPress={handlePrint} color={colors.border} textColor={colors.text} style={{ marginBottom: spacing.sm }} />

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

      <Card style={styles.shareBlock}>
        <Text style={styles.shareTitle}>🔗 Fiche de garde</Text>
        <Text style={styles.shareHint}>
          Lien en lecture seule avec les infos essentielles de {animal.nom}, à partager avec un pet-sitter ou un vétérinaire — sans connexion requise.
        </Text>

        {/* Numéro de contact */}
        <Text style={styles.fieldLabel}>📞 N° si trouvé / perdu</Text>
        <View style={styles.phoneRow}>
          <Input
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="06 12 34 56 78"
            keyboardType="phone-pad"
            style={{ flex: 1 }}
          />
          <Button title="Sauv." onPress={handleSaveContactPhone} style={{ marginLeft: spacing.sm, paddingHorizontal: spacing.sm }} />
        </View>
        <Text style={styles.shareHint}>Utilisé sur l'étiquette collier et l'affiche perdu.</Text>

        <Button
          title={animal.shareEnabled ? '🔒 Désactiver le partage' : '🔗 Activer le partage'}
          onPress={toggleShare}
          color={animal.shareEnabled ? colors.redLight : colors.primary}
          textColor={animal.shareEnabled ? colors.red : colors.white}
          style={{ marginTop: spacing.sm }}
        />
        {animal.shareEnabled ? (
          <View style={styles.qrBlock}>
            <QRCode value={shareUrl} size={140} color={colors.text} backgroundColor={colors.white} />
            <Button
              title={shareLinkCopied ? '✅ Lien copié !' : '🔗 Copier le lien'}
              onPress={copyShareLink}
              color={shareLinkCopied ? colors.pillGreenBg : colors.background}
              textColor={shareLinkCopied ? colors.primary : colors.text}
              style={{ marginTop: spacing.md }}
            />
            <Button
              title="🏷️ Générer l'étiquette collier (PDF)"
              onPress={handleCollarTag}
              color="#0369a1"
              style={{ marginTop: spacing.sm }}
            />
            <Text style={[styles.shareHint, { marginTop: 4, textAlign: 'center' }]}>
              Carte format crédit · nom, puce, médicaments, allergies, QR code et n° de contact
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Affiche Animal perdu / trouvé */}
      <Card style={styles.shareBlock}>
        <TouchableOpacity onPress={() => setShowLostForm((v) => !v)} activeOpacity={0.7} style={styles.lostHeader}>
          <Text style={styles.shareTitle}>🔍 Affiche perdu / trouvé</Text>
          <Text style={styles.accordionArrow}>{showLostForm ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {!showLostForm && (
          <Text style={styles.shareHint}>
            Affiche A4 deux colonnes (photo + infos) avec numéro en grand et QR code. Modes Perdu 🔴 et Trouvé 🟢.
          </Text>
        )}
        {showLostForm && (
          <View style={{ marginTop: spacing.md }}>
            {/* Toggle PERDU / TROUVÉ */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, lostMode === 'perdu' && styles.modeBtnActiveRed]}
                onPress={() => setLostMode('perdu')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, lostMode === 'perdu' && styles.modeBtnTextActive]}>🔴 PERDU</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, lostMode === 'trouve' && styles.modeBtnActiveGreen]}
                onPress={() => setLostMode('trouve')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, lostMode === 'trouve' && styles.modeBtnTextActive]}>🟢 TROUVÉ</Text>
              </TouchableOpacity>
            </View>

            {!animal.shareEnabled && (
              <View style={styles.qrNotice}>
                <Text style={styles.qrNoticeText}>
                  💡 Activez le partage (Fiche de garde) pour inclure le QR code dans l'affiche.
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>
              {lostMode === 'perdu' ? '📅 Disparu(e) le' : '📅 Trouvé(e) le'}
            </Text>
            <Input value={lostDate} onChangeText={setLostDate} placeholder="ex : 15 juillet 2025" style={{ marginBottom: spacing.sm }} />

            <Text style={styles.fieldLabel}>
              {lostMode === 'perdu' ? '📍 Dernier lieu connu' : '📍 Lieu de découverte'}
            </Text>
            <Input value={lostLieu} onChangeText={setLostLieu} placeholder="ex : Parc de la Mairie, Lyon 3e" style={{ marginBottom: spacing.sm }} />

            <Text style={styles.fieldLabel}>📞 Téléphone de contact</Text>
            <Input value={lostTel} onChangeText={setLostTel} placeholder="06 12 34 56 78" keyboardType="phone-pad" style={{ marginBottom: spacing.sm }} />

            <Text style={styles.fieldLabel}>🔍 Signes distinctifs</Text>
            <Input value={lostSignes} onChangeText={setLostSignes} placeholder="ex : Tache blanche sur la patte droite, collier rouge…" multiline style={{ marginBottom: spacing.md, minHeight: 60 }} />

            <Button
              title={`📤 Générer l'affiche ${lostMode === 'perdu' ? 'PERDU' : 'TROUVÉ'}`}
              onPress={handleLostPoster}
              color={lostMode === 'perdu' ? '#dc2626' : '#059669'}
            />
          </View>
        )}
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
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  sectionChipActive: {
    backgroundColor: colors.greenLight,
    borderColor: colors.primary,
  },
  sectionChipOff: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  sectionChipEmoji: { fontSize: 13 },
  sectionChipLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  sectionChipLabelActive: { color: colors.primaryDark },
  partageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.greenLight, borderRadius: 4, padding: 6, marginBottom: 4 },
  partageEmail: { fontSize: 11, color: colors.text },
  partageDelete: { fontSize: 12, color: colors.red, paddingHorizontal: 6 },
  noPartage: { fontSize: 11, color: colors.textMuted },
  shareRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  qrBlock: { alignItems: 'center', marginTop: spacing.md },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textLight, marginBottom: 4, marginTop: spacing.sm },
  lostHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionArrow: { fontSize: 12, color: colors.textMuted },
  modeToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background, alignItems: 'center',
  },
  modeBtnActiveRed:   { backgroundColor: '#fef2f2', borderColor: '#dc2626' },
  modeBtnActiveGreen: { backgroundColor: '#f0fdf4', borderColor: '#059669' },
  modeBtnText:       { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  modeBtnTextActive: { color: colors.text },
  qrNotice: { backgroundColor: '#fffbeb', borderRadius: 8, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: '#fde68a' },
  qrNoticeText: { fontSize: 11, color: '#92400e', lineHeight: 16 },
});
