import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Screen, EmptyState, Card, Button, Field, Input, Select, IconButton, Row } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import { useAnimals } from '../../context/AnimalsContext';
import { colors, spacing } from '../../theme';

export default function AlimentScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem } = useAnimals();
  const animal = animals.find((a) => a.id === selectedAnimal);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [quantite, setQuantite] = useState('');
  const [unite, setUnite] = useState('g');
  const [horaire, setHoraire] = useState('12:00');

  if (animals.length === 0) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

  const handleAdd = () => {
    if (nom && quantite) {
      addAnimalItem(animal, 'aliments', { nom, quantite: `${quantite} ${unite}`, horaire });
      setNom(''); setQuantite(''); setUnite('g'); setHoraire('12:00');
      setShowForm(false);
    }
  };

  return (
    <Screen>
      {animal && (
        <View style={{ flexDirection:'row', alignItems:'center', padding:12, backgroundColor:'#f0fdf4', borderBottomWidth:1, borderBottomColor:'#d1fae5' }}>
          {animal.photo ? (
            <Image source={{ uri: animal.photo }} style={{ width:40, height:40, borderRadius:20, marginRight:10 }} />
          ) : (
            <View style={{ width:40, height:40, borderRadius:20, backgroundColor:'#10b981', marginRight:10, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ color:'#fff', fontSize:18 }}>{animal.espece?.[0] || '🐾'}</Text>
            </View>
          )}
          <Text style={{ fontWeight:'700', fontSize:16, color:'#064e3b' }}>{animal.nom || 'Animal'}</Text>
        </View>
      )}
      <AnimalPicker animals={animals} selectedAnimal={selectedAnimal} onSelect={setSelectedAnimal} />
      {!animal ? (
        <EmptyState>Sélectionnez un animal</EmptyState>
      ) : (
        <View>
          <Text style={styles.title}>🍎 Alimentation de {animal.nom}</Text>

          {showForm ? (
            <Card style={{ borderWidth: 2, borderColor: colors.yellow }}>
              <Field label="Nom de l'aliment">
                <Input value={nom} onChangeText={setNom} placeholder="Nom de l'aliment" />
              </Field>
              <Row style={{ gap: spacing.sm }}>
                <Field label="Quantité" hint=" ">
                  <Input value={quantite} onChangeText={setQuantite} placeholder="Quantité" keyboardType="numeric" />
                </Field>
                <View style={{ width: 90 }}>
                  <Field label="Unité" hint=" ">
                    <Select selectedValue={unite} onValueChange={setUnite} items={['g', 'kg', 'ml', 'L'].map((u) => ({ label: u, value: u }))} />
                  </Field>
                </View>
              </Row>
              <Field label="Horaire">
                <Input value={horaire} onChangeText={setHoraire} placeholder="HH:MM" />
              </Field>
              <Row style={{ gap: spacing.sm }}>
                <Button title="➕ Ajouter" onPress={handleAdd} color={colors.yellow} style={{ flex: 1 }} />
                <Button title="Annuler" onPress={() => setShowForm(false)} color={colors.border} textColor={colors.text} style={{ flex: 1 }} />
              </Row>
            </Card>
          ) : (
            <Button title="➕ Ajouter un aliment" onPress={() => setShowForm(true)} style={{ marginBottom: spacing.lg }} />
          )}

          <Card>
            {animal.aliments && animal.aliments.length > 0 ? (
              animal.aliments.map((a, i) => (
                <View key={a.id || i} style={[styles.item, { borderLeftWidth: 4, borderLeftColor: colors.yellow, paddingLeft: spacing.sm }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{a.nom}</Text>
                    <Text style={styles.itemMeta}>{a.quantite} • {a.horaire}</Text>
                  </View>
                  {a.id ? <IconButton title="🗑️" color={colors.red} bg={colors.redLight} onPress={() => deleteAnimalItem(animal, 'aliments', a.id)} /> : null}
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Aucun aliment</Text>
            )}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTitle: { fontWeight: '600', color: colors.text },
  itemMeta: { color: colors.textLight, fontSize: 14, marginTop: 2 },
  empty: { color: colors.textMuted },
});
