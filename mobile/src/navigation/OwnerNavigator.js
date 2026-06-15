import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

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

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const { logout, user } = useAuth();
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🐾</Text>
        <Text style={styles.headerTitle}>Carnet Santé PRO</Text>
        {user?.email ? <Text style={styles.headerEmail}>{user.email}</Text> : null}
      </View>
      <DrawerItemList {...props} />
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>🚪 Déconnexion</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const screenOptions = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' },
  drawerActiveBackgroundColor: colors.greenLight,
  drawerActiveTintColor: colors.primaryDark,
  drawerInactiveTintColor: colors.text,
  drawerLabelStyle: { fontSize: 15 },
};

export default function OwnerNavigator() {
  return (
    <Drawer.Navigator drawerContent={(props) => <CustomDrawerContent {...props} />} screenOptions={screenOptions}>
      <Drawer.Screen name="Accueil" component={AccueilScreen} options={{ title: '🏠 Accueil', drawerLabel: '🏠 Accueil' }} />
      <Drawer.Screen name="Dossier" component={DossierScreen} options={{ title: '📁 Dossier', drawerLabel: '📁 Dossier' }} />
      <Drawer.Screen name="Vaccins" component={VaccinsScreen} options={{ title: '💉 Vaccins', drawerLabel: '💉 Vaccins' }} />
      <Drawer.Screen name="Medicaments" component={MedicamentsScreen} options={{ title: '💊 Médication', drawerLabel: '💊 Médication' }} />
      <Drawer.Screen name="Chirurgies" component={ChirurgiesScreen} options={{ title: '🔪 Chirurgies', drawerLabel: '🔪 Chirurgies' }} />
      <Drawer.Screen name="Aliment" component={AlimentScreen} options={{ title: '🍎 Alimentation', drawerLabel: '🍎 Alimentation' }} />
      <Drawer.Screen name="Notes" component={NotesScreen} options={{ title: '📋 Observations', drawerLabel: '📋 Observations' }} />
      <Drawer.Screen name="Messages" component={MessagesScreen} options={{ title: '💬 Messagerie vétérinaire', drawerLabel: '💬 Messagerie' }} />
      <Drawer.Screen name="Journal" component={JournalScreen} options={{ title: '📖 Journal de vie', drawerLabel: '📖 Journal de vie' }} />
      <Drawer.Screen name="Documents" component={DocumentsScreen} options={{ title: '📄 Documents', drawerLabel: '📄 Documents' }} />
      <Drawer.Screen name="Videos" component={VideosScreen} options={{ title: '🎥 Vidéos', drawerLabel: '🎥 Vidéos' }} />
      <Drawer.Screen name="Poids" component={PoidsScreen} options={{ title: '⚖️ Poids', drawerLabel: '⚖️ Poids' }} />
      <Drawer.Screen name="Planning" component={PlanningScreen} options={{ title: '📅 Rendez-vous', drawerLabel: '📅 Rendez-vous' }} />
      <Drawer.Screen name="Budget" component={BudgetScreen} options={{ title: '💰 Budget', drawerLabel: '💰 Budget' }} />
      <Drawer.Screen name="Veterinaires" component={VeterinairesScreen} options={{ title: '🏥 Vétérinaires', drawerLabel: '🏥 Vétérinaires' }} />
      <Drawer.Screen name="Rappels" component={RappelsScreen} options={{ title: '⚠️ Rappels', drawerLabel: '⚠️ Rappels' }} />
      <Drawer.Screen name="Parametres" component={ParametresScreen} options={{ title: '⚙️ Paramètres', drawerLabel: '⚙️ Paramètres' }} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  headerEmoji: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  headerEmail: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  logoutButton: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.redLight,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.red,
    fontWeight: '600',
  },
});
