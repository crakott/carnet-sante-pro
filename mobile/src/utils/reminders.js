// Check reminders across all animals (including overdue), sorted by urgency
export const getReminders = (animals, reminderSettings) => {
  const reminders = [];
  const today = new Date();

  animals.forEach((animal) => {
    (animal.vaccins || []).forEach((v) => {
      const vaccineDate = new Date(v.rappel || v.date);
      const daysUntil = Math.ceil((vaccineDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntil <= reminderSettings.vaccin) {
        reminders.push({ type: 'vaccin', animal: animal.nom, nom: v.nom, daysUntil, urgent: daysUntil <= 1 });
      }
    });

    (animal.medicaments || []).forEach((m) => {
      const medDate = new Date(m.dateFin);
      const daysUntil = Math.ceil((medDate - today) / (1000 * 60 * 60 * 24));
      const threshold = m.rappelJours != null ? m.rappelJours : reminderSettings.medicament;
      if (daysUntil <= threshold) {
        reminders.push({ type: 'medicament', animal: animal.nom, nom: m.nom, daysUntil, urgent: daysUntil <= 1 });
      }
    });

    (animal.antiparasitaires || []).forEach((t) => {
      const d = new Date(t.prochainTraitement);
      const daysUntil = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (daysUntil <= (reminderSettings.antiparasitaire ?? 14)) {
        reminders.push({ type: 'antiparasitaire', animal: animal.nom, nom: t.nom || 'Antiparasitaire', daysUntil, urgent: daysUntil <= 1 });
      }
    });

    (animal.vermifuges || []).forEach((t) => {
      const d = new Date(t.prochainTraitement);
      const daysUntil = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (daysUntil <= (reminderSettings.vermifuge ?? 14)) {
        reminders.push({ type: 'vermifuge', animal: animal.nom, nom: t.nom || 'Vermifuge', daysUntil, urgent: daysUntil <= 1 });
      }
    });
  });

  return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
};

// Get ALL scheduled items for a single animal (no threshold — used for per-animal view in RappelsScreen)
export const getAnimalAllScheduled = (animal) => {
  const today = new Date();
  const items = [];

  (animal.vaccins || []).forEach((v) => {
    const dateStr = v.rappel || v.date;
    if (!dateStr) return;
    const daysUntil = Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
    items.push({ type: 'vaccin', nom: v.nom, daysUntil });
  });

  (animal.medicaments || []).forEach((m) => {
    if (!m.dateFin) return;
    const daysUntil = Math.ceil((new Date(m.dateFin) - today) / (1000 * 60 * 60 * 24));
    items.push({ type: 'medicament', nom: m.nom, daysUntil });
  });

  (animal.antiparasitaires || []).forEach((t) => {
    if (!t.prochainTraitement) return;
    const daysUntil = Math.ceil((new Date(t.prochainTraitement) - today) / (1000 * 60 * 60 * 24));
    items.push({ type: 'antiparasitaire', nom: t.nom || 'Antiparasitaire', daysUntil });
  });

  (animal.vermifuges || []).forEach((t) => {
    if (!t.prochainTraitement) return;
    const daysUntil = Math.ceil((new Date(t.prochainTraitement) - today) / (1000 * 60 * 60 * 24));
    items.push({ type: 'vermifuge', nom: t.nom || 'Vermifuge', daysUntil });
  });

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
};

// Build a clear summary of an animal's record (mirrors getAnimalDossier)
export const getAnimalDossier = (animal) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const vaccinNames = (animal.vaccins || []).map((v) => v.nom);
  const lastWeight = [...(animal.poids || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
  const currentMedications = (animal.medicaments || []).filter((m) => todayIso >= m.dateDebut && todayIso <= m.dateFin);
  const observationTypes = [...new Set((animal.observations || []).map((o) => o.type))];
  return { vaccinNames, lastWeight, currentMedications, observationTypes };
};
