import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Field, Input, Select, IconButton, Row } from './ui';
import { colors, spacing } from '../theme';
import { formatDate, todayStr, addDays } from '../utils/dates';
import { MEDICAMENTS_COURANTS } from '../constants';

// Médication for one animal (mirrors MedicamentsTab in the web app)
export default function MedicamentsSection({ animal, addAnimalItem, deleteAnimalItem }) {
  const today = todayStr();
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [dosage, setDosage] = useState('');
  const [unite, setUnite] = useState('mg');
  const [frequence, setFrequence] = useState('');
  const [duree, setDuree] = useState('');
  const [dateDebut, setDateDebut] = useState(today);

  const handleAdd = () => {
    if (nom && dosage && frequence && duree) {
      const dateFin = addDays(dateDebut, parseInt(duree, 10));
      addAnimalItem(animal, 'medicaments', { nom, dosage, unite, frequence: `${frequence}x/jour`, duree, dateDebut, dateFin });
      setNom(''); setDosage(''); setUnite('mg'); setFrequence(''); setDuree(''); setDateDebut(today);
      setShowForm(false);
    }
  };

  return (
    <View>
      <Text style={styles.title}>💊 Médication de {animal.nom}</Text>

      {showForm ? (
        <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
          <Field label="Médicaments courants">
            <Select selectedValue="" onValueChange={(v) => v && setNom(v)} placeholder="Choisir un médicament courant" items={MEDICAMENTS_COURANTS.map((m) => ({ label: m, value: m }))} />
          </Field>
          <Field label="Nom du médicament">
            <Input value={nom} onChangeText={setNom} placeholder="Nom du médicament" />
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Field label="Dosage" hint=" ">
              <Input value={dosage} onChangeText={setDosage} placeholder="Dosage" keyboardType="numeric" />
            </Field>
            <View style={{ width: 90 }}>
              <Field label="Unité" hint=" ">
                <Select selectedValue={unite} onValueChange={setUnite} items={['g', 'mg', 'ml', 'UI'].map((u) => ({ label: u, value: u }))} />
              </Field>
            </View>
          </Row>
          <Field label="Fréquence (x/jour)">
            <Input value={frequence} onChangeText={setFrequence} placeholder="ex. 2" keyboardType="numeric" />
          </Field>
          <Field label="Durée (jours)">
            <Input value={duree} onChangeText={setDuree} placeholder="ex. 7" keyboardType="numeric" />
          </Field>
          <Field label="Date de début">
            <Input value={dateDebut} onChangeText={setDateDebut} placeholder="AAAA-MM-JJ" />
          </Field>
          <Row style={{ gap: spacing.sm }}>
            <Button title="➕ Ajouter" onPress={handleAdd} color={colors.pink} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Button title="➕ Ajouter un traitement" onPress={() => setShowForm(true)} style={{ marginBottom: spacing.lg }} />
      )}

      <Card>
        {animal.medicaments && animal.medicaments.length > 0 ? (
          animal.medicaments.map((m, i) => {
            const isActive = m.dateFin ? (today >= m.dateDebut && today <= m.dateFin) : false;
            return (
              <View key={m.id || i} style={[styles.item, { borderLeftWidth: 4, borderLeftColor: isActive ? colors.pink : colors.textMuted, paddingLeft: spacing.sm }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{m.nom}</Text>
                  {m.dosage ? <Text style={styles.itemMeta}>💊 {m.dosage} {m.unite} • {m.frequence}</Text> : null}
                  <Text style={styles.itemMeta}>📅 {formatDate(m.dateDebut)}{m.dateFin ? ` → ${formatDate(m.dateFin)}` : ''}</Text>
                  {m.dateFin ? (
                    <View style={[styles.badge, { backgroundColor: isActive ? colors.pinkLight : colors.background }]}>
                      <Text style={[styles.badgeText, { color: isActive ? '#be185d' : colors.textLight }]}>{isActive ? '✅ En cours' : '⏱️ Fini'}</Text>
                    </View>
                  ) : null}
                </View>
                {m.id ? <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'medicaments', m.id)} /> : null}
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>Aucun traitement</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 14, marginTop: 2 },
  empty: { color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
