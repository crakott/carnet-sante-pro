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
import GalerieScreen from '../screens/owner/GalerieScreen';
import VeterinairesScreen from '../screens/owner/VeterinairesScreen';
import RappelsScreen from '../screens/owner/RappelsScreen';
import ParametresScreen from '../screens/owner/ParametresScreen';

const Tab = createBottomTabNavigator();
const AccueilStackNav = createNativeStackNavigator();
const DossierStackNav = createNativeStackNavigator();
const VetStackNav = createNativeStackNavigator();
const RappelsStackNav = createNativeStackNavigator();
const ParametresStackNav = createNativeStackNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
  headerBackTitle: 'Retour',
};

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

function AccueilStack() {
  return (
    <AccueilStackNav.Navigator screenOptions={stackOptions}>
      <AccueilStackNav.Screen
        name="AccueilMain"
        component={AccueilScreen}
        options={{ title: '🐾 Carnet Santé PRO', headerLeft: () => <Text style={{ fontSize: 22, marginLeft: 8 }}>🐾</Text> }}
      />
    </AccueilStackNav.Navigator>
  );
}

function DossierStack() {
  return (
    <DossierStackNav.Navigator screenOptions={stackOptions}>
      <DossierStackNav.Screen
        name="DossierMain"
        component={DossierScreen}
        options={({ navigation }) => ({
          title: '📁 Dossier',
          headerLeft: () => <HomeButton navigation={navigation} />,
        })}
      />
      <DossierStackNav.Screen name="Vaccins" component={VaccinsScreen} options={({ navigation }) => ({ title: '💉 Vaccins', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Medicaments" component={MedicamentsScreen} options={({ navigation }) => ({ title: '💊 Traitements', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Chirurgies" component={ChirurgiesScreen} options={({ navigation }) => ({ title: '🔪 Chirurgies', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Aliment" component={AlimentScreen} options={({ navigation }) => ({ title: '🍎 Alimentation', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Notes" component={NotesScreen} options={({ navigation }) => ({ title: '📋 Observations', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Messages" component={MessagesScreen} options={({ navigation }) => ({ title: '💬 Messagerie', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Journal" component={JournalScreen} options={({ navigation }) => ({ title: '📖 Journal de vie', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Documents" component={DocumentsScreen} options={({ navigation }) => ({ title: '📄 Documents', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Videos" component={VideosScreen} options={({ navigation }) => ({ title: '🎥 Vidéos', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Poids" component={PoidsScreen} options={({ navigation }) => ({ title: '⚖️ Poids', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Planning" component={PlanningScreen} options={({ navigation }) => ({ title: '📅 Rendez-vous', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Budget" component={BudgetScreen} options={({ navigation }) => ({ title: '💰 Budget', headerLeft: () => <HomeButton navigation={navigation} /> })} />
      <DossierStackNav.Screen name="Galerie" component={GalerieScreen} options={({ navigation }) => ({ title: '📷 Photos', headerLeft: () => <HomeButton navigation={navigation} /> })} />
    </DossierStackNav.Navigator>
  );
}

function VetStack() {
  return (
    <VetStackNav.Navigator screenOptions={stackOptions}>
      <VetStackNav.Screen
        name="VeterinairesMain"
        component={VeterinairesScreen}
        options={({ navigation }) => ({
          title: '🏥 Vétérinaires',
          headerLeft: () => <HomeButton navigation={navigation} />,
        })}
      />
    </VetStackNav.Navigator>
  );
}

function RappelsStack() {
  return (
    <RappelsStackNav.Navigator screenOptions={stackOptions}>
      <RappelsStackNav.Screen
        name="RappelsMain"
        component={RappelsScreen}
        options={({ navigation }) => ({
          title: '⚠️ Rappels',
          headerLeft: () => <HomeButton navigation={navigation} />,
        })}
      />
    </RappelsStackNav.Navigator>
  );
}

function ParametresStack() {
  return (
    <ParametresStackNav.Navigator screenOptions={stackOptions}>
      <ParametresStackNav.Screen
        name="ParametresMain"
        component={ParametresScreen}
        options={({ navigation }) => ({
          title: '⚙️ Paramètres',
          headerLeft: () => <HomeButton navigation={navigation} />,
        })}
      />
    </ParametresStackNav.Navigator>
  );
}

function EmptyScreen() { return null; }

const HIDDEN = '__hidden__';
const FAB_SLOT = '__fab__';

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  // Order must match Tab.Screen order below: Accueil(hidden), Dossier, Veterinaires, Ajouter(fab), Rappels, Parametres
  const tabs = [
    HIDDEN,
    { name: 'Dossier', label: 'Dossier', icon: '📋' },
    { name: 'Veterinaires', label: 'Vétérinaires', icon: '🐾' },
    FAB_SLOT,
    { name: 'Rappels', label: 'Rappels', icon: '⏰' },
    { name: 'Parametres', label: 'Paramètres', icon: '⚙️' },
  ];

  const isActive = (tabName) => {
    const idx = state.routes.findIndex((r) => r.name === tabName);
    return idx === state.index;
  };

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab, i) => {
        if (tab === HIDDEN) return null;
        if (tab === FAB_SLOT) {
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
      <Tab.Screen name="Veterinaires" component={VetStack} />
      <Tab.Screen name="Ajouter" component={EmptyScreen} />
      <Tab.Screen name="Rappels" component={RappelsStack} />
      <Tab.Screen name="Parametres" component={ParametresStack} />
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
