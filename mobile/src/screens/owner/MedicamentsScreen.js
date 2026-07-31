import React from 'react';
import { View, Text, Image } from 'react-native';
import { Screen, EmptyState } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import MedicamentsSection from '../../components/MedicamentsSection';
import TraitementSection from '../../components/TraitementSection';
import { useAnimals } from '../../context/AnimalsContext';
import { colors } from '../../theme';

export default function MedicamentsScreen() {
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
      {animal ? (
        <>
          <MedicamentsSection
            animal={animal}
            addAnimalItem={addAnimalItem}
            deleteAnimalItem={deleteAnimalItem}
            updateAnimalItem={updateAnimalItem}
          />
          <TraitementSection
            title="Antiparasitaires"
            emoji="🦟"
            color={colors.purple}
            items={animal.antiparasitaires}
            onAdd={(item) => addAnimalItem(animal, 'antiparasitaires', item)}
            onDelete={(id) => deleteAnimalItem(animal, 'antiparasitaires', id)}
            onUpdate={(id, updates) => updateAnimalItem(animal, 'antiparasitaires', id, updates)}
          />
          <TraitementSection
            title="Vermifuges"
            emoji="🪱"
            color={colors.brown}
            items={animal.vermifuges}
            onAdd={(item) => addAnimalItem(animal, 'vermifuges', item)}
            onDelete={(id) => deleteAnimalItem(animal, 'vermifuges', id)}
            onUpdate={(id, updates) => updateAnimalItem(animal, 'vermifuges', id, updates)}
          />
        </>
      ) : (
        <EmptyState>Sélectionnez un animal</EmptyState>
      )}
    </Screen>
  );
}
