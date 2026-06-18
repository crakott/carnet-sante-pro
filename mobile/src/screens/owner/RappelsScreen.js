import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Screen, ScreenTitle, Card } from '../../components/ui';
import AdBanner from '../../components/AdBanner';
import { useAnimals } from '../../context/AnimalsContext';
import { useAuth } from '../../context/AuthContext';
import { getReminders, getAnimalAllScheduled } from '../../utils/reminders';
import { colors, spacing, radius } from '../../theme';

const TYPE_ICONS = { vaccin: '💉', medicament: '💊', antiparasitaire: '🦟', vermifuge: '🪱' };
const TYPE_LABELS = { vaccin: 'Vaccin', medicament: 'Médicament', antiparasitaire: 'Antiparasitaire', vermifuge: 'Vermifuge' };
const TYPE_BG = { vaccin: '#ecfdf5', medicament: '#fce7f3', antiparasitaire: '#fefce8', vermifuge: '#f5f3ff' };

const sendEmailReminder = (r) => {
  const status = r.daysUntil <= 0 ? `en retard de ${Math.abs(r.daysUntil)} jours` : `dans ${r.daysUntil} jours`;
  const subject = encodeURIComponent(`⚠️ Rappel : ${r.nom} (${r.animal})`);
  const body = encodeURIComponent(`Bonjour,\n\nRappel : ${r.nom} pour ${r.animal} est ${status}.\n\nCarnet Santé PRO`);
  Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
};

function CountdownBadge({ daysUntil }) {
  const overdue = daysUntil <= 0;
  const text = overdue ? `En retard de ${Math.abs(daysUntil)} j` : `Dans ${daysUntil} j`;
  return (
    <View style={[styles.badge, overdue ? styles.badgeRed : styles.badgeGreen]}>
      <Text style={[styles.badgeText, overdue ? styles.badgeTextRed : styles.badgeTextGreen]}>{text}</Text>
    </View>
  );
}

export default function RappelsScreen() {
  const { animals } = useAnimals();
  const { reminderSettings } = useAuth();
  const urgents = getReminders(animals, reminderSettings);

  return (
    <Screen>
      <ScreenTitle>⚠️ Rappels</ScreenTitle>

      {urgents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>À FAIRE URGEMMENT ({urgents.length})</Text>
          {urgents.map((r, i) => (
            <Card key={i} style={styles.urgentCard}>
              <View style={styles.urgentRow}>
                <View style={[styles.iconBox, { backgroundColor: TYPE_BG[r.type] || colors.greenLight }]}>
                  <Text style={styles.iconText}>{TYPE_ICONS[r.type] || '📅'}</Text>
                </View>
                <View style={styles.urgentInfo}>
                  <View style={styles.urgentTitleRow}>
                    <Text style={styles.urgentTitle}>{r.nom}</Text>
                    {r.urgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.urgentMeta}>
                    {r.animal} • {r.daysUntil <= 0 ? `en retard de ${Math.abs(r.daysUntil)} jours` : `dans ${r.daysUntil} jours`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.emailBtn} onPress={() => sendEmailReminder(r)}>
                  <Text style={styles.emailBtnIcon}>📅</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      )}

      {animals.map((animal) => {
        const scheduled = getAnimalAllScheduled(animal);
        return (
          <View key={animal.id} style={styles.section}>
            <View style={styles.animalHeader}>
              <Text style={styles.calIcon}>📅</Text>
              <Text style={styles.animalName}>{animal.nom.toUpperCase()}</Text>
            </View>
            <Card style={styles.animalCard}>
              {scheduled.length === 0 ? (
                <Text style={styles.emptyAnimal}>Aucune échéance enregistrée</Text>
              ) : (
                scheduled.map((item, i) => (
                  <View key={i} style={[styles.itemRow, i < scheduled.length - 1 && styles.itemBorder]}>
                    <View style={[styles.iconBox, { backgroundColor: TYPE_BG[item.type] || colors.greenLight }]}>
                      <Text style={styles.iconText}>{TYPE_ICONS[item.type] || '📅'}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.nom}</Text>
                      <Text style={styles.itemType}>{TYPE_LABELS[item.type] || ''}</Text>
                    </View>
                    <CountdownBadge daysUntil={item.daysUntil} />
                  </View>
                ))
              )}
            </Card>
          </View>
        );
      })}

      {animals.length === 0 && (
        <Card style={styles.emptyState}>
          <Text style={styles.emptyStateText}>✅ Aucun animal enregistré</Text>
        </Card>
      )}

      <AdBanner />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  urgentCard: {
    marginBottom: spacing.sm,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  urgentInfo: {
    flex: 1,
  },
  urgentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  urgentTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.text,
  },
  urgentBadge: {
    backgroundColor: colors.red,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  urgentMeta: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  emailBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBtnIcon: {
    fontSize: 18,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  calIcon: {
    fontSize: 16,
  },
  animalName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  animalCard: {
    padding: 0,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.text,
  },
  itemType: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeRed: {
    backgroundColor: colors.redLight,
  },
  badgeGreen: {
    backgroundColor: colors.pillGreenBg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextRed: {
    color: colors.red,
  },
  badgeTextGreen: {
    color: colors.pillGreenText,
  },
  emptyAnimal: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textLight,
  },
});
