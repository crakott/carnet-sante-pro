import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing, shadow } from '../theme';
import { formatDate } from '../utils/dates';
import { getJournalEvents } from '../utils/journal';

// Read-only timeline of an animal's life events (mirrors JournalTab in the web app)
export default function JournalSection({ animal }) {
  const events = getJournalEvents(animal);

  return (
    <View>
      <Text style={styles.title}>📖 Journal de vie de {animal.nom}</Text>

      {events.length > 0 ? (
        events.map((e, i) => (
          <View key={i} style={styles.row}>
            <View style={styles.iconColumn}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{e.icon}</Text>
              </View>
              {i < events.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.date}>{formatDate(e.date)}</Text>
              <Text style={styles.eventTitle}>{e.title}</Text>
              {e.detail ? <Text style={styles.detail}>{e.detail}</Text> : null}
              {e.photo ? <Image source={{ uri: e.photo }} style={styles.photo} /> : null}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>
          Aucun souvenir enregistré pour le moment. Ajoutez des vaccins, observations, photos… pour construire l'histoire de {animal.nom} !
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.md },
  iconColumn: { alignItems: 'center' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pinkLight, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  line: { flex: 1, width: 2, backgroundColor: colors.pinkLight, minHeight: spacing.md },
  card: { ...shadow, backgroundColor: colors.white, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md, flex: 1 },
  date: { fontSize: 12, color: colors.textMuted },
  eventTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginTop: 2 },
  detail: { fontSize: 14, color: colors.text, marginTop: spacing.xs },
  photo: { width: '100%', height: 180, borderRadius: 6, marginTop: spacing.sm, resizeMode: 'cover' },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl, backgroundColor: colors.white, borderRadius: 8 },
});
