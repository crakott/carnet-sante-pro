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
  // Paris / Île-de-France
  { id: 'enva-alfort', nom: 'EnvA Alfort — Urgences chiens/chats/NAC', adresse: '7 av. du Général de Gaulle, 94700 Maisons-Alfort', telephone: '01 43 96 72 72', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'Chiens', 'Chats', 'NAC'], region: 'Paris' },
  { id: 'maisons-alfort', nom: 'Clinique Urgences Vétérinaires — Maisons-Alfort', adresse: '199 Av. de la République, 94700 Maisons-Alfort', telephone: '01 48 45 94 59', horaires: 'Nuits + WE + jours fériés', specialites: ['Urgences'], region: 'Paris' },
  { id: 'ucvet-20', nom: 'UCVet Paris 20e', adresse: '54 rue Stendhal, 75020 Paris', telephone: '01 71 19 70 10', horaires: '24h/24, 7j/7', specialites: ['Urgences'], region: 'Paris' },
  { id: 'paris-1', nom: "Vet'in Paris 11e", adresse: '89 rue du Faubourg Saint-Antoine, 75011 Paris', telephone: '01 43 07 01 06', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'Chiens', 'Chats'], region: 'Paris' },
  { id: 'paris-2', nom: 'Dr. Le Bail — 15e', adresse: "24 Rue de l'Abbé Groult, 75015 Paris", telephone: '01 45 31 30 98', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'Chiens', 'Chats'], region: 'Paris' },
  { id: 'vetoadom', nom: 'VetoAdom (à domicile — tout Paris/IDF)', adresse: 'Tout Paris et Île-de-France', telephone: '01 47 46 09 09', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'À domicile'], region: 'Paris' },
  // Lyon
  { id: 'lyon-1', nom: 'Onlyvet', adresse: '7 rue Jean Zay, 69800 Saint-Priest', telephone: '04 27 04 00 27', horaires: '24h/24, 7j/7', specialites: ['Urgences', 'Chiens', 'Chats', 'NAC'], region: 'Lyon' },
  // Marseille
  { id: 'marseille-1', nom: 'Urgences vétérinaires Marseille', adresse: '227 route des 3 Lucs, 13011 Marseille', telephone: '04 91 13 44 44', horaires: '24h/24, 7j/7', specialites: ['Urgences'], region: 'Marseille' },
  // Montpellier
  { id: 'montpellier-1', nom: 'Urgences vétérinaires Montpellier', adresse: null, telephone: '04 48 20 20 28', horaires: '24h/24, 7j/7', specialites: ['Urgences'], region: 'Montpellier' },
  // Toulouse
  { id: 'toulouse-1', nom: 'VET-URGENTYS', adresse: '112 Bd de Suisse, 31200 Toulouse', telephone: '05 61 11 21 31', horaires: '24h/24, 7j/7', specialites: ['Urgences'], region: 'Toulouse' },
  { id: 'toulouse-2', nom: 'Urgences vétérinaires Toulouse', adresse: null, telephone: '05 32 09 39 90', horaires: '24h/24, 7j/7', specialites: ['Urgences'], region: 'Toulouse' },
  // Bordeaux
  { id: 'bordeaux-1', nom: 'Clinique Alliance Bordeaux', adresse: '8 Boulevard Godard, 33300 Bordeaux', telephone: '05 56 39 15 48', horaires: '24h/24, 7j/7', specialites: ['Urgences'], region: 'Bordeaux' },
  // Nantes
  { id: 'nantes-1', nom: "Clinique Vét. de l'Arche", adresse: '243 route de Vannes, 44800 Saint-Herblain', telephone: '02 40 63 44 44', horaires: '24h/24, 7j/7', specialites: ['Urgences'], region: 'Nantes' },
  // Strasbourg
  { id: 'strasbourg-1', nom: 'Maison des Urgences Vétérinaires', adresse: 'Strasbourg (67)', telephone: '03 68 71 83 00', horaires: 'Nuits (19h–7h) + WE + jours fériés', specialites: ['Urgences'], region: 'Strasbourg' },
  // Lille
  { id: 'lille-1', nom: 'V2TU Lesquin', adresse: '11 Rue Paul Dubrule, 59810 Lesquin', telephone: '03 67 34 08 34', horaires: 'Nuits + WE + jours fériés', specialites: ['Urgences'], region: 'Lille' },
  // Rennes
  { id: 'rennes-1', nom: 'V2TU Rennes', adresse: '6 rue du Bourg Nouveau, 35000 Rennes', telephone: '02 99 41 16 46', horaires: 'Nuits + week-ends', specialites: ['Urgences'], region: 'Rennes' },
  // Grenoble
  { id: 'grenoble-1', nom: 'Maison des Urgences Vétérinaires — Échirolles', adresse: '32 rue de Comboire, 38130 Échirolles', telephone: '04 80 42 33 23', horaires: '19h30–7h30 sem. / 12h+ sam. / 24h/24 dim. & fériés', specialites: ['Urgences'], region: 'Grenoble' },
  // Rouen
  { id: 'rouen-1', nom: 'V2TU Tourville-la-Rivière', adresse: '5 rue Parc en Seine, 76410 Tourville-la-Rivière', telephone: '02 35 87 94 94', horaires: 'Nuits + WE', specialites: ['Urgences'], region: 'Rouen' },
  // Clermont-Ferrand
  { id: 'clermont-1', nom: 'V2TU Clermont', adresse: '1 rue Roland Moreno, 63100 Clermont-Ferrand', telephone: '04 88 60 20 50', horaires: 'Nuits + WE', specialites: ['Urgences'], region: 'Clermont-Ferrand' },
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

