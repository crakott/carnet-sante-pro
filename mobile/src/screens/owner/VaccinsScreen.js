import React from 'react';
import { Screen, EmptyState } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import VaccinsSection from '../../components/VaccinsSection';
import { useAnimals } from '../../context/AnimalsContext';

export default function VaccinsScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem } = useAnimals();
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
      <AnimalPicker animals={animals} selectedAnimal={selectedAnimal} onSelect={setSelectedAnimal} />
      {animal ? <VaccinsSection animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} /> : <EmptyState>Sélectionnez un animal</EmptyState>}
    </Screen>
  );
}
