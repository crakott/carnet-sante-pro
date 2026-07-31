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
    tag: 'Bienvenue',
    title: 'Tous vos animaux\nen un coup d\'œil',
    subtitle: 'Ajoutez autant d\'animaux que vous souhaitez. Suivez la santé de chacun individuellement, avec photo et rappels.',
    topColor: '#059669',
    cardType: 'animals',
  },
  {
    id: '2',
    tag: 'Dossier médical complet',
    title: 'Vaccins, traitements\net alimentation centralisés',
    subtitle: 'Antiparasitaires, vermifuges, chirurgies, profil alimentaire, photos recadrables… tout est enregistré et imprimable.',
    topColor: '#0369a1',
    cardType: 'health',
  },
  {
    id: '3',
    tag: 'Rappels & Calendrier',
    title: 'Ne ratez plus\njamais un soin',
    subtitle: 'Notifications push avant chaque échéance. Calendrier visuel avec les dates de tous vos animaux réunies.',
    topColor: '#0d9488',
    cardType: 'reminders',
  },
  {
    id: '4',
    tag: 'Voyage ✈️',
    title: 'Voyagez sereinement\navec vos animaux',
    subtitle: 'Checklist documentaire pour la France, l\'Europe ou l\'international. Générez et partagez une fiche PDF.',
    topColor: '#0891b2',
    cardType: 'voyage',
  },
  {
    id: '5',
    tag: 'Partage & Urgences',
    title: 'Prêt à partager\net à retrouver',
    subtitle: 'Dossier vétérinaire personnalisé (choisissez les sections), étiquette collier PDF et affiche perdu/trouvé en un tap.',
    topColor: '#7c3aed',
    cardType: 'budget',
  },
  {
    id: '6',
    tag: 'Urgences & Sécurité',
    title: 'Toujours prêt\npour les urgences',
    subtitle: 'Numéros SOS vétérinaires, cliniques d\'urgence à proximité, aliments dangereux et guide de premiers secours.',
    topColor: '#dc2626',
    cardType: 'urgences',
  },
];

/* ─── Preview cards per slide ─── */