export const URGENCES_OFFICIELS = [
  { id: 'urgences-3115', nom: '3115 — Urgences Vétérinaires', telBrut: '3115', telAffiche: '3115', info: 'Gratuit 24h/24, 7j/7 — 45 départements', couleur: '#dc2626', couleurBg: '#fee2e2' },
  { id: 'capae-ouest', nom: 'CAPAE-Ouest — Antipoison (Nantes)', telBrut: '0240687740', telAffiche: '02 40 68 77 40', info: 'Intoxications animales — 8h30 à minuit, 7j/7', couleur: '#7c3aed', couleurBg: '#ede9fe' },
  { id: 'cnitv-lyon', nom: 'CNITV — Antipoison (Lyon)', telBrut: '0478871040', telAffiche: '04 78 87 10 40', info: 'Intoxications animales — 8h30 à minuit, 7j/7', couleur: '#7c3aed', couleurBg: '#ede9fe' },
];

export const ALIMENTS_DANGEREUX = [
  { nom: 'Chocolat', icon: '🍫', risque: 'ÉLEVÉ', especes: ['Chien', 'Chat'], symptomes: 'Vomissements, diarrhée, agitation, tremblements, convulsions, arythmie cardiaque', detail: 'La théobromine est toxique. Le chocolat noir est le plus dangereux (+ de 150 mg/kg de théobromine). 20 g de chocolat noir peuvent mettre en danger un chien de 10 kg. Contactez un vétérinaire rapidement.', urgence: true },
  { nom: 'Raisins et raisins secs', icon: '🍇', risque: 'ÉLEVÉ', especes: ['Chien', 'Chat'], symptomes: 'Vomissements, léthargie, anorexie, insuffisance rénale aiguë en 24–72h', detail: 'La substance toxique est inconnue mais la dose létale peut être très faible. Même 1 grain de raisin sec peut être dangereux pour un petit chien. Urgence si ingestion.', urgence: true },
  { nom: 'Oignons, ail, poireaux, ciboulette', icon: '🧅', risque: 'ÉLEVÉ', especes: ['Chien', 'Chat'], symptomes: 'Anémie hémolytique, pâleur des muqueuses, faiblesse, urine rouge/brune', detail: 'Toutes les alliacées (crus, cuits, en poudre) détruisent les globules rouges. Les chats sont plus sensibles que les chiens. L\'accumulation est toxique même en petites doses répétées.', urgence: false },
  { nom: 'Xylitol (édulcorant)', icon: '🍬', risque: 'MORTEL', especes: ['Chien'], symptomes: 'Hypoglycémie sévère (10–60 min), vomissements, ataxie, convulsions, insuffisance hépatique', detail: 'Le xylitol se trouve dans les chewing-gums, bonbons "sans sucre", certains médicaments et dentifrices. La dose létale est très faible (0,1 g/kg). Urgence absolue.', urgence: true },
  { nom: 'Avocat (feuilles, peau, noyau, pulpe)', icon: '🥑', risque: 'ÉLEVÉ', especes: ['Oiseau', 'Lapin', 'Hamster', 'Cheval'], symptomes: 'Difficultés respiratoires, œdème, faiblesse cardiaque, mort', detail: 'La persine contenue dans l\'avocat est très toxique pour les oiseaux, lapins et chevaux. Moins toxique pour chiens et chats, mais le noyau reste un risque d\'obstruction.', urgence: true },
  { nom: 'Café, thé, boissons caféinées', icon: '☕', risque: 'ÉLEVÉ', especes: ['Chien', 'Chat', 'Oiseau', 'Lapin'], symptomes: 'Tachycardie, hyperactivité, tremblements, convulsions, mort', detail: 'La caféine et théophylline sont toxiques pour tous les animaux. Inclut le café moulu, le thé, les boissons énergisantes et le cacao.', urgence: true },
  { nom: 'Alcool (boissons, levure crue)', icon: '🍺', risque: 'ÉLEVÉ', especes: ['Chien', 'Chat', 'Lapin', 'Oiseau'], symptomes: 'Vomissements, désorientation, hypoglycémie, coma, arrêt respiratoire', detail: 'L\'éthanol est beaucoup plus toxique pour les animaux que pour l\'homme. La levure de boulanger crue fermente dans l\'estomac et produit de l\'alcool.', urgence: true },
  { nom: 'Noix de macadamia', icon: '🌰', risque: 'MODÉRÉ', especes: ['Chien'], symptomes: 'Faiblesse des membres postérieurs, hyperthermie, vomissements, tremblements', detail: 'La dose toxique est d\'environ 2,4 g/kg. Les symptômes apparaissent en 12h et durent 12–48h. Rarement mortel mais nécessite une surveillance.', urgence: false },
  { nom: 'Noyaux de fruits (cerise, pêche, abricot, prune)', icon: '🍒', risque: 'ÉLEVÉ', especes: ['Chien', 'Chat'], symptomes: 'Libération de cyanure : difficultés respiratoires, muqueuses rouge vif, convulsions, mort', detail: 'Les noyaux broyés ou mâchés libèrent de l\'acide cyanhydrique. Risque aussi d\'obstruction intestinale. Urgence absolue si noyau ingéré et mâché.', urgence: true },
  { nom: 'Sel en excès, chips, charcuterie', icon: '🧂', risque: 'MODÉRÉ', especes: ['Chien', 'Chat'], symptomes: 'Polydipsie, vomissements, diarrhée, tremblements, convulsions, insuffisance rénale', detail: 'Un excès de sodium provoque une hypernatrémie. Les chips, biscuits apéritifs et charcuteries sont particulièrement riches en sel. À éviter complètement.', urgence: false },
];

