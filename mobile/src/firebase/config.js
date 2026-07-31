import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same Firebase project as the web app (carnet-sante-pro)
const firebaseConfig = {
  apiKey: 'AIzaSyDZ_dc_HfSmXL1pjeKwT7uD1xX2lbr48c0',
  authDomain: 'carnet-sante-pro.firebaseapp.com',
  projectId: 'carnet-sante-pro',
  storageBucket: 'carnet-sante-pro.firebasestorage.app',
  messagingSenderId: '1059301417055',
  appId: '1:1059301417055:web:8f5f81e0b075063ad4fbea',
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export const functions = getFunctions(app, 'europe-west1');
