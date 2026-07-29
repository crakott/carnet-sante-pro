import { getAnimalDossier } from './reminders';
import { formatDate, computeAge } from './dates';
import { EMOJIS_ESPECE, TYPE_LABELS } from '../constants';
import { colors } from '../theme';

// Escape text before injecting it into the printable HTML report
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Number of whole days between today and a given date (negative if in the past)
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

// Cards shown on the "Dossier" overview, each linking to its corresponding screen
// (a subset of the web app's DOSSIER_CARDS, limited to the sections available on mobile)
export const DOSSIER_GROUPS = ['Santé', 'Quotidien', 'Administratif'];
export const DOSSIER_CARDS = [
  { id: 'Vaccins', emoji: '💉', label: 'Vaccins', color: colors.primary, bg: colors.greenLight, group: 'Santé' },
  { id: 'Medicaments', emoji: '💊', label: 'Traitements', color: colors.pink, bg: colors.pinkLight, group: 'Santé' },
  { id: 'Chirurgies', emoji: '🔪', label: 'Chirurgies', color: colors.rose, bg: colors.roseLight, group: 'Santé' },
  { id: 'Poids', emoji: '⚖️', label: 'Poids', color: colors.primary, bg: colors.greenLight, group: 'Santé' },
  { id: 'Aliment', emoji: '🍎', label: 'Alimentation', color: colors.yellow, bg: colors.yellowLight, group: 'Quotidien' },
  { id: 'Notes', emoji: '📋', label: 'Observations', color: colors.cyan, bg: colors.blueLight, group: 'Quotidien' },
  { id: 'Messages', emoji: '💬', label: 'Messagerie vétérinaire', color: colors.cyan, bg: colors.blueLight, group: 'Quotidien' },
  { id: 'Journal', emoji: '📖', label: 'Journal de vie', color: colors.pink, bg: colors.pinkLight, group: 'Quotidien' },
  { id: 'Documents', emoji: '📄', label: 'Documents', color: colors.indigo, bg: colors.indigoLight, group: 'Quotidien' },
  { id: 'Galerie', emoji: '📷', label: 'Photos', color: colors.pink, bg: colors.pinkLight, group: 'Quotidien' },
  { id: 'Videos', emoji: '🎥', label: 'Vidéos', color: colors.pink, bg: colors.pinkLight, group: 'Quotidien' },
  { id: 'Planning', emoji: '📅', label: 'Rendez-vous', color: colors.primary, bg: colors.greenLight, group: 'Administratif' },
  { id: 'Budget', emoji: '💰', label: 'Budget', color: colors.yellow, bg: colors.yellowLight, group: 'Administratif' },
  { id: 'Assurance', emoji: '🛡️', label: 'Assurance', color: colors.indigo, bg: colors.indigoLight, group: 'Administratif' },
];

// Style of the status pill shown next to a Dossier card (mirrors getDossierStatusPillStyle)
export const getDossierStatusPillStyle = (status) => {
  if (status.iconColor === colors.primary) return { bg: colors.pillGreenBg, color: colors.pillGreenText };
  if (status.iconColor === colors.red) return { bg: colors.redLight, color: colors.pillRedText };
  return { bg: colors.background, color: colors.textMuted };
};

