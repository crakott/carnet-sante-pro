import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Share, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Screen, Field, Input, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAnimals } from '../../context/AnimalsContext';
import { colors, spacing, radius, shadow } from '../../theme';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.carnetsantepro.app';
const PRIVACY_URL = 'https://carnet-sante-pro.web.app/privacy.html';

// ─── Accordion card ─────────────────────────────────────────────────────────
function AccordionCard({ id, icon, iconBg, title, expanded, onToggle, children }) {
  const isOpen = expanded === id;
  return (
    <View style={styles.accordionCard}>
      <TouchableOpacity onPress={() => onToggle(isOpen ? null : id)} activeOpacity={0.7} style={styles.accordionHeader}>
        <View style={[styles.accordionIconBox, { backgroundColor: iconBg }]}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <Text style={styles.accordionTitle}>{title}</Text>
        <Text style={styles.accordionArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isOpen && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

// ─── FAQ items ───────────────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    category: '🐾 Vaccins',
    items: [
      { q: 'Quand dois-je faire vacciner mon animal ?', a: 'Les premiers vaccins sont généralement réalisés dès les premières semaines de vie, puis des rappels réguliers sont nécessaires selon l\'âge, l\'espèce et le mode de vie de l\'animal.' },
      { q: 'Les vaccins sont-ils obligatoires ?', a: 'Certains vaccins sont fortement recommandés. D\'autres peuvent être exigés pour les voyages ou certaines pensions.' },
      { q: 'Mon animal est en retard pour son vaccin, est-ce grave ?', a: 'Un retard ne signifie pas forcément que tout est à recommencer, mais il est préférable de contacter votre vétérinaire pour vérifier le protocole adapté.' },
    ],
  },
  {
    category: '🪱 Vermifuges et parasites',
    items: [
      { q: 'À quelle fréquence vermifuger mon animal ?', a: 'La fréquence dépend de l\'âge, du mode de vie et de l\'environnement. Les jeunes animaux nécessitent généralement des traitements plus fréquents.' },
      { q: 'Mon animal a des puces, que faire ?', a: 'Traitez l\'animal avec un produit adapté et pensez également à traiter son environnement.' },
      { q: 'Comment retirer une tique ?', a: 'Utilisez un crochet à tique adapté et retirez-la délicatement sans l\'écraser.' },
    ],
  },
  {
    category: '🍖 Alimentation',
    items: [
      { q: 'Quelle quantité de nourriture donner ?', a: 'La quantité dépend du poids, de l\'âge, de l\'activité physique et du type d\'alimentation.' },
      { q: 'Quels aliments sont toxiques ?', a: 'Parmi les aliments connus pour être dangereux :\n• chocolat\n• raisin\n• oignon\n• ail\n• avocat\n• alcool\n• café\n• xylitol (édulcorant)' },
      { q: 'Mon animal refuse de manger, dois-je m\'inquiéter ?', a: 'Une perte d\'appétit persistante mérite une surveillance attentive et peut justifier une consultation.' },
    ],
  },
  {
    category: '🤒 Symptômes courants',
    items: [
      { q: 'Mon chien ou mon chat vomit.', a: 'Un vomissement isolé n\'est pas toujours inquiétant. En revanche, des vomissements répétés ou associés à d\'autres symptômes nécessitent un avis vétérinaire.' },
      { q: 'Mon animal a la diarrhée.', a: 'Une diarrhée légère peut parfois disparaître rapidement. Si elle persiste ou s\'accompagne d\'autres symptômes, consultez un professionnel.' },
      { q: 'Mon animal boit beaucoup plus que d\'habitude.', a: 'Une augmentation importante de la consommation d\'eau peut révéler un problème de santé et mérite une surveillance.' },
      { q: 'Mon animal est très fatigué.', a: 'Une baisse d\'énergie inhabituelle ou prolongée doit être prise au sérieux.' },
    ],
  },
  {
    category: '🐾 Comportement',
    items: [
      { q: 'Pourquoi mon chien aboie-t-il autant ?', a: 'L\'aboiement peut être lié à l\'ennui, la peur, l\'excitation ou un besoin d\'attention.' },
      { q: 'Pourquoi mon chat urine-t-il en dehors de sa litière ?', a: 'Cela peut être lié à un problème médical, du stress ou un changement d\'environnement.' },
      { q: 'Mon animal détruit des objets.', a: 'Les causes fréquentes sont l\'ennui, le manque d\'exercice ou l\'anxiété.' },
    ],
  },
  {
    category: '❤️ Poids et suivi',
    items: [
      { q: 'Mon animal est-il en surpoids ?', a: 'Le surpoids est fréquent chez les animaux domestiques. Un suivi régulier du poids aide à détecter rapidement les variations.' },
      { q: 'Pourquoi suivre le poids ?', a: 'Les changements de poids peuvent être un indicateur précoce de nombreux problèmes de santé.' },
    ],
  },
  {
    category: '🚨 Urgences',
    items: [
      { q: 'Mon animal a mangé du chocolat.', a: 'Le chocolat peut être toxique. Contactez rapidement un vétérinaire pour obtenir des conseils adaptés.' },
      { q: 'Mon animal a avalé un objet.', a: 'Surveillez-le attentivement et consultez rapidement si des symptômes apparaissent.' },
      { q: 'Mon animal ne mange plus depuis 24 heures.', a: 'Une absence prolongée d\'alimentation doit être prise au sérieux, particulièrement chez le chat.' },
      { q: 'Quand consulter en urgence ?', a: 'Consultez rapidement en cas de :\n• difficultés respiratoires\n• convulsions\n• saignements importants\n• perte de connaissance\n• suspicion d\'intoxication\n• traumatisme important' },
    ],
  },
  {
    category: '🏥 Vie quotidienne',
    items: [
      { q: 'Quand stériliser mon animal ?', a: 'L\'âge recommandé varie selon l\'espèce, la race et la situation de l\'animal.' },
      { q: 'Pourquoi identifier mon animal ?', a: 'L\'identification permet de retrouver plus facilement un animal perdu et est obligatoire dans plusieurs situations.' },
      { q: 'Puis-je voyager avec mon animal ?', a: 'Les conditions varient selon la destination. Vérifiez toujours les exigences sanitaires avant le départ.' },
    ],
  },
];

function FAQItem({ item, last }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity onPress={() => setOpen(!open)} activeOpacity={0.7} style={[styles.faqItem, last && styles.faqItemLast]}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Text style={styles.faqArrow}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ParametresScreen() {
  const { reminderSettings, saveReminderSettings, householdId, user, logout } = useAuth();
  const { animals, saveAnimal, createHousehold, joinHousehold, leaveHousehold } = useAnimals();

  const [expanded, setExpanded] = useState(null);
  const [settings, setSettings] = useState(reminderSettings);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [suggestion, setSuggestion] = useState('');

  // Household section states
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

  // ── Reminders ──────────────────────────────────────────────────────────────
  const update = (key, value) => setSettings({ ...settings, [key]: parseInt(value, 10) || 0 });

  const handleSave = async () => {
    try {
      await saveReminderSettings(settings);
      Alert.alert('✅ Paramètres sauvegardés !');
    } catch {
      Alert.alert('Erreur', "Échec de la sauvegarde (règles Firestore non publiées ?).");
    }
  };

  // ── Household ──────────────────────────────────────────────────────────────
  const handleCreateHousehold = async () => {
    setHouseholdBusy(true); setHouseholdError('');
    try { await createHousehold(); } catch { setHouseholdError("Impossible de créer le foyer."); }
    setHouseholdBusy(false);
  };

  const handleJoinHousehold = async () => {
    setHouseholdBusy(true); setHouseholdError('');
    try { await joinHousehold(householdCode); setHouseholdCode(''); }
    catch (err) { setHouseholdError(err.message || "Impossible de rejoindre ce foyer."); }
    setHouseholdBusy(false);
  };

  const handleLeaveHousehold = () => {
    Alert.alert('Quitter le foyer', 'Vos animaux ne seront plus partagés avec ce foyer. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: async () => {
        setHouseholdBusy(true); setHouseholdError('');
        try { await leaveHousehold(); } catch { setHouseholdError('Impossible de quitter le foyer.'); }
        setHouseholdBusy(false);
      }},
    ]);
  };

  const copyHouseholdCode = async () => {
    await Clipboard.setStringAsync(householdId);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ── Backup ─────────────────────────────────────────────────────────────────
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
        Alert.alert('Partage indisponible', "Le partage de fichiers n'est pas disponible sur cet appareil.");
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'exporter les données.");
    }
  };

  const handleImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
      const data = JSON.parse(content);
      if (!Array.isArray(data.animals)) throw new Error('Format de fichier invalide.');
      const n = data.animals.length;
      Alert.alert('Confirmer l\'import', `Importer ${n} animal${n > 1 ? 'x' : ''} ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Importer', onPress: async () => {
          setImportMsg(''); setImporting(true);
          try {
            for (const animal of data.animals) {
              const { id, userId, ...rest } = animal;
              await saveAnimal({ ...rest });
            }
            setImportMsg(`✅ ${n} animal${n > 1 ? 'x' : ''} importé${n > 1 ? 's' : ''} !`);
          } catch (err) { setImportMsg('❌ Erreur : ' + err.message); }
          setImporting(false);
        }},
      ]);
    } catch (err) { setImportMsg('❌ Erreur : ' + err.message); }
  };

  // ── Suggestions ────────────────────────────────────────────────────────────
  const handleSendSuggestion = async () => {
    if (!suggestion.trim()) return;
    const subject = encodeURIComponent('Suggestion – Carnet Santé PRO');
    const body = encodeURIComponent(suggestion.trim());
    await Linking.openURL(`mailto:carnetsante2@gmail.com?subject=${subject}&body=${body}`);
    setSuggestion('');
  };

  return (
    <Screen>
      {/* ── Mon profil ──────────────────────────────────────────────── */}
      <AccordionCard id="profil" icon="👤" iconBg={colors.blueLight} title="Mon profil" expanded={expanded} onToggle={setExpanded}>
        <Text style={styles.profileLabel}>Adresse e-mail</Text>
        <Text style={styles.profileValue}>{user?.email || '—'}</Text>
      </AccordionCard>

      {/* ── Rappels ─────────────────────────────────────────────────── */}
      <AccordionCard id="rappels" icon="⏰" iconBg={colors.yellowLight} title="Délais de rappels (en jours)" expanded={expanded} onToggle={setExpanded}>
        <Field label="Vaccins" hint="Recevoir un rappel X jours avant expiration">
          <Input value={String(settings.vaccin)} onChangeText={(v) => update('vaccin', v)} keyboardType="numeric" />
        </Field>
        <Field label="Médicaments">
          <Input value={String(settings.medicament)} onChangeText={(v) => update('medicament', v)} keyboardType="numeric" />
        </Field>
        <Field label="🦟 Antiparasitaires">
          <Input value={String(settings.antiparasitaire)} onChangeText={(v) => update('antiparasitaire', v)} keyboardType="numeric" />
        </Field>
        <Field label="🪱 Vermifuges">
          <Input value={String(settings.vermifuge)} onChangeText={(v) => update('vermifuge', v)} keyboardType="numeric" />
        </Field>
        <Button title="💾 Sauvegarder" onPress={handleSave} />
      </AccordionCard>

      {/* ── Notifications ───────────────────────────────────────────── */}
      <AccordionCard id="notifications" icon="🔔" iconBg={colors.pinkLight} title="Notifications" expanded={expanded} onToggle={setExpanded}>
        <Text style={styles.hint}>Les notifications push seront disponibles dans une prochaine mise à jour. En attendant, consultez l'onglet Rappels pour voir les soins à venir.</Text>
      </AccordionCard>

      {/* ── Foyer partagé ───────────────────────────────────────────── */}
      <AccordionCard id="foyer" icon="👥" iconBg={colors.greenLight} title="Foyer partagé" expanded={expanded} onToggle={setExpanded}>
        {householdId ? (
          <>
            <Text style={styles.hint}>
              Vos animaux sont partagés avec {householdMembers ? `${householdMembers} membre${householdMembers > 1 ? 's' : ''}` : 'votre foyer'} (vous inclus(e)).
            </Text>
            <Field label="Code du foyer (à partager)">
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Input value={householdId} editable={false} style={{ flex: 1 }} />
                <Button title={codeCopied ? '✅' : '📋'} onPress={copyHouseholdCode} color={colors.background} textColor={colors.text} />
              </View>
            </Field>
            <Button title="🚪 Quitter le foyer" onPress={handleLeaveHousehold} color={colors.redLight} textColor={colors.red} disabled={householdBusy} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>Créez un foyer pour partager vos animaux avec un proche, ou rejoignez le foyer d'un proche grâce à son code.</Text>
            <Button title="➕ Créer un foyer" onPress={handleCreateHousehold} disabled={householdBusy} style={{ marginBottom: spacing.md }} />
            <View style={styles.divider} />
            <Field label="Rejoindre un foyer existant">
              <Input value={householdCode} onChangeText={setHouseholdCode} placeholder="Code du foyer" autoCapitalize="none" />
            </Field>
            <Button title="🔗 Rejoindre" onPress={handleJoinHousehold} disabled={householdBusy || !householdCode.trim()} color={colors.cyan} />
          </>
        )}
        {householdError ? <Text style={[styles.hint, { color: colors.red, marginTop: spacing.sm }]}>{householdError}</Text> : null}
      </AccordionCard>

      {/* ── Sauvegarde ──────────────────────────────────────────────── */}
      <AccordionCard id="sauvegarde" icon="📦" iconBg={colors.blueLight} title="Sauvegarde & restauration" expanded={expanded} onToggle={setExpanded}>
        <Text style={styles.hint}>Exportez vos données pour les sauvegarder ou les transférer vers un autre appareil.</Text>
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <Button title={`⬇️ Exporter (${animals.length} animal${animals.length > 1 ? 'x' : ''}) avec photos`} onPress={() => exportJSON(true)} disabled={animals.length === 0} color={colors.cyan} />
          <Button title="⬇️ Exporter sans photos (fichier léger)" onPress={() => exportJSON(false)} disabled={animals.length === 0} color={colors.indigo} />
        </View>
        <View style={styles.divider} />
        <Text style={styles.hint}>Restaurer depuis un fichier d'export :</Text>
        <Button title={importing ? '⏳ Importation…' : '📂 Choisir un fichier .json'} onPress={handleImport} disabled={importing} color={colors.border} textColor={colors.text} />
        {importMsg ? <Text style={[styles.hint, { color: importMsg.startsWith('✅') ? colors.primary : colors.red, marginTop: spacing.sm }]}>{importMsg}</Text> : null}
      </AccordionCard>

      {/* ── Partager l'application ──────────────────────────────────── */}
      <AccordionCard id="partager" icon="📱" iconBg={colors.indigoLight} title="Partager l'application" expanded={expanded} onToggle={setExpanded}>
        <Text style={styles.hint}>Partagez Carnet Santé PRO avec vos proches ou votre vétérinaire.</Text>
        <View style={styles.qrBlock}>
          <QRCode value={PLAY_STORE_URL} size={150} color={colors.text} backgroundColor={colors.white} />
          <Text style={[styles.hint, { textAlign: 'center', marginTop: spacing.sm }]}>Scanner pour télécharger sur Android</Text>
        </View>
        <Button
          title="📤 Partager le lien"
          onPress={() => Share.share({ message: `Téléchargez Carnet Santé PRO : ${PLAY_STORE_URL}` })}
          color={colors.indigo}
          style={{ marginTop: spacing.md }}
        />
      </AccordionCard>

      {/* ── À propos ────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>À propos</Text>

      <AccordionCard id="faq" icon="❓" iconBg={colors.violetLight} title="FAQ" expanded={expanded} onToggle={setExpanded}>
        {FAQ_SECTIONS.map((section, si) => (
          <View key={si}>
            <Text style={styles.faqCategory}>{section.category}</Text>
            {section.items.map((item, i) => <FAQItem key={i} item={item} last={i === section.items.length - 1} />)}
          </View>
        ))}
      </AccordionCard>

      <AccordionCard id="suggestions" icon="💡" iconBg={colors.yellowLight} title="Suggestions" expanded={expanded} onToggle={setExpanded}>
        <Text style={styles.hint}>Une idée pour améliorer l'application ? Envoyez-nous vos suggestions !</Text>
        <Field label="Votre suggestion">
          <Input
            value={suggestion}
            onChangeText={setSuggestion}
            placeholder="Décrivez votre idée…"
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
        </Field>
        <Button title="📩 Envoyer" onPress={handleSendSuggestion} disabled={!suggestion.trim()} color={colors.yellow} textColor={colors.white} />
      </AccordionCard>

      {/* ── Déconnexion & confidentialité ───────────────────────────── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.privacyLink}>
        <Text style={styles.privacyText}>Politique de confidentialité</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accordionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  accordionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  accordionArrow: {
    fontSize: 11,
    color: colors.textMuted,
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginLeft: 4,
    marginTop: spacing.sm,
  },
  profileLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 2,
  },
  profileValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: spacing.md,
  },
  qrBlock: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  faqCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  faqItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqItemLast: {
    borderBottomWidth: 0,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQ: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    paddingRight: spacing.sm,
  },
  faqArrow: {
    fontSize: 10,
    color: colors.textMuted,
  },
  faqA: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  logoutBtn: {
    backgroundColor: colors.redLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  logoutText: {
    color: colors.red,
    fontWeight: '700',
    fontSize: 15,
  },
  privacyLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xxl,
  },
  privacyText: {
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