export const PLANTES_TOXIQUES = [
  { nom: 'Lys (Lilium sp., Hémérocalle)', icon: '🌸', niveau: 'MORTEL', especes: ['Chat'], symptomes: 'Vomissements, léthargie, anorexie, insuffisance rénale aiguë en 24–72h', detail: 'Mortel pour les chats. Une seule feuille, pétale ou même le pollen sur la fourrure léché suffit à provoquer une insuffisance rénale fatale. Urgence absolue en cas d\'exposition.', urgence: true },
  { nom: 'Muguet (Convallaria majalis)', icon: '🌿', niveau: 'MORTEL', especes: ['Chien', 'Chat'], symptomes: 'Vomissements, bradycardie, arythmie cardiaque, convulsions, mort', detail: 'Toute la plante est toxique (feuilles, fleurs, baies, même l\'eau du vase). Les glycosides cardiaques sont concentrés dans les baies. Urgence absolue.', urgence: true },
  { nom: 'Laurier-rose (Nerium oleander)', icon: '🌺', niveau: 'MORTEL', especes: ['Chien', 'Chat', 'Cheval', 'Lapin'], symptomes: 'Arythmie cardiaque sévère, vomissements, diarrhée hémorragique, mort', detail: 'Toutes les parties sont mortellement toxiques. 1 à 5 feuilles peuvent tuer un chien adulte. La fumée de feuilles brûlées est aussi toxique.', urgence: true },
  { nom: 'If commun (Taxus baccata)', icon: '🌲', niveau: 'MORTEL', especes: ['Chien', 'Chat', 'Cheval', 'Lapin', 'Oiseau'], symptomes: 'Mort subite (toxines à absorption très rapide), tremblements, difficultés respiratoires', detail: 'Toutes les parties sauf la chair des baies contiennent de la taxine. Mort possible en quelques heures. Haie courante dans les jardins — à supprimer si animaux.', urgence: true },
  { nom: 'Azalée / Rhododendron', icon: '🌷', niveau: 'ÉLEVÉ', especes: ['Chien', 'Chat', 'Cheval'], symptomes: 'Salivation, vomissements, diarrhée, hypotension, arythmie, coma', detail: 'Les grayanotoxines bloquent les canaux sodiques. Même le miel de rhododendron est toxique. Quelques feuilles suffisent pour provoquer des symptômes graves.', urgence: true },
  { nom: 'Dieffenbachia (plante d\'intérieur)', icon: '🪴', niveau: 'ÉLEVÉ', especes: ['Chien', 'Chat'], symptomes: 'Brûlures intenses de la bouche et de la gorge, œdème laryngé, difficultés à avaler', detail: 'Les cristaux d\'oxalate de calcium provoquent une douleur brûlante immédiate et peuvent provoquer un œdème des voies aériennes. Rincer la bouche à l\'eau abondamment.', urgence: false },
  { nom: 'Gui (Viscum album)', icon: '🍀', niveau: 'ÉLEVÉ', especes: ['Chien', 'Chat'], symptomes: 'Vomissements, bradycardie, hypotension, diarrhée, convulsions (fortes doses)', detail: 'Les baies blanches sont particulièrement toxiques. Les lectines et viscotoxines affectent le système cardiovasculaire. À garder hors de portée à Noël.', urgence: true },
  { nom: 'Houx (Ilex aquifolium)', icon: '🍃', niveau: 'MODÉRÉ', especes: ['Chien', 'Chat'], symptomes: 'Vomissements, diarrhée, léthargie, somnolence', detail: 'Les baies rouges sont attrayantes pour les animaux. Peu de baies (moins de 20) provoquent rarement des effets graves mais une surveillance est recommandée.', urgence: false },
  { nom: 'Fougère aigle (Pteridium aquilinum)', icon: '🌿', niveau: 'ÉLEVÉ', especes: ['Chien', 'Chat', 'Cheval'], symptomes: 'Destruction de la moelle osseuse (usage chronique), hémorragies, anémie aplasique', detail: 'La toxicité est cumulative : la plante contient de la tiaminase et des immunosuppresseurs. Surtout dangereuse pour les herbivores en pâturage, mais aussi pour les chiens qui mâchent les feuilles.', urgence: false },
  { nom: 'Aloe vera (gel intérieur des feuilles)', icon: '🌵', niveau: 'MODÉRÉ', especes: ['Chien', 'Chat'], symptomes: 'Vomissements, diarrhée, léthargie, urine rouge/orange', detail: 'La sève jaune (aloïne) est un puissant laxatif. Le gel transparent est moins toxique. La plante en pot est souvent accessible aux animaux d\'intérieur.', urgence: false },
];

