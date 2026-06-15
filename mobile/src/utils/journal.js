import { TYPE_LABELS } from '../constants';

// Build the "Journal de vie" timeline for an animal: vaccins, chirurgies, médicaments,
// pesées, observations, naissance and anniversaires, sorted from most to least recent
// (mirrors the events array built in JournalTab on the web app)
export const getJournalEvents = (animal) => {
  const events = [];

  (animal.vaccins || []).forEach((v) => v.date && events.push({ date: v.date, icon: '💉', title: `Vaccin : ${v.nom}` }));
  (animal.chirurgies || []).forEach((c) => c.date && events.push({ date: c.date, icon: '🔪', title: c.nom, detail: c.notes }));
  (animal.medicaments || []).forEach((m) => m.dateDebut && events.push({ date: m.dateDebut, icon: '💊', title: `Traitement : ${m.nom}` }));
  (animal.poids || []).forEach((p) => p.date && events.push({ date: p.date, icon: '⚖️', title: `Pesée : ${p.valeur} kg` }));
  (animal.observations || []).forEach((o) => o.date && events.push({
    date: o.date,
    icon: (TYPE_LABELS[o.type] || o.type).split(' ')[0],
    title: (TYPE_LABELS[o.type] || o.type).replace(/^\S+\s/, ''),
    detail: o.description,
    photo: o.photo,
  }));

  if (animal.dateNaissance) {
    const birth = new Date(animal.dateNaissance);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      events.push({ date: animal.dateNaissance, icon: '🐣', title: 'Naissance' });
      for (let year = birth.getFullYear() + 1; year <= today.getFullYear(); year++) {
        const anniv = new Date(birth);
        anniv.setFullYear(year);
        if (anniv <= today) {
          const age = year - birth.getFullYear();
          events.push({ date: anniv.toISOString().split('T')[0], icon: '🎂', title: `${age} an${age > 1 ? 's' : ''}` });
        }
      }
    }
  }

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  return events;
};
