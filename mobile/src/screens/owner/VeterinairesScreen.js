import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, Alert, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as Location from 'expo-location';
import { Screen, ScreenTitle, Button } from '../../components/ui';
import AdBanner from '../../components/AdBanner';
import { useAnimals } from '../../context/AnimalsContext';
import { getDistanceKm, fetchNearbyVets } from '../../utils/vets';
import { VETERINAIRES } from '../../constants';
import { colors, spacing, radius } from '../../theme';

function StarRating({ rating }) {
  const full = Math.round(rating || 0);
  return (
    <Text style={{ color: '#f59e0b', fontSize: 13 }}>
      {'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))} {rating ? rating.toFixed(1) : ''}
    </Text>
  );
}

function SpecTag({ label }) {
  const colors_map = {
    'Urgences': { bg: '#fee2e2', color: '#dc2626' },
    'Chiens': { bg: '#dbeafe', color: '#1d4ed8' },
    'Chats': { bg: '#fce7f3', color: '#9d174d' },
    'Reptiles': { bg: '#d1fae5', color: '#065f46' },
    'Oiseaux': { bg: '#fef3c7', color: '#92400e' },
  };
  const style = colors_map[label] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <View style={[styles.specTag, { backgroundColor: style.bg }]}>
      <Text style={[styles.specTagText, { color: style.color }]}>{label}</Text>
    </View>
  );
}