export const GUIDE_PREMIERS_SECOURS = [
  {
    id: 'intoxication',
    titre: 'Intoxication / Empoisonnement',
    icon: '☠️',
    couleur: '#dc2626',
    urgence: true,
    symptomes: ['Vomissements soudains', 'Salivation excessive', 'Convulsions ou tremblements', 'Prostration / faiblesse soudaine', 'Pupilles dilatées ou réduites', 'Difficultés respiratoires'],
    faire: [
      'Appelez immédiatement : 3115 ou centre antipoison (02 40 68 77 40 / 04 78 87 10 40)',
      'Notez ce qu\'il a ingéré : nom exact du produit, quantité estimée, heure',
      'Conservez l\'emballage ou un échantillon de la plante',
      'Gardez l\'animal au chaud et au calme',
      'Emmenez-le chez le vétérinaire sans attendre l\'aggravation',
    ],
    ne_pas_faire: [
      'NE faites PAS vomir l\'animal sans avis vétérinaire (certains produits causent plus de dégâts au retrait)',
      'Ne donnez PAS de lait, d\'huile ou d\'eau pour "diluer" le poison',
      'N\'attendez PAS l\'apparition de symptômes graves pour agir',
      'Ne donnez aucun médicament humain (paracétamol, ibuprofène = mortels pour les chats)',
    ],
  },
  {
    id: 'coup-de-chaleur',
    titre: 'Coup de chaleur / Hyperthermie',
    icon: '🌡️',
    couleur: '#f97316',
    urgence: true,
    symptomes: ['Halètement intense et rapide', 'Bave épaisse / mousse', 'Gencives rouge vif ou violacées', 'Démarche titubante', 'Prostration / perte de connaissance', 'Vomissements'],
    faire: [
      'Déplacez l\'animal à l\'ombre ou dans un endroit frais immédiatement',
      'Mouillez-le avec de l\'eau fraîche (pas glacée) sur le corps, les pattes, la nuque',
      'Dirigez un ventilateur vers lui si disponible',
      'Proposez-lui de l\'eau fraîche à boire (pas forcez pas)',
      'Appelez un vétérinaire en urgence même si l\'animal semble récupérer',
    ],
    ne_pas_faire: [
      'NE plongez PAS l\'animal dans de l\'eau glacée (choc thermique)',
      'Ne le couvrez pas de glace',
      'Ne laissez jamais un animal dans une voiture fermée, même par temps nuageux',
    ],
  },
  {
    id: 'convulsions',
    titre: 'Convulsions / Crise épileptique',
    icon: '⚡',
    couleur: '#7c3aed',
    urgence: true,
    symptomes: ['Mouvements incontrôlés des membres', 'Mâchements involontaires', 'Perte de connaissance', 'Salivation, urines involontaires', 'Rigidité du corps', 'Confusion après la crise'],
    faire: [
      'Restez calme et ne touchez pas l\'animal pendant la crise',
      'Éloignez les objets dangereux autour de lui',
      'Chronométrez la durée de la crise',
      'Gardez la pièce sombre et silencieuse',
      'Appelez le vétérinaire pendant ou juste après la crise',
      'Si > 5 minutes : urgence vitale, partez immédiatement',
    ],
    ne_pas_faire: [
      'NE mettez PAS la main dans sa gueule (risque de morsure grave)',
      'Ne tentez pas de l\'immobiliser',
      'Ne lui donnez pas d\'eau pendant la crise',
      'Ne laissez pas une crise durer sans intervention vétérinaire',
    ],
  },
  {
    id: 'hemorragie',
    titre: 'Hémorragie / Plaie profonde',
    icon: '🩸',
    couleur: '#be123c',
    urgence: true,
    symptomes: ['Saignement visible abondant', 'Plaie profonde ou béante', 'Pâleur des muqueuses', 'Faiblesse soudaine', 'Gencives blanches ou bleues'],
    faire: [
      'Appuyez fermement avec un tissu propre sur la plaie (pression directe continue)',
      'Maintenez la pression au moins 5–10 minutes sans soulever',
      'Si une patte : levez-la au-dessus du niveau du cœur',
      'Transportez l\'animal chez le vétérinaire le plus vite possible',
      'Gardez-le au chaud (couverture) pour éviter le choc',
    ],
    ne_pas_faire: [
      'Ne retirez PAS un objet enfoncé dans une plaie (tenez-le en place)',
      'N\'utilisez pas de garrot sauf saignement artériel massif',
      'Ne nettoyez pas la plaie avec de l\'alcool ou de l\'eau oxygénée',
      'Ne laissez pas l\'animal se lécher la plaie',
    ],
  },
  {
    id: 'perte-conscience',
    titre: 'Perte de connaissance / Arrêt respiratoire',
    icon: '💨',
    couleur: '#1d4ed8',
    urgence: true,
    symptomes: ['Animal inconscient, ne répond pas', 'Absence de mouvements respiratoires', 'Gencives bleues ou blanches', 'Pupilles fixes et dilatées', 'Corps flasque'],
    faire: [
      'Vérifiez la respiration : observez le flanc pendant 10 secondes',
      'Dégagez les voies aériennes : ouvrez la gueule, retirez corps étrangers',
      'Si absence de respiration : bouche-à-nez (petits animaux) ou bouche-à-gueule (chiens)',
      'Appelez le vétérinaire en urgence absolue',
      'Si pas de pouls + formation vétérinaire : massage cardiaque (30 compressions / 2 insufflations)',
    ],
    ne_pas_faire: [
      'Ne perdez pas de temps : chaque seconde compte',
      'Ne déplacez pas brutalement l\'animal si traumatisme possible',
    ],
  },
  {
    id: 'traumatisme',
    titre: 'Choc / Fracture / Traumatisme',
    icon: '🦴',
    couleur: '#b45309',
    urgence: false,
    symptomes: ['Boiterie soudaine ou impossibilité de se lever', 'Membre à angle anormal', 'Douleur intense à la palpation', 'Gonflement rapide', 'Animal projeté ou heurté par un véhicule'],
    faire: [
      'Gardez l\'animal le plus immobile possible',
      'Glissez-le délicatement sur une surface rigide (planche, carton épais)',
      'Couvrez-le d\'une couverture pour éviter le refroidissement',
      'Appelez le vétérinaire et décrivez la situation avant de vous déplacer',
      'Si saignement visible : appliquer une pression douce avec un tissu propre',
    ],
    ne_pas_faire: [
      'Ne tentez pas de repositionner un os fracturé',
      'N\'appliquez pas d\'attelle sans conseils vétérinaires',
      'Ne faites pas marcher l\'animal',
      'N\'ignorez PAS un animal heurté par un véhicule même s\'il semble intact (hémorragie interne possible)',
    ],
  },
];