function PreviewRow({ icon, label, right, rightBg, rightColor }) {
  return (
    <View style={card.row}>
      <Text style={card.icon}>{icon}</Text>
      <Text style={card.label} numberOfLines={1}>{label}</Text>
      {right ? (
        <View style={[card.badge, { backgroundColor: rightBg || '#f3f4f6' }]}>
          <Text style={[card.badgeText, { color: rightColor || '#374151' }]}>{right}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AnimalsCard() {
  return (
    <View style={card.container}>
      <Text style={card.header}>🐾 Mes animaux (3)</Text>
      {[
        { icon: '🐕', name: 'Luna', sub: 'Labrador · 3 ans', ok: true },
        { icon: '🐈', name: 'Milo', sub: 'Siamois · 2 ans', ok: false },
        { icon: '🐇', name: 'Caramel', sub: 'Lapin · 1 an', ok: true },
      ].map((a, i) => (
        <View key={i} style={[card.row, { paddingVertical: 6 }]}>
          <View style={card.animalAvatar}>
            <Text style={{ fontSize: 16 }}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={card.animalName}>{a.name}</Text>
            <Text style={card.animalSub}>{a.sub}</Text>
          </View>
          <View style={[card.badge, { backgroundColor: a.ok ? '#d1fae5' : '#fee2e2' }]}>
            <Text style={[card.badgeText, { color: a.ok ? '#065f46' : '#dc2626' }]}>
              {a.ok ? '✅ À jour' : '⏰ 1 rappel'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function HealthCard() {
  return (
    <View style={card.container}>
      <View style={[card.row, { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
        <View style={card.animalAvatar}><Text style={{ fontSize: 18 }}>🐕</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={card.animalName}>Luna</Text>
          <Text style={card.animalSub}>Labrador · Femelle · 3 ans</Text>
        </View>
        <View style={[card.badge, { backgroundColor: '#f0fdf4' }]}>
          <Text style={[card.badgeText, { color: '#065f46', fontSize: 9 }]}>✂️ Photo recadrée</Text>
        </View>
      </View>
      <PreviewRow icon="💉" label="Vaccin Rage" right="À jour" rightBg="#d1fae5" rightColor="#065f46" />
      <PreviewRow icon="💊" label="Prévicox 7 j" right="En cours" rightBg="#dbeafe" rightColor="#1e40af" />
      <PreviewRow icon="🐛" label="Antiparasitaire" right="J-14" rightBg="#fef3c7" rightColor="#92400e" />
      <PreviewRow icon="🍽️" label="Croquettes Royal Canin" right="Allergies ⚠️" rightBg="#fef3c7" rightColor="#92400e" />
    </View>
  );
}

function RemindersCard() {
  return (
    <View style={card.container}>
      <Text style={card.header}>⏰ Prochaines échéances</Text>
      {[
        { icon: '💉', animal: 'Luna', label: 'Rappel Vaccin Rage', tag: 'J-3', bg: '#fee2e2', tc: '#dc2626' },
        { icon: '🐛', animal: 'Milo', label: 'Antiparasitaire', tag: 'J-7', bg: '#fef3c7', tc: '#b45309' },
        { icon: '🧪', animal: 'Caramel', label: 'Vermifuge', tag: '✅ À jour', bg: '#d1fae5', tc: '#065f46' },
      ].map((r, i) => (
        <View key={i} style={card.row}>
          <Text style={card.icon}>{r.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={card.animalName}>{r.animal}</Text>
            <Text style={card.label}>{r.label}</Text>
          </View>
          <View style={[card.badge, { backgroundColor: r.bg }]}>
            <Text style={[card.badgeText, { color: r.tc }]}>{r.tag}</Text>
          </View>
        </View>
      ))}
      <View style={[card.row, { marginTop: 6, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 8 }]}>
        <Text style={{ fontSize: 14 }}>📅</Text>
        <Text style={[card.label, { flex: 1, color: '#065f46', fontWeight: '600' }]}>Calendrier — Juillet 2025</Text>
        <View style={[card.badge, { backgroundColor: '#d1fae5' }]}>
          <Text style={[card.badgeText, { color: '#065f46' }]}>3 événements</Text>
        </View>
      </View>
    </View>
  );
}

function VoyageCard() {
  const items = [
    { label: 'Passeport européen', checked: true, required: true },
    { label: 'Puce électronique ISO', checked: true, required: true },
    { label: 'Vaccin antirabique', checked: false, required: true },
    { label: 'Assurance voyage', checked: false, required: false },
  ];
  const done = items.filter(i => i.checked).length;
  return (
    <View style={card.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={card.header}>✈️ Europe · Luna</Text>
        <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>{done}/{items.length}</Text>
      </View>
      {items.map((c, i) => (
        <View key={i} style={[card.row, { gap: 8, paddingVertical: 5 }]}>
          <View style={[{
            width: 16, height: 16, borderRadius: 3, borderWidth: 1.5,
            alignItems: 'center', justifyContent: 'center',
          }, c.checked
            ? { backgroundColor: '#10b981', borderColor: '#10b981' }
            : { borderColor: '#d1d5db' }]}>
            {c.checked && <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={[card.label, { flex: 1, fontSize: 11 }, c.checked && { color: '#9ca3af', textDecorationLine: 'line-through' }]}>
            {c.label}
          </Text>
          {c.required
            ? <View style={[card.badge, { backgroundColor: '#fee2e2' }]}><Text style={[card.badgeText, { color: '#dc2626', fontSize: 8 }]}>REQUIS</Text></View>
            : null}
        </View>
      ))}
      <View style={[{ marginTop: 8, backgroundColor: '#0891b2', borderRadius: 8, paddingVertical: 7, alignItems: 'center' }]}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🖨️ Partager / Imprimer la fiche</Text>
      </View>
    </View>
  );
}

function BudgetCard() {
  return (
    <View style={card.container}>
      <Text style={card.header}>📤 Partage — Luna</Text>
      {/* Section selector chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {['💉 Vaccins', '💊 Traitement', '⚖️ Poids', '🐛 Antiparas.'].map((s, i) => (
          <View key={i} style={{ backgroundColor: '#7c3aed', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{s}</Text>
          </View>
        ))}
        {['💰 Budget'].map((s, i) => (
          <View key={i} style={{ backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#d1d5db' }}>
            <Text style={{ fontSize: 9, color: '#6b7280', fontWeight: '600' }}>{s}</Text>
          </View>
        ))}
      </View>
      <View style={[card.row, { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 8, marginBottom: 5 }]}>
        <Text style={{ fontSize: 14 }}>🏷️</Text>
        <View style={{ flex: 1 }}>
          <Text style={[card.animalName, { fontSize: 11, color: '#065f46' }]}>Étiquette collier PDF</Text>
          <Text style={[card.animalSub, { fontSize: 10 }]}>Nom · puce · médicaments · QR code</Text>
        </View>
      </View>
      <View style={[card.row, { backgroundColor: '#fee2e2', borderRadius: 8, padding: 8 }]}>
        <Text style={{ fontSize: 14 }}>🔍</Text>
        <View style={{ flex: 1 }}>
          <Text style={[card.animalName, { fontSize: 11, color: '#dc2626' }]}>Affiche Perdu / Trouvé</Text>
          <Text style={[card.animalSub, { fontSize: 10 }]}>A4 · photo recadrée · QR code · contact</Text>
        </View>
      </View>
    </View>
  );
}

function UrgencesCard() {
  return (
    <View style={card.container}>
      <Text style={card.header}>🆘 Urgences & Sécurité</Text>
      <View style={[card.row, { backgroundColor: '#fee2e2', borderRadius: 8, padding: 8, marginBottom: 6 }]}>
        <Text style={{ fontSize: 16 }}>☎️</Text>
        <View style={{ flex: 1 }}>
          <Text style={[card.animalName, { fontSize: 11, color: '#dc2626' }]}>Antipoison vétérinaire</Text>
          <Text style={[card.label, { fontSize: 11 }]}>02 40 68 77 40</Text>
        </View>
        <View style={[card.badge, { backgroundColor: '#dc2626' }]}>
          <Text style={[card.badgeText, { color: '#fff' }]}>Appeler</Text>
        </View>
      </View>
      <PreviewRow icon="🏥" label="Clinique du Parc · 0,8 km" right="24h/24" rightBg="#d1fae5" rightColor="#065f46" />
      <PreviewRow icon="🍫" label="Chocolat — MORTEL" right="⚠️" rightBg="#fee2e2" rightColor="#dc2626" />
      <PreviewRow icon="🌿" label="Plantes toxiques (56)" right="Guide" rightBg="#fef3c7" rightColor="#92400e" />
    </View>
  );
}

function PreviewCard({ slide }) {
  switch (slide.cardType) {
    case 'animals': return <AnimalsCard />;
    case 'health': return <HealthCard />;
    case 'reminders': return <RemindersCard />;
    case 'voyage': return <VoyageCard />;
    case 'budget': return <BudgetCard />;
    case 'urgences': return <UrgencesCard />;
    default: return null;
  }
}

/* ─── Main screen ─── */

export default function OnboardingScreen({ onDone }) {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const slide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  const handleNext = async () => {
    if (!isLast) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      onDone();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    onDone();
  };

  const renderSlide = ({ item }) => (
    <View style={{ width }}>
      <View style={[styles.topSection, { backgroundColor: item.topColor }]}>
        <View style={styles.topHeader}>
          <Text style={styles.appName}>🐾 Carnet Santé PRO</Text>
          {currentIndex < SLIDES.length - 1 && (
            <TouchableOpacity onPress={handleSkip} hitSlop={12}>
              <Text style={styles.skipLink}>Passer →</Text>
            </TouchableOpacity>
          )}
        </View>
        <PreviewCard slide={item} />
      </View>
      <View style={styles.bottomContent}>
        <View style={[styles.tagChip, { backgroundColor: item.topColor + '20' }]}>
          <Text style={[styles.tagText, { color: item.topColor }]}>{item.tag}</Text>
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
        scrollEnabled
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.bottomControls}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => flatListRef.current?.scrollToIndex({ index: i, animated: true })}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.dotActive, { backgroundColor: slide.topColor }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Slide counter */}
        <Text style={styles.counter}>{currentIndex + 1} / {SLIDES.length}</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: slide.topColor }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{isLast ? '🚀 Commencer' : 'Suivant →'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.loginLink}>
          <Text style={styles.loginText}>
            J'ai déjà un compte ?{' '}
            <Text style={[styles.loginBold, { color: slide.topColor }]}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Card sub-styles (used in PreviewCard components) ─── */
const card = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  icon: {
    fontSize: 15,
    width: 22,
    textAlign: 'center',
  },
  label: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  animalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  animalSub: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 1,
  },
});

/* ─── Screen styles ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSection: {
    height: 340,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  appName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  skipLink: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 4,
  },
  tagChip: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 6,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#e5e7eb',
  },
  counter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 14,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
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
