import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const AnimalsContext = createContext(null);

export function AnimalsProvider({ children }) {
  const { user } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [animalsLoading, setAnimalsLoading] = useState(true);
  const [budgetFilter, setBudgetFilter] = useState('tout');

  const loadAnimals = useCallback(async (uid) => {
    setAnimalsLoading(true);
    try {
      const q = query(collection(db, 'animals'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const animalsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      loadAnimals(user.uid);
    } else {
      setAnimals([]);
      setSelectedAnimal(null);
      setAnimalsLoading(false);
    }
  }, [user, loadAnimals]);

  const saveAnimal = async (animalData) => {
    try {
      if (animalData.id && animals.find((a) => a.id === animalData.id)) {
        const { id, ...data } = animalData;
        await updateDoc(doc(db, 'animals', id), data);
      } else {
        await addDoc(collection(db, 'animals'), { ...animalData, userId: user.uid, createdAt: new Date() });
      }
      await loadAnimals(user.uid);
    } catch (error) {
      console.error('Erreur saving animal:', error);
      throw error;
    }
  };

  const deleteAnimal = async (animalId) => {
    try {
      await deleteDoc(doc(db, 'animals', animalId));
      await loadAnimals(user.uid);
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

  // Merge field updates (e.g. assigned vétérinaire) into an animal
  const updateAnimalFields = (animal, updates) => saveAnimal({ ...animal, ...updates });

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
        updateAnimalFields,
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
