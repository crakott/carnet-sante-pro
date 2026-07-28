import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, IconButton, Row } from './ui';
import PoidsChart from './PoidsChart';
import { colors, spacing } from '../theme';
import { formatDate, todayStr } from '../utils/dates';

export default function PoidsSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const today = todayStr();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [valeur, setValeur] = useState('');
  const [date, setDate] = useState(today);

  const poids = animal.poids || [];
  const sortedDesc = [...poids].sort((a, b) => new Date(b.date) - new Date(a.date));

  const openAdd = () => {
    setEditingId(null);
    setValeur('');
    setDate(today);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setValeur(String(p.valeur));
    setDate(p.date);
    setShowForm(true);
  };

  const handleSave = () => {
    const val = parseFloat(valeur);
    if (!val) return;
    if (editingId) {
      updateAnimalItem(animal, 'poids', editingId, { valeur: val, date });
    } else {
      addAnimalItem(animal, 'poids', { valeur: val, date });
    }
    setValeur('');
    setDate(today);
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <View>
      <Text style={styles.title}>⚖️ Suivi du poids de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.primary }}>
          <Field label="Poids (kg)">
            <Input value={valeur} onChangeText={setValeur} placeholder="Poids (kg)" keyboardType="numeric" />
          </Field>
          <Field label="Date">
            <Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Button title={editingId ? '✏️ Modifier' : '➕ Ajouter'} onPress={handleSave} color={colors.primary} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter une mesure" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
      )}

      {poids.length >= 2 ? (
        <Card>
          <Text style={styles.cardHeading}>📈 Courbe d'évolution</Text>
          <PoidsChart poids={poids} />
        </Card>
      ) : null}

      {poids.length > 0 ? (
        <Card style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={styles.statValue}>{Math.min(...poids.map((p) => p.valeur)).toFixed(1)} kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Moy</Text>
            <Text style={styles.statValue}>{(poids.reduce((s, p) => s + p.valeur, 0) / poids.length).toFixed(1)} kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={styles.statValue}>{Math.max(...poids.map((p) => p.valeur)).toFixed(1)} kg</Text>
          </View>
        </Card>
      ) : null}

      {sortedDesc.length > 0 ? (
        sortedDesc.map((p, i) => (
          <Card key={p.id || i} accentColor={colors.primary} style={styles.item}>
            <View>
              <Text style={styles.itemValue}>{p.valeur} kg</Text>
              <Text style={styles.itemMeta}>{formatDate(p.date)}</Text>
            </View>
            {p.id ? (
              <Row style={{ gap: 4 }}>
                <IconButton title="✏️" color={colors.primary} bg={colors.greenLight} onPress={() => openEdit(p)} />
                <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'poids', p.id)} />
              </Row>
            ) : null}
          </Card>
        ))
      ) : (
        <Text style={styles.empty}>Aucune mesure enregistrée</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  cardHeading: { fontSize: 14, fontWeight: '700', marginBottom: spacing.md, color: colors.text },
  statsCard: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.greenLight, borderRadius: 6, padding: spacing.sm, alignItems: 'center' },
  statLabel: { color: colors.textLight, fontSize: 11 },
  statValue: { color: colors.primary, fontWeight: '700', marginTop: 2 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  itemMeta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
});
