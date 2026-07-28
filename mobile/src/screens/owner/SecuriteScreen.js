import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Screen } from '../../components/ui';
import { URGENCES_OFFICIELS, ALIMENTS_DANGEREUX, PLANTES_TOXIQUES, GUIDE_PREMIERS_SECOURS, VETERINAIRES } from '../../constants';
import { colors, spacing, radius } from '../../theme';

const REGION_LABEL = {
  'Paris & Île-de-France': 'Paris / Île-de-France',
  'Lyon & Auvergne-Rhône-Alpes': 'Lyon',
  'Marseille & PACA': 'Marseille',
  'Toulouse & Occitanie': 'Toulouse',
  'Bordeaux & Nouvelle-Aquitaine': 'Bordeaux',
  'Grand Est & Bourgogne': 'Est & Bourgogne',
  'Hauts-de-France': 'Hauts-de-France',
  'Bretagne & Pays de la Loire': 'Bretagne & Loire',
  'Normandie': 'Normandie',
};

function groupVetsByRegion() {
  const map = {};
  VETERINAIRES.forEach((v) => {
    const r = v.region || 'Autres';
    if (!map[r]) map[r] = [];
    map[r].push(v);
  });
  return Object.entries(map).map(([region, vets]) => ({ region, label: REGION_LABEL[region] || region, vets }));
}

function CliniqueCityAccordion({ label, vets }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.cityAccordion}>
      <TouchableOpacity style={styles.cityAccordionHd} onPress={() => setOpen((o) => !o)} activeOpacity={0.75}>
        <Text style={styles.cityIcon}>🏙️</Text>
        <Text style={styles.cityTitle}>{label}</Text>
        <Text style={styles.cityChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && vets.map((vet) => (
        <View key={vet.id} style={styles.clinicRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clinicNom}>{vet.nom}</Text>
            {vet.horaires ? <Text style={styles.clinicDetail}>⏰ {vet.horaires}</Text> : null}
            {vet.adresse ? <Text style={styles.clinicDetail}>🏠 {vet.adresse}</Text> : null}
          </View>
          {vet.telephone ? (
            <TouchableOpacity style={styles.clinicCallBtn} onPress={() => Linking.openURL(`tel:${vet.telephone.replace(/\s/g, '')}`)}>
              <Text style={styles.clinicCallText}>📞</Text>
            </TouchableOpacity>
          ) : null}
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
  const clinicGroups = groupVetsByRegion();
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
      <SectionTitle>CLINIQUES D'URGENCE 24H/24 PAR VILLE</SectionTitle>
      {clinicGroups.map(({ region, label, vets }) => (
        <CliniqueCityAccordion key={region} label={label} vets={vets} />
      ))}

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
  cityAccordion: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cityAccordionHd: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cityIcon: { fontSize: 18 },
  cityTitle: { flex: 1, fontWeight: '600', fontSize: 14, color: colors.text },
  cityChevron: { fontSize: 10, color: colors.textMuted },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  clinicNom: { fontWeight: '600', fontSize: 13, color: colors.text, marginBottom: 2 },
  clinicDetail: { fontSize: 11, color: colors.textLight },
  clinicCallBtn: { backgroundColor: '#d1fae5', borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  clinicCallText: { fontSize: 18 },
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
