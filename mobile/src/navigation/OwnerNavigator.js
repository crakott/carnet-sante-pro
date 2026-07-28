import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

import AccueilScreen from '../screens/owner/AccueilScreen';
import DossierScreen from '../screens/owner/DossierScreen';
import VaccinsScreen from '../screens/owner/VaccinsScreen';
import MedicamentsScreen from '../screens/owner/MedicamentsScreen';
import ChirurgiesScreen from '../screens/owner/ChirurgiesScreen';
import AlimentScreen from '../screens/owner/AlimentScreen';
import NotesScreen from '../screens/owner/NotesScreen';
import JournalScreen from '../screens/owner/JournalScreen';
import DocumentsScreen from '../screens/owner/DocumentsScreen';
import VideosScreen from '../screens/owner/VideosScreen';
import MessagesScreen from '../screens/owner/MessagesScreen';
import PoidsScreen from '../screens/owner/PoidsScreen';
import PlanningScreen from '../screens/owner/PlanningScreen';
import BudgetScreen from '../screens/owner/BudgetScreen';
import GalerieScreen from '../screens/owner/GalerieScreen';
import SecuriteScreen from '../screens/owner/SecuriteScreen';
import VeterinairesScreen from '../screens/owner/VeterinairesScreen';
import RappelsScreen from '../screens/owner/RappelsScreen';
import ParametresScreen from '../screens/owner/ParametresScreen';
import CalendrierScreen from '../screens/owner/CalendrierScreen';
import VoyageScreen from '../screens/owner/VoyageScreen';
import AssuranceScreen from '../screens/owner/AssuranceScreen';

const Tab = createBottomTabNavigator();
const AccueilStackNav = createNativeStackNavigator();
const DossierStackNav = createNativeStackNavigator();
const UrgencesStackNav = createNativeStackNavigator();
const RappelsStackNav = createNativeStackNavigator();
const PlusStackNav = createNativeStackNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: '#fff' },
  headerTintColor: '#111827',
  headerTitleStyle: { fontWeight: '700', fontSize: 16 },
  headerBackTitle: 'Retour',
  headerShadowVisible: false,
};

const APP_TITLE = '🐾 Carnet Santé';

function HomeButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Accueil', { screen: 'AccueilMain' })}
      hitSlop={12}
      style={{ marginLeft: 4 }}
    >
      <Text style={{ fontSize: 22 }}>🏠</Text>
    </TouchableOpacity>
  );
}

function BackAndHomeButtons({ navigation }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={{ paddingHorizontal: 6 }}>
        <Text style={{ fontSize: 26, color: '#111827', lineHeight: 30 }}>‹</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Accueil', { screen: 'AccueilMain' })} hitSlop={12} style={{ paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 22 }}>🏠</Text>
      </TouchableOpacity>
    </View>
  );
}

function AccueilStack() {
  return (
    <AccueilStackNav.Navigator screenOptions={stackOptions}>
      <AccueilStackNav.Screen
        name="AccueilMain"
        component={AccueilScreen}
        options={{ title: APP_TITLE, headerLeft: () => <Text style={{ fontSize: 22, marginLeft: 8 }}>🏠</Text> }}
      />
    </AccueilStackNav.Navigator>
  );
}

