import React from 'react';
import { Screen, EmptyState } from '../../components/ui';
import GalerieSection from '../../components/GalerieSection';
import { useAnimals } from '../../context/AnimalsContext';

export default function GalerieScreen() {
  const { animals, selectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem } = useAnimals();
  const animal = animals.find((a) => a.id === selectedAnimal) || animals[0];

  if (!animal) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <GalerieSection animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />
    </Screen>
  );
}
