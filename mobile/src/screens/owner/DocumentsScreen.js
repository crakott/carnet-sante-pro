import React from 'react';
import { View, Text, Image } from 'react-native';
import { Screen, EmptyState } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import DocumentsSection from '../../components/DocumentsSection';
import { useAnimals } from '../../context/AnimalsContext';

export default function DocumentsScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem } = useAnimals();
  const animal = animals.find((a) => a.id === selectedAnimal);

  if (animals.length === 0) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

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
      {animal ? <DocumentsSection animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} /> : <EmptyState>Sélectionnez un animal</EmptyState>}
    </Screen>
  );
}
