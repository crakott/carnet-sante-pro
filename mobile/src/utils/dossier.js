import { getAnimalDossier } from './reminders';
import { formatDate } from './dates';
import { EMOJIS_ESPECE, TYPE_LABELS } from '../constants';

// Escape text before injecting it into the printable HTML report
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Format an animal's record as plain text, ready to be sent by email to a vétérinaire
// (mirrors buildDossierEmailBody in the web app)
export const buildDossierEmailBody = (animal) => {
  const { vaccinNames, lastWeight, currentMedications } = getAnimalDossier(animal);
  const observations = [...(animal.observations || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const obsLines = observations.length > 0
    ? observations.map((o) => {
        const label = (TYPE_LABELS[o.type] || o.type).replace(/^\S+\s/, '');
        const attachments = [o.photo ? '📷 photo' : null, o.audio ? '🎙️ audio' : null].filter(Boolean).join(' + ');
        return `  • [${o.date}] ${label}${o.description ? ' — ' + o.description : ''}${attachments ? ` (${attachments}, voir le dossier complet)` : ''}`;
      })
    : ['  • aucune observation enregistrée'];
  const hasMedia = observations.some((o) => o.photo || o.audio);

  return [
    `Dossier santé de ${animal.nom} (${EMOJIS_ESPECE[animal.espece] || ''} ${animal.espece}${animal.race ? ', ' + animal.race : ''})`,
    animal.sexe ? `Sexe : ${animal.sexe === 'male' ? 'Mâle' : 'Femelle'}${animal.sterilise ? ' (stérilisé/castré)' : ''}` : null,
    animal.dateNaissance ? `Date de naissance : ${formatDate(animal.dateNaissance)}` : null,
    '',
    `💉 Vaccins : ${vaccinNames.length > 0 ? vaccinNames.join(', ') : 'aucun enregistré'}`,
    `⚖️ Poids actuel : ${lastWeight ? `${lastWeight.valeur} kg (mesuré le ${lastWeight.date})` : 'non renseigné'}`,
    `💊 Médicaments en cours : ${currentMedications.length > 0 ? currentMedications.map((m) => `${m.nom} (${m.dosage}${m.unite}, ${m.frequence})`).join(', ') : 'aucun'}`,
    '',
    '📋 Observations :',
    ...obsLines,
    hasMedia ? "\nℹ️ Certaines observations contiennent des photos ou enregistrements audio : ouvrez le dossier complet (bouton « 🖨️ Dossier complet ») pour les consulter ou les joindre à cet e-mail." : null,
    '',
    'Envoyé depuis Carnet Santé PRO',
  ].filter((line) => line !== null).join('\n');
};

// Build a standalone printable HTML report (with embedded photos/audio), used with expo-print
// (mirrors openDossierReport in the web app)
export const buildDossierHtml = (animal) => {
  const { vaccinNames, lastWeight, currentMedications } = getAnimalDossier(animal);
  const observations = [...(animal.observations || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  const obsHtml = observations.length > 0
    ? observations.map((o) => `
        <div class="obs">
            <p class="obs-head"><strong>${escapeHtml(TYPE_LABELS[o.type] || o.type)}</strong> — ${escapeHtml(o.date)}</p>
            ${o.description ? `<p>${escapeHtml(o.description)}</p>` : ''}
            ${o.photo ? `<img src="${escapeHtml(o.photo)}" alt="Photo observation" />` : ''}
            ${o.audio ? `<audio controls src="${escapeHtml(o.audio)}"></audio>` : ''}
        </div>`).join('')
    : '<p>Aucune observation enregistrée</p>';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dossier santé - ${escapeHtml(animal.nom)}</title>
    <style>
        body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 800px; margin: 0 auto; }
        h1 { color: #10b981; margin-bottom: 4px; }
        h2 { margin-top: 28px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; font-size: 18px; }
        .obs { margin-bottom: 14px; padding: 12px; background: #f9fafb; border-radius: 8px; }
        .obs-head { margin: 0 0 6px; }
        img { max-width: 320px; display: block; margin-top: 8px; border-radius: 6px; }
        audio { margin-top: 8px; display: block; }
    </style></head>
    <body>
        <h1>🐾 Dossier santé de ${escapeHtml(animal.nom)}</h1>
        <p>${escapeHtml(EMOJIS_ESPECE[animal.espece] || '')} ${escapeHtml(animal.espece || '')}${animal.race ? ' • ' + escapeHtml(animal.race) : ''}${animal.sexe ? ' • ' + (animal.sexe === 'male' ? 'Mâle' : 'Femelle') : ''}${animal.sterilise ? ' (stérilisé/castré)' : ''}</p>
        ${animal.dateNaissance ? `<p>Date de naissance : ${escapeHtml(formatDate(animal.dateNaissance))}</p>` : ''}
        <h2>💉 Vaccins</h2>
        <p>${vaccinNames.length > 0 ? escapeHtml(vaccinNames.join(', ')) : 'Aucun enregistré'}</p>
        <h2>⚖️ Poids actuel</h2>
        <p>${lastWeight ? `${escapeHtml(lastWeight.valeur)} kg (mesuré le ${escapeHtml(lastWeight.date)})` : 'Non renseigné'}</p>
        <h2>💊 Médicaments en cours</h2>
        <p>${currentMedications.length > 0 ? currentMedications.map((m) => `${escapeHtml(m.nom)} — ${escapeHtml(m.dosage)}${escapeHtml(m.unite)}, ${escapeHtml(m.frequence)}`).join('<br>') : 'Aucun'}</p>
        <h2>📋 Observations</h2>
        ${obsHtml}
    </body></html>`;
};
