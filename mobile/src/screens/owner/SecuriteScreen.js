import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Screen } from '../../components/ui';
import { URGENCES_OFFICIELS, ALIMENTS_DANGEREUX, PLANTES_TOXIQUES, GUIDE_PREMIERS_SECOURS, VETERINAIRES } from '../../constants';
import { colors, spacing, radius } from '../../theme';

const CITY_ORDER = ['Paris', 'Lyon', 'Marseille', 'Montpellier', 'Toulouse', 'Bordeaux', 'Nantes', 'Strasbourg', 'Lille', 'Rennes', 'Grenoble', 'Rouen', 'Clermont-Ferrand'];

function groupVetsByCity() {
  const map = {};
  VETERINAIRES.forEach((v) => {
    const c = v.region || 'Autres';
    if (!map[c]) map[c] = [];
    map[c].push(v);
  });
  return CITY_ORDER
    .filter(c => map[c])
    .map(c => ({ city: c, vets: map[c] }));
}

function ClinicCard({ vet }) {
  return (
    <View style={styles.clinicCard}>
      <View style={styles.clinicInfo}>
        <Text style={styles.clinicNom}>{vet.nom}</Text>
        {vet.adresse ? <Text style={styles.clinicDetail}>📍 {vet.adresse}</Text> : null}
        {vet.horaires ? <Text style={styles.clinicDetail}>⏰ {vet.horaires}</Text> : null}
      </View>
      {vet.telephone ? (
        <TouchableOpacity
          style={styles.clinicCallBtn}
          onPress={() => Linking.openURL(`tel:${vet.telephone.replace(/\s/g, '')}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.clinicCallIcon}>📞</Text>
          <Text style={styles.clinicCallNum}>{vet.telephone}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function CliniquesAccordion() {
  const [open, setOpen] = useState(false);
  const groups = groupVetsByCity();
  const total = groups.length;
  return (
    <View style={styles.cliniquesOuter}>
      <TouchableOpacity style={styles.cliniquesHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
        <Text style={styles.cliniquesHeaderIcon}>🏙️</Text>
        <Text style={styles.cliniquesHeaderTitle}>Cliniques d'urgence par ville</Text>
        <Text style={styles.cliniquesHeaderCount}>({total} villes)</Text>
        <Text style={styles.cityChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && groups.map(({ city, vets }) => (
        <View key={city}>
          <View style={styles.citySectionHeader}>
            <Text style={styles.cityIcon}>🏙️</Text>
            <Text style={styles.citySectionTitle}>{city.toUpperCase()}</Text>
          </View>
          {vets.map(vet => <ClinicCard key={vet.id} vet={vet} />)}
        </View>
      ))}
    </View>
  );
}

const RISK_COLOR = { MORTEL: '#dc2626', 'ÉLEVÉ': '#f97316', MODÉRÉ: '#d97706' };
const RISK_BG = { MORTEL: '#fee2e2', 'ÉLEVÉ': '#fff7ed', MODÉRÉ: '#fef3c7' };

function RiskBadge({ level }) {
  return (
    <View style={[styles.riskBadge, { backgroundColor: RISK_BG[level] }]}>
      <Text style={[styles.riskText, { color: RISK_COLOR[level] }]}>{level}</Text>
    </View>
  );
}

function ExpandableItem({ item, riskKey = 'risque' }) {
  const [open, setOpen] = useState(false);
  const level = item[riskKey];
  return (
    <TouchableOpacity onPress={() => setOpen((o) => !o)} activeOpacity={0.75} style={styles.itemRow}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIcon}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemNom}>{item.nom}</Text>
          <Text style={styles.itemEspeces}>{item.especes.join(', ')}</Text>
        </View>
        <RiskBadge level={level} />
        <Text style={styles.itemArrow}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && (
        <View style={styles.itemBody}>
          <Text style={styles.bodyLabel}>⚠️ Symptômes</Text>
          <Text style={styles.bodyText}>{item.symptomes}</Text>
          <Text style={[styles.bodyLabel, { marginTop: spacing.sm }]}>ℹ️ Détail</Text>
          <Text style={styles.bodyText}>{item.detail}</Text>
          {item.urgence && (
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:0240687740')}>
              <Text style={styles.callBtnText}>📞 Antipoison : 02 40 68 77 40</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function FirstAidCard({ guide }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity onPress={() => setOpen((o) => !o)} activeOpacity={0.75} style={[styles.itemRow, { borderLeftWidth: 4, borderLeftColor: guide.couleur }]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIcon}>{guide.icon}</Text>
        <Text style={[styles.itemNom, { flex: 1 }]}>{guide.titre}</Text>
        {guide.urgence && <View style={styles.urgBadge}><Text style={styles.urgBadgeText}>URGENT</Text></View>}
        <Text style={styles.itemArrow}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && (
        <View style={styles.itemBody}>
          <Text style={styles.bodyLabel}>🔍 Reconnaître</Text>
          {guide.symptomes.map((s, i) => <Text key={i} style={styles.bulletItem}>• {s}</Text>)}

          <Text style={[styles.bodyLabel, { marginTop: spacing.md, color: '#065f46' }]}>✅ À faire</Text>
          {guide.faire.map((f, i) => <Text key={i} style={[styles.bulletItem, { color: '#065f46' }]}>• {f}</Text>)}

          <Text style={[styles.bodyLabel, { marginTop: spacing.md, color: colors.red }]}>🚫 À ne PAS faire</Text>
          {guide.ne_pas_faire.map((n, i) => <Text key={i} style={[styles.bulletItem, { color: '#b91c1c' }]}>• {n}</Text>)}

          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:3115')}>
            <Text style={styles.callBtnText}>📞 Appeler le 3115 (gratuit)</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function SecuriteScreen() {
  return (
    <Screen>
      <Text style={styles.pageTitle}>🆘 Urgences & Santé</Text>
      <Text style={styles.pageSubtitle}>Numéros d'urgence, premiers secours et toxiques courants.</Text>

      <SectionTitle>NUMÉROS D'URGENCE</SectionTitle>
      {URGENCES_OFFICIELS.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={[styles.urgenceCard, { borderLeftColor: c.couleur, backgroundColor: c.couleurBg }]}
          onPress={() => Linking.openURL(`tel:${c.telBrut}`)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.urgenceNom, { color: c.couleur }]}>{c.nom}</Text>
            <Text style={styles.urgenceInfo}>{c.info}</Text>
          </View>
          <View style={[styles.urgenceTelBox, { backgroundColor: c.couleur }]}>
            <Text style={styles.urgenceTel}>{c.telAffiche}</Text>
            <Text style={styles.urgenceTelLabel}>Appeler</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Cliniques d'urgence */}
      <SectionTitle>CLINIQUES D'URGENCE PAR VILLE</SectionTitle>
      <CliniquesAccordion />

      {/* Premiers secours */}
      <SectionTitle>PREMIERS SECOURS</SectionTitle>
      {GUIDE_PREMIERS_SECOURS.map((g) => <FirstAidCard key={g.id} guide={g} />)}

      {/* Aliments dangereux */}
      <SectionTitle>⚠️ Aliments dangereux</SectionTitle>
      <Text style={styles.hint}>Appuyez sur un aliment pour voir les risques et les symptômes.</Text>
      {ALIMENTS_DANGEREUX.map((a) => <ExpandableItem key={a.nom} item={a} riskKey="risque" />)}

      {/* Plantes toxiques */}
      <SectionTitle>🌿 Plantes toxiques</SectionTitle>
      <Text style={styles.hint}>Appuyez sur une plante pour voir le niveau de danger et les symptômes.</Text>
      {PLANTES_TOXIQUES.map((p) => <ExpandableItem key={p.nom} item={p} riskKey="niveau" />)}

      <Text style={styles.sources}>Sources : Ordre National des Vétérinaires · CNITV · CAPAE-Ouest · SantéVet</Text>
      <View style={{ height: 40 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: colors.textLight, marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  sources: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
  cliniquesOuter: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cliniquesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cliniquesHeaderIcon: { fontSize: 18 },
  cliniquesHeaderTitle: { flex: 1, fontWeight: '700', fontSize: 14, color: colors.text },
  cliniquesHeaderCount: { fontSize: 12, color: colors.textMuted },
  cityChevron: { fontSize: 10, color: colors.textMuted, marginLeft: 4 },
  citySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cityIcon: { fontSize: 14 },
  citySectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  clinicCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clinicInfo: { marginBottom: spacing.sm },
  clinicNom: { fontWeight: '700', fontSize: 14, color: colors.text, marginBottom: 4 },
  clinicDetail: { fontSize: 12, color: colors.textLight, marginBottom: 2 },
  clinicCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#d1fae5',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  clinicCallIcon: { fontSize: 16 },
  clinicCallNum: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  urgenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderLeftWidth: 5,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  urgenceNom: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  urgenceInfo: { fontSize: 11, color: colors.textLight },
  urgenceTelBox: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', minWidth: 70 },
  urgenceTel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  urgenceTelLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 1 },
  itemRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  itemIcon: { fontSize: 22, width: 30 },
  itemNom: { fontWeight: '600', color: colors.text, fontSize: 14 },
  itemEspeces: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  riskBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, marginRight: spacing.xs },
  riskText: { fontSize: 10, fontWeight: '700' },
  itemArrow: { fontSize: 10, color: colors.textMuted, marginLeft: 4 },
  itemBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  bodyLabel: { fontSize: 12, fontWeight: '700', color: colors.textLight, marginBottom: spacing.xs, textTransform: 'uppercase' },
  bodyText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  bulletItem: { fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 3 },
  callBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.red,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  urgBadge: { backgroundColor: '#fee2e2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: spacing.xs },
  urgBadgeText: { fontSize: 9, fontWeight: '700', color: '#dc2626' },
});
