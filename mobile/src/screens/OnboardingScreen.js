import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    tag: 'Santé animale',
    title: 'Tout pour la santé\nde vos animaux',
    subtitle: 'Vaccins, médicaments, pesées... centralisés par animal, accessibles en un instant.',
    topColor: '#059669',
    animalName: 'Luna',
    animalEspece: '🐕',
    animalAge: '3 ans',
    items: [
      { icon: '💉', label: 'Vaccin Rage', status: 'À jour', bg: '#d1fae5', tc: '#065f46' },
      { icon: '💊', label: 'Traitement', status: 'En cours', bg: '#dbeafe', tc: '#1e40af' },
      { icon: '⚖️', label: 'Dernière pesée', status: '12,4 kg', bg: '#f3f4f6', tc: '#374151' },
    ],
  },
  {
    id: '2',
    tag: 'Rappels intelligents',
    title: 'Ne ratez plus\njamais un soin',
    subtitle: 'Recevez des notifications avant les rappels de vaccins, antiparasitaires et vermifuges.',
    topColor: '#0d9488',
    animalName: 'Milo',
    animalEspece: '🐈',
    animalAge: '2 ans',
    items: [
      { icon: '💉', label: 'Vaccin Leucose', status: '⏰ J-3', bg: '#fef3c7', tc: '#92400e' },
      { icon: '🐛', label: 'Antiparasitaire', status: '⏰ J-14', bg: '#fef3c7', tc: '#92400e' },
      { icon: '🧪', label: 'Vermifuge', status: '✅ À jour', bg: '#d1fae5', tc: '#065f46' },
    ],
  },
  {
    id: '3',
    tag: 'Géolocalisation',
    title: 'Trouvez un vétérinaire\nà proximité',
    subtitle: "Localisez les cliniques autour de vous et appelez-les directement depuis l'app.",
    topColor: '#0f766e',
    animalName: null,
    items: [
      { icon: '🏥', label: 'Clinique du Parc', status: '📍 0,8 km', bg: '#f0fdf4', tc: '#065f46' },
      { icon: '🏥', label: 'Cabinet Vétérinaire Central', status: '📍 1,4 km', bg: '#f0fdf4', tc: '#065f46' },
      { icon: '🏥', label: 'Animaux & Santé', status: '📍 2,1 km', bg: '#f0fdf4', tc: '#065f46' },
    ],
  },
];

function PreviewCard({ slide }) {
  return (
    <View style={styles.previewCard}>
      {slide.animalName ? (
        <View style={styles.previewAnimalRow}>
          <View style={styles.previewAnimalIcon}>
            <Text style={{ fontSize: 20 }}>{slide.animalEspece}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewAnimalName}>{slide.animalName}</Text>
            <Text style={styles.previewAnimalAge}>{slide.animalAge}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
            <Text style={{ color: '#065f46', fontSize: 11, fontWeight: '700' }}>À jour</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.previewSectionTitle}>🗺️ Vétérinaires à proximité</Text>
      )}
      {slide.items.map((item, i) => (
        <View key={i} style={styles.previewRow}>
          <Text style={styles.previewIcon}>{item.icon}</Text>
          <Text style={styles.previewLabel} numberOfLines={1}>{item.label}</Text>
          <View style={[styles.badge, { backgroundColor: item.bg }]}>
            <Text style={{ color: item.tc, fontSize: 10, fontWeight: '600' }}>{item.status}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function OnboardingScreen({ onDone }) {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLast = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];

  const handleNext = async () => {
    if (!isLast) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      onDone();
    }
  };

  const handleLogin = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    onDone();
  };

  const renderSlide = ({ item }) => (
    <View style={{ width }}>
      <View style={[styles.topSection, { backgroundColor: item.topColor }]}>
        <Text style={styles.appName}>🐾 Carnet Santé PRO</Text>
        <PreviewCard slide={item} />
      </View>
      <View style={styles.bottomContent}>
        <View style={styles.tagChip}>
          <Text style={styles.tagText}>{item.tag}</Text>
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={slide.topColor} />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.bottomControls}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? [styles.dotActive, { backgroundColor: slide.topColor }] : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: slide.topColor }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{isLast ? 'Commencer' : 'Suivant'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} style={styles.loginLink}>
          <Text style={styles.loginText}>
            J'ai déjà un compte ?{' '}
            <Text style={[styles.loginBold, { color: slide.topColor }]}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSection: {
    height: 330,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  appName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  previewAnimalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  previewAnimalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAnimalName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1f2937',
  },
  previewAnimalAge: {
    fontSize: 11,
    color: '#6b7280',
  },
  previewSectionTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  previewLabel: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bottomContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 4,
  },
  tagChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#d1fae5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  slideTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 31,
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    backgroundColor: '#fff',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#d1d5db',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginBold: {
    fontWeight: '700',
  },
});