function VetCard({ vet, animals, onAssign }) {
  return (
    <View style={styles.vetCard}>
      <View style={styles.vetCardHeader}>
        <View style={styles.vetIconBox}>
          <Text style={{ fontSize: 26 }}>🏥</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.vetName}>{vet.nom}</Text>
          <StarRating rating={vet.rating} />
        </View>
        {vet.distanceKm != null && (
          <Text style={styles.distanceBadge}>📍 {vet.distanceKm.toFixed(1)} km</Text>
        )}
        {vet.distance && !vet.distanceKm && (
          <Text style={styles.distanceBadge}>📍 {vet.distance}</Text>
        )}
      </View>

      {vet.horaires ? (
        <Text style={styles.vetDetail}>⏰ {vet.horaires}</Text>
      ) : null}
      {vet.adresse ? (
        <Text style={styles.vetDetail}>🏠 {vet.adresse}</Text>
      ) : null}

      {vet.specialites && vet.specialites.length > 0 && (
        <View style={styles.specRow}>
          {vet.specialites.map((s, i) => <SpecTag key={i} label={s} />)}
        </View>
      )}

      <View style={styles.vetBtnRow}>
        <TouchableOpacity
          style={styles.btnItineraire}
          onPress={() => {
            const q = vet.adresse ? encodeURIComponent(vet.adresse) : `${vet.lat},${vet.lng}`;
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`);
          }}
        >
          <Text style={styles.btnItineraireText}>🗺️ Itinéraire</Text>
        </TouchableOpacity>
        {vet.telephone ? (
          <TouchableOpacity
            style={styles.btnAppeler}
            onPress={() => Linking.openURL(`tel:${vet.telephone}`)}
          >
            <Text style={styles.btnAppelerText}>📞 Appeler</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {animals && animals.length > 0 && (
        <View style={styles.petsRow}>
          <Text style={styles.petsLabel}>🐾 Vétérinaire de :</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {animals.map((a) => (
              <TouchableOpacity key={a.id} onPress={() => onAssign && onAssign(a, vet)} style={styles.petChip}>
                {a.photo ? (
                  <Image source={{ uri: a.photo }} style={styles.petPhoto} />
                ) : (
                  <View style={[styles.petPhoto, { backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#fff', fontSize: 12 }}>{a.espece?.[0] || '🐾'}</Text>
                  </View>
                )}
                <Text style={[styles.petName, a.veterinaire?.id === vet.id && { color: '#059669', fontWeight: '700' }]}>{a.nom}</Text>
                {a.veterinaire?.id === vet.id && <Text style={{ fontSize: 10, color: '#059669' }}> ✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function VeterinairesScreen() {
  const { animals, selectedAnimal, setSelectedAnimal, updateAnimalFields } = useAnimals();

  const [userPos, setUserPos] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoError, setGeoError] = useState('');
  const [nearbyVets, setNearbyVets] = useState(null);
  const [foundRadiusKm, setFoundRadiusKm] = useState(25);
  const [vetsStatus, setVetsStatus] = useState('idle');
  const [vetsError, setVetsError] = useState('');

  const locateMe = async () => {
    setGeoStatus('loading');
    setGeoError('');
    setNearbyVets(null);
    setFoundRadiusKm(25);
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
        const { results, radiusKm } = await fetchNearbyVets(coords.lat, coords.lng);
        setNearbyVets(
          results
            .map((v) => ({ ...v, distanceKm: getDistanceKm(coords.lat, coords.lng, v.lat, v.lng) }))
            .sort((a, b) => a.distanceKm - b.distanceKm)
        );
        setFoundRadiusKm(radiusKm);
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

  const handleEmergency = async () => {
    // Try to find vets with Urgences specialty
    if (nearbyVets && nearbyVets.length > 0) {
      const urgences = nearbyVets.filter((v) => (v.specialites || []).includes('Urgences'));
      if (urgences.length > 0) {
        const vet = urgences[0];
        Alert.alert(
          '🚨 Urgence vétérinaire',
          `${vet.nom}\n${vet.telephone ? `📞 ${vet.telephone}` : ''}`,
          [
            { text: 'Annuler', style: 'cancel' },
            vet.telephone ? { text: '📞 Appeler', onPress: () => Linking.openURL(`tel:${vet.telephone}`) } : null,
          ].filter(Boolean)
        );
        return;
      }
    }
    // From example vets
    const urgences = VETERINAIRES.filter((v) => (v.specialites || []).includes('Urgences'));
    if (urgences.length > 0 && !userPos) {
      const vet = urgences[0];
      Alert.alert(
        '🚨 Urgence vétérinaire',
        `${vet.nom}\n${vet.telephone ? `📞 ${vet.telephone}` : ''}`,
        [
          { text: 'Annuler', style: 'cancel' },
          vet.telephone ? { text: '📞 Appeler', onPress: () => Linking.openURL(`tel:${vet.telephone}`) } : null,
        ].filter(Boolean)
      );
      return;
    }
    // Fallback: open Google Maps
    if (userPos) {
      Linking.openURL(`https://www.google.com/maps/search/urgence+vétérinaire/@${userPos.lat},${userPos.lng},13z`);
    } else {
      // Try to geolocate first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          Linking.openURL(`https://www.google.com/maps/search/urgence+vétérinaire/@${pos.coords.latitude},${pos.coords.longitude},13z`);
        } catch {
          Linking.openURL(`https://www.google.com/maps/search/urgence+vétérinaire`);
        }
      } else {
        Linking.openURL(`https://www.google.com/maps/search/urgence+vétérinaire`);
      }
    }
  };

  const handleAssign = (animal, vet) => {
    updateAnimalFields(animal, { veterinaire: { id: vet.id, nom: vet.nom } });
  };

  const usingRealVets = nearbyVets !== null && nearbyVets.length > 0;
  const showFallback = geoStatus === 'idle';
  const vets = usingRealVets ? nearbyVets : (showFallback ? VETERINAIRES : []);
  const mapsUrl = userPos
    ? `https://www.google.com/maps/search/vétérinaire/@${userPos.lat},${userPos.lng},13z`
    : null;
  const showMapsLink = userPos && !usingRealVets && (vetsStatus === 'error' || vetsStatus === 'done');

  return (
    <Screen>
      {/* Emergency button */}
      <TouchableOpacity
        style={styles.emergencyBtn}
        activeOpacity={0.85}
        onPress={handleEmergency}
      >
        <Text style={styles.emergencyText}>🚨 Urgence vétérinaire à proximité</Text>
      </TouchableOpacity>

      <AdBanner />

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
        <Text style={styles.successText}>✅ {nearbyVets.length} vétérinaire{nearbyVets.length > 1 ? 's' : ''} trouvé{nearbyVets.length > 1 ? 's' : ''} dans un rayon de {foundRadiusKm} km (OpenStreetMap), triés par proximité</Text>
      ) : null}
      {geoStatus === 'done' && vetsStatus === 'done' && !usingRealVets ? <Text style={styles.warnText}>⚠️ Aucun vétérinaire trouvé sur OpenStreetMap dans un rayon de 50 km.</Text> : null}
      {geoStatus === 'done' && vetsStatus === 'error' ? <Text style={styles.warnText}>⚠️ {vetsError}</Text> : null}

      {showMapsLink ? (
        <Button
          title="🗺️ Chercher un vétérinaire sur Google Maps"
          onPress={() => Linking.openURL(mapsUrl)}
          color={colors.darkBlue}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {vetsStatus !== 'loading' && vets.map((vet) => (
        <VetCard key={vet.id} vet={vet} animals={animals} onAssign={handleAssign} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emergencyBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    margin: 0,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: { color: colors.red, fontSize: 13, marginBottom: spacing.md },
  infoText: { color: colors.darkBlue, fontSize: 13, marginBottom: spacing.md },
  successText: { color: colors.primary, fontSize: 13, marginBottom: spacing.md },
  warnText: { color: '#d97706', fontSize: 13, marginBottom: spacing.md },
  vetCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  vetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  vetIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  vetName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 2,
  },
  distanceBadge: {
    fontSize: 11,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vetDetail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  specTag: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vetBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btnItineraire: {
    flex: 1,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  btnItineraireText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 14,
  },
  btnAppeler: {
    flex: 1,
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  btnAppelerText: {
    color: '#065f46',
    fontWeight: '600',
    fontSize: 14,
  },
  petsRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  petsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  petName: {
    fontSize: 13,
    color: '#374151',
  },
});
