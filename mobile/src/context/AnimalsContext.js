import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const AnimalsContext = createContext(null);

export function AnimalsProvider({ children }) {
  const { user, householdId, reloadSettings } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [animalsLoading, setAnimalsLoading] = useState(true);
  const [budgetFilter, setBudgetFilter] = useState('tout');

  // Loads the user's own animals, plus any animal shared with their foyer (householdId)
  const loadAnimals = useCallback(async (uid, hId) => {
    setAnimalsLoading(true);
    try {
      const queries = [getDocs(query(collection(db, 'animals'), where('userId', '==', uid)))];
      if (hId) queries.push(getDocs(query(collection(db, 'animals'), where('householdId', '==', hId))));
      const snaps = await Promise.all(queries);
      const byId = new Map();
      snaps.forEach((snap) => snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() })));
      const animalsData = Array.from(byId.values());
      setAnimals(animalsData);
      setSelectedAnimal((prev) => {
        if (prev && animalsData.find((a) => a.id === prev)) return prev;
        return animalsData.length > 0 ? animalsData[0].id : null;
      });
    } catch (error) {
      console.error('Erreur loading animals:', error);
    } finally {
      setAnimalsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAnimals(user.uid, householdId);
    } else {
      setAnimals([]);
      setSelectedAnimal(null);
      setAnimalsLoading(false);
    }
  }, [user, householdId, loadAnimals]);

  const saveAnimal = async (animalData) => {
    try {
      if (animalData.id && animals.find((a) => a.id === animalData.id)) {
        const { id, ...data } = animalData;
        await updateDoc(doc(db, 'animals', id), data);
      } else {
        await addDoc(collection(db, 'animals'), { ...animalData, userId: user.uid, householdId: householdId || null, createdAt: new Date() });
      }
      await loadAnimals(user.uid, householdId);
    } catch (error) {
      console.error('Erreur saving animal:', error);
      throw error;
    }
  };

  const deleteAnimal = async (animalId) => {
    try {
      await deleteDoc(doc(db, 'animals', animalId));
      await loadAnimals(user.uid, householdId);
      setSelectedAnimal(null);
    } catch (error) {
      console.error('Erreur deleting animal:', error);
    }
  };

  // Append an item (vaccin, médicament, observation...) to an animal's array field
  const addAnimalItem = (animal, type, item) => {
    const updated = { ...animal, [type]: [...(animal[type] || []), { ...item, id: Date.now() }] };
    return saveAnimal(updated);
  };

  // Remove an item from an animal's array field by id
  const deleteAnimalItem = (animal, type, itemId) => {
    const updated = { ...animal, [type]: (animal[type] || []).filter((i) => i.id !== itemId) };
    return saveAnimal(updated);
  };

  // Merge updates into a single item of an animal's array field by id
  const updateAnimalItem = (animal, type, itemId, updates) => {
    const updated = { ...animal, [type]: (animal[type] || []).map((i) => (i.id === itemId ? { ...i, ...updates } : i)) };
    return saveAnimal(updated);
  };

  // Merge field updates (e.g. assigned vétérinaire) into an animal
  const updateAnimalFields = (animal, updates) => saveAnimal({ ...animal, ...updates });

  // Mark all of the current user's own animals as shared with the given foyer
  const shareAnimalsWithHousehold = async (hId) => {
    const mine = animals.filter((a) => a.userId === user.uid);
    await Promise.all(mine.map((a) => updateDoc(doc(db, 'animals', a.id), { householdId: hId })));
  };

  // Create a new foyer partagé, share my animals with it, and join it
  const createHousehold = async () => {
    const ref = await addDoc(collection(db, 'households'), { members: [user.uid], createdAt: new Date() });
    await shareAnimalsWithHousehold(ref.id);
    await setDoc(doc(db, 'settings', user.uid), { userId: user.uid, householdId: ref.id }, { merge: true });
    await reloadSettings();
    return ref.id;
  };

  // Join an existing foyer using its code (household document id), sharing my animals with it
  const joinHousehold = async (code) => {
    const id = (code || '').trim();
    if (!id) throw new Error('Veuillez saisir un code de foyer.');
    const ref = doc(db, 'households', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Foyer introuvable. Vérifiez le code.');
    await updateDoc(ref, { members: arrayUnion(user.uid) });
    await shareAnimalsWithHousehold(id);
    await setDoc(doc(db, 'settings', user.uid), { userId: user.uid, householdId: id }, { merge: true });
    await reloadSettings();
  };

  // Leave the current foyer and stop sharing my animals with it
  const leaveHousehold = async () => {
    if (!householdId) return;
    await updateDoc(doc(db, 'households', householdId), { members: arrayRemove(user.uid) });
    const mine = animals.filter((a) => a.userId === user.uid && a.householdId === householdId);
    await Promise.all(mine.map((a) => updateDoc(doc(db, 'animals', a.id), { householdId: null })));
    await setDoc(doc(db, 'settings', user.uid), { userId: user.uid, householdId: null }, { merge: true });
    await reloadSettings();
  };

  // Filter an animal's budget entries by the selected period
  const getFilteredBudget = (budget) => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearAgo = new Date(today.getFullYear(), 0, 1);

    return (budget || []).filter((b) => {
      const bDate = new Date(b.date);
      if (budgetFilter === 'semaine') return bDate >= weekAgo;
      if (budgetFilter === 'mois') return bDate >= monthAgo;
      if (budgetFilter === 'annee') return bDate >= yearAgo;
      return true;
    });
  };

  return (
    <AnimalsContext.Provider
      value={{
        animals,
        animalsLoading,
        selectedAnimal,
        setSelectedAnimal,
        saveAnimal,
        deleteAnimal,
        addAnimalItem,
        deleteAnimalItem,
        updateAnimalItem,
        updateAnimalFields,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        budgetFilter,
        setBudgetFilter,
        getFilteredBudget,
      }}
    >
      {children}
    </AnimalsContext.Provider>
  );
}

export const useAnimals = () => useContext(AnimalsContext);
