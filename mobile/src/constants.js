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
  'Clamoxyl / Augmentin', 'Vibramycine', 'Keflex', 'Baytril', 'Marboflox', 'Zithromax',
  'Metacam / Meloxidyl', 'Previcox', 'Feldène', 'Cortancyl', 'Rimadyl / Carprieve',
  'Piriteze', 'Claritine', 'Benadryl', 'Apoquel', 'Omnaris',
  'Losec / Nexium', 'Zantac', 'Eupantol', 'Cerenia', 'Primperan',
  'Tobradex', 'Exocine', 'Ciloxan', 'Pilocar', 'Lamisil ototopique',
  'Lamisil', 'Diflucan', 'Sporanox', 'Nizoral', 'Daktarin',
  'Vetmedin', 'Digoxine Nativelle', 'Lasilix', 'Aldactone', 'Renitec',
  'Thyroxine / Levaxin', 'Tapazole', 'PTU',
  'Insuline Humuline', 'Lantus', 'Minidiab', 'Humalog',
  'Hibitane', 'Fluoridex',
];

export const MEDICAMENTS_CATEGORIES = [
  { cat: 'ANTIBIOTIQUES', items: ['Clamoxyl / Augmentin', 'Vibramycine', 'Keflex', 'Baytril', 'Marboflox', 'Zithromax'] },
  { cat: 'ANTI-INFLAMMATOIRES', items: ['Metacam / Meloxidyl', 'Previcox', 'Feldène', 'Cortancyl', 'Rimadyl / Carprieve'] },
  { cat: 'ANTIHISTAMINIQUES & ALLERGIES', items: ['Piriteze', 'Claritine', 'Benadryl', 'Apoquel', 'Omnaris'] },
  { cat: 'PROTECTEURS GASTRIQUES & DIGESTIFS', items: ['Losec / Nexium', 'Zantac', 'Eupantol', 'Cerenia', 'Primperan'] },
  { cat: 'COLLYRES & AURICULAIRES', items: ['Tobradex', 'Exocine', 'Ciloxan', 'Pilocar', 'Lamisil ototopique'] },
  { cat: 'ANTIFONGIQUES', items: ['Lamisil', 'Diflucan', 'Sporanox', 'Nizoral', 'Daktarin'] },
  { cat: 'CARDIOLOGIQUES', items: ['Vetmedin', 'Digoxine Nativelle', 'Lasilix', 'Aldactone', 'Renitec'] },
  { cat: 'THYROÏDIENS', items: ['Thyroxine / Levaxin', 'Tapazole', 'PTU'] },
  { cat: 'DIABÈTE', items: ['Insuline Humuline', 'Lantus', 'Minidiab', 'Humalog'] },
  { cat: 'DENTAIRE ET AUTRES', items: ['Hibitane', 'Fluoridex'] },
];

export const VETERINAIRES = [
  { id: 'paris-1', nom: "Vet'in Paris (11e)", adresse: '89 Rue du Faubourg Saint-Antoine, 75011 Paris', telephone: '01 43 07 01 06', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'Chiens', 'Chats'] },
  { id: 'paris-2', nom: 'Dr. Le Bail (15e)', adresse: '24 Rue de l\'Abbé Groult, 75015 Paris', telephone: '01 45 31 30 98', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'Chiens', 'Chats'] },
  { id: 'maisons-alfort', nom: 'Clinique Urgences Vétérinaires', adresse: '199 Av. de la République, 94700 Maisons-Alfort', telephone: '01 48 45 94 59', horaires: 'Nuits + week-ends + jours fériés', specialites: ['Urgences'] },
  { id: 'lyon-1', nom: 'Onlyvet — Saint-Priest (Lyon)', adresse: '7 rue Jean Zay, 69800 Saint-Priest', telephone: '04 27 04 00 27', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'Chiens', 'Chats', 'NAC'] },
  { id: 'marseille-1', nom: 'Urgences Vétérinaires Marseille', adresse: '227 route des 3 Lucs, 13011 Marseille', telephone: '04 91 13 44 44', horaires: '24h/24, 7j/7', specialites: ['Urgences'] },
  { id: 'toulouse-1', nom: 'VET-URGENTYS Toulouse', adresse: '112 Bd de Suisse, 31200 Toulouse', telephone: '05 61 11 21 31', horaires: '24h/24, 7j/7', specialites: ['Urgences'] },
  { id: 'bordeaux-1', nom: 'Clinique Alliance Bordeaux', adresse: '8 Boulevard Godard, 33300 Bordeaux', telephone: '05 56 39 15 48', horaires: '24h/24, 7j/7', specialites: ['Urgences'] },
  { id: 'strasbourg-1', nom: 'Maison des Urgences Vétérinaires', adresse: 'Strasbourg (67)', telephone: '03 68 71 83 00', horaires: 'Nuits (19h–7h) + WE + jours fériés', specialites: ['Urgences'] },
  { id: 'rennes-1', nom: 'V2TU Rennes', adresse: '6 rue du Bourg Nouveau, 35000 Rennes', telephone: '02 99 41 16 46', horaires: 'Nuits + week-ends', specialites: ['Urgences'] },
  { id: 'montpellier-1', nom: 'V2TU Montpellier', adresse: '137 rue Claude Balbastre, 34070 Montpellier', telephone: '04 67 45 46 84', horaires: 'Nuits + week-ends', specialites: ['Urgences'] },
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
