import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { Screen, ScreenTitle, EmptyState, Card, Button } from '../../components/ui';
import AnimalPicker from '../../components/AnimalPicker';
import { useAnimals } from '../../context/AnimalsContext';
import { getDistanceKm, fetchNearbyVets } from '../../utils/vets';
import { VETERINAIRES } from '../../constants';
import { colors, spacing } from '../../theme';

export default function VeterinairesScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, updateAnimalFields } = useAnimals();
  const animal = animals.find((a) => a.id === selectedAnimal);

  const [userPos, setUserPos] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | done | error
  const [geoError, setGeoError] = useState('');
  const [nearbyVets, setNearbyVets] = useState(null);
  const [vetsStatus, setVetsStatus] = useState('idle'); // idle | loading | done | error
  const [vetsError, setVetsError] = useState('');

  const locateMe = async () => {
    setGeoStatus('loading');
    setGeoError('');
    setNearbyVets(null);
    setVetsStatus('idle');
    setVetsError('');

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setGeoStatus('error');
      setGeoError("Localisation refusée : activez la géolocalisation de votre appareil et autorisez l'application à accéder à votre position, puis réessayez.");
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(coords);
      setGeoStatus('done');
      setVetsStatus('loading');
      try {
        const found = await fetchNearbyVets(coords.lat, coords.lng);
        setNearbyVets(
          found
            .map((v) => ({ ...v, distanceKm: getDistanceKm(coords.lat, coords.lng, v.lat, v.lng) }))
            .sort((a, b) => a.distanceKm - b.distanceKm)
        );
        setVetsStatus('done');
      } catch (err) {
        setVetsStatus('error');
        setVetsError("Impossible de récupérer les vétérinaires à proximité pour le moment (service de cartographie indisponible). Voici une sélection d'exemple en attendant.");
      }
    } catch (err) {
      setGeoStatus('error');
      setGeoError('Impossible de récupérer votre position pour le moment. Vérifiez que la géolocalisation est activée sur votre appareil.');
    }
  };

  if (animals.length === 0) {
    return (
      <Screen>
        <EmptyState>Aucun animal enregistré</EmptyState>
      </Screen>
    );
  }

  const usingRealVets = nearbyVets !== null && nearbyVets.length > 0;
  const vets = usingRealVets
    ? nearbyVets
    : (userPos
        ? VETERINAIRES.map((v) => ({ ...v, distanceKm: getDistanceKm(userPos.lat, userPos.lng, v.lat, v.lng) })).sort((a, b) => a.distanceKm - b.distanceKm)
        : VETERINAIRES);

  return (
    <Screen>
      <ScreenTitle>🏥 Vétérinaires</ScreenTitle>

      <AnimalPicker animals={animals} selectedAnimal={selectedAnimal} onSelect={setSelectedAnimal} />

      <Button
        title={geoStatus === 'loading' ? '📍 Localisation en cours…' : '📍 Me géolocaliser pour trouver les vétérinaires autour de moi'}
        onPress={locateMe}
        disabled={geoStatus === 'loading'}
        color={colors.darkBlue}
        style={{ marginBottom: spacing.md }}
      />

      {geoStatus === 'error' ? <Text style={styles.errorText}>⚠️ {geoError}</Text> : null}
      {geoStatus === 'done' && vetsStatus === 'loading' ? <Text style={styles.infoText}>🔎 Recherche des vétérinaires autour de votre position…</Text> : null}
      {geoStatus === 'done' && vetsStatus === 'done' && usingRealVets ? (
        <Text style={styles.successText}>✅ {nearbyVets.length} vétérinaire{nearbyVets.length > 1 ? 's' : ''} trouvé{nearbyVets.length > 1 ? 's' : ''} près de chez vous (données OpenStreetMap), triés par proximité</Text>
      ) : null}
      {geoStatus === 'done' && vetsStatus === 'done' && !usingRealVets ? <Text style={styles.warnText}>⚠️ Aucun vétérinaire référencé sur OpenStreetMap dans un rayon de 25 km autour de votre position. Voici une sélection d'exemple en attendant.</Text> : null}
      {geoStatus === 'done' && vetsStatus === 'error' ? <Text style={styles.warnText}>⚠️ {vetsError}</Text> : null}

      {vetsStatus !== 'loading' && vets.map((vet) => (
        <Card key={vet.id}>
          <Text style={styles.vetName}>{vet.nom}</Text>
          <Text style={styles.vetLine}>📍 {vet.distanceKm != null ? `≈ ${vet.distanceKm.toFixed(1)} km de votre position` : vet.distance}</Text>
          {vet.adresse ? <Text style={styles.vetLine}>🏠 {vet.adresse}</Text> : null}
          {vet.telephone ? <Text style={styles.vetLine}>📞 {vet.telephone}</Text> : null}
          {vet.horaires ? <Text style={styles.vetLine}>🕐 {vet.horaires}</Text> : null}
          {(vet.rating || vet.specialites) ? <Text style={styles.vetLine}>⭐ {vet.rating} • {(vet.specialites || []).join(', ')}</Text> : null}
          {animal ? (
            <Button
              title={animal.veterinaire?.id === vet.id ? '✅ Assigné' : '📌 Assigner'}
              onPress={() => updateAnimalFields(animal, { veterinaire: { id: vet.id, nom: vet.nom } })}
              color={animal.veterinaire?.id === vet.id ? colors.primaryDark : colors.primary}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorText: { color: colors.red, fontSize: 13, marginBottom: spacing.md },
  infoText: { color: colors.darkBlue, fontSize: 13, marginBottom: spacing.md },
  successText: { color: colors.primary, fontSize: 13, marginBottom: spacing.md },
  warnText: { color: '#d97706', fontSize: 13, marginBottom: spacing.md },
  vetName: { fontSize: 16, fontWeight: '700', color: colors.text },
  vetLine: { fontSize: 12, color: colors.textLight, marginTop: 6 },
});
