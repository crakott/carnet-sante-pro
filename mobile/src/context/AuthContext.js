import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const DEFAULT_REMINDERS = { vaccin: 3, medicament: 3, antiparasitaire: 14, vermifuge: 14 };

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [reminderSettings, setReminderSettings] = useState(DEFAULT_REMINDERS);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const loadSettings = async (uid) => {
    try {
      const ref = doc(db, 'settings', uid);
      let snap = await getDoc(ref);
      if (!snap.exists()) {
        // Migrate legacy settings doc (random id, userId field) if it exists
        const q = query(collection(db, 'settings'), where('userId', '==', uid));
        const legacy = await getDocs(q);
        if (legacy.docs.length > 0) {
          await setDoc(ref, legacy.docs[0].data(), { merge: true });
          snap = await getDoc(ref);
        }
      }
      if (snap.exists()) {
        const settings = snap.data();
        const s = settings.reminders || {};
        setReminderSettings({
          vaccin: s.vaccin ?? 3,
          medicament: s.medicament ?? 3,
          antiparasitaire: s.antiparasitaire ?? 14,
          vermifuge: s.vermifuge ?? 14,
        });
        setUserRole(settings.role || 'proprietaire');
        setSubscriptionStatus(settings.subscriptionStatus ?? null);
        setHouseholdId(settings.householdId || null);
        setNom(settings.nom || '');
        setPrenom(settings.prenom || '');
        setNotificationsEnabled(settings.notificationsEnabled ?? false);
      } else {
        await setDoc(ref, { userId: uid, role: 'proprietaire', reminders: DEFAULT_REMINDERS });
        setUserRole('proprietaire');
        setHouseholdId(null);
        setNom('');
        setPrenom('');
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Erreur loading settings:', error);
      setUserRole('proprietaire');
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        loadSettings(currentUser.uid);
      } else {
        setUserRole(null);
        setSubscriptionStatus(null);
      }
    });
    return unsub;
  }, []);

  const createSettingsDoc = async (uid, role, profile = {}) => {
    const data = { userId: uid, role, reminders: DEFAULT_REMINDERS, ...profile };
    if (role === 'veterinaire') data.subscriptionStatus = 'inactive';
    await setDoc(doc(db, 'settings', uid), data, { merge: true });
  };

  const signup = async (email, password, isVet, profile = {}) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createSettingsDoc(cred.user.uid, isVet ? 'veterinaire' : 'proprietaire', profile);
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = () => signOut(auth);

  const saveReminderSettings = async (settings) => {
    setReminderSettings(settings);
    await setDoc(doc(db, 'settings', user.uid), { userId: user.uid, reminders: settings }, { merge: true });
  };

  // Re-read settings/{uid} (e.g. after joining/leaving a foyer partagé)
  const reloadSettings = () => user && loadSettings(user.uid);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userRole,
        reminderSettings,
        subscriptionStatus,
        householdId,
        nom,
        prenom,
        notificationsEnabled,
        reloadSettings,
        signup,
        login,
        logout,
        resetPassword,
        saveReminderSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
