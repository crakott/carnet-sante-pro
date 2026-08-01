import { formatDate } from './format';
import { EMOJIS_ESPECE, TYPE_LABELS, PUBLIC_CARD_FIELDS } from '../constants';

// Build a clear summary of an animal's record: vaccine names, current weight,
// ongoing medications and the kinds of observations logged
const getAnimalDossier = (animal) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const vaccinNames = (animal.vaccins || []).map(v => v.nom);
    const lastWeight = [...(animal.poids || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
    const currentMedications = (animal.medicaments || []).filter(m => todayStr >= m.dateDebut && todayStr <= m.dateFin);
    const observationTypes = [...new Set((animal.observations || []).map(o => o.type))];
    return { vaccinNames, lastWeight, currentMedications, observationTypes };
};

// Build a filtered public card from an animal record (only safe fields, no private data).
// Strips photo/audio from observations — they can contain sensitive medical images and
// should never be exposed publicly even when the owner enables QR code sharing.
export const buildPublicCard = (animalData) => {
    const card = {};
    PUBLIC_CARD_FIELDS.forEach(f => { if (animalData[f] !== undefined) card[f] = animalData[f]; });
    if (card.observations) {
        card.observations = card.observations.map(({ photo: _p, audio: _a, ...rest }) => rest);
    }
    return card;
};

// Génère un token aléatoire pour les liens d'invitation foyer
export const generateInviteToken = () => {
    try { return crypto.randomUUID(); } catch {
        return Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    }
};

// Escape text before injecting it into the printable HTML report (the report is built via document.write)
export const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Convert a base64 data-URL to a File object suitable for the Web Share API
export const dataUrlToFile = (dataUrl, baseName) => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
    if (!match) return null;
    const mime = match[1];
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ext = mime.split('/')[1].replace('jpeg', 'jpg').split('+')[0];
    return new File([bytes], `${baseName}.${ext}`, { type: mime });
};