// Status text + indicator color shown on a Dossier card for a given section (mirrors getDossierCardStatus)
export const getDossierCardStatus = (animal, cardId, videoCount = 0) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const ok = { iconColor: colors.primary };
  const none = { iconColor: colors.inputBorder };
  switch (cardId) {
    case 'Vaccins': {
      const vaccins = animal.vaccins || [];
      if (vaccins.length === 0) return { text: 'Aucun vaccin enregistré', ...none };
      const aJour = vaccins.every((v) => { const d = daysUntil(v.rappel || v.date); return d === null || d >= 0; });
      return aJour ? { text: 'À jour', ...ok } : { text: 'À renouveler', iconColor: colors.red };
    }
    case 'Medicaments': {
      const meds = animal.medicaments || [];
      const enCours = meds.filter((m) => m.dateDebut && m.dateFin && todayIso >= m.dateDebut && todayIso <= m.dateFin);
      if (enCours.length > 0) return { text: `${enCours.length} en cours`, iconColor: colors.pink };
      return meds.length > 0 ? { text: `${meds.length} enregistré(s)`, ...none } : { text: 'Aucun', ...none };
    }
    case 'Chirurgies': {
      const n = (animal.chirurgies || []).length;
      return n > 0 ? { text: `${n} enregistrée(s)`, ...ok } : { text: 'Aucune', ...none };
    }
    case 'Poids': {
      const lastWeight = [...(animal.poids || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return lastWeight ? { text: `${lastWeight.valeur} kg (${formatDate(lastWeight.date)})`, ...ok } : { text: 'Non renseigné', ...none };
    }
    case 'Aliment': {
      const n = (animal.aliments || []).length;
      return n > 0 ? { text: `${n} repas enregistré(s)`, ...ok } : { text: 'Aucun', ...none };
    }
    case 'Notes': {
      const n = (animal.observations || []).length;
      return n > 0 ? { text: `${n} observation(s)`, ...ok } : { text: 'Aucune', ...none };
    }
    case 'Galerie': {
      const n = (animal.photos || []).length;
      return n > 0 ? { text: `${n} photo(s)`, iconColor: colors.pink } : { text: 'Aucune photo', ...none };
    }
    case 'Videos':
      return videoCount > 0 ? { text: `${videoCount} vidéo(s)`, ...ok } : { text: 'Aucune vidéo', ...none };
    case 'Documents': {
      const n = (animal.documents || []).length;
      return n > 0 ? { text: `${n} fichier(s)`, ...ok } : { text: 'Aucun document', ...none };
    }
    case 'Messages':
      return { text: 'Échanger avec le vétérinaire', iconColor: colors.cyan };
    case 'Journal': {
      const n = (animal.vaccins || []).length + (animal.chirurgies || []).length
        + (animal.medicaments || []).length + (animal.poids || []).length + (animal.observations || []).length;
      return n > 0 ? { text: `${n} souvenir(s)`, iconColor: colors.pink } : { text: 'Aucun souvenir', ...none };
    }
    case 'Securite':
      return { text: 'Urgences & premiers secours', iconColor: colors.red };
    case 'Planning': {
      const rdvs = animal.rdvs || [];
      const now = new Date();
      const upcoming = rdvs.filter((r) => new Date(`${r.date}T${r.heure || '00:00'}`) >= now)
        .sort((a, b) => `${a.date}T${a.heure || '00:00'}`.localeCompare(`${b.date}T${b.heure || '00:00'}`));
      return upcoming.length > 0 ? { text: `Prochain : ${formatDate(upcoming[0].date)}`, iconColor: colors.violet } : { text: 'Aucun RDV programmé', ...none };
    }
    case 'Budget': {
      const total = (animal.budget || []).reduce((s, b) => s + b.montant, 0);
      return { text: `${total.toFixed(0)} €`, iconColor: colors.yellow };
    }
    case 'Assurance': {
      const ins = animal.assurance;
      if (!ins || !ins.compagnie) return { text: 'Non renseignée', ...none };
      if (ins.dateFin) {
        const d = daysUntil(ins.dateFin);
        if (d !== null && d < 0) return { text: `Expirée (${ins.compagnie})`, iconColor: colors.red };
        if (d !== null && d <= 30) return { text: `Renouvellement dans ${d} j`, iconColor: colors.yellow };
      }
      return { text: ins.compagnie, ...ok };
    }
    default:
      return { text: '', ...none };
  }
};

// Format an animal's record as plain text, ready to be sent by email to a vétérinaire
// sections: object { vaccins, medicaments, chirurgies, antiparasitaires, vermifuges, poids, rdvs, observations, assurance, budget }
// Pass null to include everything (backward compat).
export const buildDossierEmailBody = (animal, sections = null) => {
  const inc = (key) => sections === null || !!sections[key];
  const { vaccinNames, lastWeight, currentMedications } = getAnimalDossier(animal);
  const observations = [...(animal.observations || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const chirurgies = animal.chirurgies || [];
  const antiparasitaires = animal.antiparasitaires || [];
  const vermifuges = animal.vermifuges || [];
  const rdvs = [...(animal.rdvs || [])].sort((a, b) => b.date.localeCompare(a.date));

  const lines = [
    `Dossier santé de ${animal.nom} (${EMOJIS_ESPECE[animal.espece] || ''} ${animal.espece}${animal.race ? ', ' + animal.race : ''})`,
    animal.sexe ? `Sexe : ${animal.sexe === 'male' ? 'Mâle' : 'Femelle'}${animal.sterilise ? ' (stérilisé/castré)' : ''}` : null,
    animal.dateNaissance ? `Date de naissance : ${formatDate(animal.dateNaissance)}` : null,
    '',
  ];

  if (inc('vaccins')) lines.push(`💉 Vaccins : ${vaccinNames.length > 0 ? vaccinNames.join(', ') : 'aucun enregistré'}`);
  if (inc('poids')) lines.push(`⚖️ Poids actuel : ${lastWeight ? `${lastWeight.valeur} kg (mesuré le ${lastWeight.date})` : 'non renseigné'}`);
  if (inc('medicaments')) lines.push(`💊 Médicaments en cours : ${currentMedications.length > 0 ? currentMedications.map((m) => `${m.nom} (${m.dosage}${m.unite}, ${m.frequence})`).join(', ') : 'aucun'}`);
  if (inc('chirurgies')) lines.push(`🔪 Chirurgies : ${chirurgies.length > 0 ? chirurgies.map((c) => `${c.nom || c.type || 'Chirurgie'}${c.date ? ' (' + c.date + ')' : ''}`).join(', ') : 'aucune'}`);
  if (inc('antiparasitaires')) lines.push(`🐛 Antiparasitaires : ${antiparasitaires.length > 0 ? antiparasitaires.map((a) => `${a.produit || a.nom || ''}${a.prochaine ? ' (prochain : ' + a.prochaine + ')' : ''}`).join(', ') : 'aucun'}`);
  if (inc('vermifuges')) lines.push(`💊 Vermifuges : ${vermifuges.length > 0 ? vermifuges.map((v) => `${v.produit || v.nom || ''}${v.prochaine ? ' (prochain : ' + v.prochaine + ')' : ''}`).join(', ') : 'aucun'}`);

  if (inc('rdvs') && rdvs.length > 0) {
    lines.push('', '📅 Rendez-vous :');
    rdvs.forEach((r) => lines.push(`  • [${r.date}${r.heure ? ' ' + r.heure : ''}] ${r.motif}${r.lieu ? ' — ' + r.lieu : ''}`));
  }

  if (inc('observations')) {
    const obsLines = observations.length > 0
      ? observations.map((o) => {
          const label = (TYPE_LABELS[o.type] || o.type).replace(/^\S+\s/, '');
          const attachments = [o.photo ? '📷 photo' : null, o.audio ? '🎙️ audio' : null].filter(Boolean).join(' + ');
          return `  • [${o.date}] ${label}${o.description ? ' — ' + o.description : ''}${attachments ? ` (${attachments}, voir le dossier complet)` : ''}`;
        })
      : ['  • aucune observation enregistrée'];
    const hasMedia = observations.some((o) => o.photo || o.audio);
    lines.push('', '📋 Observations :', ...obsLines);
    if (hasMedia) lines.push("\nℹ️ Certaines observations contiennent des photos ou enregistrements audio : ouvrez le dossier complet pour les consulter.");
  }

  if (inc('assurance')) {
    const ins = animal.assurance;
    if (ins && ins.compagnie) lines.push('', `🛡️ Assurance : ${ins.compagnie}${ins.numeroContrat ? ' — N° ' + ins.numeroContrat : ''}${ins.dateFin ? ' (renouvellement : ' + ins.dateFin + ')' : ''}`);
  }

  if (inc('budget')) {
    const total = (animal.budget || []).reduce((s, b) => s + (b.montant || 0), 0);
    lines.push(`💰 Budget total : ${total.toFixed(2)} €`);
  }

  lines.push('', 'Envoyé depuis Carnet Santé PRO');
  return lines.filter((line) => line !== null).join('\n');
};

// Build a standalone printable HTML report (with embedded photos/audio), used with expo-print
// sections: same shape as buildDossierEmailBody — null means include everything.
export const buildDossierHtml = (animal, sections = null) => {
  const inc = (key) => sections === null || !!sections[key];
  const { vaccinNames, lastWeight, currentMedications } = getAnimalDossier(animal);
  const observations = [...(animal.observations || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const poids = [...(animal.poids || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const rdvs = [...(animal.rdvs || [])].sort((a, b) => b.date.localeCompare(a.date));
  const chirurgies = animal.chirurgies || [];
  const antiparasitaires = animal.antiparasitaires || [];
  const vermifuges = animal.vermifuges || [];
  const budget = animal.budget || [];
  const ins = animal.assurance;
  const generated = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const obsHtml = observations.length > 0
    ? observations.map((o) => `
        <div class="obs">
            <p class="obs-head"><strong>${escapeHtml(TYPE_LABELS[o.type] || o.type)}</strong> — ${escapeHtml(o.date)}</p>
            ${o.description ? `<p>${escapeHtml(o.description)}</p>` : ''}
            ${o.photo ? `<img src="${escapeHtml(o.photo)}" alt="Photo observation" />` : ''}
            ${o.audio ? `<audio controls src="${escapeHtml(o.audio)}"></audio>` : ''}
        </div>`).join('')
    : '<p>Aucune observation enregistrée</p>';

  const poidsHtml = poids.length > 0
    ? `<table><tr><th>Date</th><th>Poids</th></tr>${poids.map((p) => `<tr><td>${escapeHtml(p.date)}</td><td>${escapeHtml(String(p.valeur))} kg</td></tr>`).join('')}</table>`
    : '<p>Non renseigné</p>';

  const rdvsHtml = rdvs.length > 0
    ? rdvs.map((r) => `<div class="obs"><p class="obs-head"><strong>${escapeHtml(r.motif)}</strong> — ${escapeHtml(r.date)}${r.heure ? ` à ${escapeHtml(r.heure)}` : ''}</p>${r.lieu ? `<p>📍 ${escapeHtml(r.lieu)}</p>` : ''}${r.notes ? `<p><em>${escapeHtml(r.notes)}</em></p>` : ''}</div>`).join('')
    : '<p>Aucun rendez-vous enregistré</p>';

  const chirHtml = chirurgies.length > 0
    ? chirurgies.map((c) => `<div class="obs"><p class="obs-head"><strong>${escapeHtml(c.nom || c.type || 'Chirurgie')}</strong>${c.date ? ` — ${escapeHtml(c.date)}` : ''}</p>${c.notes ? `<p>${escapeHtml(c.notes)}</p>` : ''}</div>`).join('')
    : '<p>Aucune chirurgie enregistrée</p>';

  const antiHtml = antiparasitaires.length > 0
    ? `<ul>${antiparasitaires.map((a) => `<li>${escapeHtml(a.produit || a.nom || '')}${a.date ? ` — ${escapeHtml(a.date)}` : ''}${a.prochaine ? ` (prochain : ${escapeHtml(a.prochaine)})` : ''}</li>`).join('')}</ul>`
    : '<p>Aucun</p>';

  const vermHtml = vermifuges.length > 0
    ? `<ul>${vermifuges.map((v) => `<li>${escapeHtml(v.produit || v.nom || '')}${v.date ? ` — ${escapeHtml(v.date)}` : ''}${v.prochaine ? ` (prochain : ${escapeHtml(v.prochaine)})` : ''}</li>`).join('')}</ul>`
    : '<p>Aucun</p>';

  const budgetTotal = budget.reduce((s, b) => s + (b.montant || 0), 0);

  const assuranceHtml = ins && ins.compagnie ? `
    <p><strong>Compagnie :</strong> ${escapeHtml(ins.compagnie)}</p>
    ${ins.numeroContrat ? `<p><strong>N° contrat :</strong> ${escapeHtml(ins.numeroContrat)}</p>` : ''}
    ${ins.dateDebut ? `<p><strong>Début :</strong> ${escapeHtml(ins.dateDebut)}</p>` : ''}
    ${ins.dateFin ? `<p><strong>Renouvellement :</strong> ${escapeHtml(ins.dateFin)}</p>` : ''}
    ${ins.franchise ? `<p><strong>Franchise :</strong> ${escapeHtml(String(ins.franchise))} €</p>` : ''}
    ${ins.plafond ? `<p><strong>Plafond annuel :</strong> ${escapeHtml(String(ins.plafond))} €</p>` : ''}
    ${ins.notes ? `<p>${escapeHtml(ins.notes)}</p>` : ''}` : '<p>Non renseignée</p>';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dossier santé - ${escapeHtml(animal.nom)}</title>
    <style>
        body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 800px; margin: 0 auto; }
        h1 { color: #10b981; margin-bottom: 4px; }
        h2 { margin-top: 28px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; font-size: 18px; }
        .obs { margin-bottom: 14px; padding: 12px; background: #f9fafb; border-radius: 8px; }
        .obs-head { margin: 0 0 6px; }
        img { max-width: 320px; display: block; margin-top: 8px; border-radius: 6px; }
        audio { margin-top: 8px; display: block; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 12px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; }
        .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    </style></head>
    <body>
        <h1>🐾 Dossier santé de ${escapeHtml(animal.nom)}</h1>
        <p>${escapeHtml(EMOJIS_ESPECE[animal.espece] || '')} ${escapeHtml(animal.espece || '')}${animal.race ? ' • ' + escapeHtml(animal.race) : ''}${animal.sexe ? ' • ' + (animal.sexe === 'male' ? 'Mâle' : 'Femelle') : ''}${animal.sterilise ? ' (stérilisé/castré)' : ''}</p>
        ${animal.dateNaissance ? `<p>Date de naissance : ${escapeHtml(formatDate(animal.dateNaissance))}</p>` : ''}
        ${animal.identifiant ? `<p>Identifiant : ${escapeHtml(animal.identifiant)}</p>` : ''}

        ${inc('vaccins') ? `<h2>💉 Vaccins</h2><p>${vaccinNames.length > 0 ? escapeHtml(vaccinNames.join(', ')) : 'Aucun enregistré'}</p>` : ''}
        ${inc('medicaments') ? `<h2>💊 Médicaments en cours</h2><p>${currentMedications.length > 0 ? currentMedications.map((m) => `${escapeHtml(m.nom)} — ${escapeHtml(m.dosage)}${escapeHtml(m.unite)}, ${escapeHtml(m.frequence)}`).join('<br>') : 'Aucun'}</p>` : ''}
        ${inc('chirurgies') ? `<h2>🔪 Chirurgies</h2>${chirHtml}` : ''}
        ${inc('antiparasitaires') ? `<h2>🐛 Antiparasitaires</h2>${antiHtml}` : ''}
        ${inc('vermifuges') ? `<h2>💊 Vermifuges</h2>${vermHtml}` : ''}
        ${inc('poids') ? `<h2>⚖️ Historique de poids</h2>${poidsHtml}` : ''}
        ${inc('rdvs') ? `<h2>📅 Rendez-vous</h2>${rdvsHtml}` : ''}
        ${inc('observations') ? `<h2>📋 Observations</h2>${obsHtml}` : ''}
        ${inc('assurance') ? `<h2>🛡️ Assurance</h2>${assuranceHtml}` : ''}
        ${inc('budget') ? `<h2>💰 Budget total</h2><p>${budgetTotal.toFixed(2)} € (${budget.length} dépense${budget.length > 1 ? 's' : ''})</p>` : ''}

        <div class="footer">Généré le ${escapeHtml(generated)} · Carnet Santé PRO</div>
    </body></html>`;
};

// ─── Étiquette collier (format carte de crédit 85.6 × 54 mm) ────────────────
// shareUrl : URL publique de la fiche de garde (https://…/?share=id)
export const buildCollarTagHtml = (animal, shareUrl) => {
  const { currentMedications } = getAnimalDossier(animal);
  const allergies = (animal.alimentationProfil?.allergies || '').trim();
  const phone = (animal.contactPhone || '').trim();
  const chip = (animal.identifiant || '').trim();
  const medsText = currentMedications.length > 0
    ? currentMedications.map((m) => `${escapeHtml(m.nom)} ${escapeHtml(m.dosage)}${escapeHtml(m.unite)}`).join(', ')
    : '';
  const photoSection = animal.photo
    ? `<img src="${escapeHtml(animal.photo)}" class="photo" />`
    : `<div class="photo-fb">🐾</div>`;
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=66x66&chl=${encodeURIComponent(shareUrl)}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: 85.6mm 54mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 85.6mm; height: 54mm; font-family: Arial, sans-serif; overflow: hidden; }
  .card { display: flex; padding: 3mm; gap: 2.5mm; height: 100%; background: #fff; border: 0.3mm solid #e5e7eb; border-radius: 1.5mm; }
  .left { flex: 1; display: flex; flex-direction: column; gap: 0.8mm; overflow: hidden; }
  .right { display: flex; flex-direction: column; align-items: center; justify-content: space-between; width: 24mm; }
  .photo { width: 15mm; height: 15mm; border-radius: 7.5mm; object-fit: cover; margin-bottom: 1mm; }
  .photo-fb { width: 15mm; height: 15mm; border-radius: 7.5mm; background: #10b981; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #fff; margin-bottom: 1mm; }
  .name { font-size: 10pt; font-weight: 700; color: #059669; }
  .chip { font-size: 5pt; color: #6b7280; margin-top: 0.5mm; }
  .tag { font-size: 4pt; font-weight: 700; color: #fff; padding: 0.5pt 2pt; border-radius: 1pt; display: inline-block; margin-top: 0.8mm; }
  .tag-red { background: #dc2626; }
  .tag-amber { background: #d97706; }
  .info { font-size: 5pt; color: #374151; line-height: 1.3; margin-top: 0.3mm; }
  .qr-label { font-size: 4pt; color: #9ca3af; text-align: center; margin-top: 0.5mm; }
  .phone { font-size: 7pt; font-weight: 900; color: #059669; text-align: center; word-break: break-all; }
  .phone-lbl { font-size: 4pt; color: #9ca3af; text-align: center; margin-bottom: 0.5mm; }
  .logo { font-size: 4pt; color: #d1d5db; text-align: center; }
</style></head><body>
<div class="card">
  <div class="left">
    ${photoSection}
    <div class="name">${escapeHtml(animal.nom || '')}</div>
    ${chip ? `<div class="chip">🔢 ${escapeHtml(chip)}</div>` : ''}
    ${medsText ? `<span class="tag tag-red">💊 Médicaments</span><div class="info">${escapeHtml(medsText)}</div>` : ''}
    ${allergies ? `<span class="tag tag-amber">⚠️ Allergies</span><div class="info">${escapeHtml(allergies)}</div>` : ''}
  </div>
  <div class="right">
    <div>
      <img src="${qrUrl}" style="width:22mm;height:22mm;display:block;" />
      <div class="qr-label">Fiche en ligne</div>
    </div>
    <div>
      ${phone ? `<div class="phone-lbl">📞 Si trouvé(e)</div><div class="phone">${escapeHtml(phone)}</div>` : `<div class="phone-lbl">Ajoutez un n° de contact</div>`}
    </div>
    <div class="logo">Carnet Santé PRO</div>
  </div>
</div>
</body></html>`;
};

// ─── Affiche "Animal perdu / trouvé" (A4, deux colonnes) ─────────────────────
// form : { date, lieu, telephone, signes, mode }   mode: 'perdu' | 'trouve'
// shareUrl : URL publique de la fiche de garde (chaîne vide = partage désactivé)
export const buildLostPosterHtml = (animal, form, shareUrl) => {
  const { date, lieu, telephone, signes, mode = 'perdu' } = form;
  const isPerdu = mode !== 'trouve';

  const accent      = isPerdu ? '#dc2626' : '#059669';
  const accentDark  = isPerdu ? '#991b1b' : '#065f46';
  const accentLight = isPerdu ? '#fef2f2' : '#f0fdf4';
  const accentBorder = isPerdu ? '#fca5a5' : '#6ee7b7';

  const modeLabel  = isPerdu ? 'ANIMAL PERDU'  : 'ANIMAL TROUVÉ';
  const modeSub    = isPerdu ? "Merci de nous contacter si vous l'avez aperçu" : 'Nous avons trouvé cet animal — est-il à vous ?';
  const dateLabel  = isPerdu ? 'Disparu(e) le' : 'Trouvé(e) le';
  const lieuLabel  = isPerdu ? 'Dernier lieu connu' : 'Lieu de découverte';
  const phoneLabel = isPerdu ? "Si vous l'avez trouvé, appelez le" : 'Pour récupérer votre animal, appelez le';

  const phone = (telephone || animal.contactPhone || '').trim();
  const age   = computeAge(animal.dateNaissance);
  const espaceEmoji = EMOJIS_ESPECE[animal.espece] || '🐾';
  const descParts = [espaceEmoji + ' ' + (animal.espece || ''), animal.race, age].filter(Boolean);

  const photoSection = animal.photo
    ? `<img src="${escapeHtml(animal.photo)}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:100%;background:#374151;display:flex;align-items:center;justify-content:center;font-size:80pt;">🐾</div>`;

  const qrUrl = shareUrl
    ? `https://chart.googleapis.com/chart?cht=qr&chs=80x80&chl=${encodeURIComponent(shareUrl)}`
    : '';

  const generated = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(modeLabel)} — ${escapeHtml(animal.nom)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; font-family: Arial, Helvetica, sans-serif; }
  .page { display: flex; flex-direction: column; width: 210mm; height: 297mm; }

  .hdr { background: ${accent}; color: #fff; padding: 14px 22px; flex-shrink: 0; }
  .hdr-title { font-size: 30pt; font-weight: 900; letter-spacing: 2px; line-height: 1; }
  .hdr-sub   { font-size: 10.5pt; opacity: 0.88; margin-top: 3px; }

  .main { display: flex; flex: 1; overflow: hidden; }

  .col-photo { width: 44%; overflow: hidden; background: #111; flex-shrink: 0; }

  .col-info {
    width: 56%; background: ${accentLight};
    padding: 22px 20px; display: flex; flex-direction: column;
    justify-content: center; gap: 10px;
    border-left: 4px solid ${accent};
  }
  .animal-name { font-size: 26pt; font-weight: 900; color: ${accentDark}; line-height: 1.05; }
  .animal-meta { font-size: 11pt; color: #374151; margin-top: 3px; }
  .divider { border: none; border-top: 1.5px solid ${accentBorder}; margin: 4px 0; }
  .info-item { font-size: 11pt; color: #1f2937; line-height: 1.5; }
  .info-lbl  { font-weight: 700; color: ${accentDark}; }

  .contact-bar {
    background: ${accentDark}; color: #fff;
    display: flex; align-items: center; padding: 16px 22px; gap: 20px; flex-shrink: 0;
  }
  .phone-wrap { flex: 1; }
  .phone-lbl  { font-size: 9pt; opacity: 0.85; margin-bottom: 3px; }
  .phone-num  { font-size: 28pt; font-weight: 900; letter-spacing: 0.5px; line-height: 1; }
  .footer-note { font-size: 7pt; opacity: 0.55; margin-top: 5px; }
  .qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; }
  .qr-lbl  { font-size: 7pt; opacity: 0.78; }
  .qr-no   { font-size: 7.5pt; opacity: 0.6; max-width: 88px; line-height: 1.4; }
</style></head>
<body>
<div class="page">
  <div class="hdr">
    <div class="hdr-title">🐾 ${escapeHtml(modeLabel)}</div>
    <div class="hdr-sub">${escapeHtml(modeSub)}</div>
  </div>

  <div class="main">
    <div class="col-photo">${photoSection}</div>
    <div class="col-info">
      <div>
        <div class="animal-name">${escapeHtml(animal.nom || '')}</div>
        ${descParts.length ? `<div class="animal-meta">${escapeHtml(descParts.join(' · '))}</div>` : ''}
      </div>
      <div class="divider"></div>
      ${date    ? `<div class="info-item"><span class="info-lbl">📅 ${escapeHtml(dateLabel)} :</span> ${escapeHtml(date)}</div>` : ''}
      ${lieu    ? `<div class="info-item"><span class="info-lbl">📍 ${escapeHtml(lieuLabel)} :</span> ${escapeHtml(lieu)}</div>` : ''}
      ${signes  ? `<div class="info-item"><span class="info-lbl">🔍 Signes distinctifs :</span> ${escapeHtml(signes)}</div>` : ''}
      ${animal.identifiant ? `<div class="info-item"><span class="info-lbl">🔢 Puce :</span> ${escapeHtml(animal.identifiant)}</div>` : ''}
    </div>
  </div>

  <div class="contact-bar">
    <div class="phone-wrap">
      <div class="phone-lbl">${escapeHtml(phoneLabel)}</div>
      <div class="phone-num">${escapeHtml(phone || '—')}</div>
      <div class="footer-note">Généré le ${escapeHtml(generated)} · Carnet Santé PRO</div>
    </div>
    <div class="qr-wrap">
      ${qrUrl
        ? `<img src="${qrUrl}" style="width:80px;height:80px;" /><div class="qr-lbl">Fiche en ligne</div>`
        : `<div class="qr-no">Activez le partage pour inclure le QR code</div>`}
    </div>
  </div>
</div>
</body></html>`;
};
