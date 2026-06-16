import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
import VeterinairesScreen from '../screens/owner/VeterinairesScreen';
import RappelsScreen from '../screens/owner/RappelsScreen';
import ParametresScreen from '../screens/owner/ParametresScreen';

const Tab = createBottomTabNavigator();
const AccueilStackNav = createNativeStackNavigator();
const DossierStackNav = createNativeStackNavigator();
const VetStackNav = createNativeStackNavigator();
const RappelsStackNav = createNativeStackNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' },
  headerBackTitle: 'Retour',
};

function AccueilStack() {
  return (
    <AccueilStackNav.Navigator screenOptions={stackOptions}>
      <AccueilStackNav.Screen
        name="AccueilMain"
        component={AccueilScreen}
        options={({ navigation }) => ({
          title: '🐾 Carnet Santé PRO',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Parametres')} hitSlop={12} style={{ marginRight: 4 }}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <AccueilStackNav.Screen
        name="Parametres"
        component={ParametresScreen}
        options={{ title: '⚙️ Paramètres' }}
      />
    </AccueilStackNav.Navigator>
  );
}

function DossierStack() {
  return (
    <DossierStackNav.Navigator screenOptions={stackOptions}>
      <DossierStackNav.Screen name="DossierMain" component={DossierScreen} options={{ title: '📁 Dossier' }} />
      <DossierStackNav.Screen name="Vaccins" component={VaccinsScreen} options={{ title: '💉 Vaccins' }} />
      <DossierStackNav.Screen name="Medicaments" component={MedicamentsScreen} options={{ title: '💊 Médicaments' }} />
      <DossierStackNav.Screen name="Chirurgies" component={ChirurgiesScreen} options={{ title: '🔪 Chirurgies' }} />
      <DossierStackNav.Screen name="Aliment" component={AlimentScreen} options={{ title: '🍎 Alimentation' }} />
      <DossierStackNav.Screen name="Notes" component={NotesScreen} options={{ title: '📋 Observations' }} />
      <DossierStackNav.Screen name="Messages" component={MessagesScreen} options={{ title: '💬 Messagerie' }} />
      <DossierStackNav.Screen name="Journal" component={JournalScreen} options={{ title: '📖 Journal de vie' }} />
      <DossierStackNav.Screen name="Documents" component={DocumentsScreen} options={{ title: '📄 Documents' }} />
      <DossierStackNav.Screen name="Videos" component={VideosScreen} options={{ title: '🎥 Vidéos' }} />
      <DossierStackNav.Screen name="Poids" component={PoidsScreen} options={{ title: '⚖️ Poids' }} />
      <DossierStackNav.Screen name="Planning" component={PlanningScreen} options={{ title: '📅 Rendez-vous' }} />
      <DossierStackNav.Screen name="Budget" component={BudgetScreen} options={{ title: '💰 Budget' }} />
    </DossierStackNav.Navigator>
  );
}

function VetStack() {
  return (
    <VetStackNav.Navigator screenOptions={stackOptions}>
      <VetStackNav.Screen name="VeterinairesMain" component={VeterinairesScreen} options={{ title: '🏥 Vétérinaires' }} />
    </VetStackNav.Navigator>
  );
}

function RappelsStack() {
  return (
    <RappelsStackNav.Navigator screenOptions={stackOptions}>
      <RappelsStackNav.Screen name="RappelsMain" component={RappelsScreen} options={{ title: '⚠️ Rappels' }} />
    </RappelsStackNav.Navigator>
  );
}

function EmptyScreen() { return null; }

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: 'Accueil', label: 'Accueil', icon: '🏠' },
    { name: 'Dossier', label: 'Dossier', icon: '📋' },
    null, // FAB center slot
    { name: 'Veterinaires', label: 'Vétérinaires', icon: '🐾' },
    { name: 'Rappels', label: 'Rappels', icon: '⏰' },
  ];

  const isActive = (tabName) => {
    const idx = state.routes.findIndex((r) => r.name === tabName);
    return idx === state.index;
  };

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab, i) => {
        if (!tab) {
          return (
            <View key="fab" style={styles.fabWrapper}>
              <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('Accueil', {
                    screen: 'AccueilMain',
                    params: { openAdd: Date.now() },
                  })
                }
              >
                <Text style={styles.fabIcon}>＋</Text>
              </TouchableOpacity>
            </View>
          );
        }
        const active = isActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function OwnerNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Accueil" component={AccueilStack} />
      <Tab.Screen name="Dossier" component={DossierStack} />
      <Tab.Screen name="Ajouter" component={EmptyScreen} />
      <Tab.Screen name="Veterinaires" component={VetStack} />
      <Tab.Screen name="Rappels" component={RappelsStack} />
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
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 30,
    color: colors.white,
    lineHeight: 34,
  },
});