function DossierStack() {
  const hb = (nav) => ({ headerLeft: () => <HomeButton navigation={nav} /> });
  const bhb = (nav) => ({ headerLeft: () => <BackAndHomeButtons navigation={nav} /> });
  return (
    <DossierStackNav.Navigator screenOptions={stackOptions}>
      <DossierStackNav.Screen name="DossierMain" component={DossierScreen} options={({ navigation }) => ({ title: APP_TITLE, ...hb(navigation) })} />
      <DossierStackNav.Screen name="Vaccins" component={VaccinsScreen} options={({ navigation }) => ({ title: '💉 Vaccins', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Medicaments" component={MedicamentsScreen} options={({ navigation }) => ({ title: '💊 Traitements', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Chirurgies" component={ChirurgiesScreen} options={({ navigation }) => ({ title: '🔪 Chirurgies', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Aliment" component={AlimentScreen} options={({ navigation }) => ({ title: '🍎 Alimentation', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Notes" component={NotesScreen} options={({ navigation }) => ({ title: '📋 Observations', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Messages" component={MessagesScreen} options={({ navigation }) => ({ title: '💬 Messagerie', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Journal" component={JournalScreen} options={({ navigation }) => ({ title: '📖 Journal de vie', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Documents" component={DocumentsScreen} options={({ navigation }) => ({ title: '📄 Documents', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Videos" component={VideosScreen} options={({ navigation }) => ({ title: '🎥 Vidéos', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Poids" component={PoidsScreen} options={({ navigation }) => ({ title: '⚖️ Poids', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Planning" component={PlanningScreen} options={({ navigation }) => ({ title: '📅 Rendez-vous', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Budget" component={BudgetScreen} options={({ navigation }) => ({ title: '💰 Budget', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Galerie" component={GalerieScreen} options={({ navigation }) => ({ title: '📷 Photos', ...bhb(navigation) })} />
      <DossierStackNav.Screen name="Assurance" component={AssuranceScreen} options={({ navigation }) => ({ title: '🛡️ Assurance', ...bhb(navigation) })} />
    </DossierStackNav.Navigator>
  );
}

function UrgencesStack() {
  return (
    <UrgencesStackNav.Navigator screenOptions={stackOptions}>
      <UrgencesStackNav.Screen
        name="UrgencesMain"
        component={SecuriteScreen}
        options={{ title: APP_TITLE }}
      />
    </UrgencesStackNav.Navigator>
  );
}

function RappelsStack() {
  return (
    <RappelsStackNav.Navigator screenOptions={stackOptions}>
      <RappelsStackNav.Screen
        name="RappelsMain"
        component={RappelsScreen}
        options={({ navigation }) => ({ title: APP_TITLE, headerLeft: () => <HomeButton navigation={navigation} /> })}
      />
    </RappelsStackNav.Navigator>
  );
}

function PlusStack() {
  const hb = (nav) => ({ headerLeft: () => <HomeButton navigation={nav} /> });
  return (
    <PlusStackNav.Navigator screenOptions={stackOptions}>
      <PlusStackNav.Screen name="Calendrier" component={CalendrierScreen} options={({ navigation }) => ({ title: APP_TITLE, ...hb(navigation) })} />
      <PlusStackNav.Screen name="Voyage" component={VoyageScreen} options={({ navigation }) => ({ title: APP_TITLE, ...hb(navigation) })} />
      <PlusStackNav.Screen name="PlusPlanning" component={PlanningScreen} options={({ navigation }) => ({ title: '📅 Rendez-vous', ...hb(navigation) })} />
      <PlusStackNav.Screen name="Veterinaires" component={VeterinairesScreen} options={({ navigation }) => ({ title: APP_TITLE, ...hb(navigation) })} />
      <PlusStackNav.Screen name="PlusBudget" component={BudgetScreen} options={({ navigation }) => ({ title: '💰 Budget', ...hb(navigation) })} />
      <PlusStackNav.Screen name="Parametres" component={ParametresScreen} options={({ navigation }) => ({ title: APP_TITLE, ...hb(navigation) })} />
    </PlusStackNav.Navigator>
  );
}

const PLUS_ITEMS = [
  { screen: 'Calendrier', label: 'Calendrier', icon: '📅', bg: '#dbeafe' },
  { screen: 'Voyage', label: 'Voyage', icon: '✈️', bg: '#e0f2fe' },
  { screen: 'PlusPlanning', label: 'Planning', icon: '🗓️', bg: '#d1fae5' },
  { screen: 'Veterinaires', label: 'Vétérinaires', icon: '🏥', bg: '#fee2e2' },
  { screen: 'PlusBudget', label: 'Budget', icon: '💰', bg: '#fef3c7' },
  { screen: 'Parametres', label: 'Paramètres', icon: '⚙️', bg: '#f3f4f6' },
];

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const [plusOpen, setPlusOpen] = useState(false);

  const isActive = (tabName) => state.routes[state.index]?.name === tabName;

  const handlePlusItem = (screenName) => {
    setPlusOpen(false);
    navigation.navigate('Plus', { screen: screenName });
  };

  return (
    <>
      <Modal visible={plusOpen} transparent animationType="slide" onRequestClose={() => setPlusOpen(false)}>
        <Pressable style={styles.plusBackdrop} onPress={() => setPlusOpen(false)} />
        <View style={[styles.plusSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.plusHandle} />
          <Text style={styles.plusSheetTitle}>PLUS</Text>
          <View style={styles.plusGrid}>
            {PLUS_ITEMS.map((item) => (
              <TouchableOpacity key={item.screen} style={styles.plusItem} onPress={() => handlePlusItem(item.screen)} activeOpacity={0.7}>
                <View style={[styles.plusItemIcon, { backgroundColor: item.bg }]}>
                  <Text style={{ fontSize: 30 }}>{item.icon}</Text>
                </View>
                <Text style={styles.plusItemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Dossier')} activeOpacity={0.7}>
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={[styles.tabLabel, isActive('Dossier') && styles.tabLabelActive]}>Dossier</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Urgences')} activeOpacity={0.7}>
          <View style={[styles.sosBox, isActive('Urgences') && { backgroundColor: '#dc2626' }]}>
            <Text style={styles.sosText}>SOS</Text>
          </View>
          <Text style={[styles.tabLabel, isActive('Urgences') && styles.tabLabelActive]}>Urgences</Text>
        </TouchableOpacity>

        <View style={styles.fabWrapper}>
          <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('Accueil', { screen: 'AccueilMain' })}>
            <Text style={{ fontSize: 26 }}>🏠</Text>
          </TouchableOpacity>
          <Text style={styles.fabLabel}>Accueil</Text>
        </View>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Rappels')} activeOpacity={0.7}>
          <Text style={styles.tabIcon}>⏰</Text>
          <Text style={[styles.tabLabel, isActive('Rappels') && styles.tabLabelActive]}>Rappels</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setPlusOpen(true)} activeOpacity={0.7}>
          <Text style={[styles.tabIcon, { color: isActive('Plus') ? colors.primary : colors.textMuted }]}>···</Text>
          <Text style={[styles.tabLabel, isActive('Plus') && styles.tabLabelActive]}>Plus</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function OwnerNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Accueil"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dossier" component={DossierStack} />
      <Tab.Screen name="Urgences" component={UrgencesStack} />
      <Tab.Screen name="Accueil" component={AccueilStack} />
      <Tab.Screen name="Rappels" component={RappelsStack} />
      <Tab.Screen name="Plus" component={PlusStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sosBox: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
  },
  sosText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  plusBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  plusSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  plusHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  plusSheetTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 16,
  },
  plusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  plusItem: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  plusItemIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusItemLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
});
