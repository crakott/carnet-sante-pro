// Reference data for animal profiles, vaccines, medications and vets
export const ESPECES = ['Chien', 'Chat', 'Lapin', 'Hamster', 'Gerbille', 'Cheval', 'Oiseau', 'Tortue'];

export const EMOJIS_ESPECE = {
    'Chien': '🐕', 'Chat': '🐈', 'Lapin': '🐰', 'Hamster': '🐹',
    'Cheval': '🐴', 'Oiseau': '🦜', 'Tortue': '🐢', 'Gerbille': '🐭'
};

// Champs exposés publiquement dans la fiche de garde QR code.
// NE PAS y inclure : budget, documents, partages, authorizedVets,
// authorizedVetsNames, householdId, userId, proprietaire*, fcmToken, stripeCustomerId
export const PUBLIC_CARD_FIELDS = [
    'nom', 'espece', 'race', 'sexe', 'dateNaissance', 'photo', 'sterilise',
    'identifiant', 'alimentationInfo', 'contactUrgence', 'veterinaire',
    'vaccins', 'medicaments', 'antiparasitaires', 'vermifuges',
    'chirurgies', 'observations', 'poids', 'poidsObjectif',
];

export const TYPE_LABELS = {
    comportement: '🐾 Comportement', selles: '💩 Selles', urine: '🚽 Urine',
    blessure: '🩹 Blessure', maladie: '🤒 Maladie', autres: '➕ Autres'
};

export const NAV_TABS = [
    { id: 'accueil', label: '🏠 Accueil' },
    { id: 'dossier', label: '📁 Dossier' },
    { id: 'vaccins', label: '💉 Vaccins' },
    { id: 'aliment', label: '🍎 Alimentation' },
    { id: 'medicaments', label: '💊 Traitements' },
    { id: 'chirurgies', label: '🔪 Chirurgies' },
    { id: 'notes', label: '📋 Observations' },
    { id: 'messages', label: '💬 Messagerie' },
    { id: 'journal', label: '📖 Journal de vie' },
    { id: 'documents', label: '📄 Documents' },
    { id: 'videos', label: '🎥 Vidéos' },
    { id: 'poids', label: '⚖️ Poids' },
    { id: 'budget', label: '💰 Budget' },
    { id: 'veterinaires', label: '🏥 Vétérinaires' },
    { id: 'urgences', label: '🆘 Urgences & Santé' },
    { id: 'planning', label: '📅 Planning' },
    { id: 'calendrier', label: '📆 Calendrier' },
    { id: 'voyage', label: '✈️ Voyage' },
    { id: 'rappels', label: '⚠️ Rappels' },
    { id: 'parametres', label: '⚙️ Paramètres' }
];

export const SIDEBAR_GROUPS = [
    { key: null, header: null, items: [
        { id: 'accueil', label: '🏠 Accueil' },
        { id: 'dossier', label: '📁 Dossier' },
    ]},
    { key: 'sante', header: 'Santé', items: [
        { id: 'vaccins', label: '💉 Vaccins' },
        { id: 'medicaments', label: '💊 Traitements' },
        { id: 'chirurgies', label: '🔪 Chirurgies' },
        { id: 'poids', label: '⚖️ Poids' },
    ]},
    { key: 'quotidien', header: 'Quotidien', items: [
        { id: 'aliment', label: '🍎 Alimentation' },
        { id: 'notes', label: '📋 Observations' },
        { id: 'messages', label: '💬 Messagerie' },
        { id: 'journal', label: '📖 Journal de vie' },
        { id: 'documents', label: '📄 Documents' },
        { id: 'videos', label: '🎥 Vidéos' },
    ]},
    { key: 'admin', header: 'Administratif', items: [
        { id: 'budget', label: '💰 Budget' },
        { id: 'planning', label: '📅 Planning' },
        { id: 'calendrier', label: '📆 Calendrier' },
        { id: 'voyage', label: '✈️ Voyage' },
    ]},
    { key: null, header: null, items: [
        { id: 'veterinaires', label: '🏥 Vétérinaires' },
        { id: 'urgences', label: '🆘 Urgences & Santé' },
        { id: 'rappels', label: '⚠️ Rappels' },
        { id: 'parametres', label: '⚙️ Paramètres' },
    ]},
];
