import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Share, Linking, Switch } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Screen, Field, Input, Button } from '../../components/ui';
import { scheduleAnimalNotifications, cancelAllNotifications } from '../../utils/notifications';
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
      { q: 'Mon animal a mangé du chocolat.', a: 'Le chocolat peut être toxique, d\'autant plus s\'il est noir ou riche en cacao. La gravité dépend de la quantité ingérée et du poids de l\'animal. Contactez rapidement un vétérinaire et gardez l\'emballage à portée de main pour préciser le type et la quantité.' },
      { q: 'Mon animal a avalé un objet.', a: 'Surveillez-le attentivement et consultez rapidement si des symptômes apparaissent.' },
      { q: 'Mon animal ne mange plus depuis 24 heures.', a: 'Une absence prolongée d\'alimentation doit être prise au sérieux, particulièrement chez le chat.' },
      { q: 'Comment reconnaître un coup de chaleur ?', a: 'Les signes fréquents sont un halètement intense, une bave épaisse, un abattement, une démarche titubante, parfois des vomissements ou une perte de connaissance. C\'est une urgence vitale.' },
      { q: 'Que faire en cas de coup de chaleur ?', a: 'Placez l\'animal à l\'ombre dans un endroit frais, rafraîchissez-le progressivement avec de l\'eau tempérée (jamais glacée) et contactez immédiatement un vétérinaire. Ne laissez jamais un animal seul dans une voiture, même quelques minutes et même à l\'ombre.' },
      { q: 'Quand consulter en urgence ?', a: 'Consultez rapidement en cas de :\n• difficultés respiratoires\n• convulsions\n• saignements importants\n• perte de connaissance\n• suspicion d\'intoxication\n• traumatisme important' },
    ],
  },
  {
    category: '🌿 Plantes et produits dangereux',
    items: [
      { q: 'Quelles plantes sont dangereuses ?', a: 'Plusieurs plantes courantes sont toxiques. Le lys (ou lis) est particulièrement dangereux pour le chat : même une petite quantité, le pollen ou l\'eau du vase peuvent provoquer une atteinte grave. En cas de doute, éloignez la plante et contactez un vétérinaire.' },
      { q: 'Quels produits ménagers présentent un risque ?', a: 'L\'antigel, les produits d\'entretien, les médicaments humains et certains insecticides sont toxiques. L\'antigel est particulièrement traître : son goût sucré attire les animaux. Rangez ces produits hors de portée et consultez en urgence en cas d\'ingestion.' },
      { q: 'Mon animal a ingéré une plante ou un produit toxique.', a: 'Ne tentez pas de le faire vomir sans avis professionnel. Notez ce qu\'il a ingéré et en quelle quantité, gardez l\'emballage si possible, et contactez rapidement un vétérinaire ou un centre antipoison vétérinaire.\n\nCentres antipoison animaux (France) :\n• CNITV Lyon : 04 78 87 10 40\n• CAPAE-Ouest Nantes : 02 40 68 77 40' },
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
  const { reminderSettings, saveReminderSettings, householdId, user, logout, nom, prenom, notificationsEnabled: savedNotifEnabled } = useAuth();
  const { animals, saveAnimal, createHousehold, joinHousehold, leaveHousehold } = useAnimals();

  const [expanded, setExpanded] = useState(null);
  const [settings, setSettings] = useState(reminderSettings);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Emergency contacts
  const [urgenceContacts, setUrgenceContacts] = useState([]);
  const [newContactNom, setNewContactNom] = useState('');
  const [newContactTel, setNewContactTel] = useState('');

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'settings', user.uid)).then((snap) => {
      if (snap.exists()) setUrgenceContacts(snap.data().urgenceContacts || []);
    }).catch(() => {});
  }, [user]);

  const saveUrgenceContacts = async (contacts) => {
    setUrgenceContacts(contacts);
    if (!user) return;
    await setDoc(doc(db, 'settings', user.uid), { urgenceContacts: contacts }, { merge: true });
  };

  const addUrgenceContact = () => {
    if (!newContactNom.trim() || !newContactTel.trim()) return;
    const updated = [...urgenceContacts, { id: Date.now().toString(), nom: newContactNom.trim(), tel: newContactTel.trim() }];
    saveUrgenceContacts(updated);
    setNewContactNom('');
    setNewContactTel('');
  };

  const deleteUrgenceContact = (id) => {
    saveUrgenceContacts(urgenceContacts.filter((c) => c.id !== id));
  };

  // Household section states
  const [householdMembers, setHouseholdMembers] = useState(null);
  const [householdCode, setHouseholdCode] = useState('');
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [householdError, setHouseholdError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Sync local toggle: only ON if both the saved pref and system permission are granted
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(savedNotifEnabled && status === 'granted');
    });
  }, [savedNotifEnabled]);

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

  // ── Notifications ──────────────────────────────────────────────────────────
  const toggleNotifications = async () => {
    setNotifLoading(true);
    if (!notificationsEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
        await setDoc(doc(db, 'settings', user.uid), { notificationsEnabled: true }, { merge: true });
        const count = await scheduleAnimalNotifications(animals, settings);
        Alert.alert('🔔 Notifications activées', `${count} rappel${count !== 1 ? 's' : ''} push programmé${count !== 1 ? 's' : ''}.`);
      } else {
        Alert.alert('Permission refusée', "Activez les notifications dans les réglages de votre appareil puis réessayez.");
      }
    } else {
      setNotificationsEnabled(false);
      await setDoc(doc(db, 'settings', user.uid), { notificationsEnabled: false }, { merge: true });
      await cancelAllNotifications();
    }
    setNotifLoading(false);
  };

  const handleScheduleNotifications = async () => {
    setScheduling(true);
    try {
      await saveReminderSettings(settings);
      const count = await scheduleAnimalNotifications(animals, settings);
      Alert.alert('✅ Rappels mis à jour', `${count} notification${count !== 1 ? 's' : ''} programmée${count !== 1 ? 's' : ''}.`);
    } catch {
      Alert.alert('Erreur', 'Impossible de planifier les notifications.');
    }
    setScheduling(false);
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
        {(prenom || nom) ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.profileLabel}>Nom complet</Text>
            <Text style={styles.profileValue}>{[prenom, nom].filter(Boolean).join(' ')}</Text>
          </View>
        ) : null}
        <Text style={styles.profileLabel}>Adresse e-mail</Text>
        <Text style={styles.profileValue}>{user?.email || '—'}</Text>
      </AccordionCard>

      {/* ── Notifications ───────────────────────────────────────────── */}
      <AccordionCard id="notifications" icon="🔔" iconBg={colors.pinkLight} title="Notifications" expanded={expanded} onToggle={setExpanded}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Activer les notifications push</Text>
            <Text style={styles.hint}>Recevez des alertes pour les soins à venir de vos animaux.</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            disabled={notifLoading}
          />
        </View>
        {notificationsEnabled && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.hint, { marginBottom: spacing.md }]}>Être prévenu X jours avant :</Text>
            <Field label="💉 Vaccins">
              <Input value={String(settings.vaccin)} onChangeText={(v) => update('vaccin', v)} keyboardType="numeric" />
            </Field>
            <Field label="💊 Traitements">
              <Input value={String(settings.medicament)} onChangeText={(v) => update('medicament', v)} keyboardType="numeric" />
            </Field>
            <Field label="🦟 Antiparasitaires">
              <Input value={String(settings.antiparasitaire)} onChangeText={(v) => update('antiparasitaire', v)} keyboardType="numeric" />
            </Field>
            <Field label="🪱 Vermifuges">
              <Input value={String(settings.vermifuge)} onChangeText={(v) => update('vermifuge', v)} keyboardType="numeric" />
            </Field>
            <Button
              title={scheduling ? '⏳ Planification…' : '🔔 Planifier les rappels push'}
              onPress={handleScheduleNotifications}
              disabled={scheduling}
              color={colors.primary}
            />
          </>
        )}
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
        <View style={styles.faqDisclaimer}>
          <Text style={styles.faqDisclaimerText}>⚠️ Les informations de cette FAQ sont fournies à titre indicatif et ne remplacent en aucun cas une consultation vétérinaire. En cas de doute ou d'urgence, contactez toujours un professionnel.</Text>
        </View>
        {FAQ_SECTIONS.map((section, si) => (
          <View key={si}>
            <Text style={styles.faqCategory}>{section.category}</Text>
            {section.items.map((item, i) => <FAQItem key={i} item={item} last={i === section.items.length - 1} />)}
          </View>
        ))}
      </AccordionCard>

      <AccordionCard id="urgence" icon="🆘" iconBg="#fee2e2" title="Contacts d'urgence" expanded={expanded} onToggle={setExpanded}>
        <Text style={styles.hint}>Enregistrez vos contacts d'urgence (véto habituel, antipoison, pension…)</Text>
        {urgenceContacts.map((c) => (
          <View key={c.id} style={styles.contactRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactNom}>{c.nom}</Text>
              <Text style={styles.contactTel} onPress={() => Linking.openURL(`tel:${c.tel}`)}>{c.tel}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteUrgenceContact(c.id)} style={styles.contactDelete}>
              <Text style={{ color: colors.red }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Field label="Nom du contact">
          <Input value={newContactNom} onChangeText={setNewContactNom} placeholder="ex. Clinique Saint-Germain" />
        </Field>
        <Field label="Téléphone">
          <Input value={newContactTel} onChangeText={setNewContactTel} placeholder="06 XX XX XX XX" keyboardType="phone-pad" />
        </Field>
        <Button title="➕ Ajouter" onPress={addUrgenceContact} color="#ef4444" disabled={!newContactNom.trim() || !newContactTel.trim()} />
      </AccordionCard>

      <AccordionCard id="suggestions" icon="💡" iconBg={colors.yellowLight} title="Suggestions" expanded={expanded} onToggle={setExpanded}>
        <Text style={styles.hint}>Une idée pour améliorer l'application ? Un bug à signaler ? Écrivez-nous !</Text>
        <Input
          value={suggestion}
          onChangeText={setSuggestion}
          placeholder="Votre suggestion..."
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.md }}
        />
        <Button title="📧 Envoyer la suggestion" onPress={handleSendSuggestion} disabled={!suggestion.trim()} color={colors.primary} />
      </AccordionCard>

      {/* ── Déconnexion & confidentialité ───────────────────────────── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.privacyLink}>
        <Text style={styles.privacyText}>Politique de confidentialité</Text>
      </TouchableOpacity>

      <View style={styles.copyright}>
        <Text style={styles.copyrightText}>© 2025 Christopher Rakotoson</Text>
        <Text style={styles.copyrightText}>All rights reserved</Text>
        <Text style={styles.copyrightSub}>Logiciel propriétaire — toute copie ou redistribution est interdite.</Text>
      </View>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
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
  faqDisclaimer: {
    backgroundColor: colors.yellowLight,
    borderWidth: 1,
    borderColor: colors.yellowBorder,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  faqDisclaimerText: {
    fontSize: 12,
    color: colors.brown,
    lineHeight: 17,
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
  copyright: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xxl,
    gap: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  copyrightSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  contactNom: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  contactTel: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  contactDelete: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.redLight,
  },
});
