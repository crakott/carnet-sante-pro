import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Card, Button, Field, Input, Row } from './ui';
import { colors, spacing, radius } from '../theme';
import { formatDate, todayStr, addDays } from '../utils/dates';
import { MEDICAMENTS_CATEGORIES } from '../constants';

export default function MedicamentsSection({ animal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
  const today = todayStr();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nom, setNom] = useState('');
  const [dosage, setDosage] = useState('');
  const [unite, setUnite] = useState('mg');
  const [frequence, setFrequence] = useState('');
  const [duree, setDuree] = useState('');
  const [dateDebut, setDateDebut] = useState(today);
  const [rappelJours, setRappelJours] = useState('');

  const resetForm = () => {
    setNom(''); setDosage(''); setUnite('mg'); setFrequence('');
    setDuree(''); setDateDebut(today); setRappelJours('');
  };

  const openAdd = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setNom(item.nom || '');
    setDosage(item.dosage || '');
    setUnite(item.unite || 'mg');
    setFrequence((item.frequence || '').replace('x/jour', ''));
    setDuree(item.duree || '');
    setDateDebut(item.dateDebut || today);
    setRappelJours(item.rappelJours != null ? String(item.rappelJours) : '');
    setShowForm(true);
  };

  const handleSave = () => {
    if (!nom || !dosage || !frequence || !duree) return;
    const dateFin = addDays(dateDebut, parseInt(duree, 10));
    const data = {
      nom,
      dosage,
      unite,
      frequence: `${frequence}x/jour`,
      duree,
      dateDebut,
      dateFin,
      ...(rappelJours !== '' ? { rappelJours: parseInt(rappelJours, 10) } : {}),
    };
    if (editingId) {
      updateAnimalItem(animal, 'medicaments', editingId, data);
    } else {
      addAnimalItem(animal, 'medicaments', data);
    }
    resetForm();
    setShowForm(false);
    setEditingId(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <View>
      <Text style={styles.title}>💊 Traitements de {animal.nom}</Text>

      {!showForm ? (
        <Button title="➕ Ajouter un traitement" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
      ) : (
        <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
          <Text style={styles.formTitle}>{editingId ? '✏️ Modifier le traitement' : '➕ Nouveau traitement'}</Text>

          <Field label="Sélectionner un médicament courant">
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue=""
                onValueChange={(v) => { if (v && !v.startsWith('__cat__')) setNom(v); }}
                style={styles.picker}
              >
                <Picker.Item label="Choisir dans la liste..." value="" />
                {MEDICAMENTS_CATEGORIES.map((cat) => [
                  <Picker.Item
                    key={`__cat__${cat.cat}`}
                    label={`── ${cat.cat} ──`}
                    value={`__cat__${cat.cat}`}
                    enabled={false}
                    color="#9ca3af"
                  />,
                  ...cat.items.map((m) => (
                    <Picker.Item key={m} label={m} value={m} />
                  )),
                ]).flat()}
              </Picker>
            </View>
          </Field>

          <Field label="Nom du médicament">
            <Input value={nom} onChangeText={setNom} placeholder="Nom du médicament" />
          </Field>

          <Row style={{ gap: spacing.sm }}>
            <Field label="Dosage" hint=" ">
              <Input value={dosage} onChangeText={setDosage} placeholder="ex. 250" keyboardType="numeric" />
            </Field>
            <View style={{ width: 90 }}>
              <Field label="Unité" hint=" ">
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={unite} onValueChange={setUnite} style={styles.pickerSmall}>
                    {['g', 'mg', 'ml', 'UI'].map((u) => <Picker.Item key={u} label={u} value={u} />)}
                  </Picker>
                </View>
              </Field>
            </View>
          </Row>

          <Row style={{ gap: spacing.sm }}>
            <Field label="Fréquence (x/jour)" hint=" ">
              <Input value={frequence} onChangeText={setFrequence} placeholder="ex. 2" keyboardType="numeric" />
            </Field>
            <Field label="Durée (jours)" hint=" ">
              <Input value={duree} onChangeText={setDuree} placeholder="ex. 7" keyboardType="numeric" />
            </Field>
          </Row>

          <Row style={{ gap: spacing.sm }}>
            <Field label="Date de début" hint=" ">
              <Input value={dateDebut} onChangeText={setDateDebut} placeholder="AAAA-MM-JJ" />
            </Field>
            <Field label="Rappel (jours avant fin)" hint=" ">
              <Input value={rappelJours} onChangeText={setRappelJours} placeholder="ex. 3" keyboardType="numeric" />
            </Field>
          </Row>

          <Row style={{ gap: spacing.sm }}>
            <Button title={editingId ? '✅ Enregistrer' : '➕ Ajouter'} onPress={handleSave} color={colors.pink} style={{ flex: 1 }} />
            <Button title="Annuler" onPress={handleCancel} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}

      <Card>
        {animal.medicaments && animal.medicaments.length > 0 ? (
          animal.medicaments.map((m, i) => {
            const isActive = m.dateFin ? (today >= m.dateDebut && today <= m.dateFin) : false;
            return (
              <View key={m.id || i} style={[styles.item, { borderLeftColor: isActive ? colors.pink : colors.textMuted }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{m.nom}</Text>
                  {m.dosage ? <Text style={styles.itemMeta}>💊 {m.dosage} {m.unite} • {m.frequence}</Text> : null}
                  <Text style={styles.itemMeta}>📅 {formatDate(m.dateDebut)}{m.dateFin ? ` → ${formatDate(m.dateFin)}` : ''}</Text>
                  {m.rappelJours != null ? <Text style={styles.itemMeta}>🔔 Rappel {m.rappelJours}j avant la fin</Text> : null}
                  {m.dateFin ? (
                    <View style={[styles.badge, { backgroundColor: isActive ? colors.pinkLight : colors.background }]}>
                      <Text style={[styles.badgeText, { color: isActive ? '#be185d' : colors.textLight }]}>
                        {isActive ? '✅ En cours' : '⏱️ Terminé'}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {m.id ? (
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEdit(m)} style={styles.btnEdit}>
                      <Text style={styles.btnEditText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteAnimalItem(animal, 'medicaments', m.id)} style={styles.btnDelete}>
                      <Text style={styles.btnDeleteText}>✖</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>Aucun traitement enregistré</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  formTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.md, color: colors.text },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
    ...(Platform.OS === 'ios' ? { height: 120 } : {}),
  },
  pickerSmall: {
    color: colors.text,
    ...(Platform.OS === 'ios' ? { height: 120 } : {}),
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
    paddingLeft: spacing.sm,
  },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 13, marginTop: 2 },
  empty: { color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  itemActions: {
    flexDirection: 'column',
    gap: 4,
    marginLeft: spacing.sm,
  },
  btnEdit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEditText: { color: colors.blue, fontSize: 16, fontWeight: '700' },
  btnDelete: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteText: { color: colors.red, fontSize: 16, fontWeight: '700' },
});
