import React from 'react';
import { Screen, EmptyState } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import VideosSection from '../../components/VideosSection';
import { useAnimals } from '../../context/AnimalsContext';

export default function VideosScreen() {
  const { animals, selectedAnimal, setSelectedAnimal } = useAnimals();
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
      {animal ? <VideosSection animal={animal} /> : <EmptyState>Sélectionnez un animal</EmptyState>}
    </Screen>
  );
}
