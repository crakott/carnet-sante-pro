import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
    apiKey: "AIzaSyDZ_dc_HfSmXL1pjeKwT7uD1xX2lbr48c0",
    authDomain: "carnet-sante-pro.firebaseapp.com",
    projectId: "carnet-sante-pro",
    storageBucket: "carnet-sante-pro.firebasestorage.app",
    messagingSenderId: "1059301417055",
    appId: "1:1059301417055:web:8f5f81e0b075063ad4fbea"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistance locale (IndexedDB) : permet de consulter et modifier les données
// déjà chargées hors connexion, avec synchronisation automatique au retour du réseau
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
} catch (e) {
    console.warn('Persistance Firestore indisponible, mode mémoire utilisé:', e);
    db = getFirestore(app);
}
export { db };

export const functions = getFunctions(app, 'europe-west1');
