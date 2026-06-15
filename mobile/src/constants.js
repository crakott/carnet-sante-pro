// Base URL of the web app, used to build the public "fiche de garde" share link
export const APP_URL = 'https://carnet-sante-pro.web.app';

export const ESPECES = ['Chien', 'Chat', 'Lapin', 'Hamster', 'Gerbille', 'Cheval', 'Oiseau', 'Tortue'];

export const EMOJIS_ESPECE = {
  Chien: '🐕', Chat: '🐈', Lapin: '🐰', Hamster: '🐹',
  Cheval: '🐴', Oiseau: '🦜', Tortue: '🐢', Gerbille: '🐭',
};

export const VACCINS_COURANTS = {
  Chien: ['Rage', 'DTP', 'Parvovirose', 'Leptospirose'],
  Chat: ['Rage', 'Typhus félin', 'Calicivirose', 'Rhinotrachéite', 'Coryza', 'Chlamydophilose', 'Leucose féline'],
  Cheval: ['Grippe équine', 'Tétanos', 'Rhinopneumonite'],
  Lapin: ['Myxomatose', 'VHD', 'VHD2'],
  Hamster: [], Gerbille: [], Tortue: [],
  Oiseau: ['Paramyxovirus', 'Newcastle'],
};

export const MEDICAMENTS_COURANTS = [
  'Amoxicilline', 'Doxycycline', 'Métronidazole', 'Fluconazole',
  'Paracétamol', 'Ibuprofène', 'Carprofen', 'Meloxicam',
  'Prednisone', 'Dexaméthasone', 'Loratadine', 'Cetirizine',
  'Oméprazole', 'Famotidine', 'Lactulose', 'Probiotiques',
];

export const VETERINAIRES = [
  { id: 1, nom: 'Clinique Saint-Germain', distance: '2.3 km', lat: 48.8539, lng: 2.3340, telephone: '01 23 45 67 89', horaires: 'Lun-Ven: 9h-19h', specialites: ['Chiens', 'Chats'], rating: 4.8 },
  { id: 2, nom: 'Vétérinaire 24h/24', distance: '5.1 km', lat: 48.8907, lng: 2.3617, telephone: '01 98 76 54 32', horaires: '24h/24, 7j/7', specialites: ['Urgences'], rating: 4.6 },
  { id: 3, nom: 'Clinique Exotiques', distance: '3.8 km', lat: 48.8330, lng: 2.3708, telephone: '01 45 23 12 34', horaires: 'Lun-Ven: 10h-18h', specialites: ['Reptiles', 'Oiseaux'], rating: 4.9 },
];

export const TYPE_LABELS = {
  comportement: '🐾 Comportement', selles: '💩 Selles', urine: '🚽 Urine',
  blessure: '🩹 Blessure', maladie: '🤒 Maladie', autres: '➕ Autres',
};

export const DOCUMENT_TYPES = {
  vaccin: '💉 Carnet de vaccination',
  ordonnance: '📝 Ordonnance',
  certificat: '📜 Certificat / Attestation',
  'compte-rendu': '🗒️ Compte-rendu de consultation',
  analyse: '🔬 Analyse / Résultat',
  facture: '🧾 Facture',
  assurance: '🛡️ Assurance / Mutuelle',
  icad: '🪪 I-CAD (identification)',
  adoption: "🏠 Document d'adoption",
  photo: '📷 Photo importante',
  autres: '📄 Autre document',
};

// 700 Ko, pour rester bien sous la limite de 1 Mo par document Firestore
export const MAX_DOCUMENT_PDF_SIZE = 700 * 1024;

export const CATEGORIES_BUDGET = ['Vétérinaire', 'Alimentation', 'Médicaments', 'Toilettage', 'Jouets', 'Accessoires', 'Autres'];

export const CATEGORY_EMOJIS = {
  Vétérinaire: '🏥', Alimentation: '🍎', Médicaments: '💊', Toilettage: '🛁', Jouets: '🎾', Accessoires: '🛠️', Autres: '➕',
};

export const VET_TABS = [
  { id: 'vaccins', label: '💉 Vaccins' },
  { id: 'medicaments', label: '💊 Médicaments' },
  { id: 'notes', label: '📋 Observations' },
  { id: 'poids', label: '⚖️ Poids' },
];

export const NAV_TABS = [
  { id: 'accueil', label: '🏠 Accueil' },
  { id: 'sante', label: '💪 Santé' },
  { id: 'vaccins', label: '💉 Vaccins' },
  { id: 'medicaments', label: '💊 Médication' },
  { id: 'aliment', label: '🍎 Alimentation' },
  { id: 'notes', label: '📋 Observations' },
  { id: 'poids', label: '⚖️ Poids' },
  { id: 'budget', label: '💰 Budget' },
  { id: 'veterinaires', label: '🏥 Vétérinaires' },
  { id: 'rappels', label: '⚠️ Rappels' },
  { id: 'parametres', label: '⚙️ Paramètres' },
];