// Format an animal's record as plain text, ready to be sent by email to a vétérinaire.
export const buildDossierEmailBody = (animal) => {
    const { vaccinNames, lastWeight, currentMedications } = getAnimalDossier(animal);
    const observations = [...(animal.observations || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const obsLines = observations.length > 0
        ? observations.map(o => {
            const label = (TYPE_LABELS[o.type] || o.type).replace(/^\S+\s/, '');
            const attachments = [o.photo ? '📷 photo' : null, o.audio ? '🎙️ audio' : null].filter(Boolean).join(' + ');
            return `  • [${o.date}] ${label}${o.description ? ' — ' + o.description : ''}${attachments ? ` (${attachments}, voir le dossier complet)` : ''}`;
        })
        : ['  • aucune observation enregistrée'];
    const hasMedia = observations.some(o => o.photo || o.audio);

    return [
        `Dossier santé de ${animal.nom} (${EMOJIS_ESPECE[animal.espece] || ''} ${animal.espece}${animal.race ? ', ' + animal.race : ''})`,
        animal.sexe ? `Sexe : ${animal.sexe === 'male' ? 'Mâle' : 'Femelle'}${animal.sterilise ? ' (stérilisé/castré)' : ''}` : null,
        animal.dateNaissance ? `Date de naissance : ${formatDate(animal.dateNaissance)}` : null,
        '',
        `💉 Vaccins : ${vaccinNames.length > 0 ? vaccinNames.join(', ') : 'aucun enregistré'}`,
        `⚖️ Poids actuel : ${lastWeight ? `${lastWeight.valeur} kg (mesuré le ${lastWeight.date})` : 'non renseigné'}`,
        `💊 Médicaments en cours : ${currentMedications.length > 0 ? currentMedications.map(m => `${m.nom} (${m.dosage}${m.unite}, ${m.frequence})`).join(', ') : 'aucun'}`,
        '',
        '📋 Observations :',
        ...obsLines,
        hasMedia ? "\nℹ️ Certaines observations contiennent des photos ou enregistrements audio : ouvrez le dossier complet (bouton « 🖨️ Dossier complet ») pour les consulter ou les joindre à cet e-mail." : null,
        '',
        'Envoyé depuis Carnet Santé PRO'
    ].filter(line => line !== null).join('\n');
};

// Open a printable, standalone report with the full written record AND embedded photos/audio
export const openDossierReport = (animal, sections) => {
    const s = sections || { vaccins: true, traitements: true, chirurgies: true, antiparasitaires: true, vermifuges: true, rdvs: true, assurance: true, poids: true, budget: true, observations: true };
    const { vaccinNames, lastWeight, currentMedications } = getAnimalDossier(animal);
    const observations = [...(animal.observations || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const chirurgies = [...(animal.chirurgies || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const antiparasitaires = [...(animal.antiparasitaires || [])].sort((a, b) => new Date(b.prochainTraitement || b.dernierTraitement) - new Date(a.prochainTraitement || a.dernierTraitement));
    const vermifuges = [...(animal.vermifuges || [])].sort((a, b) => new Date(b.prochainTraitement || b.dernierTraitement) - new Date(a.prochainTraitement || a.dernierTraitement));
    const rdvs = [...(animal.rdvs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const poids = [...(animal.poids || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const budget = (animal.budget || []).reduce((s, b) => s + (parseFloat(b.montant) || 0), 0);
    const generatedDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const win = window.open('', '_blank');
    if (!win) return;

    const obsHtml = observations.length > 0
        ? observations.map(o => `
                    <div class="obs">
                        <p class="obs-head"><strong>${escapeHtml(TYPE_LABELS[o.type] || o.type)}</strong> — ${escapeHtml(o.date)}</p>
                        ${o.description ? `<p>${escapeHtml(o.description)}</p>` : ''}
                        ${o.photo ? `<img src="${escapeHtml(o.photo)}" alt="Photo observation" />` : ''}
                        ${o.audio ? `<audio controls src="${escapeHtml(o.audio)}"></audio>` : ''}
                    </div>`).join('')
        : '<p>Aucune observation enregistrée</p>';

    const chirHtml = chirurgies.length > 0
        ? chirurgies.map(c => `<div class="obs"><p class="obs-head"><strong>${escapeHtml(c.nom)}</strong> — ${escapeHtml(c.date)}</p>${c.notes ? `<p>${escapeHtml(c.notes)}</p>` : ''}</div>`).join('')
        : '<p>Aucune chirurgie enregistrée</p>';

    const apHtml = antiparasitaires.length > 0
        ? antiparasitaires.map(a => `<div class="obs"><p class="obs-head"><strong>🦟 ${escapeHtml(a.nom)}</strong></p><p>Dernier : ${escapeHtml(a.dernierTraitement)} — Prochain : ${escapeHtml(a.prochainTraitement)}</p></div>`).join('')
        : '<p>Aucun antiparasitaire enregistré</p>';

    const vfHtml = vermifuges.length > 0
        ? vermifuges.map(v => `<div class="obs"><p class="obs-head"><strong>🪱 ${escapeHtml(v.nom)}</strong></p><p>Dernier : ${escapeHtml(v.dernierTraitement)} — Prochain : ${escapeHtml(v.prochainTraitement)}</p></div>`).join('')
        : '<p>Aucun vermifuge enregistré</p>';

    const rdvHtml = rdvs.length > 0
        ? rdvs.map(r => `<div class="obs"><p class="obs-head"><strong>${escapeHtml(r.motif)}</strong> — ${escapeHtml(r.date)}${r.heure ? ' à ' + escapeHtml(r.heure) : ''}</p>${r.lieu ? `<p>📍 ${escapeHtml(r.lieu)}</p>` : ''}${r.notesConsultation ? `<p><em>Notes : ${escapeHtml(r.notesConsultation)}</em></p>` : ''}</div>`).join('')
        : '<p>Aucun rendez-vous enregistré</p>';

    const poidsHtml = poids.length > 0
        ? `<table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="background:#f3f4f6"><th style="padding:6px 10px;text-align:left">Date</th><th style="padding:6px 10px;text-align:left">Poids (kg)</th></tr>${poids.map((p, i) => `<tr style="background:${i%2?'#f9fafb':'white'}"><td style="padding:6px 10px">${escapeHtml(p.date)}</td><td style="padding:6px 10px">${escapeHtml(String(p.valeur))}</td></tr>`).join('')}</table>`
        : '<p>Aucune pesée enregistrée</p>';

    const assurHtml = animal.assurance && animal.assurance.compagnie
        ? `<div class="obs"><p><strong>Compagnie :</strong> ${escapeHtml(animal.assurance.compagnie)}</p>${animal.assurance.numeroContrat ? `<p><strong>N° contrat :</strong> ${escapeHtml(animal.assurance.numeroContrat)}</p>` : ''}${animal.assurance.telephone ? `<p><strong>Téléphone :</strong> ${escapeHtml(animal.assurance.telephone)}</p>` : ''}${animal.assurance.dateDebut ? `<p><strong>Du</strong> ${escapeHtml(animal.assurance.dateDebut)}${animal.assurance.dateFin ? ` <strong>au</strong> ${escapeHtml(animal.assurance.dateFin)}` : ''}</p>` : ''}${animal.assurance.franchise ? `<p><strong>Franchise :</strong> ${escapeHtml(String(animal.assurance.franchise))} €</p>` : ''}${animal.assurance.plafondAnnuel ? `<p><strong>Plafond annuel :</strong> ${escapeHtml(String(animal.assurance.plafondAnnuel))} €</p>` : ''}${animal.assurance.notes ? `<p><em>${escapeHtml(animal.assurance.notes)}</em></p>` : ''}</div>`
        : null;

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dossier santé - ${escapeHtml(animal.nom)}</title>
                <style>
                    body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 800px; margin: 0 auto; }
                    h1 { color: #10b981; margin-bottom: 4px; }
                    h2 { margin-top: 28px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; font-size: 18px; }
                    .obs { margin-bottom: 14px; padding: 12px; background: #f9fafb; border-radius: 8px; }
                    .obs-head { margin: 0 0 6px; }
                    img { max-width: 320px; display: block; margin-top: 8px; border-radius: 6px; }
                    audio { margin-top: 8px; display: block; }
                    .print-btn { padding: 10px 18px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-bottom: 20px; }
                    .stamp { font-size: 12px; color: #9ca3af; margin-bottom: 16px; }
                    @media print { .print-btn { display: none; } }
                </style></head>
                <body>
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
                    <p class="stamp">Généré le ${generatedDate}</p>
                    <h1>🐾 Dossier santé de ${escapeHtml(animal.nom)}</h1>
                    <p>${escapeHtml(EMOJIS_ESPECE[animal.espece] || '')} ${escapeHtml(animal.espece || '')}${animal.race ? ' • ' + escapeHtml(animal.race) : ''}${animal.sexe ? ' • ' + (animal.sexe === 'male' ? 'Mâle' : 'Femelle') : ''}${animal.sterilise ? ' (stérilisé/castré)' : ''}</p>
                    ${animal.dateNaissance ? `<p>Date de naissance : ${escapeHtml(formatDate(animal.dateNaissance))}</p>` : ''}
                    ${animal.identifiant ? `<p><strong>Identifiant :</strong> ${escapeHtml(animal.identifiant)}</p>` : ''}
                    ${s.vaccins ? `<h2>💉 Vaccins</h2><p>${vaccinNames.length > 0 ? escapeHtml(vaccinNames.join(', ')) : 'Aucun enregistré'}</p>` : ''}
                    ${s.traitements ? `<h2>💊 Traitements en cours</h2><p>${currentMedications.length > 0 ? currentMedications.map(m => `${escapeHtml(m.nom)} — ${escapeHtml(m.dosage)}${escapeHtml(m.unite)}, ${escapeHtml(m.frequence)}`).join('<br>') : 'Aucun'}</p>` : ''}
                    ${s.chirurgies ? `<h2>🔪 Chirurgies & interventions</h2>${chirHtml}` : ''}
                    ${s.antiparasitaires ? `<h2>🦟 Antiparasitaires</h2>${apHtml}` : ''}
                    ${s.vermifuges ? `<h2>🪱 Vermifuges</h2>${vfHtml}` : ''}
                    ${s.rdvs ? `<h2>📅 Rendez-vous vétérinaires</h2>${rdvHtml}` : ''}
                    ${s.assurance && assurHtml ? '<h2>🛡️ Assurance</h2>' + assurHtml : ''}
                    ${s.poids ? `<h2>⚖️ Historique de poids</h2>${poidsHtml}${lastWeight ? `<p>Poids actuel : <strong>${escapeHtml(lastWeight.valeur)} kg</strong> (mesuré le ${escapeHtml(lastWeight.date)})</p>` : ''}` : ''}
                    ${s.budget ? `<h2>💰 Budget total</h2><p>${budget > 0 ? budget.toFixed(2) + ' €' : 'Aucune dépense enregistrée'}</p>` : ''}
                    ${s.observations ? `<h2>📋 Observations</h2>${obsHtml}` : ''}
                </body></html>`);
    win.document.close();
};

export const openLostPosterReport = (animal, lostInfo, shareUrl) => {
    const { mode = 'perdu', dateEvt, lieuEvt, telephone, description } = lostInfo || {};
    const isPerdu = mode !== 'trouve';
    const emoji = EMOJIS_ESPECE[animal.espece] || '🐾';
    const accent = isPerdu ? '#dc2626' : '#16a34a';
    const accentLight = isPerdu ? '#fef2f2' : '#f0fdf4';
    const titleIcon = isPerdu ? '🔍' : '✅';
    const titleText = isPerdu ? 'ANIMAL PERDU' : 'ANIMAL TROUVÉ';
    const dateLabel = isPerdu ? 'Perdu(e) le' : 'Trouvé(e) le';
    const lieuLabel = isPerdu ? 'Lieu de disparition' : 'Lieu où trouvé(e)';
    const ctaLabel = isPerdu ? 'Si vous l\'avez vu(e), appelez le :' : 'Pour contacter le propriétaire :';
    const footerText = isPerdu
        ? 'Merci de ne pas garder l\'animal sans en informer le propriétaire.'
        : 'Merci pour votre aide ! L\'animal sera rendu à son propriétaire dans les plus brefs délais.';
    const age = (() => {
        if (!animal.dateNaissance) return null;
        const diff = (Date.now() - new Date(animal.dateNaissance)) / (365.25 * 86400000);
        return diff < 1 ? Math.round(diff * 12) + ' mois' : Math.floor(diff) + ' an' + (Math.floor(diff) > 1 ? 's' : '');
    })();
    const posterPhoto = lostInfo && lostInfo.photo ? lostInfo.photo : (animal.photo || null);
    const qrUrl = (shareUrl && animal.shareEnabled)
        ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`
        : null;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
            <title>${titleText} — ${escapeHtml(animal.nom)}</title>
            <style>
                *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
                body{font-family:'Helvetica Neue',Arial,sans-serif;background:white;color:#111;width:190mm;padding:10mm;margin:0 auto}
                .header{background:${accent};color:white;text-align:center;padding:18px 16px;border-radius:12px;margin-bottom:14px}
                .header-icon{font-size:32px;line-height:1;margin-bottom:4px}
                .header-title{font-size:42px;font-weight:900;letter-spacing:4px;margin-bottom:4px}
                .header-name{font-size:26px;font-weight:700;opacity:.95}
                .body{display:flex;gap:14px;margin-bottom:14px}
                .photo-col{flex:0 0 44%}
                .photo-col img,.photo-placeholder{width:100%;height:250px;object-fit:cover;border-radius:10px;display:block}
                .photo-placeholder{background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:90px}
                .info-col{flex:1;background:${accentLight};border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:7px}
                .ir{font-size:14px;line-height:1.5}
                .ir strong{color:${accent};font-size:12px;display:block;text-transform:uppercase;letter-spacing:.4px;margin-bottom:1px}
                .ir.hi{background:${accent};color:white;padding:6px 10px;border-radius:6px}
                .ir.hi strong{color:rgba(255,255,255,.75)}
                .contact{background:${accent};color:white;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:16px}
                .contact-text{flex:1}
                .contact-label{font-size:13px;opacity:.85;margin-bottom:5px}
                .contact-tel{font-size:34px;font-weight:900;letter-spacing:.5px}
                .qr-wrap{flex-shrink:0;text-align:center}
                .qr-wrap img{border-radius:8px;background:white;padding:5px;display:block}
                .qr-cap{font-size:10px;opacity:.7;margin-top:3px}
                .footer{font-size:11px;color:#9ca3af;text-align:center;margin-top:10px;line-height:1.5}
                @media print{body{width:100%;padding:6mm}.no-print{display:none!important}}
            </style></head><body>
            <div class="header">
                <div class="header-icon">${titleIcon}</div>
                <div class="header-title">${titleText}</div>
                <div class="header-name">${emoji} ${escapeHtml(animal.nom)}</div>
            </div>
            <div class="body">
                <div class="photo-col">
                    ${posterPhoto ? `<img src="${posterPhoto}" alt="${escapeHtml(animal.nom)}" />` : `<div class="photo-placeholder">${emoji}</div>`}
                </div>
                <div class="info-col">
                    <div class="ir"><strong>Espèce</strong>${escapeHtml(animal.espece || '')}${animal.race ? ' · ' + escapeHtml(animal.race) : ''}</div>
                    ${animal.sexe ? `<div class="ir"><strong>Sexe</strong>${animal.sexe === 'male' ? 'Mâle' : 'Femelle'}${animal.sterilise ? ' · stérilisé/castré' : ''}</div>` : ''}
                    ${age ? `<div class="ir"><strong>Âge</strong>${escapeHtml(age)}</div>` : ''}
                    ${animal.identifiant ? `<div class="ir"><strong>Puce / identifiant</strong>${escapeHtml(animal.identifiant)}</div>` : ''}
                    ${dateEvt ? `<div class="ir hi"><strong>${escapeHtml(dateLabel)}</strong>${escapeHtml(formatDate(dateEvt))}</div>` : ''}
                    ${lieuEvt ? `<div class="ir hi"><strong>${escapeHtml(lieuLabel)}</strong>${escapeHtml(lieuEvt)}</div>` : ''}
                    ${description ? `<div class="ir" style="margin-top:2px"><strong>Signes distinctifs</strong>${escapeHtml(description)}</div>` : ''}
                </div>
            </div>
            <div class="contact">
                <div class="contact-text">
                    <div class="contact-label">${escapeHtml(ctaLabel)}</div>
                    <div class="contact-tel">📞 ${escapeHtml(telephone || '—')}</div>
                </div>
                ${qrUrl ? `<div class="qr-wrap"><img src="${qrUrl}" width="110" height="110" alt="QR code" /><div class="qr-cap">Carnet de santé</div></div>` : ''}
            </div>
            <p class="footer">${escapeHtml(footerText)}</p>
            <button class="no-print" onclick="window.print()" style="display:block;margin:14px auto 0;padding:10px 28px;background:${accent};color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ Imprimer</button>
            </body></html>`);
    win.document.close();
};

export const openCollarTagReport = (animal, shareUrl) => {
    const currentMeds = (animal.medicaments || []).filter(m => !m.dateFin || new Date(m.dateFin) >= new Date());
    const emoji = EMOJIS_ESPECE[animal.espece] || '🐾';
    const qrUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}` : null;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Étiquette collier — ${escapeHtml(animal.nom)}</title><style>
                *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;padding:20px;background:#f9fafb}
                .card{background:white;border:2.5px solid #111;border-radius:14px;padding:16px;max-width:360px;margin:0 auto 16px;page-break-inside:avoid}
                .name{font-size:24px;font-weight:900;margin-bottom:2px}
                .sub{font-size:12px;color:#6b7280;margin-bottom:12px}
                .row{display:flex;gap:12px;align-items:flex-start}
                .info{flex:1}.tel-label{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
                .tel{font-size:20px;font-weight:900;color:#ef4444;margin-bottom:10px}
                .alert-label{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
                .alert{font-size:12px;color:#111;margin-bottom:8px}
                .qr{flex-shrink:0;text-align:center}.qr img{border-radius:6px;display:block}
                .qr-caption{font-size:9px;color:#9ca3af;margin-top:3px;text-align:center}
                .hint{font-size:11px;color:#9ca3af;text-align:center;margin-top:8px}
                @media print{body{background:white;padding:0}.no-print{display:none}}
            </style></head><body>
                <div class="card">
                    <div class="name">${emoji} ${escapeHtml(animal.nom)}</div>
                    <div class="sub">${escapeHtml(animal.espece || '')}${animal.race ? ' · ' + escapeHtml(animal.race) : ''}${animal.identifiant ? ' · Puce : ' + escapeHtml(animal.identifiant) : ''}</div>
                    <div class="row">
                        <div class="info">
                            <div class="tel-label">Contact si trouvé</div>
                            <div class="tel">${escapeHtml(animal.contactUrgence || '—')}</div>
                            ${currentMeds.length > 0 ? `<div class="alert-label">⚠️ Médicaments en cours</div><div class="alert">${escapeHtml(currentMeds.map(m => m.nom).join(', '))}</div>` : ''}
                            ${animal.alimentationInfo && animal.alimentationInfo.allergies ? `<div class="alert-label">🚫 Allergies alimentaires</div><div class="alert">${escapeHtml(animal.alimentationInfo.allergies)}</div>` : ''}
                        </div>
                        ${qrUrl ? `<div class="qr"><img src="${qrUrl}" width="110" height="110" alt="QR code" /><div class="qr-caption">Carnet de santé</div></div>` : ''}
                    </div>
                </div>
                <p class="hint">Imprimez et plastifiez · Taille carte de crédit recommandée</p>
                <button class="no-print" onclick="window.print()" style="display:block;margin:16px auto;padding:10px 24px;background:#10b981;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">\u{1F5A8}️ Imprimer</button>
            </body></html>`);
    win.document.close();
};
