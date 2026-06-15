import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Screen, ScreenTitle, Card, Button } from '../../components/ui';
import { useAnimals } from '../../context/AnimalsContext';
import { useAuth } from '../../context/AuthContext';
import { getReminders } from '../../utils/reminders';
import { colors, spacing, radius } from '../../theme';

// Open a pre-filled email so the user can send themselves a reminder (mirrors sendEmailReminder)
const sendEmailReminder = (reminder) => {
  const subject = `⚠️ Rappel: ${reminder.nom} expire dans ${reminder.daysUntil} jours`;
  const body = `Bonjour,\n\nRappel: ${reminder.nom} pour ${reminder.animal} expire dans ${reminder.daysUntil} jours.\n\nVeuillez prendre les mesures nécessaires.\n\nCarnet Santé PRO`;
  Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
};

export default function RappelsScreen() {
  const { animals } = useAnimals();
  const { reminderSettings } = useAuth();
  const reminders = getReminders(animals, reminderSettings);

  return (
    <Screen>
      <ScreenTitle>⚠️ Rappels</ScreenTitle>

      {reminders.length > 0 ? (
        <Card style={styles.banner}>
          <Text style={styles.bannerTitle}>À faire urgemment ({reminders.length})</Text>
          {reminders.map((r, i) => (
            <View key={i} style={[styles.item, r.urgent ? styles.itemUrgent : null]}>
              <View style={{ flex: 1 }}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{r.nom}</Text>
                  {r.urgent ? (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>URGENT</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.itemMeta}>Animal: {r.animal}</Text>
                <Text style={styles.itemMeta}>⏰ {r.daysUntil} jours restants</Text>
              </View>
              <Button title="📧 Rappel email" onPress={() => sendEmailReminder(r)} color={colors.yellow} />
            </View>
          ))}
        </Card>
      ) : (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>✅ Aucun rappel pour le moment</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.yellowLight, borderLeftWidth: 4, borderLeftColor: colors.yellow },
  bannerTitle: { color: '#d97706', fontWeight: '700', marginBottom: spacing.md, fontSize: 16 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.yellowBorder,
    gap: spacing.sm,
  },
  itemUrgent: { borderWidth: 2, borderColor: colors.red },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 13, marginTop: 2 },
  urgentBadge: { backgroundColor: colors.red, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  urgentBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center' },
  emptyText: { color: colors.textLight },
});
