import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export default function AnimalPicker({ animals, selectedAnimal, onSelect }) {
  if (!animals || animals.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {animals.map((animal) => {
        const isSelected = animal.id === selectedAnimal;
        return (
          <TouchableOpacity
            key={animal.id}
            onPress={() => onSelect(animal.id)}
            style={[styles.chip, isSelected && styles.chipSelected]}
            activeOpacity={0.7}
          >
            {animal.photo ? (
              <Image source={{ uri: animal.photo }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoEmoji}>{animal.espece?.[0] || '🐾'}</Text>
              </View>
            )}
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {animal.nom}
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
    flexDirection: 'row',
    paddingRight: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f0fdf4',
  },
  photo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  photoFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: {
    fontSize: 13,
    color: '#fff',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});
