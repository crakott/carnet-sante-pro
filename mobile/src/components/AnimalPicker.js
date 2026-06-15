import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { EMOJIS_ESPECE } from '../constants';

// Horizontal chip selector used at the top of per-animal screens (Vaccins, Médicaments, etc.)
export default function AnimalPicker({ animals, selectedAnimal, onSelect }) {
  if (!animals || animals.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {animals.map((animal) => {
        const isSelected = animal.id === selectedAnimal;
        return (
          <TouchableOpacity
            key={animal.id}
            onPress={() => onSelect(animal.id)}
            style={[styles.chip, isSelected ? styles.chipSelected : null]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : null]}>
              {EMOJIS_ESPECE[animal.espece] || '🐾'} {animal.nom}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
