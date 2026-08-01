import React from 'react';
import { createRoot } from 'react-dom/client';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, getAdditionalUserInfo } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, getDocs, getDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { app, auth, db, functions } from './firebase/config';
import { formatDate, computeAge, formatReminderDelay, getCountdown } from './utils/format';
import { readImageAsResizedDataUrl, MAX_DOCUMENT_PDF_SIZE, readFileAsDataUrl, _cropModal, openCropModal } from './utils/image';
import { openVideoDB, addVideoToDB, getVideosForAnimal, deleteVideoFromDB, MAX_VIDEO_SIZE } from './utils/video';
import { getDistanceKm, isEmergencyVet } from './utils/geo';
import { buildPublicCard, generateInviteToken, escapeHtml, dataUrlToFile, buildDossierEmailBody, openDossierReport, openLostPosterReport, openCollarTagReport } from './utils/reports';
import { EMOJIS_ESPECE, ESPECES, PUBLIC_CARD_FIELDS, TYPE_LABELS, NAV_TABS, SIDEBAR_GROUPS } from './constants';
import AnimalAvatar from './components/AnimalAvatar';
import ValidationBadge from './components/ValidationBadge';
import EditIcon from './components/EditIcon';
import DeleteIcon from './components/DeleteIcon';
import EmptyList from './components/EmptyList';
import CropModal from './components/CropModal';


        // Firebase Cloud Messaging — push notifications even when phone is locked.
        // VAPID key: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates > Generate key pair
        const VAPID_KEY = 'BPAV-UAO2SzWLDbZQLMdI_hxJqI4BHgN5jYyhPrfkTBsDv2jSLZsNRgnu7QGLHaC9sUYTRWziOvN1Cdqo_d4Sg0';

        // Register this device for FCM push and store the token in Firestore.
        // Uses a dynamic import so a CDN failure never blocks the rest of the app.
        const initFCM = async (uid) => {
            if (!uid || VAPID_KEY === 'VOTRE_CLE_VAPID_ICI') return;
            try {
                const { getMessaging, getToken } = await import('firebase/messaging');
                const messaging = getMessaging(app);
                const swReg = await navigator.serviceWorker.ready;
                const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
                if (token) await setDoc(doc(db, 'settings', uid), { fcmToken: token }, { merge: true });
            } catch (e) { /* Permission denied, CDN unavailable, or VAPID key not set */ }
        };

        const VACCINS_COURANTS = {
            'Chien': ['Rage', 'DTP', 'Parvovirose', 'Leptospirose'],
            'Chat': ['Rage', 'Typhus félin', 'Calicivirose', 'Rhinotrachéite', 'Coryza', 'Chlamydophilose', 'Leucose féline'],
            'Cheval': ['Grippe équine', 'Tétanos', 'Rhinopneumonite'],
            'Lapin': ['Myxomatose', 'VHD', 'VHD2'],
            'Hamster': [], 'Gerbille': [], 'Tortue': [],
            'Oiseau': ['Paramyxovirus', 'Newcastle'],
        };
        // Cliniques d'urgence vétérinaire réelles (24h/24, 7j/7) — fallback si CNOV et OSM sont indisponibles
        const VETERINAIRES = [
            { id: 'alfort', nom: 'EnvA Alfort — Urgences chiens/chats/NAC', lat: 48.8139, lng: 2.4234, telephone: '01 43 96 72 72', horaires: '24h/24, 7j/7', adresse: '7 av. du Général de Gaulle, 94700 Maisons-Alfort', specialites: ['Urgences', 'NAC', 'Chiens', 'Chats'], emergency: true },
            { id: 'clinique-alfort2', nom: 'Clinique Urgences Vétérinaires — Maisons-Alfort', lat: 48.8132, lng: 2.4321, telephone: '01 48 45 94 59', horaires: 'Nuits + WE + jours fériés', adresse: '199 Av. de la République, 94700 Maisons-Alfort', specialites: ['Urgences'], emergency: true },
            { id: 'ucvet', nom: 'UCVet Paris 20e', lat: 48.8598, lng: 2.4012, telephone: '01 71 19 70 10', horaires: '24h/24, 7j/7', adresse: '54 rue Stendhal, 75020 Paris', specialites: ['Urgences'], emergency: true },
            { id: 'vetinparis', nom: 'Vet\'in Paris 11e', lat: 48.8536, lng: 2.3728, telephone: '01 43 07 01 06', horaires: '24h/24, 7j/7', adresse: '89 rue du Faubourg Saint-Antoine, 75011 Paris', specialites: ['Urgences'], emergency: true },
            { id: 'lebail', nom: 'Dr. Le Bail — Paris 15e', lat: 48.8426, lng: 2.3064, telephone: '01 45 31 30 98', horaires: '24h/24, 7j/7', adresse: '24 Rue de l\'Abbé Groult, 75015 Paris', specialites: ['Urgences'], emergency: true },
            { id: 'vetoadom', nom: 'VetoAdom — Urgences à domicile (Paris/IDF)', lat: 48.8178, lng: 2.3153, telephone: '01 47 46 09 09', horaires: '24h/24, 7j/7', adresse: 'Tout Paris et Île-de-France', specialites: ['Urgences', 'Domicile'], emergency: true },
            { id: 'onlyvet', nom: 'Onlyvet (Lyon)', lat: 45.7234, lng: 4.9501, telephone: '04 27 04 00 27', horaires: '24h/24, 7j/7', adresse: '7 rue Jean Zay, 69800 Saint-Priest', specialites: ['Urgences'], emergency: true },
            { id: 'marseille', nom: 'Urgences vétérinaires Marseille', lat: 43.2805, lng: 5.4229, telephone: '04 91 13 44 44', horaires: '24h/24, 7j/7', adresse: '227 route des 3 Lucs, 13011 Marseille', specialites: ['Urgences'], emergency: true },
            { id: 'veturgentys', nom: 'VET-URGENTYS Toulouse', lat: 43.5933, lng: 1.4609, telephone: '05 61 11 21 31', horaires: '24h/24, 7j/7', adresse: '112 Bd de Suisse, 31200 Toulouse', specialites: ['Urgences'], emergency: true },
            { id: 'toulouse', nom: 'Urgences vétérinaires Toulouse', lat: 43.6047, lng: 1.4442, telephone: '05 32 09 39 90', horaires: '24h/24, 7j/7', adresse: 'Toulouse', specialites: ['Urgences'], emergency: true },
            { id: 'montpellier', nom: 'Urgences vétérinaires Montpellier', lat: 43.6108, lng: 3.8767, telephone: '04 48 20 20 28', horaires: '24h/24, 7j/7', adresse: 'Montpellier', specialites: ['Urgences'], emergency: true },
            { id: 'bordeaux', nom: 'Clinique Alliance Bordeaux', lat: 44.8503, lng: -0.5888, telephone: '05 56 39 15 48', horaires: '24h/24, 7j/7', adresse: '8 Boulevard Godard, 33300 Bordeaux', specialites: ['Urgences'], emergency: true },
            { id: 'nantes', nom: 'Clinique Vét. de l\'Arche (Nantes)', lat: 47.2368, lng: -1.6218, telephone: '02 40 63 44 44', horaires: '24h/24, 7j/7', adresse: '243 route de Vannes, 44800 Saint-Herblain', specialites: ['Urgences'], emergency: true },
            { id: 'strasbourg', nom: 'Maison des Urgences Vétérinaires (Strasbourg)', lat: 48.5734, lng: 7.7521, telephone: '03 68 71 83 00', horaires: 'Nuits (19h–7h) + WE + jours fériés', adresse: 'Strasbourg (67)', specialites: ['Urgences'], emergency: true },
            { id: 'lille', nom: 'V2TU Lesquin (Lille)', lat: 50.5622, lng: 3.1082, telephone: '03 67 34 08 34', horaires: 'Nuits + WE + jours fériés', adresse: '11 Rue Paul Dubrule, 59810 Lesquin', specialites: ['Urgences'], emergency: true },
            { id: 'rennes', nom: 'V2TU Rennes', lat: 48.1173, lng: -1.6778, telephone: '02 99 41 16 46', horaires: 'Nuits + week-ends', adresse: '6 rue du Bourg Nouveau, 35000 Rennes', specialites: ['Urgences'], emergency: true },
            { id: 'grenoble', nom: 'Maison des Urgences Vétérinaires — Échirolles', lat: 45.1402, lng: 5.7172, telephone: '04 80 42 33 23', horaires: '19h30–7h30 sem. / 12h+ sam. / 24h/24 dim. & fériés', adresse: '32 rue de Comboire, 38130 Échirolles', specialites: ['Urgences'], emergency: true },
            { id: 'rouen', nom: 'V2TU Tourville-la-Rivière (Rouen)', lat: 49.3442, lng: 1.0842, telephone: '02 35 87 94 94', horaires: 'Nuits + WE', adresse: '5 rue Parc en Seine, 76410 Tourville-la-Rivière', specialites: ['Urgences'], emergency: true },
            { id: 'clermont', nom: 'V2TU Clermont-Ferrand', lat: 45.7797, lng: 3.0862, telephone: '04 88 60 20 50', horaires: 'Nuits + WE', adresse: '1 rue Roland Moreno, 63100 Clermont-Ferrand', specialites: ['Urgences'], emergency: true },
            { id: 'v2tu-montpellier', nom: 'V2TU Montpellier', lat: 43.6016, lng: 3.8878, telephone: '04 67 45 46 84', horaires: 'Nuits + WE', adresse: '137 rue Claude Balbastre, 34070 Montpellier', specialites: ['Urgences'], emergency: true },
            { id: 'dijon', nom: 'Clinique Ducs de Bourgogne — Dijon', lat: 47.3220, lng: 5.0415, telephone: '03 80 51 63 16', horaires: '24h/24, 7j/7', adresse: '11 ter Rue Paul Langevin, 21300 Chenôve', specialites: ['Urgences'], emergency: true },
        ];

        // FAQ shown in Paramètres, grouped by section, with collapsible Q/A
        const FAQ_DATA = [
            {
                section: '🐾 Vaccins',
                items: [
                    { q: 'Quand dois-je faire vacciner mon animal ?', a: "Les premiers vaccins sont généralement réalisés dès les premières semaines de vie, puis des rappels réguliers sont nécessaires selon l'âge, l'espèce et le mode de vie de l'animal." },
                    { q: 'Les vaccins sont-ils obligatoires ?', a: "Certains vaccins sont fortement recommandés. D'autres peuvent être exigés pour les voyages ou certaines pensions." },
                    { q: 'Mon animal est en retard pour son vaccin, est-ce grave ?', a: "Un retard ne signifie pas forcément que tout est à recommencer, mais il est préférable de contacter votre vétérinaire pour vérifier le protocole adapté." },
                ]
            },
            {
                section: '🪱 Vermifuges et parasites',
                items: [
                    { q: 'À quelle fréquence vermifuger mon animal ?', a: "La fréquence dépend de l'âge, du mode de vie et de l'environnement. Les jeunes animaux nécessitent généralement des traitements plus fréquents." },
                    { q: 'Mon animal a des puces, que faire ?', a: "Traitez l'animal avec un produit adapté et pensez également à traiter son environnement." },
                    { q: 'Comment retirer une tique ?', a: "Utilisez un crochet à tique adapté et retirez-la délicatement sans l'écraser." },
                ]
            },
            {
                section: '🍖 Alimentation',
                items: [
                    { q: 'Quelle quantité de nourriture donner ?', a: "La quantité dépend du poids, de l'âge, de l'activité physique et du type d'alimentation." },
                    { q: 'Quels aliments sont toxiques ?', a: "Parmi les aliments connus pour être dangereux :\n• chocolat\n• raisin\n• oignon\n• ail\n• avocat\n• alcool\n• café\n• xylitol (édulcorant)" },
                    { q: 'Mon animal refuse de manger, dois-je m\'inquiéter ?', a: "Une perte d'appétit persistante mérite une surveillance attentive et peut justifier une consultation." },
                ]
            },
            {
                section: '🤒 Symptômes courants',
                items: [
                    { q: 'Mon chien ou mon chat vomit.', a: "Un vomissement isolé n'est pas toujours inquiétant. En revanche, des vomissements répétés ou associés à d'autres symptômes nécessitent un avis vétérinaire." },
                    { q: 'Mon animal a la diarrhée.', a: "Une diarrhée légère peut parfois disparaître rapidement. Si elle persiste ou s'accompagne d'autres symptômes, consultez un professionnel." },
                    { q: 'Mon animal boit beaucoup plus que d\'habitude.', a: "Une augmentation importante de la consommation d'eau peut révéler un problème de santé et mérite une surveillance." },
                    { q: 'Mon animal est très fatigué.', a: "Une baisse d'énergie inhabituelle ou prolongée doit être prise au sérieux." },
                ]
            },
            {
                section: '🐾 Comportement',
                items: [
                    { q: 'Pourquoi mon chien aboie-t-il autant ?', a: "L'aboiement peut être lié à l'ennui, la peur, l'excitation ou un besoin d'attention." },
                    { q: 'Pourquoi mon chat urine-t-il en dehors de sa litière ?', a: "Cela peut être lié à un problème médical, du stress ou un changement d'environnement." },
                    { q: 'Mon animal détruit des objets.', a: "Les causes fréquentes sont l'ennui, le manque d'exercice ou l'anxiété." },
                ]
            },
            {
                section: '❤️ Poids et suivi',
                items: [
                    { q: 'Mon animal est-il en surpoids ?', a: "Le surpoids est fréquent chez les animaux domestiques. Un suivi régulier du poids aide à détecter rapidement les variations." },
                    { q: 'Pourquoi suivre le poids ?', a: "Les changements de poids peuvent être un indicateur précoce de nombreux problèmes de santé." },
                ]
            },
            {
                section: '🚨 Urgences',
                items: [
                    { q: 'Mon animal a mangé du chocolat.', a: "Le chocolat peut être toxique, d'autant plus s'il est noir ou riche en cacao. La gravité dépend de la quantité ingérée et du poids de l'animal. Contactez rapidement un vétérinaire et gardez l'emballage à portée de main pour préciser le type et la quantité." },
                    { q: 'Mon animal a avalé un objet.', a: "Surveillez-le attentivement et consultez rapidement si des symptômes apparaissent." },
                    { q: 'Mon animal ne mange plus depuis 24 heures.', a: "Une absence prolongée d'alimentation doit être prise au sérieux, particulièrement chez le chat." },
                    { q: 'Quand consulter en urgence ?', a: "Consultez rapidement en cas de :\n• difficultés respiratoires\n• convulsions\n• saignements importants\n• perte de connaissance\n• suspicion d'intoxication\n• traumatisme important" },
                ]
            },
            {
                section: '🌡️ Coup de chaleur',
                items: [
                    { q: 'Comment reconnaître un coup de chaleur ?', a: "Les signes fréquents sont un halètement intense, une bave épaisse, un abattement, une démarche titubante, parfois des vomissements ou une perte de connaissance. C'est une urgence vitale." },
                    { q: 'Que faire en cas de coup de chaleur ?', a: "Placez l'animal à l'ombre dans un endroit frais, rafraîchissez-le progressivement avec de l'eau tempérée (jamais glacée) et contactez immédiatement un vétérinaire. Ne laissez jamais un animal seul dans une voiture, même quelques minutes et même à l'ombre." },
                ]
            },
            {
                section: '🌿 Plantes et produits dangereux',
                items: [
                    { q: 'Quelles plantes sont dangereuses ?', a: "Plusieurs plantes courantes sont toxiques. Le lys (ou lis) est particulièrement dangereux pour le chat : même une petite quantité, le pollen ou l'eau du vase peuvent provoquer une atteinte grave. En cas de doute, éloignez la plante et contactez un vétérinaire." },
                    { q: 'Quels produits ménagers présentent un risque ?', a: "L'antigel, les produits d'entretien, les médicaments humains et certains insecticides sont toxiques. L'antigel est particulièrement traître : son goût sucré attire les animaux. Rangez ces produits hors de portée et consultez en urgence en cas d'ingestion." },
                    { q: 'Mon animal a ingéré une plante ou un produit toxique.', a: "Ne tentez pas de le faire vomir sans avis professionnel. Notez ce qu'il a ingéré et en quelle quantité, gardez l'emballage si possible, et contactez rapidement un vétérinaire ou un centre antipoison vétérinaire." },
                ]
            },
            {
                section: '🏥 Vie quotidienne',
                items: [
                    { q: 'Quand stériliser mon animal ?', a: "L'âge recommandé varie selon l'espèce, la race et la situation de l'animal." },
                    { q: 'Pourquoi identifier mon animal ?', a: "L'identification permet de retrouver plus facilement un animal perdu et est obligatoire dans plusieurs situations." },
                    { q: 'Puis-je voyager avec mon animal ?', a: "Les conditions varient selon la destination. Vérifiez toujours les exigences sanitaires avant le départ." },
                ]
            },
        ];


        // Récupère le code département INSEE depuis des coordonnées (API Géo gouvernementale)
        const getDepartementCode = async (lat, lng) => {
            const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=departement&limit=1`);
            if (!res.ok) throw new Error('geo.api.gouv.fr indisponible');
            const data = await res.json();
            return (data[0] && data[0].departement && data[0].departement.code) || null;
        };

        // Recherche via l\'annuaire de l\'Ordre National des Vétérinaires (CNOV)
        // Endpoint public (pas d\'authentification requise) : GET /api/directories/search-veterinaries-for-care
        const fetchCNOVVets = async (departementCode) => {
            const url = `https://extranet.veterinaire.fr/api/directories/search-veterinaries-for-care?departmentId=${departementCode}`;
            const res = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error('CNOV HTTP ' + res.status);
            const raw = await res.json();
            // Normalise la réponse (liste directe ou { data/items/results: [...] })
            const list = Array.isArray(raw) ? raw
                : Array.isArray(raw.data) ? raw.data
                : Array.isArray(raw.items) ? raw.items
                : Array.isArray(raw.results) ? raw.results
                : [];
            return list.map((v, i) => {
                // Nom : soit une structure "cabinet", soit un vétérinaire individuel
                const structureNom = v.structure?.nom || v.nomStructure || v.nomExercice || null;
                const vetNom = [v.prenom, v.nom].filter(Boolean).join(' ') || null;
                const nom = structureNom || vetNom || v.name || v.nom || 'Vétérinaire';
                const cp = v.structure?.codePostal || v.codePostal || v.postalCode || '';
                const ville = v.structure?.ville || v.structure?.commune || v.ville || v.commune || v.city || '';
                const adresseLigne = v.structure?.adresse || v.adresse || v.adresseExercice || v.address || '';
                const adresse = [adresseLigne, cp, ville].filter(Boolean).join(' ') || null;
                const telephone = v.structure?.telephone || v.telephone || v.phone || null;
                const specialites = Array.isArray(v.specialites) ? v.specialites
                    : Array.isArray(v.especes) ? v.especes
                    : null;
                const vLat = v.structure?.latitude ?? v.latitude ?? v.lat ?? null;
                const vLng = v.structure?.longitude ?? v.longitude ?? v.lng ?? null;
                return {
                    id: `cnov-${v.id || i}`,
                    nom,
                    telephone,
                    horaires: v.horaires || null,
                    adresse,
                    specialites: specialites && specialites.length > 0 ? specialites : null,
                    emergency: false,
                    source: 'cnov',
                    lat: typeof vLat === 'number' ? vLat : null,
                    lng: typeof vLng === 'number' ? vLng : null,
                };
            }).filter(v => v.nom || v.adresse);
        };

        // Recherche les cliniques vétérinaires via OpenStreetMap (Overpass API) — fallback
        const OVERPASS_ENDPOINTS = [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
        ];
        const fetchOverpassVets = async (lat, lng) => {
            const query = `[out:json][timeout:25];(node["amenity"="veterinary"](around:25000,${lat},${lng});way["amenity"="veterinary"](around:25000,${lat},${lng}););out center 30;`;
            let lastError = null;
            for (const endpoint of OVERPASS_ENDPOINTS) {
                try {
                    const res = await fetch(endpoint, { method: 'POST', body: 'data=' + encodeURIComponent(query) });
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const data = await res.json();
                    return (data.elements || [])
                        .map(el => {
                            const tags = el.tags || {};
                            const vLat = el.lat ?? el.center?.lat;
                            const vLng = el.lon ?? el.center?.lon;
                            if (vLat == null || vLng == null) return null;
                            const adresse = [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
                            return {
                                id: `osm-${el.type}-${el.id}`,
                                nom: tags.name || tags.brand || 'Vétérinaire',
                                telephone: tags.phone || tags['contact:phone'] || null,
                                horaires: tags.opening_hours || null,
                                adresse: adresse || null,
                                emergency: tags.emergency === 'yes',
                                source: 'osm',
                                lat: vLat,
                                lng: vLng,
                            };
                        })
                        .filter(Boolean);
                } catch (err) {
                    lastError = err;
                }
            }
            throw lastError || new Error('Service de recherche indisponible');
        };

        // Essaie d\'abord le CNOV (annuaire officiel), puis OpenStreetMap en fallback
        const fetchNearbyVets = async (lat, lng) => {
            let deptCode = null;
            try { deptCode = await getDepartementCode(lat, lng); } catch (e) {}
            if (deptCode) {
                try {
                    const cnovResults = await fetchCNOVVets(deptCode);
                    if (cnovResults.length > 0) return { results: cnovResults, source: 'cnov' };
                } catch (e) {
                    // CNOV indisponible (maintenance ou erreur) → on bascule sur OpenStreetMap
                }
            }
            const osmResults = await fetchOverpassVets(lat, lng);
            return { results: osmResults, source: 'osm' };
        };


        // Big red button: geolocates the user and lists the nearest 24h/emergency vets,
        // each with a one-tap call button and a directions link
        function EmergencyVetButton() {
            const [status, setStatus] = React.useState('idle'); // idle | loading | done | none | error
            const [error, setError] = React.useState('');
            const [vets, setVets] = React.useState([]);

            const findEmergencyVets = () => {
                if (!navigator.geolocation) {
                    setStatus('error');
                    setError("La géolocalisation n\'est pas disponible sur cet appareil.");
                    return;
                }
                setStatus('loading');
                setError('');
                setVets([]);
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const { latitude: lat, longitude: lng } = pos.coords;
                        let candidates = [];
                        try {
                            const { results } = await fetchNearbyVets(lat, lng);
                            candidates = results.filter(isEmergencyVet);
                        } catch (err) {
                            console.error('Erreur recherche urgences vétérinaires:', err);
                        }
                        if (candidates.length === 0) {
                            candidates = VETERINAIRES.filter(isEmergencyVet);
                        }
                        candidates = candidates
                            .map(v => ({ ...v, distanceKm: v.lat != null ? getDistanceKm(lat, lng, v.lat, v.lng) : null }))
                            .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
                            .slice(0, 5);
                        if (candidates.length > 0) {
                            setVets(candidates);
                            setStatus('done');
                        } else {
                            setStatus('none');
                        }
                    },
                    (err) => {
                        setStatus('error');
                        setError(err.code === err.PERMISSION_DENIED
                            ? "Localisation refusée. Activez la géolocalisation et autorisez ce site, puis réessayez."
                            : "Impossible de récupérer votre position. Vérifiez que la géolocalisation est activée.");
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            };

            React.useEffect(() => { findEmergencyVets(); }, []);

            return (
                <div style={{ marginBottom: '20px' }}>
                    {/* Numéros permanents : 3115 + antipoison */}
                    <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
                        <a href="tel:3115" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '10px', padding: '14px 16px', textDecoration: 'none' }}>
                            <span style={{ fontSize: '24px' }}>🚨</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '700', fontSize: '15px', color: '#dc2626' }}>Vétérinaire de garde national</div>
                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>24h/24 · 7j/7 · gratuit · donne le code postal</div>
                            </div>
                            <span style={{ fontSize: '22px', fontWeight: '800', color: '#dc2626' }}>3115</span>
                        </a>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <a href="tel:0478871040" style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '10px 12px', textDecoration: 'none' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed' }}>☠️ Antipoison — Lyon</span>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#4c1d95' }}>04 78 87 10 40</span>
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>CNITV · 8h30–minuit</span>
                            </a>
                            <a href="tel:0240687740" style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '10px 12px', textDecoration: 'none' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed' }}>☠️ Antipoison — Nantes</span>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#4c1d95' }}>02 40 68 77 40</span>
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>CAPAE · 8h30–minuit</span>
                            </a>
                        </div>
                    </div>

                    {/* Cliniques d'urgence à proximité */}
                    {status === 'idle' && (
                        <button onClick={findEmergencyVets}
                            style={{ width: '100%', padding: '12px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            📍 Cliniques d\'urgence autour de moi
                        </button>
                    )}
                    {status === 'loading' && (
                        <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '10px', textAlign: 'center', fontSize: '14px', color: '#dc2626', fontWeight: '600' }}>
                            📍 Localisation en cours…
                        </div>
                    )}
                    {status === 'error' && (
                        <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#7f1d1d' }}>⚠️ {error}</p>
                            <button onClick={findEmergencyVets} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '600' }}>🔄 Réessayer</button>
                        </div>
                    )}
                    {status === 'none' && (
                        <p style={{ fontSize: '13px', color: '#d97706', margin: '8px 0 0' }}>⚠️ Aucune clinique d\'urgence référencée près de vous. Appelez le 3115 (gratuit, 24h/24).</p>
                    )}
                    {status === 'done' && vets.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>Cliniques d\'urgence les plus proches</p>
                                <button onClick={() => setStatus('idle')} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', padding: 0 }}>Fermer</button>
                            </div>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {vets.map(vet => (
                                    <div key={vet.id} style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '10px', padding: '14px' }}>
                                        <p style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>{vet.nom}</p>
                                        {vet.adresse && <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0' }}>🏠 {vet.adresse}</p>}
                                        {vet.horaires && <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0' }}>🕐 {vet.horaires}</p>}
                                        {vet.distanceKm != null && <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0' }}>📍 à {vet.distanceKm.toFixed(1)} km</p>}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                            {vet.telephone ? (
                                                <a href={`tel:${vet.telephone.replace(/\s+/g, '')}`}
                                                    style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', background: '#dc2626', color: 'white' }}>
                                                    📞 {vet.telephone}
                                                </a>
                                            ) : (
                                                <p style={{ color: '#9ca3af', fontSize: '13px', flex: 1, margin: 0, display: 'flex', alignItems: 'center' }}>Numéro non disponible</p>
                                            )}
                                            <a href={vet.lat && vet.lng
                                                    ? `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`
                                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((vet.nom + ' ' + (vet.adresse || '')).trim())}`}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ padding: '12px 16px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', background: '#fee2e2', color: '#dc2626' }}>
                                                🗺️
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }


        // Cards shown on the per-animal "Dossier" overview, each linking to its corresponding tab
        const DOSSIER_CARDS = [
            { id: 'vaccins', label: '💉 Vaccins', color: '#10b981', group: 'Santé' },
            { id: 'medicaments', label: '💊 Traitements', color: '#ec4899', group: 'Santé' },
            { id: 'chirurgies', label: '🔪 Chirurgies', color: '#6366f1', group: 'Santé' },
            { id: 'poids', label: '⚖️ Poids', color: '#10b981', group: 'Santé' },
            { id: 'aliment', label: '🍎 Alimentation', color: '#f59e0b', group: 'Quotidien' },
            { id: 'notes', label: '📋 Observations', color: '#0891b2', group: 'Quotidien' },
            { id: 'messages', label: '💬 Messagerie vétérinaire', color: '#0891b2', group: 'Quotidien' },
            { id: 'journal', label: '📖 Journal de vie', color: '#ec4899', group: 'Quotidien' },
            { id: 'documents', label: '📄 Documents', color: '#6366f1', group: 'Quotidien' },
            { id: 'videos', label: '🎥 Vidéos', color: '#ec4899', group: 'Quotidien' },
            { id: 'planning', label: '📅 Rendez-vous', color: '#10b981', group: 'Administratif' },
            { id: 'budget', label: '💰 Budget', color: '#f59e0b', group: 'Administratif' }
        ];

        // Grouping and styling helpers for the compact "Dossier" list (grouped rows with status pills)
        const DOSSIER_GROUPS = ['Santé', 'Quotidien', 'Administratif'];
        const DOSSIER_CARD_BG = { '#10b981': '#d1fae5', '#ec4899': '#fce7f3', '#6366f1': '#e0e7ff', '#f59e0b': '#fef3c7', '#0891b2': '#cffafe' };
        const getDossierStatusPillStyle = (status) => {
            if (status.iconColor === '#10b981') return { background: '#d1fae5', color: '#047857' };
            if (status.iconColor === '#ef4444') return { background: '#fee2e2', color: '#dc2626' };
            if (status.iconColor === '#d1d5db') return { background: '#f3f4f6', color: '#9ca3af' };
            return { background: '#f3f4f6', color: '#374151' };
        };

        // Icon + label + color for each type of reminder, used by the compact Rappels list
        const REMINDER_TYPE_INFO = {
            vaccin: { emoji: '💉', label: 'Vaccin', color: '#10b981' },
            medicament: { emoji: '💊', label: 'Médicament', color: '#ec4899' },
            antiparasitaire: { emoji: '🦟', label: 'Antiparasitaire', color: '#f59e0b' },
            vermifuge: { emoji: '🪱', label: 'Vermifuge', color: '#0891b2' },
        };

        // Shared style helper for the small colored icon-square used in section headers (Paramètres)
        const sectionIconStyle = (bg, color) => ({ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, background: bg, color });

        // Compute the status text and indicator icon shown on a Dossier card for a given section
        const getDossierCardStatus = (animal, cardId, videoCount) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const ok = { icon: '✅', iconColor: '#10b981' };
            const none = { icon: '⭘', iconColor: '#d1d5db' };
            switch (cardId) {
                case 'vaccins': {
                    const vaccins = animal.vaccins || [];
                    if (vaccins.length === 0) return { text: 'Aucun vaccin enregistré', ...none };
                    const aJour = vaccins.every(v => { const c = getCountdown(v.rappel || v.date); return !c || c.days >= 0; });
                    return aJour ? { text: 'À jour', ...ok } : { text: 'À renouveler', icon: '⚠️', iconColor: '#ef4444' };
                }
                case 'medicaments': {
                    const meds = animal.medicaments || [];
                    const enCours = meds.filter(m => m.dateDebut && m.dateFin && todayStr >= m.dateDebut && todayStr <= m.dateFin);
                    if (enCours.length > 0) return { text: `${enCours.length} en cours`, icon: '💊', iconColor: '#ec4899' };
                    return meds.length > 0 ? { text: `${meds.length} enregistré(s)`, ...none } : { text: 'Aucun', ...none };
                }
                case 'chirurgies': {
                    const n = (animal.chirurgies || []).length;
                    return n > 0 ? { text: `${n} enregistrée(s)`, ...ok } : { text: 'Aucune', ...none };
                }
                case 'planning': {
                    const rdvs = animal.rdvs || [];
                    const now = new Date();
                    const upcoming = rdvs.filter(r => new Date(`${r.date}T${r.heure || '00:00'}`) >= now)
                        .sort((a, b) => `${a.date}T${a.heure || '00:00'}`.localeCompare(`${b.date}T${b.heure || '00:00'}`));
                    return upcoming.length > 0
                        ? { text: `Prochain : ${formatDate(upcoming[0].date)}`, icon: '📅', iconColor: '#8b5cf6' }
                        : { text: 'Aucun RDV programmé', ...none };
                }
                case 'documents': {
                    const n = (animal.documents || []).length;
                    return n > 0 ? { text: `${n} fichier(s)`, ...ok } : { text: 'Aucun document', ...none };
                }
                case 'videos': {
                    return videoCount > 0 ? { text: `${videoCount} vidéo(s)`, ...ok } : { text: 'Aucune vidéo', ...none };
                }
                case 'poids': {
                    const lastWeight = [...(animal.poids || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                    return lastWeight ? { text: `${lastWeight.valeur} kg (${formatDate(lastWeight.date)})`, ...ok } : { text: 'Non renseigné', ...none };
                }
                case 'aliment': {
                    const n = (animal.aliments || []).length;
                    return n > 0 ? { text: `${n} repas enregistré(s)`, ...ok } : { text: 'Aucun', ...none };
                }
                case 'notes': {
                    const n = (animal.observations || []).length;
                    return n > 0 ? { text: `${n} observation(s)`, ...ok } : { text: 'Aucune', ...none };
                }
                case 'messages': {
                    return { text: 'Échanger avec le vétérinaire', icon: '💬', iconColor: '#0891b2' };
                }
                case 'journal': {
                    const n = (animal.vaccins || []).length + (animal.chirurgies || []).length
                        + (animal.medicaments || []).length + (animal.poids || []).length + (animal.observations || []).length;
                    return n > 0 ? { text: `${n} souvenir(s)`, icon: '📖', iconColor: '#ec4899' } : { text: 'Aucun souvenir', ...none };
                }
                case 'budget': {
                    const total = (animal.budget || []).reduce((s, b) => s + b.montant, 0);
                    return { text: `${total.toFixed(0)} €`, icon: '💰', iconColor: '#f59e0b' };
                }
                default:
                    return { text: '', ...none };
            }
        };


        // Share a photo or audio via the native OS share sheet (iOS/Android),
        // or fall back to downloading the file if Web Share API isn't available.
        const shareOrDownloadMedia = async (dataUrl, baseName, shareTitle, shareText) => {
            const file = dataUrlToFile(dataUrl, baseName);
            if (!file) return;
            // Build a companion .txt file so the observation text is reliably present
            // even when the email app ignores the Web Share API 'text' field
            const txtFile = shareText
                ? new File([shareText], `${baseName}-observation.txt`, { type: 'text/plain' })
                : null;
            const filesToShare = txtFile ? [file, txtFile] : [file];
            try {
                if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
                    await navigator.share({ files: filesToShare, title: shareTitle, text: shareText || '' });
                    return;
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('Erreur partage fichier:', err);
            }
            // Fallback desktop: download the media file then open a pre-filled mailto
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url; a.download = file.name;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (shareText) {
                const note = '\n\n(Pièce jointe téléchargée séparément — pensez à l\'attacher à cet e-mail.)';
                window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + note)}`;
            }
        };

        const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';

        // ── Service Worker registration ──────────────────────────────────
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch(() => {});
            });
            // When a new SW takes over (skipWaiting + clients.claim), reload so the
            // user gets the updated app immediately instead of seeing the old version.
            let swRefreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!swRefreshing) { swRefreshing = true; window.location.reload(); }
            });
        }

        // Send local push notifications for due/overdue reminders via the service worker.
        // Fires at the configured threshold day (advance warning) and again the day before + day of.
        // Deduplication per day via localStorage so the same reminder doesn't fire twice on the same day.
        const scheduleReminders = async (reminders) => {
            if (!('Notification' in window) || !navigator.serviceWorker) return;
            if (Notification.permission !== 'granted') return;
            if (localStorage.getItem('notificationsEnabled') === 'false') return;
            const reg = await navigator.serviceWorker.ready;
            const today = new Date().toDateString();
            let notified = {};
            try { notified = JSON.parse(localStorage.getItem('notifiedReminders') || '{}'); } catch (e) { notified = {}; }
            notified = Object.fromEntries(Object.entries(notified).filter(([, d]) => d === today));
            reminders.forEach(r => {
                // Fire at threshold day (advance warning), day before, and day of
                if (r.daysUntil > 1 && r.daysUntil !== r.threshold) return;
                if (r.daysUntil < 0) return;
                const key = `${r.animal}|${r.type}|${r.nom}|${r.daysUntil}`;
                if (notified[key] === today) return;
                const emoji = r.type === 'vaccin' ? '💉' : r.type === 'medicament' ? '💊' : r.type === 'antiparasitaire' ? '🦟' : r.type === 'rdv' ? '📅' : '🪱';
                reg.active?.postMessage({
                    type: 'SCHEDULE_NOTIFICATION',
                    title: `${emoji} ${r.animal} — ${r.nom}`,
                    body: formatReminderDelay(r.daysUntil),
                });
                notified[key] = today;
            });
            localStorage.setItem('notifiedReminders', JSON.stringify(notified));
        };

        // Main App Component
        function App() {
            const [user, setUser] = React.useState(null);
            const [loading, setLoading] = React.useState(true);
            const [activeTab, setActiveTab] = React.useState('accueil');
            const [tabHistory, setTabHistory] = React.useState([]);

            const navigateTo = (tab) => {
                if (tab !== activeTab) setTabHistory(h => [...h, activeTab]);
                setActiveTab(tab);
            };
            const goBack = () => {
                if (tabHistory.length === 0) return;
                const prev = tabHistory[tabHistory.length - 1];
                setTabHistory(h => h.slice(0, -1));
                setActiveTab(prev);
            };
            const [animals, setAnimals] = React.useState([]);
            const [selectedAnimal, setSelectedAnimal] = React.useState(null);
            const [reminderSettings, setReminderSettings] = React.useState({ vaccin: 3, medicament: 3, antiparasitaire: 14, vermifuge: 14 });
            const [userRole, setUserRole] = React.useState(null); // null (chargement) | 'proprietaire' | 'veterinaire'
            const [userProfile, setUserProfile] = React.useState({ nom: '', prenom: '', dateNaissance: '' });
            const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
            const [budgetFilter, setBudgetFilter] = React.useState('tout');
            const [householdId, setHouseholdId] = React.useState(null);
            const [isOnline, setIsOnline] = React.useState(navigator.onLine);
            const [syncState, setSyncState] = React.useState('synced'); // 'synced' | 'offline' | 'syncing'
            const [showSearch, setShowSearch] = React.useState(false);

            React.useEffect(() => {
                const onOnline = () => {
                    setIsOnline(true);
                    setSyncState('syncing');
                    setTimeout(() => setSyncState('synced'), 3000);
                };
                const onOffline = () => { setIsOnline(false); setSyncState('offline'); };
                window.addEventListener('online', onOnline);
                window.addEventListener('offline', onOffline);
                return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
            }, []);

            // Auth State
            React.useEffect(() => {
                const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                    setUser(currentUser);
                    setLoading(false);
                    if (currentUser) {
                        const hId = await loadSettings(currentUser.uid);
                        loadAnimalsFromFirestore(currentUser.uid, hId);
                        // Auto-register FCM token if notification permission already granted
                        if ('Notification' in window && Notification.permission === 'granted') {
                            initFCM(currentUser.uid);
                        }
                    } else {
                        setUserRole(null);
                    }
                });
                return unsubscribe;
            }, []);

            // Responsive layout: switch between sidebar (desktop) and hamburger menu (mobile)
            React.useEffect(() => {
                const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
                window.addEventListener('resize', handleResize);
                return () => window.removeEventListener('resize', handleResize);
            }, []);

            // Load Animals from Firestore. Members of a shared household see every animal of
            // the household (theirs and other members'); otherwise only their own animals.
            const loadAnimalsFromFirestore = async (uid, hId = householdId, keepSelected = false) => {
                try {
                    const q = hId
                        ? query(collection(db, 'animals'), where('householdId', '==', hId))
                        : query(collection(db, 'animals'), where('userId', '==', uid));
                    const querySnapshot = await getDocs(q);
                    const ARRAY_FIELDS = ['vaccins','medicaments','antiparasitaires','vermifuges','observations','poids','aliments','budget','rdvs','chirurgies','documents'];
                    const animalsData = querySnapshot.docs.map(docSnap => {
                        const data = docSnap.data();
                        ARRAY_FIELDS.forEach(field => {
                            if (Array.isArray(data[field])) {
                                data[field] = data[field].map((item, idx) => item.id ? item : { ...item, id: `${docSnap.id}_${field}_${idx}` });
                            }
                        });
                        return { id: docSnap.id, ...data };
                    });
                    setAnimals(animalsData);
                    if (!keepSelected && animalsData.length > 0) {
                        setSelectedAnimal(prev => {
                            const stillExists = animalsData.some(a => a.id === prev);
                            return stillExists ? prev : animalsData[0].id;
                        });
                    }
                } catch (error) {
                    console.error('Erreur loading animals:', error);
                }
            };

            // Apply loaded settings data to state — shared between fresh and legacy paths
            const applySettings = (settings, uid) => {
                const s = settings.reminders || {};
                setReminderSettings({ vaccin: s.vaccin ?? 3, medicament: s.medicament ?? 3, antiparasitaire: s.antiparasitaire ?? 14, vermifuge: s.vermifuge ?? 14 });
                setUserProfile({ nom: settings.nom || '', prenom: settings.prenom || '', dateNaissance: settings.dateNaissance || '', userId: uid });
                setUserRole(settings.role || 'proprietaire');
                setHouseholdId(settings.householdId || null);
                return settings.householdId || null;
            };

            // Load Settings (settings/{uid}; migrates legacy docs keyed by a random id)
            const loadSettings = async (uid) => {
                try {
                    const ref = doc(db, 'settings', uid);
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        return applySettings(snap.data(), uid);
                    }
                    // Legacy migration: old docs used a random ID with userId field
                    const q = query(collection(db, 'settings'), where('userId', '==', uid));
                    const legacy = await getDocs(q);
                    if (legacy.docs.length > 0) {
                        const legacyData = legacy.docs[0].data();
                        await setDoc(ref, legacyData, { merge: true });
                        return applySettings(legacyData, uid);
                    }
                    // New user — create default settings
                    await setDoc(ref, { userId: uid, role: 'proprietaire', reminders: { vaccin: 3, medicament: 3, antiparasitaire: 14, vermifuge: 14 } });
                    setUserRole('proprietaire');
                    return null;
                } catch (error) {
                    console.error('Erreur loading settings:', error);
                    setUserRole('proprietaire');
                    return null;
                }
            };

            // Save the owner's profile (nom, prénom, date de naissance) to settings/{uid}
            const saveUserProfile = async (profile) => {
                try {
                    await setDoc(doc(db, 'settings', user.uid), { userId: user.uid, ...profile }, { merge: true });
                    setUserProfile(profile);
                } catch (error) {
                    console.error('Erreur saving profile:', error);
                    throw error;
                }
            };

            // Stamp the user's own animals with a household id (or remove it when leaving)
            const setOwnAnimalsHousehold = async (hId) => {
                await Promise.all(
                    animals.filter(a => a.userId === user.uid).map(a => updateDoc(doc(db, 'animals', a.id), { householdId: hId }))
                );
            };

            // Create a shared household: the current user becomes its first member, and their
            // existing animals are stamped with the new household id so future members see them.
            const createHousehold = async () => {
                try {
                    const token = generateInviteToken();
                    const ref = await addDoc(collection(db, 'households'), { members: [user.uid], currentInviteToken: token });
                    await setDoc(doc(db, 'invitationLinks', token), { householdId: ref.id, createdBy: user.uid, createdAt: new Date() });
                    await setDoc(doc(db, 'settings', user.uid), { householdId: ref.id }, { merge: true });
                    await setOwnAnimalsHousehold(ref.id);
                    setHouseholdId(ref.id);
                    loadAnimalsFromFirestore(user.uid, ref.id);
                } catch (error) {
                    console.error('Erreur creating household:', error);
                    throw error;
                }
            };

            const regenerateInviteLink = async () => {
                if (!householdId) return null;
                const newToken = generateInviteToken();
                const snap = await getDoc(doc(db, 'households', householdId));
                const oldToken = snap.data()?.currentInviteToken;
                if (oldToken) await deleteDoc(doc(db, 'invitationLinks', oldToken)).catch(() => {});
                await setDoc(doc(db, 'invitationLinks', newToken), { householdId, createdBy: user.uid, createdAt: new Date() });
                await updateDoc(doc(db, 'households', householdId), { currentInviteToken: newToken });
                return newToken;
            };

            // Join a household via its invitation link/QR code
            const joinHousehold = async (hId) => {
                try {
                    await updateDoc(doc(db, 'households', hId), { members: arrayUnion(user.uid) });
                    await setDoc(doc(db, 'settings', user.uid), { householdId: hId }, { merge: true });
                    await setOwnAnimalsHousehold(hId);
                    setHouseholdId(hId);
                    loadAnimalsFromFirestore(user.uid, hId);
                } catch (error) {
                    console.error('Erreur joining household:', error);
                    throw error;
                }
            };

            // Leave the current household: own animals become private again
            const leaveHousehold = async () => {
                if (!householdId) return;
                try {
                    await updateDoc(doc(db, 'households', householdId), { members: arrayRemove(user.uid) });
                    await setDoc(doc(db, 'settings', user.uid), { householdId: null }, { merge: true });
                    await setOwnAnimalsHousehold(null);
                    setHouseholdId(null);
                    loadAnimalsFromFirestore(user.uid, null);
                } catch (error) {
                    console.error('Erreur leaving household:', error);
                    throw error;
                }
            };

            // Save Animal to Firestore
            const saveAnimal = async (animalData) => {
                try {
                    if (animalData.id && animals.find(a => a.id === animalData.id)) {
                        // Update existing — exclude the local `id` field from the Firestore document
                        const { id: _id, ...dataWithoutId } = animalData;
                        await updateDoc(doc(db, 'animals', animalData.id), dataWithoutId);
                        // Sync public card — only safe fields, never the full document
                        if (animalData.shareEnabled) {
                            await setDoc(doc(db, 'publicAnimalCards', animalData.id), buildPublicCard(animalData));
                        } else {
                            const prev = animals.find(a => a.id === animalData.id);
                            if (prev && prev.shareEnabled) {
                                await deleteDoc(doc(db, 'publicAnimalCards', animalData.id));
                            }
                        }
                    } else {
                        // Create new (owner nom/prénom/date de naissance are denormalized so vets can search by owner identity)
                        const docRef = await addDoc(collection(db, 'animals'), {
                            ...animalData, userId: user.uid,
                            proprietaireNom: userProfile.nom, proprietairePrenom: userProfile.prenom,
                            proprietaireDateNaissance: userProfile.dateNaissance || null,
                            householdId: householdId || null,
                            createdAt: new Date()
                        });
                        animalData.id = docRef.id;
                    }
                    loadAnimalsFromFirestore(user.uid, householdId, true);
                } catch (error) {
                    console.error('Erreur saving animal:', error);
                }
            };

            // Delete Animal
            const deleteAnimalFromFirestore = async (animalId) => {
                try {
                    await deleteDoc(doc(db, 'animals', animalId));
                    // Remove public card if it exists (ignore errors — may not exist)
                    deleteDoc(doc(db, 'publicAnimalCards', animalId)).catch(() => {});
                    loadAnimalsFromFirestore(user.uid);
                    setSelectedAnimal(null);
                } catch (error) {
                    console.error('Erreur deleting animal:', error);
                }
            };

            // Append an item (vaccin, médicament, observation...) to an animal's array field and persist to Firestore
            const addAnimalItem = (animal, type, item) => {
                const updated = { ...animal, [type]: [...(animal[type] || []), { ...item, id: Date.now() }] };
                saveAnimal(updated);
            };

            // Remove an item from an animal's array field by id and persist to Firestore
            const deleteAnimalItem = (animal, type, itemId) => {
                const updated = { ...animal, [type]: (animal[type] || []).filter(i => i.id !== itemId) };
                saveAnimal(updated);
            };

            // Update an existing item in an animal's array field by id and persist to Firestore
            const updateAnimalItem = (animal, type, itemId, updates) => {
                const updated = { ...animal, [type]: (animal[type] || []).map(i => i.id === itemId ? { ...i, ...updates } : i) };
                saveAnimal(updated);
            };


            // Filter an animal's budget entries by the selected period
            const getFilteredBudget = (budget) => {
                const today = new Date();
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
                const yearAgo = new Date(today.getFullYear(), 0, 1);

                return (budget || []).filter(b => {
                    const bDate = new Date(b.date);
                    if (budgetFilter === 'semaine') return bDate >= weekAgo;
                    if (budgetFilter === 'mois') return bDate >= monthAgo;
                    if (budgetFilter === 'annee') return bDate >= yearAgo;
                    return true;
                });
            };

            // Check Reminders across all animals, sorted by urgency. Includes items already
            // overdue (negative daysUntil), not just upcoming ones, so nothing falls through the cracks.
            const getReminders = () => {
                const reminders = [];
                const today = new Date();

                const checkItem = (type, animalNom, nom, dateStr, threshold) => {
                    const target = new Date(dateStr);
                    if (isNaN(target.getTime())) return;
                    const daysUntil = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                    if (daysUntil <= threshold) {
                        reminders.push({ type, animal: animalNom, nom, daysUntil, threshold, urgent: daysUntil <= 1 });
                    }
                };

                animals.forEach(animal => {
                    (animal.vaccins || []).forEach(v => checkItem('vaccin', animal.nom, v.nom, v.rappel || v.date, reminderSettings.vaccin));
                    (animal.medicaments || []).forEach(m => checkItem('medicament', animal.nom, m.nom, m.dateFin, reminderSettings.medicament));
                    (animal.antiparasitaires || []).forEach(t => checkItem('antiparasitaire', animal.nom, t.nom || 'Antiparasitaire', t.prochainTraitement, reminderSettings.antiparasitaire ?? 14));
                    (animal.vermifuges || []).forEach(t => checkItem('vermifuge', animal.nom, t.nom || 'Vermifuge', t.prochainTraitement, reminderSettings.vermifuge ?? 14));
                    (animal.rdvs || []).forEach(r => r.date && checkItem('rdv', animal.nom, r.motif || 'Rendez-vous', r.date, 7));
                });

                return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
            };

            // Open a pre-filled email so the user can send themselves a reminder
            const sendEmailReminder = (reminder) => {
                const delay = formatReminderDelay(reminder.daysUntil);
                const subject = `⚠️ Rappel: ${reminder.nom} (${delay})`;
                const body = `Bonjour,\n\nRappel: ${reminder.nom} pour ${reminder.animal} ${delay}.\n\nVeuillez prendre les mesures nécessaires.\n\nCarnet Santé PRO`;
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            };

            const reminders = getReminders();

            // Schedule local push notifications whenever reminders change
            React.useEffect(() => {
                if (reminders.length > 0) scheduleReminders(reminders);
            }, [animals, reminderSettings]);

            // Public "fiche de garde" link (?share=<animalId>) — no authentication required
            const sharedAnimalId = new URLSearchParams(window.location.search).get('share');
            if (sharedAnimalId) {
                return <SharedDossierView animalId={sharedAnimalId} db={db} />;
            }

            // While auth state is resolving, show login screen directly.
            // Firebase restores auth from localStorage in <100ms so logged-in users
            // see at most a brief flash before the app takes over.
            if (loading) return <LoginScreen auth={auth} db={db} />;

            if (!user) {
                return <LoginScreen auth={auth} db={db} />;
            }

            // User is authenticated but settings (role) not loaded yet — brief moment
            if (userRole === null) return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
                    <span style={{ fontSize: '32px' }}>🐾</span>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Chargement…</span>
                </div>
            );

            if (userRole === 'veterinaire') {
                return <VetApp user={user} auth={auth} db={db} />;
            }

            return (
                <div style={{ display: 'flex', height: '100vh', background: '#f9fafb' }}>
                    {isDesktop && <Sidebar activeTab={activeTab} setActiveTab={navigateTo} user={user} auth={auth} onSearchOpen={() => setShowSearch(true)} syncState={syncState} />}

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: isDesktop ? 0 : '70px' }}>
                        {!isDesktop && <MobileHeader navigateTo={navigateTo} goBack={goBack} canGoBack={tabHistory.length > 0} onSearchOpen={() => setShowSearch(true)} />}

                        {syncState === 'offline' && (
                            <div style={{ background: '#fef3c7', borderBottom: '1px solid #f59e0b', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
                                <span>📴</span>
                                <span>Hors connexion — tes modifications sont sauvegardées localement et seront synchronisées à la reconnexion.</span>
                            </div>
                        )}
                        {syncState === 'syncing' && (
                            <div style={{ background: '#eff6ff', borderBottom: '1px solid #3b82f6', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#1d4ed8' }}>
                                <span>🔄</span>
                                <span>Reconnecté — synchronisation en cours…</span>
                            </div>
                        )}
                        {syncState === 'synced' && !isOnline && null}

                        <CropModal />
                        {showSearch && <SearchOverlay animals={animals} onClose={() => setShowSearch(false)} navigateTo={navigateTo} setSelectedAnimal={setSelectedAnimal} />}

                        <NotificationPrompt animals={animals} reminders={reminders} />

                        <JoinHouseholdBanner householdId={householdId} joinHousehold={joinHousehold} leaveHousehold={leaveHousehold} />

                        <div style={{ flex: 1, width: '100%', maxWidth: isDesktop ? '980px' : '100%', margin: isDesktop ? '0 auto' : 0, padding: isDesktop ? '0 24px' : 0 }}>
                        <Content
                            activeTab={activeTab}
                            setActiveTab={navigateTo}
                            animals={animals}
                            selectedAnimal={selectedAnimal}
                            setSelectedAnimal={setSelectedAnimal}
                            saveAnimal={saveAnimal}
                            deleteAnimal={deleteAnimalFromFirestore}
                            addAnimalItem={addAnimalItem}
                            deleteAnimalItem={deleteAnimalItem}
                            updateAnimalItem={updateAnimalItem}
                            budgetFilter={budgetFilter}
                            setBudgetFilter={setBudgetFilter}
                            getFilteredBudget={getFilteredBudget}
                            reminderSettings={reminderSettings}
                            setReminderSettings={setReminderSettings}
                            reminders={reminders}
                            sendEmailReminder={sendEmailReminder}
                            user={user}
                            db={db}
                            auth={auth}
                            userProfile={userProfile}
                            saveUserProfile={saveUserProfile}
                            householdId={householdId}
                            createHousehold={createHousehold}
                            leaveHousehold={leaveHousehold}
                            regenerateInviteLink={regenerateInviteLink}
                        />
                        </div>
                    </div>

                    {!isDesktop && <BottomNav activeTab={activeTab} setActiveTab={navigateTo} />}
                </div>
            );
        }

        // Auth form (shared between landing CTA and direct login)
        function AuthForm({ auth, db, onBack, defaultPro }) {
            const [email, setEmail] = React.useState('');
            const [password, setPassword] = React.useState('');
            const [showPassword, setShowPassword] = React.useState(false);
            const [isSignup, setIsSignup] = React.useState(false);
            const [isVet, setIsVet] = React.useState(!!defaultPro);
            const [nom, setNom] = React.useState('');
            const [prenom, setPrenom] = React.useState('');
            const [dateNaissance, setDateNaissance] = React.useState('');
            const [error, setError] = React.useState('');
            const [resetMsg, setResetMsg] = React.useState('');

            const createSettingsDoc = async (uid, role) => {
                try {
                    const data = {
                        userId: uid, role, nom, prenom, dateNaissance,
                        reminders: { vaccin: 3, medicament: 3, antiparasitaire: 14, vermifuge: 14 }
                    };
                    if (role === 'veterinaire') data.subscriptionStatus = 'inactive';
                    await setDoc(doc(db, 'settings', uid), data, { merge: true });
                } catch (err) { console.error('Erreur creating settings:', err); }
            };

            const handlePasswordReset = async () => {
                if (!email) { setError('Entrez votre adresse email pour réinitialiser le mot de passe.'); return; }
                setError(''); setResetMsg('');
                try {
                    await sendPasswordResetEmail(auth, email);
                    setResetMsg('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
                } catch (err) { setError(err.message); }
            };

            const handleAuth = async (e) => {
                e.preventDefault();
                setError('');
                try {
                    if (isSignup) {
                        const cred = await createUserWithEmailAndPassword(auth, email, password);
                        await createSettingsDoc(cred.user.uid, isVet ? 'veterinaire' : 'proprietaire');
                    } else {
                        await signInWithEmailAndPassword(auth, email, password);
                    }
                } catch (err) { setError(err.message); }
            };

            const handleGoogleAuth = async () => {
                setError('');
                try {
                    const result = await signInWithPopup(auth, new GoogleAuthProvider());
                    if (getAdditionalUserInfo(result)?.isNewUser) {
                        await createSettingsDoc(result.user.uid, isVet ? 'veterinaire' : 'proprietaire');
                    }
                } catch (err) { setError(err.message); }
            };

            return (
                <div className="animate-fade-in" style={{ background: 'white', borderRadius: '20px', padding: '36px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                    {onBack && (
                        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px', marginBottom: '16px', padding: 0 }}>
                            ← Retour
                        </button>
                    )}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🐾</div>
                        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>Carnet Santé PRO</h2>
                        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>{isSignup ? 'Créez votre compte gratuit' : 'Connectez-vous à votre espace'}</p>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleAuth}
                        style={{ width: '100%', padding: '12px', background: 'white', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18">
                            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
                            <path fill="#FBBC05" d="M3.97 10.72c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.95H.96A8.996 8.996 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"/>
                            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
                        </svg>
                        Continuer avec Google
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>ou par email</span>
                        <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                    </div>

                    {isSignup && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                            <input type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)}
                                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                            <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)}
                                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: '1 / -1' }}>
                                <label htmlFor="signup-date-naissance" style={{ fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>Date de naissance</label>
                                <input id="signup-date-naissance" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)}
                                    style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', flex: 1 }} />
                            </div>
                        </div>
                    )}

                    {isSignup && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px', padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>
                            <input type="checkbox" id="is-vet" checked={isVet} onChange={(e) => setIsVet(e.target.checked)} style={{ width: 'auto', marginTop: '2px' }} />
                            <label htmlFor="is-vet" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer' }}>🩺 Je suis vétérinaire / professionnel de santé animale (espace pro)</label>
                        </div>
                    )}

                    <form onSubmit={handleAuth}>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '10px', fontSize: '16px' }} />
                        <div style={{ position: 'relative', marginBottom: '14px' }}>
                            <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', padding: '12px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', padding: '4px', lineHeight: 1 }}>
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <button type="submit"
                            style={{ width: '100%', padding: '13px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '16px', marginBottom: '10px' }}>
                            {isSignup ? 'Créer mon compte' : 'Se connecter'}
                        </button>
                        <button type="button" onClick={() => setIsSignup(!isSignup)}
                            style={{ width: '100%', padding: '12px', background: 'transparent', color: '#10b981', border: '1px solid #10b981', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                            {isSignup ? 'Déjà inscrit ? Se connecter' : 'Créer un compte gratuit'}
                        </button>
                        {!isSignup && (
                            <button type="button" onClick={handlePasswordReset}
                                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline', width: '100%' }}>
                                Mot de passe oublié ?
                            </button>
                        )}
                    </form>
                    {resetMsg && <p style={{ color: '#10b981', marginTop: '8px', fontSize: '14px' }}>{resetMsg}</p>}
                    {error && <p style={{ color: '#ef4444', marginTop: '10px', fontSize: '14px' }}>{error}</p>}

                    <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', marginTop: '14px' }}>
                        En continuant, vous acceptez notre <a href="privacy.html" target="_blank" rel="noopener" style={{ color: '#10b981' }}>politique de confidentialité</a>.
                    </p>
                </div>
            );
        }

        // Icônes SVG Lucide-style pour la landing page
        function SvgIcon({ name, size = 24, color = '#10b981', strokeWidth = 2 }) {
            const icons = {
                syringe: React.createElement('g', null,
                    React.createElement('path', { d: 'M18 2 22 6' }),
                    React.createElement('path', { d: 'm17 7 3-3' }),
                    React.createElement('path', { d: 'm14 4 6 6' }),
                    React.createElement('path', { d: 'M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5' }),
                    React.createElement('path', { d: 'm9 11 4 4' }),
                    React.createElement('path', { d: 'm5 19-3 3' })
                ),
                shield: React.createElement('g', null,
                    React.createElement('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10' }),
                    React.createElement('path', { d: 'm9 12 2 2 4-4' })
                ),
                clipboard: React.createElement('g', null,
                    React.createElement('rect', { width: '8', height: '4', x: '8', y: '2', rx: '1', ry: '1' }),
                    React.createElement('path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }),
                    React.createElement('path', { d: 'M12 11h4' }), React.createElement('path', { d: 'M12 16h4' }),
                    React.createElement('path', { d: 'M8 11h.01' }), React.createElement('path', { d: 'M8 16h.01' })
                ),
                'map-pin': React.createElement('g', null,
                    React.createElement('path', { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' }),
                    React.createElement('circle', { cx: '12', cy: '10', r: '3' })
                ),
                'bar-chart': React.createElement('g', null,
                    React.createElement('line', { x1: '12', x2: '12', y1: '20', y2: '10' }),
                    React.createElement('line', { x1: '18', x2: '18', y1: '20', y2: '4' }),
                    React.createElement('line', { x1: '6', x2: '6', y1: '20', y2: '16' })
                ),
                smartphone: React.createElement('g', null,
                    React.createElement('rect', { width: '14', height: '20', x: '5', y: '2', rx: '2', ry: '2' }),
                    React.createElement('path', { d: 'M12 18h.01' })
                ),
            };
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                    {icons[name] || null}
                </svg>
            );
        }

        // Cadre téléphone réutilisable (Dynamic Island + boutons + home indicator)
        function PhoneShell({ children, tilt }) {
            return (
                <div style={{
                    position: 'relative',
                    background: 'linear-gradient(155deg, #2e2e48 0%, #1a1a2e 55%, #12121f 100%)',
                    borderRadius: '46px',
                    padding: '14px 10px',
                    width: '220px',
                    flexShrink: 0,
                    transform: tilt ? 'rotate(' + tilt + 'deg)' : undefined,
                    boxShadow: [
                        '0 60px 100px rgba(0,0,0,0.55)',
                        '0 24px 48px rgba(0,0,0,0.3)',
                        '0 0 0 1px rgba(255,255,255,0.12)',
                        'inset 0 1px 0 rgba(255,255,255,0.18)',
                        'inset 0 -1px 0 rgba(0,0,0,0.4)',
                    ].join(','),
                }}>
                    {/* Bouton muet */}
                    <div style={{ position: 'absolute', left: '-3px', top: '82px', width: '3px', height: '24px', background: '#23233a', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 3px rgba(0,0,0,0.5)' }} />
                    {/* Volume + */}
                    <div style={{ position: 'absolute', left: '-3px', top: '116px', width: '3px', height: '40px', background: '#23233a', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 3px rgba(0,0,0,0.5)' }} />
                    {/* Volume - */}
                    <div style={{ position: 'absolute', left: '-3px', top: '166px', width: '3px', height: '40px', background: '#23233a', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 3px rgba(0,0,0,0.5)' }} />
                    {/* Power */}
                    <div style={{ position: 'absolute', right: '-3px', top: '110px', width: '3px', height: '64px', background: '#23233a', borderRadius: '0 2px 2px 0', boxShadow: '1px 0 3px rgba(0,0,0,0.5)' }} />

                    {/* Écran */}
                    <div style={{ background: '#f9fafb', borderRadius: '36px', overflow: 'hidden', position: 'relative' }}>
                        {/* Dynamic Island */}
                        <div style={{
                            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
                            width: '70px', height: '22px',
                            background: '#12121f',
                            borderRadius: '11px',
                            zIndex: 10,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        }} />
                        {/* Barre de statut */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '38px 18px 4px 18px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#111827' }}>9:41</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {/* Barres signal */}
                                <div style={{ display: 'flex', gap: '1.5px', alignItems: 'flex-end', height: '10px' }}>
                                    {[4, 6, 8, 10].map((h, i) => (
                                        <div key={i} style={{ width: '2.5px', height: h+'px', background: i < 4 ? '#1f2937' : '#d1d5db', borderRadius: '1px' }} />
                                    ))}
                                </div>
                                {/* Batterie */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', width: '20px', height: '10px', border: '1.5px solid #374151', borderRadius: '3px' }}>
                                        <div style={{ position: 'absolute', left: '2px', top: '1.5px', width: '13px', height: '5px', background: '#22c55e', borderRadius: '1px' }} />
                                    </div>
                                    <div style={{ width: '2px', height: '5px', background: '#374151', borderRadius: '0 1px 1px 0', marginLeft: '-0.5px' }} />
                                </div>
                            </div>
                        </div>
                        {children}
                        {/* Indicateur home */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '7px 0 10px', background: 'white' }}>
                            <div style={{ width: '72px', height: '4px', background: '#e5e7eb', borderRadius: '2px' }} />
                        </div>
                    </div>
                </div>
            );
        }

        // Mockup téléphone pour le hero de la landing page
        function PhoneMockup() {
            return (
                <PhoneShell>
                    {/* En-tête app */}
                    <div style={{ background: '#10b981', padding: '8px 14px 10px', color: 'white', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🐾 Carnet Santé</span>
                        <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: '500' }}>3 animaux</span>
                    </div>
                    {/* Liste animaux */}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {[
                            { emoji: '🐕', nom: 'Max', race: 'Golden Retriever · 3 ans', statut: '✅ À jour', statusBg: '#d1fae5', statusColor: '#065f46' },
                            { emoji: '🐈', nom: 'Luna', race: 'Persan · 5 ans', statut: '⚠️ 2 rappels', statusBg: '#fee2e2', statusColor: '#991b1b' },
                            { emoji: '🐇', nom: 'Noisette', race: 'Lapin · 1 an', statut: '✅ À jour', statusBg: '#d1fae5', statusColor: '#065f46' },
                        ].map((a, i) => (
                            <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                                <span style={{ fontSize: '24px' }}>{a.emoji}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#111827' }}>{a.nom}</div>
                                    <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.race}</div>
                                    <span style={{ fontSize: '10px', background: a.statusBg, color: a.statusColor, padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{a.statut}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Barre de navigation */}
                    <div style={{ background: 'white', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 4px 4px' }}>
                        {[{ icon: '📋', label: 'Dossier' }, { icon: '🐾', label: 'Animaux', active: true }, { icon: '⏰', label: 'Rappels' }, { icon: '⚙️', label: 'Réglages' }].map((tab, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', flex: 1, position: 'relative' }}>
                                {tab.active
                                    ? <div style={{ width: '34px', height: '34px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', marginTop: '-14px', boxShadow: '0 3px 10px rgba(16,185,129,0.5)' }}>{tab.icon}</div>
                                    : <span style={{ fontSize: '17px' }}>{tab.icon}</span>
                                }
                                <span style={{ fontSize: '9px', color: tab.active ? '#10b981' : '#9ca3af', fontWeight: tab.active ? '700' : '400' }}>{tab.label}</span>
                            </div>
                        ))}
                    </div>
                </PhoneShell>
            );
        }

        // Accordéon FAQ pour la landing page
        function FaqItem({ q, r }) {
            const [open, setOpen] = React.useState(false);
            return (
                <div style={{ background: 'white', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <button onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', gap: '12px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{q}</span>
                        <span style={{ fontSize: '22px', color: '#10b981', flexShrink: 0, lineHeight: 1, fontWeight: '300' }}>{open ? '−' : '+'}</span>
                    </button>
                    {open && (
                        <div style={{ padding: '0 24px 18px', borderTop: '1px solid #f3f4f6' }}>
                            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.7, margin: '12px 0 0' }}>{r}</p>
                        </div>
                    )}
                </div>
            );
        }


        // Landing page + login/signup screen
        function LoginScreen({ auth, db }) {
            const [showForm, setShowForm] = React.useState(false);
            const [proMode, setProMode] = React.useState(false);

            const FEATURES = [
                { emoji: '🔍', bg: '#fff1f2', title: 'Affiche perdu / trouvé', desc: 'Générez une affiche A4 imprimable avec photo, QR code et coordonnées — rouge si l\'animal est perdu, verte s\'il est trouvé.' },
                { emoji: '✈️', bg: '#fef3c7', title: 'Fiche voyage', desc: 'Checklist voyage France / Europe / International, rappels vaccins, passeport animal… tout dans un PDF imprimable.' },
                { emoji: '🔗', bg: '#ecfdf5', title: 'Fiche de garde partagée', desc: 'QR code public à accrocher au collier : dossier consultable sans connexion par n\'importe quel vétérinaire de garde.' },
            ];

            const STEPS = [
                { num: '1', title: 'Créez votre compte', desc: 'Inscription gratuite en 30 secondes avec votre email ou Google.' },
                { num: '2', title: 'Ajoutez vos animaux', desc: 'Renseignez le profil de chaque animal (espèce, race, date de naissance…).' },
                { num: '3', title: 'Gérez leur santé', desc: 'Vaccins, médicaments, rappels automatiques — tout au même endroit.' },
            ];

            if (showForm) {
                return (
                    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', padding: '20px' }}>
                        <AuthForm auth={auth} db={db} onBack={() => setShowForm(false)} defaultPro={proMode} />
                    </div>
                );
            }

            return (
                <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1f2937' }}>

                    {/* ── NAV ── */}
                    <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
                        <span style={{ fontWeight: '800', fontSize: '18px', color: '#10b981' }}>🐾 Carnet Santé PRO</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => { setProMode(true); setShowForm(true); }}
                                style={{ padding: '8px 16px', background: 'white', color: '#10b981', border: '1px solid #10b981', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                                🩺 Espace vétérinaire
                            </button>
                            <button onClick={() => { setProMode(false); setShowForm(true); }}
                                style={{ padding: '8px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                                Se connecter
                            </button>
                        </div>
                    </nav>

                    {/* ── 1. HERO ── */}
                    <section style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 60%, #a7f3d0 100%)', padding: '52px 20px 36px' }}>
                        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
                            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🐾</div>
                            <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: '800', color: '#064e3b', lineHeight: 1.15, marginBottom: '20px' }}>
                                Le carnet de santé numérique de votre animal, toujours avec vous.
                            </h1>
                            <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#065f46', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto 36px' }}>
                                Vaccins, traitements, documents vétérinaires et informations importantes réunis au même endroit.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <button onClick={() => setShowForm(true)}
                                    style={{ padding: '16px 40px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
                                    Commencer gratuitement →
                                </button>
                                <button onClick={() => setShowForm(true)}
                                    style={{ padding: '14px 20px', background: 'transparent', color: '#065f46', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '15px', textDecoration: 'underline', textUnderlineOffset: '3px', opacity: 0.75 }}>
                                    Se connecter
                                </button>
                            </div>
                            <p style={{ fontSize: '13px', color: '#6b7280' }}>✅ Gratuit · ✅ Sans publicité intrusive · ✅ Données sécurisées</p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
                                {['🐕 Chien', '🐈 Chat', '🐇 Lapin', '🐦 Oiseau', '🐴 Cheval', '🦎 Reptile'].map((s, i) => (
                                    <span key={i} style={{ background: 'rgba(6,95,70,0.08)', color: '#065f46', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── PRODUCT SHOWCASE ── */}
                    <section style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 50%, #f9fafb 100%)', padding: '44px 20px' }}>
                        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Aperçu de l'application</p>
                            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
                                Votre animal mérite son propre dossier santé.
                            </h2>
                            <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '28px' }}>Voilà ce que vous aurez dès votre inscription — en moins de 3 minutes.</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <PhoneMockup />
                                <PhoneShell>
                                    {/* En-tête dossier */}
                                    <div style={{ background: '#10b981', padding: '8px 14px 10px', color: 'white', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>🐕 Max</span>
                                        <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: '500' }}>Dossier santé</span>
                                    </div>
                                    {/* Rappels du dossier */}
                                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                        {[
                                            { label: '💉 Vaccin rage', date: 'Rappel dans 47 j', bg: '#fef3c7', color: '#92400e' },
                                            { label: '🦟 Antiparasitaire', date: 'Dans 12 j ⚠️', bg: '#fee2e2', color: '#991b1b' },
                                            { label: '💊 Métacam', date: 'En cours · 5 j restants', bg: '#eff6ff', color: '#1e40af' },
                                            { label: '⚖️ Poids : 28,4 kg', date: 'Mesuré le 15 juil.', bg: '#f0fdf4', color: '#065f46' },
                                        ].map((r, i) => (
                                            <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '7px 9px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                                                <div style={{ fontWeight: '600', fontSize: '11px', color: '#111827', marginBottom: '2px' }}>{r.label}</div>
                                                <span style={{ fontSize: '10px', background: r.bg, color: r.color, padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{r.date}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Nav bas */}
                                    <div style={{ background: 'white', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 4px 4px' }}>
                                        {[{ icon: '📋', label: 'Dossier', active: true }, { icon: '🐾', label: 'Animaux' }, { icon: '⏰', label: 'Rappels' }, { icon: '⚙️', label: 'Réglages' }].map((tab, i) => (
                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', flex: 1 }}>
                                                {tab.active
                                                    ? <div style={{ width: '34px', height: '34px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', marginTop: '-14px', boxShadow: '0 3px 10px rgba(16,185,129,0.5)' }}>{tab.icon}</div>
                                                    : <span style={{ fontSize: '17px' }}>{tab.icon}</span>
                                                }
                                                <span style={{ fontSize: '9px', color: tab.active ? '#10b981' : '#9ca3af', fontWeight: tab.active ? '700' : '400' }}>{tab.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </PhoneShell>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '28px' }}>
                                {[
                                    { icon: '💉', text: 'Consultez les rappels de vaccination en un coup d\'œil.' },
                                    { icon: '🗂️', text: 'Retrouvez les documents vétérinaires de votre animal.' },
                                    { icon: '🔗', text: 'Partagez uniquement les informations nécessaires.' },
                                ].map((item, i) => (
                                    <div key={i} style={{ textAlign: 'center', padding: '14px 12px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ fontSize: '22px', marginBottom: '6px' }}>{item.icon}</div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── POURQUOI UTILISER CARNET SANTÉ PRO ? ── */}
                    <section style={{ padding: '48px 20px', background: 'white' }}>
                        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', textAlign: 'center', marginBottom: '12px', color: '#064e3b' }}>
                                Pourquoi utiliser Carnet Santé PRO ?
                            </h2>
                            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '32px', fontSize: '16px' }}>Des rappels essentiels pour garder vos compagnons en bonne santé.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                                {[
                                    { icon: '💉', title: 'Vaccinations annuelles', text: 'Les rappels vaccinaux protègent votre animal contre des maladies graves comme la parvovirose ou le coryza. Un carnet à jour est obligatoire pour certains voyages, la pension ou le toilettage. Une alerte configurée quelques semaines avant vous évite d\'oublier une injection.' },
                                    { icon: '🦟', title: 'Antiparasitaires réguliers', text: 'Puces, tiques et moustiques représentent un risque toute l\'année, y compris en appartement. Les tiques véhiculent des maladies sérieuses comme la piroplasmose. Un traitement renouvelé toutes les 4 à 12 semaines protège efficacement votre animal et votre foyer.' },
                                    { icon: '⚖️', title: 'Suivi du poids', text: 'L\'obésité touche près d\'un animal sur deux en France. Pesez votre animal chaque mois et suivez la courbe dans l\'app. Une variation rapide peut aussi signaler une maladie à ne pas ignorer.' },
                                    { icon: '🦷', title: 'Hygiène dentaire', text: 'Les problèmes dentaires touchent plus de 80 % des chiens et chats de plus de 3 ans. Un brossage hebdomadaire et un détartrage annuel suffisent à maintenir une bonne santé bucco-dentaire.' },
                                    { icon: '🍽️', title: 'Alimentation adaptée', text: 'Les besoins nutritionnels varient selon l\'espèce, l\'âge et l\'état de santé. Consignez le régime dans l\'app pour faciliter les ajustements lors des consultations vétérinaires.' },
                                    { icon: '📋', title: 'Dossier médical centralisé', text: 'Chirurgies passées, allergies, analyses, traitements en cours : votre vétérinaire a besoin de l\'historique complet. En cas d\'urgence, le QR code du collier lui donne accès en quelques secondes.' },
                                ].map((c, i) => (
                                    <div key={i} style={{ background: '#f9fafb', borderRadius: '12px', padding: '22px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ fontSize: '28px', marginBottom: '10px' }}>{c.icon}</div>
                                        <h3 style={{ fontWeight: '700', fontSize: '15px', color: '#064e3b', marginBottom: '8px' }}>{c.title}</h3>
                                        <p style={{ color: '#4b5563', fontSize: '13px', lineHeight: 1.65, margin: 0 }}>{c.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── FONCTIONNALITÉS ── */}
                    <section style={{ padding: '48px 20px', background: '#f9fafb' }}>
                        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
                            <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', marginBottom: '12px', color: '#064e3b' }}>
                                Toutes les fonctionnalités
                            </h2>
                            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '28px', fontSize: '16px' }}>
                                Du suivi quotidien aux situations d'urgence — une application complète.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {[
                                    { emoji: '💉', bg: '#ecfdf5', title: 'Vaccins & rappels', desc: 'Enregistrez chaque vaccination et recevez une notification avant la date de rappel. Ne ratez plus jamais une injection importante.' },
                                    { emoji: '💊', bg: '#eff6ff', title: 'Traitements & médicaments', desc: 'Suivez les traitements en cours, les antiparasitaires et les vermifuges avec leurs dates de renouvellement et heures de prise.' },
                                    { emoji: '🔍', bg: '#fff1f2', title: 'Affiche perdu / trouvé', desc: 'Générez une affiche A4 imprimable avec photo, QR code et coordonnées — rouge si l\'animal est perdu, verte s\'il est trouvé.' },
                                    { emoji: '✈️', bg: '#fef3c7', title: 'Fiche voyage', desc: 'Checklist voyage France / Europe / International, rappels vaccins obligatoires, passeport animal — tout dans un PDF imprimable.' },
                                    { emoji: '🔗', bg: '#f5f3ff', title: 'Fiche de garde QR code', desc: 'QR code à accrocher au collier : le dossier est consultable sans connexion par n\'importe quel vétérinaire de garde.' },
                                    { emoji: '👨‍👩‍👧', bg: '#fdf4ff', title: 'Foyer partagé', desc: 'Partagez l\'accès aux carnets de tous vos animaux avec les membres de votre famille, en lecture et en écriture.' },
                                    { emoji: '📶', bg: '#f0fdf4', title: 'Fonctionne hors ligne', desc: 'Consultez et modifiez les dossiers même sans connexion. La synchronisation se fait automatiquement au retour du réseau.' },
                                    { emoji: '🔔', bg: '#fefce8', title: 'Notifications push', desc: 'Recevez des rappels même téléphone verrouillé : vaccins à venir, doses de médicaments, renouvellements antiparasitaires.' },
                                    { emoji: '⚖️', bg: '#fff7ed', title: 'Courbe de poids', desc: 'Suivez l\'évolution du poids sur un graphique et fixez un objectif. Idéal pour détecter les variations anormales.' },
                                ].map((f, i) => (
                                    <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #e5e7eb', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '46px', height: '46px', background: f.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{f.emoji}</div>
                                        <div>
                                            <h3 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px', color: '#111827' }}>{f.title}</h3>
                                            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── QR CODE & URGENCE ── */}
                    <section style={{ padding: '48px 20px', background: '#111827' }}>
                        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ display: 'inline-block', background: '#ef4444', borderRadius: '8px', padding: '6px 16px', fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '20px', letterSpacing: '0.05em' }}>🚨 EN CAS D'URGENCE</div>
                                <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: '800', color: 'white', lineHeight: 1.2, marginBottom: '16px' }}>
                                    Les informations vitales de votre animal,<br />accessibles en quelques secondes.
                                </h2>
                                <p style={{ color: '#9ca3af', fontSize: '16px', maxWidth: '580px', margin: '0 auto', lineHeight: 1.7 }}>
                                    Vaccins, allergies, traitements en cours, contacts d'urgence — tout est là, même si vous n'êtes pas joignable.
                                </p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                                {[
                                    {
                                        num: '1', icon: '📋', color: '#3b82f6',
                                        title: 'Créez le profil de votre animal',
                                        desc: 'Renseignez son identité, ses vaccins, ses traitements en cours, ses allergies et ses documents médicaux importants.',
                                    },
                                    {
                                        num: '2', icon: '🔗', color: '#10b981',
                                        title: 'Ajoutez le QR code à son collier',
                                        desc: 'Un QR code unique est généré. Toute personne qui retrouve votre animal peut accéder aux informations que vous choisissez de partager.',
                                    },
                                    {
                                        num: '3', icon: '🩺', color: '#f59e0b',
                                        title: 'Le vétérinaire consulte le dossier',
                                        desc: 'En cas d\'urgence, le vétérinaire de garde accède instantanément aux informations utiles — même sans vous avoir au téléphone.',
                                    },
                                ].map((s, i) => (
                                    <div key={i} style={{ background: '#1f2937', borderRadius: '16px', padding: '28px', border: '1px solid #374151', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '36px', opacity: 0.08 }}>{s.icon}</div>
                                        <div style={{ width: '40px', height: '40px', background: s.color, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: 'white', marginBottom: '18px' }}>{s.num}</div>
                                        <h3 style={{ fontWeight: '700', fontSize: '16px', color: 'white', marginBottom: '10px', lineHeight: 1.3 }}>{s.title}</h3>
                                        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <button onClick={() => setShowForm(true)}
                                    style={{ padding: '14px 32px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
                                    Créer la fiche de mon animal →
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* ── 5. ESPACE VÉTÉRINAIRE ── */}
                    <section style={{ padding: '48px 20px', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' }}>
                        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <div style={{ flex: '1 1 340px', color: 'white' }}>
                                    <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '700', marginBottom: '20px', color: '#a7f3d0' }}>🩺 POUR LES PROFESSIONNELS</div>
                                    <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', marginBottom: '16px', lineHeight: 1.2 }}>
                                        Espace vétérinaire professionnel
                                    </h2>
                                    <p style={{ color: '#d1fae5', fontSize: '16px', lineHeight: 1.7, marginBottom: '28px' }}>
                                        Accédez au dossier complet de vos patients en quelques secondes. Ajoutez des actes médicaux avec badge professionnel, rédigez des notes de consultation et communiquez directement avec les propriétaires.
                                    </p>
                                    <div style={{ display: 'grid', gap: '12px', marginBottom: '32px' }}>
                                        {[
                                            '🔎 Recherche par numéro de puce ou nom du propriétaire',
                                            '✅ Actes médicaux identifiés avec badge professionnel',
                                            '📝 Notes de consultation et comptes-rendus numériques',
                                            '💬 Messagerie sécurisée avec le propriétaire',
                                            '📊 Historique complet : vaccins, chirurgies, poids',
                                        ].map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ecfdf5', fontSize: '14px' }}>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                        <button onClick={() => { setProMode(true); setShowForm(true); }}
                                            style={{ padding: '14px 28px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
                                            Accéder à l'espace vétérinaire →
                                        </button>
                                    </div>
                                </div>
                                <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
                                    {[
                                        { icon: '⚡', label: 'Accès rapide', desc: 'Dossier patient disponible immédiatement' },
                                        { icon: '🩺', label: 'Badge professionnel', desc: 'Chaque acte clairement identifié comme acte pro' },
                                        { icon: '📱', label: 'Zéro installation', desc: '100 % web, fonctionne sur tous les appareils' },
                                    ].map((stat, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px 24px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
                                            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{stat.icon}</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', marginBottom: '4px' }}>{stat.label}</div>
                                            <div style={{ fontSize: '12px', color: '#d1fae5' }}>{stat.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── COMMENT ÇA MARCHE ? ── */}
                    <section style={{ padding: '48px 20px', background: '#f9fafb' }}>
                        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', marginBottom: '12px', color: '#064e3b', textAlign: 'center' }}>
                                Comment ça marche ?
                            </h2>
                            <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '36px', textAlign: 'center' }}>Démarrez en moins de 3 minutes, sans installation ni carte bancaire.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Étape 01 */}
                                <div style={{ background: 'white', borderRadius: '20px', padding: '32px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <div style={{ flex: '1 1 280px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', letterSpacing: '0.1em', marginBottom: '10px' }}>🟢 ÉTAPE 01</div>
                                        <h3 style={{ fontWeight: '800', fontSize: '22px', color: '#111827', marginBottom: '12px' }}>Créez votre compte</h3>
                                        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>30 secondes suffisent. Inscription gratuite avec votre adresse e-mail ou votre compte Google. Aucune carte bancaire requise.</p>
                                    </div>
                                    <div style={{ flex: '0 0 auto', background: '#f9fafb', borderRadius: '16px', padding: '20px', minWidth: '200px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', fontWeight: '600' }}>Adresse e-mail</div>
                                            <div style={{ background: 'white', border: '2px solid #10b981', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#374151' }}>vous@exemple.fr</div>
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', fontWeight: '600' }}>Mot de passe</div>
                                            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#9ca3af' }}>••••••••</div>
                                        </div>
                                        <div style={{ background: '#10b981', color: 'white', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700' }}>Créer mon compte</div>
                                        <div style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', margin: '8px 0' }}>— ou —</div>
                                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>🔵 Continuer avec Google</div>
                                    </div>
                                </div>

                                {/* Étape 02 */}
                                <div style={{ background: 'white', borderRadius: '20px', padding: '32px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap-reverse', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <div style={{ flex: '0 0 auto', background: '#f9fafb', borderRadius: '16px', padding: '20px', minWidth: '200px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ background: 'white', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ width: '52px', height: '52px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>🐕</div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '15px', color: '#111827' }}>Max</div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>Golden Retriever · 3 ans</div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>Né le 12 mars 2022</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {['💉 Vaccins', '🦟 Antiparasitaires', '📄 Documents'].map((t, i) => (
                                                <div key={i} style={{ background: 'white', borderRadius: '6px', padding: '7px 10px', fontSize: '12px', color: '#374151', fontWeight: '600', border: '1px solid #e5e7eb' }}>{t}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ flex: '1 1 280px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', letterSpacing: '0.1em', marginBottom: '10px' }}>🐶 ÉTAPE 02</div>
                                        <h3 style={{ fontWeight: '800', fontSize: '22px', color: '#111827', marginBottom: '12px' }}>Ajoutez votre compagnon</h3>
                                        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>Ajoutez sa photo, son identité, sa race, sa date de naissance et toutes les informations importantes. Chaque animal dispose de son propre dossier complet.</p>
                                    </div>
                                </div>

                                {/* Étape 03 */}
                                <div style={{ background: 'white', borderRadius: '20px', padding: '32px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <div style={{ flex: '1 1 280px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#8b5cf6', letterSpacing: '0.1em', marginBottom: '10px' }}>💉 ÉTAPE 03</div>
                                        <h3 style={{ fontWeight: '800', fontSize: '22px', color: '#111827', marginBottom: '12px' }}>Suivez sa santé</h3>
                                        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>Vaccins, traitements, rappels automatiques, documents vétérinaires… tout est regroupé dans son dossier. Recevez une notification avant chaque échéance importante.</p>
                                    </div>
                                    <div style={{ flex: '0 0 auto', background: '#f9fafb', borderRadius: '16px', padding: '20px', minWidth: '200px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '8px' }}>PROCHAINS RAPPELS</div>
                                        {[
                                            { label: '💉 Vaccin rage', tag: 'Dans 47 j', bg: '#fef3c7', c: '#92400e' },
                                            { label: '🦟 Antiparasitaire', tag: 'Dans 12 j', bg: '#fee2e2', c: '#991b1b' },
                                            { label: '🪱 Vermifuge', tag: 'Dans 3 j', bg: '#fee2e2', c: '#991b1b' },
                                            { label: '💊 Métacam', tag: 'Ce soir 20h', bg: '#eff6ff', c: '#1e40af' },
                                        ].map((r, i) => (
                                            <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{r.label}</span>
                                                <span style={{ fontSize: '10px', background: r.bg, color: r.c, padding: '2px 7px', borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap' }}>{r.tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </section>

                    {/* ── 6. SANTÉ CHIEN & CHAT ── */}
                    <section style={{ padding: '48px 20px', background: 'white' }}>
                        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', textAlign: 'center', marginBottom: '12px', color: '#064e3b' }}>
                                Guide santé de votre animal
                            </h2>
                            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '16px', marginBottom: '32px' }}>Informations essentielles pour prendre soin de votre compagnon au quotidien.</p>

                            {/* Chien */}
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <span style={{ fontSize: '36px' }}>🐶</span>
                                    <h3 style={{ fontWeight: '800', fontSize: '24px', color: '#111827', margin: 0 }}>Santé du chien</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                    {[
                                        { icon: '💉', title: 'Vaccination du chien', body: 'Pourquoi vacciner son chien ? Les vaccins essentiels (maladie de Carré, parvovirose, hépatite de Rubarth) doivent débuter à 6–8 semaines. Un rappel est nécessaire à 1 an, puis tous les 1 à 3 ans selon le vaccin. Le carnet de vaccination à jour est obligatoire pour la pension, le toilettage et certains voyages.' },
                                        { icon: '🪱', title: 'Vermifugation du chien', body: 'La fréquence dépend du mode de vie : toutes les 2 semaines jusqu\'à 3 mois, mensuelle jusqu\'à 6 mois, puis tous les 3 mois pour un chien qui sort régulièrement (chasse, forêt, contact avec d\'autres animaux), ou deux fois par an pour un chien d\'appartement sans contact extérieur.' },
                                        { icon: '🦟', title: 'Antiparasitaires du chien', body: 'Puces et tiques représentent un danger toute l\'année. Les pipettes ou comprimés antiparasitaires doivent être renouvelés toutes les 4 à 12 semaines. Les tiques peuvent transmettre la piroplasmose, potentiellement mortelle. Pensez à traiter aussi l\'environnement (litière, tapis) en cas d\'infestation de puces.' },
                                        { icon: '🚨', title: 'Symptômes à surveiller', body: 'Consultez sans attendre si votre chien présente : difficultés à respirer, abdomen gonflé ou douloureux, refus de boire plus de 24h, convulsions ou perte de connaissance, sang dans les selles ou vomissements, douleur intense à la palpation. Ces signes peuvent indiquer une urgence vitale.' },
                                    ].map((c, i) => (
                                        <div key={i} style={{ background: '#fafafa', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.icon}</div>
                                            <h4 style={{ fontWeight: '700', fontSize: '15px', color: '#111827', marginBottom: '8px' }}>{c.title}</h4>
                                            <p style={{ color: '#4b5563', fontSize: '13px', lineHeight: 1.65, margin: 0 }}>{c.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chat */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <span style={{ fontSize: '36px' }}>🐱</span>
                                    <h3 style={{ fontWeight: '800', fontSize: '24px', color: '#111827', margin: 0 }}>Santé du chat</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                    {[
                                        { icon: '💉', title: 'Vaccination du chat', body: 'Les vaccins fondamentaux protègent contre le coryza (rhinotrachéite + calicivirose), la typhus (panleucopénie) et la leucose féline (FeLV). Le protocole débute entre 8 et 12 semaines, avec un rappel à 1 an, puis tous les 1 à 3 ans. La rage est obligatoire pour tout séjour en pension ou voyage à l\'étranger.' },
                                        { icon: '🪱', title: 'Vermifugation du chat', body: 'Les chats d\'intérieur peuvent également contracter des vers (par les puces ou des proies). Vermifugez tous les 3 mois pour un chat qui sort, deux fois par an pour un chat strictement d\'intérieur. Les chatons doivent être vermifugés toutes les 2 semaines jusqu\'à 3 mois, puis mensuellement jusqu\'à 6 mois.' },
                                        { icon: '🦟', title: 'Antiparasitaires du chat', body: 'Les puces sont la première cause de démangeaisons chez le chat. Même un chat d\'intérieur peut être infesté (via les chaussures ou les vêtements). Un traitement mensuel (pipette, comprimé) suffit à prévenir les infestations. Attention : certains produits pour chien sont toxiques pour les chats — vérifiez toujours l\'étiquette.' },
                                        { icon: '🚨', title: 'Symptômes à surveiller', body: 'Consultez rapidement si votre chat présente : blocage urinaire (cris en urinant, absence d\'urine — urgence absolue chez le mâle), difficultés à respirer, absence de nourriture et de boisson depuis plus de 24h, troisième paupière visible, troubles de l\'équilibre ou désorientation, perte de poids rapide inexpliquée.' },
                                    ].map((c, i) => (
                                        <div key={i} style={{ background: '#fafafa', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.icon}</div>
                                            <h4 style={{ fontWeight: '700', fontSize: '15px', color: '#111827', marginBottom: '8px' }}>{c.title}</h4>
                                            <p style={{ color: '#4b5563', fontSize: '13px', lineHeight: 1.65, margin: 0 }}>{c.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 7. FAQ ── */}
                    <section style={{ padding: '48px 20px', background: '#f9fafb' }}>
                        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
                            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', textAlign: 'center', marginBottom: '12px', color: '#064e3b' }}>
                                Questions fréquentes
                            </h2>
                            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '40px', fontSize: '16px' }}>Tout ce que vous voulez savoir avant de commencer.</p>
                            {[
                                { q: 'Carnet Santé PRO est-il gratuit ?', r: 'Oui, l\'application est entièrement gratuite pour les propriétaires d\'animaux. Toutes les fonctionnalités — suivi des vaccins et traitements, rappels automatiques, calendrier, fiche voyage, affiche perdu/trouvé, partage en famille — sont incluses sans abonnement ni limite d\'animaux. Un abonnement mensuel (49,99 €/mois) est uniquement requis pour l\'espace vétérinaire professionnel.' },
                                { q: 'Combien d\'animaux puis-je enregistrer ?', r: 'Il n\'y a aucune limite. Chiens, chats, lapins, chevaux, oiseaux, rongeurs… chaque animal dispose de son propre carnet de santé complet avec photo, profil, historique médical et rappels personnalisés.' },
                                { q: 'Puis-je utiliser l\'application sans connexion internet ?', r: 'Oui, Carnet Santé PRO fonctionne hors ligne grâce à la persistance locale IndexedDB. Vous pouvez consulter les dossiers, ajouter des informations et recevoir des rappels même sans réseau. Toutes vos modifications se synchronisent automatiquement dès le retour de la connexion.' },
                                { q: 'Comment fonctionne la fiche de garde QR code ?', r: 'Activez le partage depuis l\'onglet Dossier de votre animal. Un QR code unique est généré — accrochez-le au collier. N\'importe quel vétérinaire peut le scanner pour voir le dossier résumé (vaccins, traitements, allergies) sans créer de compte. La fiche est en lecture seule et ne contient pas vos données personnelles sensibles.' },
                                { q: 'À quelle fréquence faut-il vermifuger son chien ou son chat ?', r: 'Les recommandations générales : toutes les 2 semaines jusqu\'à 3 mois, puis une fois par mois jusqu\'à 6 mois, puis tous les 3 mois pour un animal qui sort régulièrement, ou deux fois par an pour un animal strictement d\'intérieur. Carnet Santé PRO vous envoie un rappel automatique avant chaque renouvellement.' },
                                { q: 'Mes données sont-elles sécurisées ?', r: 'Toutes vos données sont stockées sur les serveurs Firebase de Google (ISO 27001), chiffrées en transit (TLS) et au repos (AES-256). Seuls vous et les vétérinaires que vous autorisez peuvent accéder au dossier de votre animal. Vous pouvez supprimer votre compte et toutes vos données à tout moment.' },
                                { q: 'Puis-je partager les animaux avec ma famille ?', r: 'Oui, la fonctionnalité "Foyer partagé" (dans Paramètres) permet à plusieurs membres d\'une même famille de gérer ensemble les carnets de santé de tous les animaux du foyer. Le créateur du foyer génère un QR code d\'invitation ; chaque membre qui le scanne obtient un accès complet en lecture et en écriture.' },
                                { q: 'Comment installer l\'application sur mon téléphone ?', r: '📱 Android (Chrome) : menu ⋮ → "Ajouter à l\'écran d\'accueil" ou "Installer l\'application". 🍎 iPhone (Safari) : bouton Partager ⬆️ → "Sur l\'écran d\'accueil". L\'app s\'installe comme une application native, sans passer par un store, et se met à jour automatiquement.' },
                            ].map((faq, i) => (
                                <FaqItem key={i} q={faq.q} r={faq.r} />
                            ))}
                            <div style={{ marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '32px' }}>
                                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>Conseils santé — cliquez pour lire</p>
                                <FaqItem q="💉 Calendrier vaccinal du chien et du chat" r="La vaccination est le pilier de la prévention des maladies infectieuses chez l'animal de compagnie. Elle doit débuter dès les premières semaines de vie et se poursuivre tout au long de la vie de l'animal, avec des rappels réguliers pour maintenir une immunité efficace. Chez le chien, les vaccins essentiels (dit « core ») sont : la maladie de Carré, la parvovirose, l'hépatite de Rubarth et la toux du chenil. Le premier protocole commence à 6–8 semaines avec deux injections espacées de 3 à 4 semaines, puis un rappel à 1 an, et ensuite tous les 1 à 3 ans. Chez le chat, les vaccins fondamentaux protègent contre la typhus (panleucopénie), le coryza et la leucose féline (FeLV). Le protocole débute entre 8 et 12 semaines, suivi d'un rappel à 1 an, puis tous les 1 à 3 ans. Le vaccin antirabique est obligatoire pour tout voyage à l'étranger. Carnet Santé PRO vous envoie un rappel automatique avant chaque échéance vaccinale." />
                                <FaqItem q="🦟 Antiparasitaires et vermifuges : fréquences recommandées" r="Les parasites internes (vers) et externes (puces, tiques, moustiques) sont une menace permanente pour la santé de votre animal, et parfois pour la vôtre. Un protocole de prévention régulier est indispensable, même si votre animal ne sort pas ou peu. Pour les antiparasitaires externes : les pipettes, colliers ou comprimés doivent être renouvelés toutes les 4 à 12 semaines selon le produit. Les tiques sont particulièrement présentes au printemps et en automne et peuvent transmettre des maladies graves comme la piroplasmose. Pour les vermifuges : les chiots et chatons doivent être vermifugés toutes les 2 semaines jusqu'à 3 mois, puis tous les mois jusqu'à 6 mois, puis tous les 3 mois pour un adulte qui sort, ou deux fois par an en intérieur strict." />
                                <FaqItem q="🚨 Signes d'alerte : quand consulter en urgence ?" r="Certains symptômes nécessitent une consultation vétérinaire immédiate. Urgences absolues : difficulté à respirer ou respiration haletante au repos, abdomen gonflé ou douloureux (surtout chez un chien de grande race — risque de dilatation-torsion de l'estomac), perte de connaissance ou convulsions. Consultations rapides : sang dans les urines, selles ou vomissements, refus de boire pendant plus de 24 heures, boiterie soudaine, œil rouge avec écoulement. En dehors des heures d'ouverture, la fiche de garde QR code de Carnet Santé PRO permet au vétérinaire de garde d'accéder instantanément aux vaccins, allergies et traitements de votre animal." />
                            </div>
                        </div>
                    </section>

                    {/* ── 7. À PROPOS ── */}
                    <section style={{ padding: '48px 20px', background: 'white' }}>
                        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
                            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', marginBottom: '24px', color: '#064e3b' }}>À propos de Carnet Santé PRO</h2>
                            <div style={{ width: '72px', height: '72px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 24px' }}>🐾</div>
                            <p style={{ color: '#4b5563', fontSize: '16px', lineHeight: 1.8, marginBottom: '16px' }}>
                                Carnet Santé PRO est une application web progressive (PWA) développée par un propriétaire d'animaux convaincu que le suivi de santé ne devrait pas se perdre dans des carnets papier ou des notes éparpillées.
                            </p>
                            <p style={{ color: '#4b5563', fontSize: '16px', lineHeight: 1.8, marginBottom: '32px' }}>
                                L'application est 100 % gratuite pour les propriétaires, fonctionne sur tous les appareils (iPhone, Android, ordinateur), et sans installation via un store. Elle est conçue pour être rapide, simple et disponible même sans connexion internet.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {['🐶 Chiens', '🐱 Chats', '🐰 Lapins', '🐦 Oiseaux', '🐴 Chevaux', '🦎 Reptiles'].map((a, i) => (
                                    <span key={i} style={{ background: '#f0fdf4', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', border: '1px solid #d1fae5' }}>{a}</span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── 8. CTA FINAL ── */}
                    <section style={{ padding: '48px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', textAlign: 'center' }}>
                        <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', color: 'white', marginBottom: '16px' }}>
                            Prêt à prendre soin de vos animaux ?
                        </h2>
                        <p style={{ color: '#d1fae5', fontSize: '16px', marginBottom: '32px' }}>
                            Inscription gratuite — aucune carte bancaire requise.
                        </p>
                        <button onClick={() => setShowForm(true)}
                            style={{ padding: '16px 40px', background: 'white', color: '#10b981', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                            Créer mon compte gratuitement →
                        </button>
                    </section>

                    {/* ── FOOTER ── */}
                    <footer style={{ background: '#111827', color: '#9ca3af', padding: '28px 20px', textAlign: 'center', fontSize: '13px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <ShareQRCode size={120} />
                            <p>📱 Scannez ce code pour ouvrir Carnet Santé PRO sur votre téléphone</p>
                        </div>
                        <p style={{ marginBottom: '8px' }}>🐾 Carnet Santé PRO — © 2025. All rights reserved.</p>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a href="about.html" target="_blank" rel="noopener" style={{ color: '#6b7280', textDecoration: 'underline' }}>À propos</a>
                            <a href="privacy.html" target="_blank" rel="noopener" style={{ color: '#6b7280', textDecoration: 'underline' }}>Politique de confidentialité</a>
                            <a href="terms.html" target="_blank" rel="noopener" style={{ color: '#6b7280', textDecoration: 'underline' }}>CGU</a>
                        </div>
                    </footer>
                </div>
            );
        }

        // QR code linking to the app's URL (or a custom `value`, e.g. a shared dossier link)

        function ShareQRCode({ size = 120, value }) {
            const ref = React.useRef(null);

            React.useEffect(() => {
                if (ref.current && window.QRCode) {
                    ref.current.innerHTML = '';
                    new window.QRCode(ref.current, {
                        text: value || (window.location.origin + window.location.pathname),
                        width: size,
                        height: size,
                        colorDark: '#111827',
                        colorLight: '#ffffff'
                    });
                }
            }, [size, value]);

            return <div ref={ref} style={{ display: 'inline-block', borderRadius: '8px', overflow: 'hidden' }} />;
        }

        // Read-only "fiche de garde" shown to anyone opening a ?share=<animalId> link (no login required)
        function SharedDossierView({ animalId, db }) {
            const [animal, setAnimal] = React.useState(null);
            const [status, setStatus] = React.useState('loading'); // 'loading' | 'ok' | 'error'

            React.useEffect(() => {
                (async () => {
                    try {
                        // Read from the filtered public card — never from the full animals document.
                        // The public card contains only safe fields (no budget, documents, partages, etc.)
                        const snap = await getDoc(doc(db, 'publicAnimalCards', animalId));
                        if (snap.exists()) {
                            setAnimal({ id: snap.id, ...snap.data() });
                            setStatus('ok');
                        } else {
                            setStatus('error');
                        }
                    } catch (error) {
                        console.error('Erreur loading shared dossier:', error);
                        setStatus('error');
                    }
                })();
            }, [animalId]);

            if (status === 'loading') {
                return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>;
            }

            if (status === 'error') {
                return (
                    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>🔒 Fiche indisponible</h2>
                            <p style={{ color: '#6b7280' }}>Ce lien n'est plus valide ou le partage a été désactivé par le propriétaire.</p>
                        </div>
                    </div>
                );
            }

            const Section = ({ title, children }) => (
                <div style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>{title}</h3>
                    {children}
                </div>
            );
            const Empty = ({ text }) => <p style={{ fontSize: '14px', color: '#9ca3af' }}>{text}</p>;

            return (
                <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
                    <header style={{ background: '#10b981', color: 'white', padding: '16px 20px', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>🐾 Fiche de garde — Carnet Santé PRO</h1>
                    </header>
                    <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
                        <AnimalProfileCard animal={animal} />

                        <Section title="ℹ️ Informations">
                            <p style={{ fontSize: '14px', color: '#374151' }}>
                                Espèce : {EMOJIS_ESPECE[animal.espece] || ''} {animal.espece}
                                {animal.sexe ? ` — ${animal.sexe === 'male' ? '♂️ Mâle' : '♀️ Femelle'}` : ''}
                                {animal.sterilise ? ' — Stérilisé/Castré' : ''}
                            </p>
                            {animal.identifiant && <p style={{ fontSize: '14px', color: '#374151', marginTop: '4px' }}>Identifiant (puce) : {animal.identifiant}</p>}
                        </Section>

                        <Section title="💉 Vaccins">
                            {(animal.vaccins && animal.vaccins.length > 0) ? animal.vaccins.map(v => (
                                <p key={v.id} style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>{v.nom} — fait le {formatDate(v.date)}, rappel le {formatDate(v.rappel)}</p>
                            )) : <Empty text="Aucun vaccin enregistré" />}
                        </Section>

                        <Section title="💊 Traitements">
                            {(animal.medicaments && animal.medicaments.length > 0) ? animal.medicaments.map(m => (
                                <p key={m.id} style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>{m.nom} — {m.dosage} {m.unite}, {m.frequence}, du {formatDate(m.dateDebut)} au {formatDate(m.dateFin)}</p>
                            )) : <Empty text="Aucun traitement enregistré" />}
                        </Section>

                        <Section title="🦟 Antiparasitaires / 🪱 Vermifuges">
                            {[...(animal.antiparasitaires || []), ...(animal.vermifuges || [])].length > 0 ? (
                                [...(animal.antiparasitaires || []), ...(animal.vermifuges || [])].map(t => (
                                    <p key={t.id} style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>{t.nom} — dernier traitement le {formatDate(t.dernierTraitement)}, prochain le {formatDate(t.prochainTraitement)}</p>
                                ))
                            ) : <Empty text="Aucun traitement enregistré" />}
                        </Section>

                        <Section title="🔪 Chirurgies">
                            {(animal.chirurgies && animal.chirurgies.length > 0) ? animal.chirurgies.map(c => (
                                <p key={c.id} style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>{c.nom} — {formatDate(c.date)}{c.notes ? ` — ${c.notes}` : ''}</p>
                            )) : <Empty text="Aucune chirurgie enregistrée" />}
                        </Section>

                        <Section title="🍎 Alimentation">
                            {(animal.aliments && animal.aliments.length > 0) ? animal.aliments.map(a => (
                                <p key={a.id} style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>{a.nom} — {a.quantite}{a.horaire ? ` — ${a.horaire}` : ''}</p>
                            )) : <Empty text="Aucune information d'alimentation" />}
                        </Section>

                        <Section title="⚖️ Poids">
                            {(animal.poids && animal.poids.length > 0) ? (
                                <p style={{ fontSize: '14px', color: '#374151' }}>
                                    {[...animal.poids].sort((a, b) => new Date(b.date) - new Date(a.date))[0].valeur} kg
                                    {' '}(le {formatDate([...animal.poids].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date)})
                                </p>
                            ) : <Empty text="Non renseigné" />}
                        </Section>

                        <Section title="📋 Observations">
                            {(animal.observations && animal.observations.length > 0) ? animal.observations.map(o => (
                                <p key={o.id} style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>{formatDate(o.date)} — {o.type}{o.description ? ` : ${o.description}` : ''}</p>
                            )) : <Empty text="Aucune observation" />}
                        </Section>

                        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', margin: '20px 0' }}>
                            Fiche en lecture seule générée par <a href={window.location.origin + window.location.pathname} style={{ color: '#10b981' }}>Carnet Santé PRO</a>
                        </p>
                    </div>
                </div>
            );
        }



        function NavButton({ tab, active, onClick, style = {} }) {
            return (
                <button
                    onClick={onClick}
                    style={{
                        width: '100%',
                        padding: '12px',
                        marginBottom: '8px',
                        background: active ? '#d1fae5' : 'transparent',
                        color: active ? '#10b981' : '#6b7280',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: active ? '600' : '400',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        ...style
                    }}
                >
                    {tab.label}
                </button>
            );
        }

        // Sidebar (desktop navigation)
        function Sidebar({ activeTab, setActiveTab, user, auth, onSearchOpen, syncState }) {
            const activeGroupKey = SIDEBAR_GROUPS.find(g => g.key && g.items.some(i => i.id === activeTab))?.key || null;
            const [openGroups, setOpenGroups] = React.useState(() => new Set(activeGroupKey ? [activeGroupKey] : []));

            React.useEffect(() => {
                if (activeGroupKey) setOpenGroups(prev => new Set([...prev, activeGroupKey]));
            }, [activeGroupKey]);

            const toggleGroup = (key) => setOpenGroups(prev => {
                const next = new Set(prev);
                next.has(key) ? next.delete(key) : next.add(key);
                return next;
            });

            return (
                <div style={{ width: '240px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <div style={{ padding: '18px 16px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '26px' }}>🐾</span>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#064e3b' }}>Carnet Santé</h2>
                        </div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', wordBreak: 'break-all' }}>{user?.email}</p>
                        {syncState === 'offline' && <p style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginTop: '4px' }}>📴 Hors connexion</p>}
                        {syncState === 'syncing' && <p style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600', marginTop: '4px' }}>🔄 Synchronisation…</p>}
                        <button onClick={onSearchOpen} style={{ marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#6b7280', fontSize: '13px' }}>
                            🔍 <span>Rechercher…</span>
                        </button>
                    </div>

                    <nav style={{ flex: 1, padding: '10px 10px' }}>
                        {SIDEBAR_GROUPS.map((group, gi) => (
                            <div key={gi} style={{ marginBottom: group.header ? '4px' : '0' }}>
                                {group.header ? (
                                    <button onClick={() => toggleGroup(group.key)}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                        {group.header}
                                        <span style={{ fontSize: '12px', transition: 'transform 0.2s', display: 'inline-block', transform: openGroups.has(group.key) ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
                                    </button>
                                ) : (
                                    gi > 0 && <div style={{ height: '1px', background: '#f3f4f6', margin: '6px 0' }} />
                                )}
                                {(!group.header || openGroups.has(group.key)) && group.items.map(tab => (
                                    <NavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} style={{ paddingLeft: group.header ? '16px' : '8px' }} />
                                ))}
                            </div>
                        ))}
                    </nav>

                    <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <button onClick={() => signOut(auth)}
                            style={{ width: '100%', padding: '9px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                            Déconnexion
                        </button>
                        <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>
                            <a href="privacy.html" target="_blank" rel="noopener" style={{ color: '#9ca3af' }}>Politique de confidentialité</a>
                        </p>
                    </div>
                </div>
            );
        }

        // Mobile header with home + optional back button
        const SEARCH_TYPE_META = {
            animal:      { icon: '🐾', label: 'Animal',       tab: 'dossier' },
            vaccin:      { icon: '💉', label: 'Vaccin',        tab: 'vaccins' },
            medicament:  { icon: '💊', label: 'Traitement',    tab: 'medicaments' },
            chirurgie:   { icon: '🔪', label: 'Chirurgie',     tab: 'chirurgies' },
            rdv:         { icon: '📅', label: 'Rendez-vous',   tab: 'planning' },
            observation: { icon: '📋', label: 'Observation',   tab: 'notes' },
            document:    { icon: '📄', label: 'Document',      tab: 'documents' },
            antiparasitaire: { icon: '🦟', label: 'Antiparasitaire', tab: 'rappels' },
            vermifuge:   { icon: '🪱', label: 'Vermifuge',     tab: 'rappels' },
            poids:       { icon: '⚖️', label: 'Pesée',         tab: 'poids' },
        };

        function SearchOverlay({ animals, onClose, navigateTo, setSelectedAnimal }) {
            const [query, setQuery] = React.useState('');
            const inputRef = React.useRef(null);

            React.useEffect(() => { setTimeout(() => inputRef.current && inputRef.current.focus(), 80); }, []);

            const results = React.useMemo(() => {
                const q = query.trim().toLowerCase();
                if (q.length < 2) return [];
                const hits = [];
                animals.forEach(animal => {
                    const push = (type, label, sub) => hits.push({ type, label: label || '', sub: sub || animal.nom, animalId: animal.id });
                    if (animal.nom.toLowerCase().includes(q)) push('animal', animal.nom, EMOJIS_ESPECE[animal.espece] + ' ' + (animal.espece || ''));
                    (animal.vaccins || []).forEach(v => v.nom && v.nom.toLowerCase().includes(q) && push('vaccin', v.nom));
                    (animal.medicaments || []).forEach(m => m.nom && m.nom.toLowerCase().includes(q) && push('medicament', m.nom));
                    (animal.chirurgies || []).forEach(c => c.nom && c.nom.toLowerCase().includes(q) && push('chirurgie', c.nom));
                    (animal.rdvs || []).forEach(r => (r.motif && r.motif.toLowerCase().includes(q)) && push('rdv', r.motif, animal.nom + (r.date ? ' • ' + r.date : '')));
                    (animal.observations || []).forEach(o => o.description && o.description.toLowerCase().includes(q) && push('observation', o.description.slice(0, 60), animal.nom));
                    (animal.documents || []).forEach(d => d.nom && d.nom.toLowerCase().includes(q) && push('document', d.nom));
                    (animal.antiparasitaires || []).forEach(a => a.nom && a.nom.toLowerCase().includes(q) && push('antiparasitaire', a.nom));
                    (animal.vermifuges || []).forEach(v => v.nom && v.nom.toLowerCase().includes(q) && push('vermifuge', v.nom));
                    (animal.poids || []).forEach(p => String(p.valeur).includes(q) && push('poids', p.valeur + ' kg', animal.nom + ' • ' + p.date));
                });
                return hits.slice(0, 25);
            }, [query, animals]);

            const handleSelect = (hit) => {
                const meta = SEARCH_TYPE_META[hit.type] || {};
                setSelectedAnimal(hit.animalId);
                navigateTo(meta.tab || 'dossier');
                onClose();
            };

            const grouped = results.reduce((acc, hit) => {
                const key = SEARCH_TYPE_META[hit.type]?.label || hit.type;
                if (!acc[key]) acc[key] = [];
                acc[key].push(hit);
                return acc;
            }, {});

            return (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: 'white', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px' }}>🔍</span>
                        <input
                            ref={inputRef}
                            type="search"
                            placeholder="Rechercher un animal, vaccin, RDV, document…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', background: 'transparent' }}
                        />
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', background: '#f9fafb' }}>
                        {query.length < 2 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                                Tape au moins 2 caractères pour rechercher
                            </div>
                        ) : results.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                <div style={{ fontSize: '36px', marginBottom: '12px' }}>😕</div>
                                Aucun résultat pour « {query} »
                            </div>
                        ) : (
                            Object.entries(grouped).map(([groupLabel, hits]) => (
                                <div key={groupLabel}>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '12px 16px 4px' }}>{groupLabel}</p>
                                    {hits.map((hit, i) => {
                                        const meta = SEARCH_TYPE_META[hit.type] || {};
                                        return (
                                            <button key={i} onClick={() => handleSelect(hit)} style={{ width: '100%', background: 'white', border: 'none', borderBottom: '1px solid #f3f4f6', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left' }}>
                                                <span style={{ fontSize: '20px', flexShrink: 0 }}>{meta.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hit.label}</div>
                                                    <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hit.sub}</div>
                                                </div>
                                                <span style={{ color: '#d1d5db', fontSize: '16px' }}>›</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        function MobileHeader({ navigateTo, goBack, canGoBack, onSearchOpen }) {
            return (
                <div style={{ background: 'white', padding: '12px 15px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {canGoBack && (
                            <button onClick={goBack} title="Retour" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', padding: '0 4px 0 0', lineHeight: 1, color: '#10b981', fontWeight: '700' }}>‹</button>
                        )}
                        <button onClick={() => navigateTo('accueil')} title="Accueil" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', padding: 0, lineHeight: 1 }}>🏠</button>
                        <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginLeft: '4px' }}>🐾 Carnet Santé</h1>
                    </div>
                    <button onClick={onSearchOpen} title="Rechercher" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', padding: '4px', lineHeight: 1, color: '#6b7280' }}>🔍</button>
                </div>
            );
        }

        // Onboarding card inviting the user to enable push notifications for reminders,
        // shown once until the user accepts, dismisses ("Plus tard") or the browser
        // already has a permission decision (granted/denied).
        function NotificationPrompt({ animals, reminders }) {
            const supported = 'Notification' in window && 'serviceWorker' in navigator;
            const [permission, setPermission] = React.useState(supported ? Notification.permission : 'unsupported');
            const [dismissed, setDismissed] = React.useState(localStorage.getItem('notifPromptDismissed') === 'true');

            if (!supported || permission !== 'default' || dismissed || animals.length === 0) return null;

            const sample = reminders[0];
            const previewBody = sample
                ? `${sample.nom} de ${sample.animal} 🐾 — ${formatReminderDelay(sample.daysUntil)}`
                : `Vaccin antirabique de ${animals[0].nom} 🐾 — Prévu dans 5 jours`;

            const dismiss = () => {
                localStorage.setItem('notifPromptDismissed', 'true');
                setDismissed(true);
            };

            const handleEnable = async () => {
                await Notification.requestPermission();
                setPermission(Notification.permission);
                dismiss();
            };

            return (
                <div className="animate-fade-in" style={{ background: '#111827', color: 'white', borderRadius: '12px', padding: '24px', margin: '16px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '16px' }}>
                        Reçois tous les rappels pour {animals[0].nom} 🔔
                    </h2>
                    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '10px', padding: '12px 14px', textAlign: 'left', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px' }}>🐾</span>
                            <strong style={{ fontSize: '12px', letterSpacing: '0.5px', color: '#9ca3af' }}>CARNET SANTÉ PRO</strong>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', color: '#f3f4f6' }}>{previewBody}. On te prévient à temps !</p>
                    </div>
                    <div style={{ textAlign: 'left', marginBottom: '20px', fontSize: '14px', lineHeight: '1.8' }}>
                        <p style={{ margin: 0 }}>✅ Vaccins et traitements rappelés à temps</p>
                        <p style={{ margin: 0 }}>✅ Désactivable à tout moment dans Paramètres</p>
                    </div>
                    <button onClick={handleEnable} style={{ width: '100%', padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '999px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginBottom: '12px' }}>
                        🔔 Activer les rappels
                    </button>
                    <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>
                        Plus tard
                    </button>
                </div>
            );
        }

        // Shown when the user opens an invitation link (?join=<householdId>) for a shared
        // household. Lets them accept or decline before joining.
        // Shown when the user opens an invitation link (?invite=<token>) for a shared household.
        // Reads invitationLinks/{token} to resolve the householdId — the ID itself is never in the URL.
        // Legacy ?join=<householdId> links show a deprecation notice instead of a join button.
        function JoinHouseholdBanner({ householdId, joinHousehold, leaveHousehold }) {
            const params = new URLSearchParams(window.location.search);
            const inviteToken = params.get('invite');
            const legacyJoinId = params.get('join');
            const [inviteData, setInviteData] = React.useState(null);
            const [status, setStatus] = React.useState(inviteToken ? 'loading' : 'idle');
            const [dismissed, setDismissed] = React.useState(false);

            const clearParams = () => {
                const url = new URL(window.location.href);
                url.searchParams.delete('invite');
                url.searchParams.delete('join');
                window.history.replaceState({}, '', url.toString());
                setDismissed(true);
            };

            React.useEffect(() => {
                if (!inviteToken) return;
                (async () => {
                    try {
                        const snap = await getDoc(doc(db, 'invitationLinks', inviteToken));
                        if (snap.exists()) {
                            setInviteData(snap.data());
                            setStatus('ready');
                        } else {
                            setStatus('invalid');
                        }
                    } catch {
                        setStatus('invalid');
                    }
                })();
            }, [inviteToken]);

            React.useEffect(() => {
                if (inviteData && inviteData.householdId === householdId) clearParams();
            }, [inviteData, householdId]);

            if (dismissed) return null;

            if (!inviteToken && legacyJoinId) {
                return (
                    <div style={{ background: '#fef3c7', padding: '14px 16px', margin: '16px', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                        <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '8px' }}>⚠️ Ce lien d'invitation est obsolète. Demandez un nouveau lien à l'administrateur du foyer.</p>
                        <button onClick={clearParams} style={{ padding: '5px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Ignorer</button>
                    </div>
                );
            }

            if (!inviteToken) return null;

            if (status === 'loading') {
                return <div style={{ padding: '14px 16px', margin: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Vérification du lien d'invitation…</div>;
            }

            if (status === 'invalid') {
                return (
                    <div style={{ background: '#fee2e2', padding: '14px 16px', margin: '16px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                        <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '8px' }}>❌ Lien d'invitation invalide ou révoqué. Demandez un nouveau lien à l'administrateur du foyer.</p>
                        <button onClick={clearParams} style={{ padding: '5px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Ignorer</button>
                    </div>
                );
            }

            if (!inviteData || inviteData.householdId === householdId) return null;

            const handleJoin = async () => {
                setStatus('joining');
                try {
                    if (householdId) await leaveHousehold();
                    await joinHousehold(inviteData.householdId);
                    clearParams();
                } catch {
                    setStatus('error');
                }
            };

            return (
                <div className="animate-fade-in" style={{ background: '#ecfdf5', padding: '16px', margin: '16px', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
                    <h3 style={{ marginBottom: '8px', fontWeight: '700' }}>👨‍👩‍👧 Invitation à un foyer partagé</h3>
                    <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>
                        Vous avez été invité(e) à rejoindre un foyer partagé. Les membres peuvent consulter et modifier les carnets de tous les animaux du foyer.
                        {householdId && ' Si vous acceptez, vous quitterez votre foyer actuel.'}
                    </p>
                    {status === 'error' && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>❌ Impossible de rejoindre ce foyer.</p>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleJoin} disabled={status === 'joining'} style={{ padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                            {status === 'joining' ? 'Adhésion…' : '✅ Rejoindre le foyer'}
                        </button>
                        <button onClick={clearParams} style={{ padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                            Ignorer
                        </button>
                    </div>
                </div>
            );
        }

        // Mobile bottom navigation bar
        const BOTTOM_NAV_TABS = [
            { id: 'dossier', icon: '📋', label: 'Dossier' },
            { id: 'urgences', icon: '🆘', label: 'Urgences' },
            { id: 'rappels', icon: '⏰', label: 'Rappels' },
        ];

        const MORE_TABS = [
            { id: 'calendrier', icon: '📆', label: 'Calendrier' },
            { id: 'voyage', icon: '✈️', label: 'Voyage' },
            { id: 'planning', icon: '📅', label: 'Planning' },
            { id: 'veterinaires', icon: '🏥', label: 'Vétérinaires' },
            { id: 'budget', icon: '💰', label: 'Budget' },
            { id: 'parametres', icon: '⚙️', label: 'Paramètres' },
        ];

        function BottomNavItem({ tab, activeTab, setActiveTab }) {
            return (
                <button
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '8px 0 10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: activeTab === tab.id ? '#10b981' : '#6b7280',
                        fontWeight: activeTab === tab.id ? '600' : '400',
                        fontSize: '11px'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                    {tab.label}
                </button>
            );
        }

        function BottomNav({ activeTab, setActiveTab }) {
            const [showMore, setShowMore] = React.useState(false);
            const moreActive = MORE_TABS.some(t => t.id === activeTab);

            const handleMore = (id) => {
                setShowMore(false);
                setActiveTab(id);
            };

            return (
                <React.Fragment>
                    {showMore && (
                        <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}>
                            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: '60px', left: '8px', right: '8px', background: 'white', borderRadius: '16px', padding: '12px', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', paddingLeft: '4px' }}>Plus</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                    {MORE_TABS.map(tab => (
                                        <button key={tab.id} onClick={() => handleMore(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 8px', background: activeTab === tab.id ? '#ecfdf5' : '#f9fafb', border: activeTab === tab.id ? '1.5px solid #10b981' : '1.5px solid transparent', borderRadius: '10px', cursor: 'pointer', color: activeTab === tab.id ? '#10b981' : '#374151', fontWeight: activeTab === tab.id ? '700' : '500', fontSize: '12px' }}>
                                            <span style={{ fontSize: '22px' }}>{tab.icon}</span>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
                        {BOTTOM_NAV_TABS.slice(0, 2).map(tab => (
                            <BottomNavItem key={tab.id} tab={tab} activeTab={activeTab} setActiveTab={setActiveTab} />
                        ))}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', padding: '8px 0 10px', fontSize: '11px', color: '#6b7280' }}>
                            <button
                                onClick={() => setActiveTab('accueil')}
                                title="Accueil"
                                style={{ position: 'absolute', top: '-22px', width: '52px', height: '52px', borderRadius: '50%', background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 4px 8px rgba(16,185,129,0.4)', cursor: 'pointer' }}
                            >
                                🏠
                            </button>
                            <span style={{ marginTop: '32px' }}>Accueil</span>
                        </div>
                        {BOTTOM_NAV_TABS.slice(2).map(tab => (
                            <BottomNavItem key={tab.id} tab={tab} activeTab={activeTab} setActiveTab={setActiveTab} />
                        ))}
                        <button
                            onClick={() => setShowMore(v => !v)}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 0 10px', background: 'none', border: 'none', cursor: 'pointer', color: (showMore || moreActive) ? '#10b981' : '#6b7280', fontWeight: (showMore || moreActive) ? '600' : '400', fontSize: '11px' }}
                        >
                            <span style={{ fontSize: '20px' }}>⋯</span>
                            Plus
                        </button>
                    </nav>
                </React.Fragment>
            );
        }

        // Content Router
        function Content(props) {
            const { activeTab, animals, selectedAnimal, setSelectedAnimal, setActiveTab, addAnimalItem, deleteAnimalItem, updateAnimalItem, saveAnimal, budgetFilter, setBudgetFilter, getFilteredBudget } = props;
            const animal = animals.find(a => a.id === selectedAnimal);

            if (activeTab === 'accueil') {
                return <HomeTab {...props} />;
            } else if (activeTab === 'dossier') {
                return <DossierTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} setActiveTab={setActiveTab} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} saveAnimal={saveAnimal} />;
            } else if (activeTab === 'vaccins') {
                return <VaccinsTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'aliment') {
                return <AlimentTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'medicaments') {
                return <MedicamentsTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'chirurgies') {
                return <ChirurgiesTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'notes') {
                return <NotesTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'messages') {
                return <MessagesTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} db={props.db} currentRole="proprietaire" authorProfile={props.userProfile} />;
            } else if (activeTab === 'journal') {
                return <JournalTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />;
            } else if (activeTab === 'documents') {
                return <DocumentsTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'videos') {
                return <VideosTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />;
            } else if (activeTab === 'poids') {
                return <PoidsTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} saveAnimal={saveAnimal} />;
            } else if (activeTab === 'budget') {
                return <BudgetTab animal={animal} animals={animals} budgetFilter={budgetFilter} setBudgetFilter={setBudgetFilter} getFilteredBudget={getFilteredBudget} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'veterinaires') {
                return <VeterinairesTab animals={animals} saveAnimal={saveAnimal} />;
            } else if (activeTab === 'urgences') {
                return <UrgencesTab setActiveTab={props.setActiveTab} />;
            } else if (activeTab === 'planning') {
                return <PlanningTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />;
            } else if (activeTab === 'calendrier') {
                return <CalendrierTab animals={animals} />;
            } else if (activeTab === 'voyage') {
                return <VoyageTab animal={animal} animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} saveAnimal={saveAnimal} />;
            } else if (activeTab === 'rappels') {
                return <RappelsTab {...props} />;
            } else if (activeTab === 'parametres') {
                return <ParametresTab {...props} />;
            }
        }

        // Tabs Content
        function HomeTab({ animals, selectedAnimal, setSelectedAnimal, setActiveTab, saveAnimal, deleteAnimal, reminders }) {
            const [showAddAnimal, setShowAddAnimal] = React.useState(false);
            const [newAnimal, setNewAnimal] = React.useState({ nom: '', espece: '', dateNaissance: '', sexe: '', race: '', sterilise: false, identifiant: '', photo: '' });
            const [editingAnimal, setEditingAnimal] = React.useState(null);
            const [photoError, setPhotoError] = React.useState('');
            const [searchQuery, setSearchQuery] = React.useState('');
            const [openVetId, setOpenVetId] = React.useState(null);

            const handlePhotoChange = (file, setter) => {
                setPhotoError('');
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    openCropModal(e.target.result, 1)
                        .then(cropped => setter(prev => ({ ...prev, photo: cropped })))
                        .catch(() => {});
                };
                reader.onerror = () => setPhotoError('Impossible de lire cette image.');
                reader.readAsDataURL(file);
            };

            const handleAddAnimal = () => {
                if (newAnimal.nom && newAnimal.espece) {
                    saveAnimal({ ...newAnimal, vaccins: [], aliments: [], medicaments: [], observations: [], poids: [], budget: [], veterinaire: null, partages: [] });
                    setNewAnimal({ nom: '', espece: '', dateNaissance: '', sexe: '', race: '', sterilise: false, identifiant: '', photo: '' });
                    setShowAddAnimal(false);
                }
            };

            const handleEditAnimal = () => {
                if (editingAnimal && editingAnimal.nom && editingAnimal.espece) {
                    saveAnimal(editingAnimal);
                    setEditingAnimal(null);
                }
            };

            const filteredAnimals = animals.filter(a => !searchQuery || (a.nom||'').toLowerCase().includes(searchQuery.toLowerCase()) || (a.espece||'').toLowerCase().includes(searchQuery.toLowerCase()) || (a.race||'').toLowerCase().includes(searchQuery.toLowerCase()));

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>Mes animaux ({animals.length})</h2>
                    {animals.length > 3 && (
                        <input
                            type="search"
                            placeholder="Rechercher un animal..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    )}

                    {/* Animals List */}
                    {animals.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {filteredAnimals.map((animal, i) => {
                                const age = computeAge(animal.dateNaissance);
                                const subtitle = [animal.race, age].filter(Boolean).join(' — ');
                                const animalReminders = reminders.filter(r => r.animal === animal.nom);
                                const pill = animalReminders.length > 0
                                    ? { background: '#fee2e2', color: '#dc2626', text: `${animalReminders.length} rappel${animalReminders.length > 1 ? 's' : ''}` }
                                    : { background: '#d1fae5', color: '#047857', text: 'À jour' };
                                const hasVet = animal.veterinaire && animal.veterinaire.nom;
                                const vetOpen = openVetId === animal.id;
                                return (
                                    <div key={animal.id} className="animate-fade-in" style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                        {/* Ligne principale */}
                                        <div
                                            onClick={() => { setSelectedAnimal(animal.id); setActiveTab('dossier'); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 14px', cursor: 'pointer', background: selectedAnimal === animal.id ? '#f0fdf4' : 'white' }}
                                        >
                                            {animal.photo ? (
                                                <AnimalAvatar animal={animal} size={44} />
                                            ) : (
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <AnimalAvatar animal={animal} size={24} />
                                                </div>
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontSize: '15px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{animal.nom}</h3>
                                                {subtitle && <p style={{ color: '#6b7280', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{subtitle}</p>}
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '999px', whiteSpace: 'nowrap', flexShrink: 0, background: pill.background, color: pill.color }}>{pill.text}</span>
                                            <button onClick={(e) => { e.stopPropagation(); setEditingAnimal({ ...animal }); }} style={{ padding: '7px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                <EditIcon size={15} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteAnimal(animal.id); }} style={{ padding: '7px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                <DeleteIcon size={15} />
                                            </button>
                                            <span style={{ color: '#d1d5db', fontSize: '16px', flexShrink: 0 }}>›</span>
                                        </div>
                                        {/* Bande vétérinaire cliquable — visible uniquement si vét assigné */}
                                        {hasVet && (
                                            <div onClick={(e) => { e.stopPropagation(); setOpenVetId(vetOpen ? null : animal.id); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderTop: '1px solid #d1fae5', background: vetOpen ? '#d1fae5' : '#f0fdf4', cursor: 'pointer' }}>
                                                <span style={{ fontSize: '13px' }}>🩺</span>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#059669', flex: 1 }}>{animal.veterinaire.nom}</span>
                                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{vetOpen ? '▲' : '▼'}</span>
                                            </div>
                                        )}
                                        {/* Accordéon détail */}
                                        {hasVet && vetOpen && (
                                            <div style={{ padding: '8px 16px 12px', background: '#f0fdf4' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {animal.veterinaire.tel && (
                                                        <a href={`tel:${animal.veterinaire.tel}`} onClick={(e) => e.stopPropagation()}
                                                            style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', textDecoration: 'none' }}>
                                                            📞 {animal.veterinaire.tel}
                                                        </a>
                                                    )}
                                                    {animal.veterinaire.adresse && (
                                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>📍 {animal.veterinaire.adresse}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Edit Animal Modal */}
                    {editingAnimal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px rgba(0,0,0,0.2)' }}>
                                <h3 style={{ marginBottom: '16px', fontWeight: '600', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><EditIcon size={18} /> Modifier {editingAnimal.nom}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                    <input type="text" placeholder="Nom" value={editingAnimal.nom} onChange={(e) => setEditingAnimal({ ...editingAnimal, nom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                    <select value={editingAnimal.espece} onChange={(e) => setEditingAnimal({ ...editingAnimal, espece: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                        <option value="">Espèce</option>
                                        {ESPECES.map(e => <option key={e} value={e}>{EMOJIS_ESPECE[e]} {e}</option>)}
                                    </select>
                                    <input type="text" placeholder="Race (optionnel)" value={editingAnimal.race || ''} onChange={(e) => setEditingAnimal({ ...editingAnimal, race: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                    <select value={editingAnimal.sexe || ''} onChange={(e) => setEditingAnimal({ ...editingAnimal, sexe: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                        <option value="">Sexe</option>
                                        <option value="male">♂️ Mâle</option>
                                        <option value="femelle">♀️ Femelle</option>
                                    </select>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label htmlFor="edit-date-naissance" style={{ fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>Date de naissance</label>
                                        <input id="edit-date-naissance" type="date" value={editingAnimal.dateNaissance || ''} onChange={(e) => setEditingAnimal({ ...editingAnimal, dateNaissance: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', flex: 1 }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="checkbox" id="edit-sterilise" checked={editingAnimal.sterilise || false} onChange={(e) => setEditingAnimal({ ...editingAnimal, sterilise: e.target.checked })} style={{ width: 'auto' }} />
                                        <label htmlFor="edit-sterilise" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Stérilisé/Castré</label>
                                    </div>
                                    <input type="text" placeholder="Identifiant vétérinaire (puce électronique, optionnel)" value={editingAnimal.identifiant || ''} onChange={(e) => setEditingAnimal({ ...editingAnimal, identifiant: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: '1 / -1' }} />
                                    <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '8px', padding: '12px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#065f46', marginBottom: '8px' }}>🩺 Vétérinaire habituel (optionnel)</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                            <input type="text" placeholder="Nom du cabinet / vétérinaire"
                                                value={(editingAnimal.veterinaire || {}).nom || ''}
                                                onChange={(e) => setEditingAnimal({ ...editingAnimal, veterinaire: { ...(editingAnimal.veterinaire || {}), nom: e.target.value } })}
                                                style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                                            <input type="tel" placeholder="Téléphone"
                                                value={(editingAnimal.veterinaire || {}).tel || ''}
                                                onChange={(e) => setEditingAnimal({ ...editingAnimal, veterinaire: { ...(editingAnimal.veterinaire || {}), tel: e.target.value } })}
                                                style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                                            <input type="text" placeholder="Adresse"
                                                value={(editingAnimal.veterinaire || {}).adresse || ''}
                                                onChange={(e) => setEditingAnimal({ ...editingAnimal, veterinaire: { ...(editingAnimal.veterinaire || {}), adresse: e.target.value } })}
                                                style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', gridColumn: '1 / -1' }} />
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>📷 Photo (optionnel)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <AnimalAvatar animal={editingAnimal} size={48} />
                                            <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files[0], setEditingAnimal)} style={{ flex: 1 }} />
                                            {editingAnimal.photo && <button type="button" onClick={() => setEditingAnimal({ ...editingAnimal, photo: '' })} style={{ padding: '6px 10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✕ Retirer</button>}
                                        </div>
                                        {photoError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{photoError}</p>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleEditAnimal} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                                        ✅ Enregistrer
                                    </button>
                                    <button onClick={() => setEditingAnimal(null)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Animal Form */}
                    {showAddAnimal ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #10b981' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter un animal</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Nom" value={newAnimal.nom} onChange={(e) => setNewAnimal({ ...newAnimal, nom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <select value={newAnimal.espece} onChange={(e) => setNewAnimal({ ...newAnimal, espece: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                    <option value="">Espèce</option>
                                    {ESPECES.map(e => <option key={e} value={e}>{EMOJIS_ESPECE[e]} {e}</option>)}
                                </select>
                                <input type="text" placeholder="Race (optionnel)" value={newAnimal.race} onChange={(e) => setNewAnimal({ ...newAnimal, race: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <select value={newAnimal.sexe} onChange={(e) => setNewAnimal({ ...newAnimal, sexe: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                    <option value="">Sexe</option>
                                    <option value="male">♂️ Mâle</option>
                                    <option value="femelle">♀️ Femelle</option>
                                </select>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label htmlFor="new-date-naissance" style={{ fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>Date de naissance</label>
                                    <input id="new-date-naissance" type="date" value={newAnimal.dateNaissance} onChange={(e) => setNewAnimal({ ...newAnimal, dateNaissance: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', flex: 1 }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" id="sterilise" checked={newAnimal.sterilise} onChange={(e) => setNewAnimal({ ...newAnimal, sterilise: e.target.checked })} style={{ width: 'auto' }} />
                                    <label htmlFor="sterilise" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>Stérilisé/Castré</label>
                                </div>
                                <input type="text" placeholder="Identifiant vétérinaire (puce électronique, optionnel)" value={newAnimal.identifiant} onChange={(e) => setNewAnimal({ ...newAnimal, identifiant: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: '1 / -1' }} />
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>📷 Photo (optionnel)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <AnimalAvatar animal={newAnimal} size={48} />
                                        <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files[0], setNewAnimal)} style={{ flex: 1 }} />
                                        {newAnimal.photo && <button type="button" onClick={() => setNewAnimal({ ...newAnimal, photo: '' })} style={{ padding: '6px 10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✕ Retirer</button>}
                                    </div>
                                    {photoError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{photoError}</p>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAddAnimal} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                                    ✅ Valider
                                </button>
                                <button onClick={() => setShowAddAnimal(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                                    Annuler
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowAddAnimal(true)} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter un animal
                        </button>
                    )}
                </div>
            );
        }

        // Per-animal overview: profile header + clickable status cards linking to each section
        function DossierTab({ animal, animals, selectedAnimal, setSelectedAnimal, setActiveTab, addAnimalItem, deleteAnimalItem, saveAnimal }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const [videoCount, setVideoCount] = React.useState(0);
            const [email, setEmail] = React.useState('');
            const [shareLinkCopied, setShareLinkCopied] = React.useState(false);
            const [editAssurance, setEditAssurance] = React.useState(false);
            const emptyAssurance = { compagnie: '', numeroContrat: '', telephone: '', dateDebut: '', dateFin: '', franchise: '', plafondAnnuel: '', notes: '' };
            const [assuranceForm, setAssuranceForm] = React.useState(animal.assurance || emptyAssurance);
            const [showSectionPicker, setShowSectionPicker] = React.useState(false);
            const [reportSections, setReportSections] = React.useState({ vaccins: true, traitements: true, chirurgies: true, antiparasitaires: true, vermifuges: true, rdvs: true, assurance: true, poids: true, budget: false, observations: true });
            const REPORT_SECTION_LABELS = [
                { key: 'vaccins', label: '💉 Vaccins' },
                { key: 'traitements', label: '💊 Traitements en cours' },
                { key: 'chirurgies', label: '🔪 Chirurgies & interventions' },
                { key: 'antiparasitaires', label: '🦟 Antiparasitaires' },
                { key: 'vermifuges', label: '🪱 Vermifuges' },
                { key: 'rdvs', label: '📅 Rendez-vous' },
                { key: 'poids', label: '⚖️ Historique de poids' },
                { key: 'observations', label: '📋 Observations' },
                { key: 'assurance', label: '🛡️ Assurance' },
                { key: 'budget', label: '💰 Budget total' },
            ];
            const emptyAlimentation = { type: 'croquettes', marque: '', portions: '', frequence: '2 repas/jour', allergies: '', supplements: '', notes: '' };
            const [editAlimentation, setEditAlimentation] = React.useState(false);
            const [alimentationForm, setAlimentationForm] = React.useState(animal.alimentationInfo || emptyAlimentation);
            const [showLostForm, setShowLostForm] = React.useState(false);
            const [lostForm, setLostForm] = React.useState({ mode: 'perdu', dateEvt: new Date().toISOString().split('T')[0], lieuEvt: '', telephone: animal.contactUrgence || '', description: '', photo: '' });
            const [editContact, setEditContact] = React.useState(false);
            const [contactValue, setContactValue] = React.useState(animal.contactUrgence || '');
            const [vetCodeInput, setVetCodeInput] = React.useState('');
            const [vetLookupResult, setVetLookupResult] = React.useState(null);
            const [vetLookupError, setVetLookupError] = React.useState('');
            const [vetLookupLoading, setVetLookupLoading] = React.useState(false);
            const [pendingVetRequests, setPendingVetRequests] = React.useState([]);

            React.useEffect(() => {
                getVideosForAnimal(animal.id).then(list => setVideoCount(list.length)).catch(() => setVideoCount(0));
            }, [animal.id]);

            React.useEffect(() => {
                const q = query(
                    collection(db, 'vetAccessRequests'),
                    where('animalId', '==', animal.id),
                    where('status', '==', 'pending')
                );
                const unsub = onSnapshot(q, (snap) => {
                    setPendingVetRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }, () => setPendingVetRequests([]));
                return () => unsub();
            }, [animal.id]);

            const handleVetRequestAccept = async (req) => {
                try {
                    await updateDoc(doc(db, 'vetAccessRequests', req.id), { status: 'accepted' });
                    const currentVets = animal.authorizedVets || [];
                    const currentNames = animal.authorizedVetsNames || {};
                    saveAnimal({
                        ...animal,
                        authorizedVets: [...currentVets, req.vetUid],
                        authorizedVetsNames: { ...currentNames, [req.vetUid]: `Dr. ${[req.vetPrenom, req.vetNom].filter(Boolean).join(' ')}` },
                    });
                } catch (e) { console.error('Erreur acceptation demande vétérinaire:', e); }
            };

            const handleVetRequestRefuse = async (req) => {
                try {
                    await updateDoc(doc(db, 'vetAccessRequests', req.id), { status: 'refused' });
                } catch (e) { console.error('Erreur refus demande vétérinaire:', e); }
            };

            // Record the share, then open the user's email client with the dossier pre-filled for the vétérinaire
            const handleShare = () => {
                if (email && email.includes('@')) {
                    addAnimalItem(animal, 'partages', { email });
                    const subject = `Dossier santé de ${animal.nom}`;
                    const body = buildDossierEmailBody(animal);
                    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    setEmail('');
                }
            };

            // Enable/disable the public read-only "fiche de garde" link for this animal
            const toggleShare = () => saveAnimal({ ...animal, shareEnabled: !animal.shareEnabled });

            const shareUrl = `${window.location.origin}${window.location.pathname}?share=${animal.id}`;
            const copyShareLink = () => {
                navigator.clipboard.writeText(shareUrl);
                setShareLinkCopied(true);
                setTimeout(() => setShareLinkCopied(false), 2000);
            };

            const lookupVet = async () => {
                const code = vetCodeInput.trim();
                if (!code) return;
                setVetLookupError('');
                setVetLookupResult(null);
                setVetLookupLoading(true);
                try {
                    const snap = await getDoc(doc(db, 'settings', code));
                    if (!snap.exists() || snap.data().role !== 'veterinaire') {
                        setVetLookupError("Code introuvable. Vérifiez le code communiqué par votre vétérinaire.");
                    } else {
                        const d = snap.data();
                        setVetLookupResult({ uid: code, nom: d.nom || '', prenom: d.prenom || '' });
                    }
                } catch (err) {
                    setVetLookupError("Erreur lors de la vérification : " + err.message);
                } finally {
                    setVetLookupLoading(false);
                }
            };

            const addAuthorizedVet = () => {
                if (!vetLookupResult) return;
                const { uid, nom, prenom } = vetLookupResult;
                const currentVets = animal.authorizedVets || [];
                if (currentVets.includes(uid)) {
                    setVetLookupError("Ce vétérinaire est déjà autorisé.");
                    return;
                }
                const currentNames = animal.authorizedVetsNames || {};
                saveAnimal({
                    ...animal,
                    authorizedVets: [...currentVets, uid],
                    authorizedVetsNames: { ...currentNames, [uid]: `Dr. ${[prenom, nom].filter(Boolean).join(' ')}` },
                });
                setVetCodeInput('');
                setVetLookupResult(null);
                setVetLookupError('');
            };

            const removeAuthorizedVet = (uid) => {
                const newVets = (animal.authorizedVets || []).filter(v => v !== uid);
                const newNames = { ...(animal.authorizedVetsNames || {}) };
                delete newNames[uid];
                saveAnimal({ ...animal, authorizedVets: newVets, authorizedVetsNames: newNames });
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />

                    <AnimalProfileCard animal={animal} />

                    {pendingVetRequests.length > 0 && (
                        <div style={{ marginBottom: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '14px 16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#92400e', margin: '0 0 10px' }}>🔔 Demandes d'accès en attente</h4>
                            {pendingVetRequests.map(req => (
                                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #fde68a' }}>
                                    <span style={{ fontSize: '13px', color: '#374151', flex: 1, marginRight: '10px' }}>🩺 Dr. {[req.vetPrenom, req.vetNom].filter(Boolean).join(' ')} demande l'accès au dossier de {animal.nom}</span>
                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                        <button onClick={() => handleVetRequestAccept(req)} style={{ padding: '5px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>✅ Autoriser</button>
                                        <button onClick={() => handleVetRequestRefuse(req)} style={{ padding: '5px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>❌ Refuser</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {DOSSIER_GROUPS.map(group => {
                        const cards = DOSSIER_CARDS.filter(c => c.group === group);
                        return (
                            <div key={group}>
                                <p style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '18px 4px 8px' }}>{group}</p>
                                <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    {cards.map((card, i) => {
                                        const status = getDossierCardStatus(animal, card.id, videoCount);
                                        const spaceIdx = card.label.indexOf(' ');
                                        const emoji = card.label.slice(0, spaceIdx);
                                        const text = card.label.slice(spaceIdx + 1);
                                        const pill = getDossierStatusPillStyle(status);
                                        return (
                                            <div
                                                key={card.id}
                                                onClick={() => setActiveTab(card.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', borderBottom: i < cards.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}
                                            >
                                                <div style={{ width: '36px', height: '36px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0, background: DOSSIER_CARD_BG[card.color] || '#f3f4f6', color: card.color }}>{emoji}</div>
                                                <div style={{ flex: 1, fontWeight: '600', fontSize: '14px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</div>
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '999px', textAlign: 'right', maxWidth: '45%', ...pill }}>{status.text}</span>
                                                <span style={{ color: '#d1d5db', fontSize: '18px' }}>›</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    <div style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>📤 Partage Vétérinaire</h4>
                        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '10px' }}>Génère un dossier PDF à partager avec le vétérinaire. Choisis les sections à inclure.</p>

                        <button onClick={() => setShowSectionPicker(v => !v)} style={{ width: '100%', marginBottom: '8px', padding: '8px 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>🗂️ Sections à inclure ({Object.values(reportSections).filter(Boolean).length}/{REPORT_SECTION_LABELS.length})</span>
                            <span style={{ color: '#9ca3af' }}>{showSectionPicker ? '▲' : '▼'}</span>
                        </button>

                        {showSectionPicker && (
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden' }}>
                                <div style={{ padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setReportSections(Object.fromEntries(REPORT_SECTION_LABELS.map(l => [l.key, true])))} style={{ fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Tout cocher</button>
                                    <button onClick={() => setReportSections(Object.fromEntries(REPORT_SECTION_LABELS.map(l => [l.key, false])))} style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Tout décocher</button>
                                </div>
                                {REPORT_SECTION_LABELS.map((sec, i) => (
                                    <label key={sec.key} onClick={() => setReportSections(s => ({ ...s, [sec.key]: !s[sec.key] }))} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', background: reportSections[sec.key] ? '#f0fdf4' : 'white' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: reportSections[sec.key] ? 'none' : '2px solid #d1d5db', background: reportSections[sec.key] ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {reportSections[sec.key] && <span style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{sec.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        <button onClick={() => openDossierReport(animal, reportSections)} style={{ width: '100%', marginBottom: '8px', padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🖨️ Générer le dossier PDF</button>
                        {(animal.partages && animal.partages.length > 0) ? (
                            animal.partages.map(p => (
                                <div key={p.id} style={{ fontSize: '13px', padding: '6px', background: '#f0fdf4', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>✉️ {p.email}</span>
                                    <button onClick={() => deleteAnimalItem(animal, 'partages', p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                                </div>
                            ))
                        ) : (
                            <p style={{ fontSize: '13px', color: '#9ca3af' }}>Aucun partage</p>
                        )}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email vétérinaire" style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }} />
                            <button onClick={handleShare} style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📧 Partager</button>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>🔗 Fiche de garde</h4>
                        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Générez un lien (ou QR code) en lecture seule avec les infos essentielles de {animal.nom} (vaccins, traitements, poids, alimentation…), à partager avec un pet-sitter, un proche ou un vétérinaire — sans connexion requise.</p>
                        <button onClick={toggleShare} style={{ width: '100%', padding: '8px 12px', background: animal.shareEnabled ? '#fee2e2' : '#10b981', color: animal.shareEnabled ? '#ef4444' : 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                            {animal.shareEnabled ? '🔒 Désactiver le partage' : '🔗 Activer le partage'}
                        </button>
                        {animal.shareEnabled && (
                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                    <ShareQRCode size={140} value={shareUrl} />
                                </div>
                                <button onClick={copyShareLink} style={{ padding: '8px 12px', background: shareLinkCopied ? '#d1fae5' : '#f3f4f6', color: shareLinkCopied ? '#10b981' : '#374151', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                    {shareLinkCopied ? '✅ Lien copié !' : '🔗 Copier le lien'}
                                </button>
                            </div>
                        )}
                        <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>📞 Contact si trouvé / perdu</span>
                                <button onClick={() => { setContactValue(animal.contactUrgence || ''); setEditContact(v => !v); }} style={{ padding: '3px 10px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    {editContact ? 'Annuler' : (animal.contactUrgence ? '✏️' : '➕ Ajouter')}
                                </button>
                            </div>
                            {editContact ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="tel" placeholder="Ex : 06 12 34 56 78" value={contactValue} onChange={e => setContactValue(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                    <button onClick={() => { saveAnimal({ ...animal, contactUrgence: contactValue }); setEditContact(false); }} style={{ padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>💾</button>
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: animal.contactUrgence ? '#111827' : '#9ca3af' }}>{animal.contactUrgence || 'Non renseigné — requis pour l\'étiquette collier'}</p>
                            )}
                        </div>
                        {animal.shareEnabled && (
                            <button onClick={() => openCollarTagReport(animal, shareUrl)} style={{ width: '100%', marginTop: '10px', padding: '8px 12px', background: '#111827', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🏷️ Générer l'étiquette collier (QR code)</button>
                        )}
                    </div>

                    <div style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>🩺 Accès vétérinaire</h4>
                        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>Autorisez un vétérinaire abonné à consulter et compléter le carnet de santé de {animal.nom}. Demandez-lui son code vétérinaire.</p>

                        {(animal.authorizedVets || []).length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                                {(animal.authorizedVets || []).map(uid => (
                                    <div key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#047857' }}>✅ {(animal.authorizedVetsNames || {})[uid] || uid}</span>
                                        <button onClick={() => removeAuthorizedVet(uid)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Révoquer</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input type="text" placeholder="Code vétérinaire" value={vetCodeInput}
                                onChange={e => { setVetCodeInput(e.target.value); setVetLookupResult(null); setVetLookupError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter') lookupVet(); }}
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }} />
                            <button onClick={lookupVet} disabled={vetLookupLoading || !vetCodeInput.trim()} style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: (!vetCodeInput.trim() || vetLookupLoading) ? 0.6 : 1 }}>
                                {vetLookupLoading ? '…' : 'Vérifier'}
                            </button>
                        </div>

                        {vetLookupError && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>{vetLookupError}</p>}

                        {vetLookupResult && (
                            <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#047857' }}>🩺 {vetLookupResult.prenom} {vetLookupResult.nom}</span>
                                <button onClick={addAuthorizedVet} style={{ padding: '6px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Autoriser</button>
                            </div>
                        )}
                    </div>

                    {(() => {
                        const a = animal.assurance || {};
                        const renewalWarning = (() => {
                            if (!a.dateFin) return null;
                            const days = Math.ceil((new Date(a.dateFin) - new Date()) / 86400000);
                            return days >= 0 && days <= 30 ? days : null;
                        })();
                        return (
                            <div style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>🛡️ Assurance animale</h4>
                                    <button onClick={() => { setAssuranceForm(animal.assurance || emptyAssurance); setEditAssurance(e => !e); }} style={{ padding: '4px 10px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                        {editAssurance ? 'Annuler' : (a.compagnie ? '✏️ Modifier' : '➕ Ajouter')}
                                    </button>
                                </div>
                                {renewalWarning !== null && (
                                    <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
                                        ⚠️ Renouvellement dans {renewalWarning} jour{renewalWarning !== 1 ? 's' : ''} !
                                    </div>
                                )}
                                {editAssurance ? (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        <input type="text" placeholder="Compagnie d\'assurance" value={assuranceForm.compagnie} onChange={e => setAssuranceForm(f => ({ ...f, compagnie: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <input type="text" placeholder="N° de contrat" value={assuranceForm.numeroContrat} onChange={e => setAssuranceForm(f => ({ ...f, numeroContrat: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <input type="tel" placeholder="Téléphone assistance" value={assuranceForm.telephone} onChange={e => setAssuranceForm(f => ({ ...f, telephone: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Début contrat</label>
                                                <input type="date" value={assuranceForm.dateDebut} onChange={e => setAssuranceForm(f => ({ ...f, dateDebut: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Fin / renouvellement</label>
                                                <input type="date" value={assuranceForm.dateFin} onChange={e => setAssuranceForm(f => ({ ...f, dateFin: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <input type="number" placeholder="Franchise (€)" value={assuranceForm.franchise} onChange={e => setAssuranceForm(f => ({ ...f, franchise: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                            <input type="number" placeholder="Plafond annuel (€)" value={assuranceForm.plafondAnnuel} onChange={e => setAssuranceForm(f => ({ ...f, plafondAnnuel: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        </div>
                                        <textarea placeholder="Notes (garanties, exclusions...)" value={assuranceForm.notes} onChange={e => setAssuranceForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} />
                                        <button onClick={() => { saveAnimal({ ...animal, assurance: assuranceForm }); setEditAssurance(false); }} style={{ padding: '9px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>💾 Enregistrer</button>
                                    </div>
                                ) : a.compagnie ? (
                                    <div style={{ fontSize: '13px', display: 'grid', gap: '4px' }}>
                                        <p><strong>Compagnie :</strong> {a.compagnie}</p>
                                        {a.numeroContrat && <p><strong>N° contrat :</strong> {a.numeroContrat}</p>}
                                        {a.telephone && <p><strong>Tél :</strong> <a href={`tel:${a.telephone}`} style={{ color: '#10b981' }}>{a.telephone}</a></p>}
                                        {a.dateDebut && <p><strong>Du</strong> {formatDate(a.dateDebut)}{a.dateFin ? <span> <strong>au</strong> {formatDate(a.dateFin)}</span> : ''}</p>}
                                        {a.franchise && <p><strong>Franchise :</strong> {a.franchise} €</p>}
                                        {a.plafondAnnuel && <p><strong>Plafond :</strong> {a.plafondAnnuel} €/an</p>}
                                        {a.notes && <p style={{ color: '#6b7280', fontStyle: 'italic' }}>{a.notes}</p>}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>Aucune assurance enregistrée. Cliquez sur "Ajouter" pour saisir les informations de votre contrat.</p>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── Fiche alimentation ── */}
                    {(() => {
                        const al = animal.alimentationInfo || {};
                        const typeLabels = { croquettes: '🥣 Croquettes', patee: '🥩 Pâtée', mixte: '🥣🥩 Mixte', barf: '🥩 BARF / cru', maison: '🍳 Fait maison', autre: '🍽️ Autre' };
                        return (
                            <div style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>🍽️ Alimentation</h4>
                                    <button onClick={() => { setAlimentationForm(animal.alimentationInfo || emptyAlimentation); setEditAlimentation(v => !v); }} style={{ padding: '4px 10px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                        {editAlimentation ? 'Annuler' : (al.marque || al.type ? '✏️ Modifier' : '➕ Ajouter')}
                                    </button>
                                </div>
                                {editAlimentation ? (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Type d'alimentation</label>
                                            <select value={alimentationForm.type} onChange={e => setAlimentationForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                                                <option value="croquettes">🥣 Croquettes</option>
                                                <option value="patee">🥩 Pâtée</option>
                                                <option value="mixte">🥣🥩 Mixte (croquettes + pâtée)</option>
                                                <option value="barf">🥩 BARF / alimentation crue</option>
                                                <option value="maison">🍳 Fait maison</option>
                                                <option value="autre">🍽️ Autre</option>
                                            </select>
                                        </div>
                                        <input type="text" placeholder="Marque / produit (ex : Royal Canin Adult)" value={alimentationForm.marque} onChange={e => setAlimentationForm(f => ({ ...f, marque: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <input type="text" placeholder="Portions (ex : 200g matin + 200g soir)" value={alimentationForm.portions} onChange={e => setAlimentationForm(f => ({ ...f, portions: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <input type="text" placeholder="Fréquence (ex : 2 repas/jour)" value={alimentationForm.frequence} onChange={e => setAlimentationForm(f => ({ ...f, frequence: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <input type="text" placeholder="Allergies / intolérances alimentaires" value={alimentationForm.allergies} onChange={e => setAlimentationForm(f => ({ ...f, allergies: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <input type="text" placeholder="Compléments / suppléments (ex : oméga-3, probiotiques)" value={alimentationForm.supplements} onChange={e => setAlimentationForm(f => ({ ...f, supplements: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                        <textarea placeholder="Notes (régime vétérinaire, transition alimentaire...)" value={alimentationForm.notes} onChange={e => setAlimentationForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} />
                                        <button onClick={() => { saveAnimal({ ...animal, alimentationInfo: alimentationForm }); setEditAlimentation(false); }} style={{ padding: '9px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>💾 Enregistrer</button>
                                    </div>
                                ) : (al.marque || al.type) ? (
                                    <div style={{ fontSize: '13px', display: 'grid', gap: '4px' }}>
                                        {al.type && <p><strong>Type :</strong> {typeLabels[al.type] || al.type}</p>}
                                        {al.marque && <p><strong>Marque :</strong> {al.marque}</p>}
                                        {al.portions && <p><strong>Portions :</strong> {al.portions}</p>}
                                        {al.frequence && <p><strong>Fréquence :</strong> {al.frequence}</p>}
                                        {al.allergies && <p style={{ color: '#dc2626', fontWeight: '600' }}>🚫 Allergies : {al.allergies}</p>}
                                        {al.supplements && <p><strong>Compléments :</strong> {al.supplements}</p>}
                                        {al.notes && <p style={{ color: '#6b7280', fontStyle: 'italic' }}>{al.notes}</p>}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>Aucune information d'alimentation. Cliquez sur "Ajouter" pour renseigner le régime de {animal.nom}.</p>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── Affiche animal perdu / trouvé ── */}
                    <div style={{ marginTop: '20px', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>🔍 Affiche « Animal perdu / trouvé »</h4>
                        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '10px' }}>Génère une affiche A4 imprimable avec photo, QR code et numéro de contact.</p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <button onClick={() => setLostForm(f => ({ ...f, mode: 'perdu' }))} style={{ flex: 1, padding: '9px', background: lostForm.mode === 'perdu' ? '#dc2626' : '#f3f4f6', color: lostForm.mode === 'perdu' ? 'white' : '#374151', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>🔍 PERDU</button>
                            <button onClick={() => setLostForm(f => ({ ...f, mode: 'trouve' }))} style={{ flex: 1, padding: '9px', background: lostForm.mode === 'trouve' ? '#16a34a' : '#f3f4f6', color: lostForm.mode === 'trouve' ? 'white' : '#374151', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>✅ TROUVÉ</button>
                        </div>
                        <button onClick={() => setShowLostForm(v => !v)} style={{ width: '100%', padding: '8px 12px', background: lostForm.mode === 'perdu' ? '#fef2f2' : '#f0fdf4', color: lostForm.mode === 'perdu' ? '#dc2626' : '#16a34a', border: `1px solid ${lostForm.mode === 'perdu' ? '#fecaca' : '#bbf7d0'}`, borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{lostForm.mode === 'perdu' ? '🔍 Informations de disparition' : '✅ Informations de découverte'}</span>
                            <span>{showLostForm ? '▲' : '▼'}</span>
                        </button>
                        {showLostForm && (
                            <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>{lostForm.mode === 'perdu' ? 'Perdu(e) le' : 'Trouvé(e) le'}</label>
                                        <input type="date" value={lostForm.dateEvt} onChange={e => setLostForm(f => ({ ...f, dateEvt: e.target.value }))} style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Téléphone à afficher</label>
                                        <input type="tel" placeholder="06 12 34 56 78" value={lostForm.telephone} onChange={e => setLostForm(f => ({ ...f, telephone: e.target.value }))} style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                <input type="text" placeholder={lostForm.mode === 'perdu' ? 'Lieu de disparition (ex : Parc des Halles, Lyon 3e)' : 'Lieu où trouvé(e) (ex : Rue du Commerce, Paris 15e)'} value={lostForm.lieuEvt} onChange={e => setLostForm(f => ({ ...f, lieuEvt: e.target.value }))} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                <textarea placeholder="Signes distinctifs (couleur du pelage, tache, collier, comportement...)" value={lostForm.description} onChange={e => setLostForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ padding: '9px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} />

                                {/* Photo pour l'affiche */}
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#374151' }}>📸 Photo sur l'affiche</div>
                                    <div style={{ padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ flexShrink: 0, width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                                            {(lostForm.photo || animal.photo)
                                                ? <img src={lostForm.photo || animal.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="aperçu" />
                                                : (EMOJIS_ESPECE[animal.espece] || '🐾')}
                                        </div>
                                        <div style={{ flex: 1, display: 'grid', gap: '6px' }}>
                                            {animal.photo && (
                                                <button onClick={() => openCropModal(animal.photo, NaN).then(p => setLostForm(f => ({ ...f, photo: p }))).catch(() => {})} style={{ padding: '7px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>✂️ Rogner la photo de profil</button>
                                            )}
                                            <label style={{ padding: '7px 10px', background: '#f3f4f6', color: '#374151', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'left', display: 'block' }}>
                                                📁 Choisir une autre photo
                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = ev => openCropModal(ev.target.result, NaN).then(p => setLostForm(fm => ({ ...fm, photo: p }))).catch(() => {}); fr.readAsDataURL(f); }} />
                                            </label>
                                            {lostForm.photo && <button onClick={() => setLostForm(f => ({ ...f, photo: '' }))} style={{ padding: '5px 10px', background: 'none', color: '#9ca3af', border: 'none', fontSize: '11px', cursor: 'pointer', textAlign: 'left' }}>↩ Utiliser la photo de profil</button>}
                                        </div>
                                    </div>
                                </div>

                                {!animal.shareEnabled && <p style={{ fontSize: '12px', color: '#9ca3af' }}>💡 Activez le partage (carte "Fiche de garde") pour ajouter un QR code sur l'affiche.</p>}
                                <button onClick={() => openLostPosterReport(animal, lostForm, animal.shareEnabled ? shareUrl : null)} style={{ padding: '10px 16px', background: lostForm.mode === 'perdu' ? '#dc2626' : '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>🖨️ Générer l'affiche {lostForm.mode === 'perdu' ? '"Animal perdu"' : '"Animal trouvé"'}</button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function TraitementSection({ title, emoji, color, items, itemKey, onAdd, onUpdate, onDelete }) {
            const todayStr = new Date().toISOString().split('T')[0];
            const [showForm, setShowForm] = React.useState(false);
            const [nom, setNom] = React.useState('');
            const [dernierTraitement, setDernierTraitement] = React.useState(todayStr);
            const [intervalMois, setIntervalMois] = React.useState(3);

            const calcProchain = (date, mois) => {
                const d = new Date(date);
                d.setMonth(d.getMonth() + parseInt(mois || 1));
                return d.toISOString().split('T')[0];
            };

            const handleAdd = () => {
                if (dernierTraitement) {
                    onAdd({ nom: nom || title, dernierTraitement, intervalMois: parseInt(intervalMois), prochainTraitement: calcProchain(dernierTraitement, intervalMois) });
                    setNom(''); setDernierTraitement(todayStr); setIntervalMois(3); setShowForm(false);
                }
            };

            return (
                <div style={{ marginTop: '32px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color }}>{emoji} {title}</h2>
                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `2px solid ${color}` }}>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <input type="text" placeholder={`Nom du produit (ex. Frontline, Milbemax…)`} value={nom} onChange={e => setNom(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Date du dernier traitement</label>
                                <input type="date" value={dernierTraitement} onChange={e => setDernierTraitement(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Fréquence (tous les X mois)</label>
                                <input type="number" min="1" max="24" value={intervalMois} onChange={e => setIntervalMois(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <p style={{ color: '#9ca3af', fontSize: '12px' }}>Prochain traitement calculé automatiquement : {formatDate(calcProchain(dernierTraitement, intervalMois))}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: color, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '16px', padding: '10px 20px', background: color, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter un traitement
                        </button>
                    )}
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {items && items.length > 0 ? items.map((t, i) => (
                            <div key={t.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <EditableRow
                                    item={t}
                                    color={color}
                                    fields={[
                                        { key: 'nom', label: 'Nom du produit' },
                                        { key: 'dernierTraitement', label: 'Dernier traitement', type: 'date' },
                                        { key: 'intervalMois', label: 'Fréquence (mois)', type: 'number' },
                                        { key: 'prochainTraitement', label: 'Prochain traitement', type: 'date' }
                                    ]}
                                    onSave={(vals) => onUpdate(t.id, vals)}
                                    onDelete={() => onDelete(t.id)}
                                >
                                    <p style={{ fontWeight: '600' }}>{t.nom}</p>
                                    <p style={{ color: '#6b7280', fontSize: '14px' }}>Dernier : {formatDate(t.dernierTraitement)} · Prochain : <strong style={{ color }}>{formatDate(t.prochainTraitement)}</strong></p>
                                    <p style={{ color: '#9ca3af', fontSize: '12px' }}>Tous les {t.intervalMois} mois</p>
                                    <ValidationBadge validePar={t.validePar} />
                                </EditableRow>
                            </div>
                        )) : (
                            <EmptyList emoji="💊" text="Aucun traitement enregistré" hint="Appuyez sur + pour ajouter un médicament" />
                        )}
                    </div>
                </div>
            );
        }

        // Generic row that can switch between a read-only display and an inline edit form for its fields
        function EditableRow({ item, fields, color = '#10b981', onSave, onDelete, children }) {
            const [editing, setEditing] = React.useState(false);
            const [values, setValues] = React.useState({});

            const startEdit = () => {
                const init = {};
                fields.forEach(f => {
                    if (f.type === 'time-array') {
                        init[f.key] = Array.isArray(item[f.key]) && item[f.key].length ? [...item[f.key]] : ['08:00'];
                    } else {
                        init[f.key] = item[f.key] ?? '';
                    }
                });
                setValues(init);
                setEditing(true);
            };

            const handleSave = () => {
                const out = {};
                fields.forEach(f => { out[f.key] = f.type === 'number' ? (parseFloat(values[f.key]) || 0) : values[f.key]; });
                onSave(out);
                setEditing(false);
            };

            if (editing) {
                return (
                    <div style={{ width: '100%' }}>
                        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '8px' }}>
                            {fields.map(f => (
                                <div key={f.key} style={f.fullWidth ? { gridColumn: '1 / -1' } : undefined}>
                                    {f.label && <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>{f.label}</label>}
                                    {f.type === 'select' ? (
                                        <select value={values[f.key]} onChange={e => setValues({ ...values, [f.key]: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }}>
                                            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    ) : f.type === 'textarea' ? (
                                        <textarea value={values[f.key]} onChange={e => setValues({ ...values, [f.key]: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px' }} />
                                    ) : f.type === 'time-array' ? (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {(values[f.key] || ['08:00']).map((h, i) => (
                                                <input key={i} type="time" value={h}
                                                    onChange={e => { const u = [...values[f.key]]; u[i] = e.target.value; setValues({ ...values, [f.key]: u }); }}
                                                    style={{ padding: '8px', border: '1px solid #ec4899', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: '#ec4899' }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <input type={f.type || 'text'} step={f.step} value={values[f.key]} onChange={e => setValues({ ...values, [f.key]: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleSave} style={{ padding: '8px 16px', background: color, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>✅ Enregistrer</button>
                            <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Annuler</button>
                        </div>
                    </div>
                );
            }

            return (
                <React.Fragment>
                    <div style={{ flex: 1 }}>{children}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {onSave && <button onClick={startEdit} style={{ padding: '8px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><EditIcon size={16} /></button>}
                        {onDelete && <button onClick={onDelete} style={{ padding: '8px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><DeleteIcon size={16} /></button>}
                    </div>
                </React.Fragment>
            );
        }

        // Small green pill shown on a medical entry that a subscribed vet added or edited

        function AnimalSwitcher({ animals, selectedAnimal, setSelectedAnimal }) {
            if (!animals || animals.length < 2) return null;
            return (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {animals.map(a => (
                        <button
                            key={a.id}
                            onClick={() => setSelectedAnimal(a.id)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: a.id === selectedAnimal ? '2px solid #10b981' : '1px solid #e5e7eb',
                                background: a.id === selectedAnimal ? '#ecfdf5' : 'white',
                                color: a.id === selectedAnimal ? '#10b981' : '#374151',
                                fontWeight: a.id === selectedAnimal ? '700' : '500',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            <AnimalAvatar animal={a} size={18} /> {a.nom}
                        </button>
                    ))}
                </div>
            );
        }

        // Profile header (photo + name + race/age) shown at the top of each animal tab, as on the Dossier page
        function AnimalProfileCard({ animal }) {
            const age = computeAge(animal.dateNaissance);
            const subtitle = [animal.race, age].filter(Boolean).join(' — ');
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                    <AnimalAvatar animal={animal} size={56} />
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: '700' }}>{animal.nom}</h2>
                        {subtitle && <p style={{ color: '#6b7280', fontSize: '14px' }}>{subtitle}</p>}
                    </div>
                </div>
            );
        }

        function VaccinsTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const [showForm, setShowForm] = React.useState(false);
            const [newVaccin, setNewVaccin] = React.useState({ nom: '', date: todayStr, lot: '', delaiJours: 365 });

            const handleAddVaccin = () => {
                if (newVaccin.nom && newVaccin.date) {
                    const delai = parseInt(newVaccin.delaiJours) || 365;
                    const rappel = new Date(new Date(newVaccin.date).getTime() + delai * 86400000).toISOString().split('T')[0];
                    addAnimalItem(animal, 'vaccins', { nom: newVaccin.nom, date: newVaccin.date, rappel, lot: newVaccin.lot, delaiJours: delai });
                    setNewVaccin({ nom: '', date: todayStr, lot: '', delaiJours: 365 });
                    setShowForm(false);
                }
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {/* Add Vaccin */}
                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #10b981' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter un vaccin</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <select onChange={(e) => { if (e.target.value && e.target.value !== 'autres') setNewVaccin({ ...newVaccin, nom: e.target.value }); }} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                    <option value="">Vaccins courants</option>
                                    {(VACCINS_COURANTS[animal.espece] || []).map(v => <option key={v} value={v}>{v}</option>)}
                                    <option value="autres">Autres</option>
                                </select>
                                <input type="text" placeholder="Nom du vaccin" value={newVaccin.nom} onChange={(e) => setNewVaccin({ ...newVaccin, nom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="date" value={newVaccin.date} onChange={(e) => setNewVaccin({ ...newVaccin, date: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="text" placeholder="N° de lot (facultatif)" value={newVaccin.lot} onChange={(e) => setNewVaccin({ ...newVaccin, lot: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Durée de validité</label>
                                        <select value={newVaccin.delaiJours} onChange={(e) => setNewVaccin({ ...newVaccin, delaiJours: parseInt(e.target.value) })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }}>
                                            <option value={183}>6 mois (183 j)</option>
                                            <option value={365}>1 an (365 j)</option>
                                            <option value={730}>2 ans (730 j)</option>
                                            <option value={1095}>3 ans (1095 j)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Ou délai personnalisé (jours)</label>
                                        <input type="number" min="1" max="3650" value={newVaccin.delaiJours} onChange={(e) => setNewVaccin({ ...newVaccin, delaiJours: parseInt(e.target.value) || 365 })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                                    </div>
                                </div>
                            </div>
                            <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px' }}>Rappel prévu le : {newVaccin.date ? formatDate(new Date(new Date(newVaccin.date).getTime() + (parseInt(newVaccin.delaiJours)||365) * 86400000).toISOString().split('T')[0]) : '–'}</p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAddVaccin} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter un vaccin
                        </button>
                    )}

                    {/* Vaccins List */}
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {animal.vaccins && animal.vaccins.length > 0 ? (
                            animal.vaccins.map((v, i) => (
                                <div key={v.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <EditableRow
                                        item={v}
                                        color="#10b981"
                                        fields={[
                                            { key: 'nom', label: 'Nom du vaccin' },
                                            { key: 'date', label: 'Date du vaccin', type: 'date' },
                                            { key: 'rappel', label: 'Date de rappel', type: 'date' },
                                            { key: 'lot', label: 'N° de lot' }
                                        ]}
                                        onSave={(vals) => updateAnimalItem(animal, 'vaccins', v.id, vals)}
                                        onDelete={() => deleteAnimalItem(animal, 'vaccins', v.id)}
                                    >
                                        <p style={{ fontWeight: '600' }}>{v.nom}</p>
                                        <p style={{ color: '#6b7280', fontSize: '14px' }}>Fait: {formatDate(v.date)}{v.rappel ? ` | Rappel: ${formatDate(v.rappel)}` : ''}</p>
                                        {v.lot && <p style={{ color: '#6b7280', fontSize: '14px' }}>N° de lot : {v.lot}</p>}
                                        <ValidationBadge validePar={v.validePar} />
                                    </EditableRow>
                                </div>
                            ))
                        ) : (
                            <EmptyList emoji="💉" text="Aucun vaccin enregistré" hint="Appuyez sur + pour ajouter le premier vaccin" />
                        )}
                    </div>

                </div>
            );
        }

        // Default dose times for common frequencies (used to pre-fill the time pickers)
        const defaultHeuresPrise = (n) => {
            const f = Math.min(6, Math.max(1, Math.round(parseFloat(n) || 1)));
            const slots = { 1: ['08:00'], 2: ['08:00', '20:00'], 3: ['08:00', '14:00', '20:00'], 4: ['07:00', '11:00', '15:00', '19:00'], 5: ['07:00', '10:00', '13:00', '16:00', '19:00'], 6: ['07:00', '09:00', '11:00', '13:00', '17:00', '21:00'] };
            return slots[f] || ['08:00'];
        };

        function MedicamentsTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const [showForm, setShowForm] = React.useState(false);
            const [newMed, setNewMed] = React.useState({ nom: '', dosage: '', unite: 'mg', frequence: '', duree: '', dateDebut: todayStr });
            const [medHeures, setMedHeures] = React.useState(['08:00']);

            const handleAddMed = () => {
                const { nom, dosage, unite, frequence, duree, dateDebut } = newMed;
                if (nom && dosage && frequence && duree) {
                    const dateFin = new Date(new Date(dateDebut).getTime() + parseInt(duree) * 86400000).toISOString().split('T')[0];
                    addAnimalItem(animal, 'medicaments', { nom, dosage, unite, frequence: `${frequence}x/jour`, duree, dateDebut, dateFin, heures: medHeures });
                    setNewMed({ nom: '', dosage: '', unite: 'mg', frequence: '', duree: '', dateDebut: todayStr });
                    setMedHeures(['08:00']);
                    setShowForm(false);
                }
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {/* Add Medicament */}
                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #ec4899' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter un traitement</h3>
                            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>
                                ⚠️ Saisissez uniquement un médicament <strong>prescrit ou recommandé par votre vétérinaire</strong>. Ne donnez jamais de médicament humain à un animal sans avis vétérinaire — certains sont mortels pour les chats et les chiens (paracétamol, ibuprofène…).
                            </div>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Nom du médicament prescrit par le vétérinaire" value={newMed.nom} onChange={(e) => setNewMed({ ...newMed, nom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                    <input type="number" placeholder="Dosage" value={newMed.dosage} onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                    <select value={newMed.unite} onChange={(e) => setNewMed({ ...newMed, unite: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                        <option>g</option><option>mg</option><option>ml</option><option>UI</option>
                                    </select>
                                </div>
                                <input type="number" placeholder="Fréquence (x/jour)" min="1" step="1" value={newMed.frequence}
                                    onChange={(e) => { setNewMed({ ...newMed, frequence: e.target.value }); setMedHeures(defaultHeuresPrise(e.target.value)); }}
                                    style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                {medHeures.length > 0 && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>⏰ Heures de prise (pour les rappels sur téléphone verrouillé)</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {medHeures.map((h, i) => (
                                                <input key={i} type="time" value={h}
                                                    onChange={(e) => { const u = [...medHeures]; u[i] = e.target.value; setMedHeures(u); }}
                                                    style={{ padding: '8px', border: '1px solid #ec4899', borderRadius: '6px', fontSize: '15px', fontWeight: '600', color: '#ec4899' }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <input type="number" placeholder="Durée (jours)" value={newMed.duree} onChange={(e) => setNewMed({ ...newMed, duree: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="date" value={newMed.dateDebut} onChange={(e) => setNewMed({ ...newMed, dateDebut: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAddMed} style={{ padding: '10px 20px', background: '#ec4899', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter un traitement
                        </button>
                    )}

                    {/* Medicaments List */}
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {animal.medicaments && animal.medicaments.length > 0 ? (
                            animal.medicaments.map((m, i) => {
                                const isActive = m.dateFin ? (todayStr >= m.dateDebut && todayStr <= m.dateFin) : false;
                                return (
                                    <div key={m.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${isActive ? '#ec4899' : '#9ca3af'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <EditableRow
                                            item={m}
                                            color="#ec4899"
                                            fields={[
                                                { key: 'nom', label: 'Nom du médicament', fullWidth: true },
                                                { key: 'dosage', label: 'Dosage' },
                                                { key: 'unite', label: 'Unité', type: 'select', options: ['g', 'mg', 'ml', 'UI'].map(u => ({ value: u, label: u })) },
                                                { key: 'frequence', label: 'Fréquence' },
                                                { key: 'dateDebut', label: 'Date de début', type: 'date' },
                                                { key: 'dateFin', label: 'Date de fin', type: 'date' },
                                                { key: 'heures', label: '⏰ Heures de rappel', type: 'time-array', fullWidth: true },
                                            ]}
                                            onSave={(vals) => updateAnimalItem(animal, 'medicaments', m.id, vals)}
                                            onDelete={() => deleteAnimalItem(animal, 'medicaments', m.id)}
                                        >
                                            <p style={{ fontWeight: '600' }}>{m.nom}</p>
                                            {m.dosage && <p style={{ color: '#6b7280', fontSize: '14px' }}>💊 {m.dosage} {m.unite} • {m.frequence}</p>}
                                            <p style={{ color: '#6b7280', fontSize: '14px' }}>📅 {formatDate(m.dateDebut)}{m.dateFin ? ` → ${formatDate(m.dateFin)}` : ''}</p>
                                            {m.heures && m.heures.length > 0 && isActive && (
                                                <p style={{ color: '#ec4899', fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>⏰ {m.heures.join(' · ')}</p>
                                            )}
                                            {m.dateFin && (
                                                <span style={{ display: 'inline-block', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: isActive ? '#fce7f3' : '#f3f4f6', color: isActive ? '#be185d' : '#6b7280', fontWeight: '600', marginTop: '4px' }}>
                                                    {isActive ? '✅ En cours' : '⏱️ Fini'}
                                                </span>
                                            )}
                                            <ValidationBadge validePar={m.validePar} />
                                        </EditableRow>
                                    </div>
                                );
                            })
                        ) : (
                            <EmptyList emoji="💊" text="Aucun traitement médicamenteux enregistré" hint="Appuyez sur + pour ajouter un traitement" />
                        )}
                    </div>

                    <TraitementSection
                        title="Antiparasitaires"
                        emoji="🦟"
                        color="#7c3aed"
                        items={animal.antiparasitaires}
                        onAdd={item => addAnimalItem(animal, 'antiparasitaires', item)}
                        onUpdate={(id, vals) => updateAnimalItem(animal, 'antiparasitaires', id, vals)}
                        onDelete={id => deleteAnimalItem(animal, 'antiparasitaires', id)}
                    />

                    <TraitementSection
                        title="Vermifuges"
                        emoji="🪱"
                        color="#b45309"
                        items={animal.vermifuges}
                        onAdd={item => addAnimalItem(animal, 'vermifuges', item)}
                        onUpdate={(id, vals) => updateAnimalItem(animal, 'vermifuges', id, vals)}
                        onDelete={id => deleteAnimalItem(animal, 'vermifuges', id)}
                    />
                </div>
            );
        }

        function AlimentTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const [showForm, setShowForm] = React.useState(false);
            const [newAliment, setNewAliment] = React.useState({ nom: '', quantite: '', unite: 'g', horaire: '12:00' });

            const handleAdd = () => {
                if (newAliment.nom && newAliment.quantite) {
                    addAnimalItem(animal, 'aliments', { nom: newAliment.nom, quantite: `${newAliment.quantite} ${newAliment.unite}`, horaire: newAliment.horaire });
                    setNewAliment({ nom: '', quantite: '', unite: 'g', horaire: '12:00' });
                    setShowForm(false);
                }
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #f59e0b' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter un aliment</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Nom de l'aliment" value={newAliment.nom} onChange={(e) => setNewAliment({ ...newAliment, nom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                    <input type="number" placeholder="Quantité" value={newAliment.quantite} onChange={(e) => setNewAliment({ ...newAliment, quantite: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                    <select value={newAliment.unite} onChange={(e) => setNewAliment({ ...newAliment, unite: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                        <option>g</option><option>kg</option><option>ml</option><option>L</option>
                                    </select>
                                </div>
                                <input type="time" value={newAliment.horaire} onChange={(e) => setNewAliment({ ...newAliment, horaire: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter un aliment
                        </button>
                    )}

                    <div style={{ display: 'grid', gap: '12px' }}>
                        {animal.aliments && animal.aliments.length > 0 && (() => {
                            const byTime = {};
                            [...animal.aliments].sort((a, b) => (a.horaire || '00:00').localeCompare(b.horaire || '00:00')).forEach(a => {
                                const h = a.horaire || 'Sans horaire';
                                if (!byTime[h]) byTime[h] = [];
                                byTime[h].push(a);
                            });
                            return (
                                <div style={{ background: 'white', borderRadius: '10px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h4 style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>🗓️ Planning journalier</h4>
                                    {Object.entries(byTime).map(([heure, items]) => (
                                        <div key={heure} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div style={{ minWidth: '54px', textAlign: 'center', background: '#fef3c7', borderRadius: '8px', padding: '4px 6px' }}>
                                                <p style={{ fontSize: '14px', fontWeight: '700', color: '#d97706' }}>{heure}</p>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                {items.map((a, i) => (
                                                    <p key={a.id || i} style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                                                        <strong>{a.nom}</strong>{a.quantite ? ` — ${a.quantite}` : ''}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        {animal.aliments && animal.aliments.length > 0 ? (
                            animal.aliments.map((a, i) => (
                                <div key={a.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <EditableRow
                                        item={a}
                                        color="#f59e0b"
                                        fields={[
                                            { key: 'nom', label: "Nom de l'aliment" },
                                            { key: 'quantite', label: 'Quantité' },
                                            { key: 'horaire', label: 'Horaire', type: 'time' }
                                        ]}
                                        onSave={(vals) => updateAnimalItem(animal, 'aliments', a.id, vals)}
                                        onDelete={() => deleteAnimalItem(animal, 'aliments', a.id)}
                                    >
                                        <p style={{ fontWeight: '600' }}>{a.nom}</p>
                                        <p style={{ color: '#6b7280', fontSize: '14px' }}>{a.quantite} • {a.horaire}</p>
                                    </EditableRow>
                                </div>
                            ))
                        ) : (
                            <EmptyList emoji="🍽️" text="Aucun aliment enregistré" hint="Appuyez sur + pour décrire la ration alimentaire" />
                        )}
                    </div>
                </div>
            );
        }

        function NotesTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];

            const [showForm, setShowForm] = React.useState(false);
            const [type, setType] = React.useState('comportement');
            const [description, setDescription] = React.useState('');
            const [date, setDate] = React.useState(todayStr);
            const [photoBase64, setPhotoBase64] = React.useState('');
            const [audioBase64, setAudioBase64] = React.useState('');
            const [fileError, setFileError] = React.useState('');

            const readPhotoFile = (file) => {
                setFileError('');
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    openCropModal(e.target.result, NaN)
                        .then(cropped => setPhotoBase64(cropped))
                        .catch(() => {});
                };
                reader.onerror = () => setFileError('Impossible de lire cette image.');
                reader.readAsDataURL(file);
            };

            const readAudioFile = (file) => {
                setFileError('');
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    setFileError('Enregistrement trop volumineux (max 5 Mo).');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => setAudioBase64(e.target.result);
                reader.readAsDataURL(file);
            };

            const resetForm = () => {
                setType('comportement');
                setDescription('');
                setDate(todayStr);
                setPhotoBase64('');
                setAudioBase64('');
                setFileError('');
                setShowForm(false);
            };

            const handleAdd = () => {
                if (description || photoBase64 || audioBase64) {
                    addAnimalItem(animal, 'observations', { type, description, date, photo: photoBase64, audio: audioBase64 });
                    resetForm();
                }
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {(() => {
                        const photos = (animal.observations || []).filter(o => o.photo).sort((a, b) => new Date(b.date) - new Date(a.date));
                        if (photos.length === 0) return null;
                        return (
                            <div style={{ background: 'white', borderRadius: '10px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>📷 Galerie photos ({photos.length})</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                                    {photos.map((o, i) => (
                                        <div key={o.id || i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden' }}>
                                            <img
                                                src={o.photo}
                                                alt={o.description || 'Photo'}
                                                onClick={() => window.open(o.photo, '_blank')}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                            />
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', padding: '3px 5px' }}>
                                                <p style={{ color: 'white', fontSize: '9px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description || formatDate(o.date)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #0891b2' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter une observation</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                    {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                                <textarea placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '100px', fontFamily: 'inherit', fontSize: '14px' }} />
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>📸 Ajouter une photo</label>
                                    <input type="file" accept="image/*" onChange={(e) => readPhotoFile(e.target.files[0])} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                                    {photoBase64 && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>✓ Photo sélectionnée (compressée automatiquement)</p>}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>🎙️ Ajouter un audio</label>
                                    <input type="file" accept="audio/*" onChange={(e) => readAudioFile(e.target.files[0])} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                                    {audioBase64 && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>✓ Audio sélectionné</p>}
                                </div>

                                {fileError && <p style={{ color: '#ef4444', fontSize: '13px' }}>{fileError}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={resetForm} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter une observation
                        </button>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {animal.observations && animal.observations.length > 0 ? (
                            [...animal.observations].reverse().map((o, i) => (
                                <div key={o.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #0891b2' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <EditableRow
                                            item={o}
                                            color="#0891b2"
                                            fields={[
                                                { key: 'type', label: 'Type', type: 'select', options: Object.entries(TYPE_LABELS).map(([key, label]) => ({ value: key, label })) },
                                                { key: 'description', label: 'Description', type: 'textarea', fullWidth: true },
                                                { key: 'date', label: 'Date', type: 'date' }
                                            ]}
                                            onSave={(vals) => updateAnimalItem(animal, 'observations', o.id, vals)}
                                            onDelete={() => deleteAnimalItem(animal, 'observations', o.id)}
                                        >
                                            <p style={{ fontWeight: '600' }}>{TYPE_LABELS[o.type] || o.type}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(o.date)}</p>
                                            <ValidationBadge validePar={o.validePar} />
                                        </EditableRow>
                                    </div>
                                    {o.description && <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{o.description}</p>}
                                    {(o.photo || o.audio) && (() => {
                                        const obsText = [
                                            `Animal : ${animal.nom}${animal.espece ? ` (${EMOJIS_ESPECE[animal.espece] || ''} ${animal.espece})` : ''}`,
                                            `Date : ${o.date}`,
                                            `Type : ${(TYPE_LABELS[o.type] || o.type).replace(/^\S+\s/, '')}`,
                                            o.description ? `Observation : ${o.description}` : null,
                                            '',
                                            'Envoyé depuis Carnet Santé PRO'
                                        ].filter(l => l !== null).join('\n');
                                        return (<>
                                        {o.photo && (
                                            <div style={{ marginTop: '12px' }}>
                                                <img src={o.photo} alt="Observation" style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', maxHeight: '300px' }} />
                                                <button
                                                    onClick={() => shareOrDownloadMedia(o.photo, `photo-${animal.nom}-${o.date}`, `Photo — ${animal.nom} (${o.date})`, obsText)}
                                                    style={{ marginTop: '8px', padding: '6px 14px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', width: '100%' }}
                                                >
                                                    {canShareFiles ? '📤 Envoyer cette photo avec le texte (e-mail, messagerie…)' : '⬇️ Télécharger cette photo + ouvrir e-mail'}
                                                </button>
                                            </div>
                                        )}
                                        {o.audio && (
                                            <div style={{ marginTop: '12px' }}>
                                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>🎙️ Enregistrement audio :</p>
                                                <audio controls style={{ width: '100%' }}>
                                                    <source src={o.audio} />
                                                    Votre navigateur ne supporte pas la lecture audio.
                                                </audio>
                                                <button
                                                    onClick={() => shareOrDownloadMedia(o.audio, `audio-${animal.nom}-${o.date}`, `Audio — ${animal.nom} (${o.date})`, obsText)}
                                                    style={{ marginTop: '8px', padding: '6px 14px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', width: '100%' }}
                                                >
                                                    {canShareFiles ? '📤 Envoyer cet audio avec le texte (e-mail, messagerie…)' : '⬇️ Télécharger cet audio + ouvrir e-mail'}
                                            </button>
                                            </div>
                                        )}
                                        </>);
                                    })()}
                                </div>
                            ))
                        ) : (
                            <EmptyList emoji="📝" text="Aucune observation" hint="Appuyez sur + pour noter un comportement ou une anomalie" />
                        )}
                    </div>
                </div>
            );
        }

        // Chronological "life journal": medical events, weight, observations and birthdays in one timeline
        function JournalTab({ animal, animals, selectedAnimal, setSelectedAnimal }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const events = [];

            (animal.vaccins || []).forEach(v => v.date && events.push({ date: v.date, icon: '💉', title: `Vaccin : ${v.nom}` }));
            (animal.chirurgies || []).forEach(c => c.date && events.push({ date: c.date, icon: '🔪', title: c.nom, detail: c.notes }));
            (animal.medicaments || []).forEach(m => m.dateDebut && events.push({ date: m.dateDebut, icon: '💊', title: `Traitement : ${m.nom}` }));
            (animal.poids || []).forEach(p => p.date && events.push({ date: p.date, icon: '⚖️', title: `Pesée : ${p.valeur} kg` }));
            (animal.observations || []).forEach(o => o.date && events.push({
                date: o.date,
                icon: (TYPE_LABELS[o.type] || o.type).split(' ')[0],
                title: (TYPE_LABELS[o.type] || o.type).replace(/^\S+\s/, ''),
                detail: o.description,
                photo: o.photo
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

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>📖 Journal de vie</h2>

                    {events.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {events.map((e, i) => (
                                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '20px', width: '36px', height: '36px', borderRadius: '50%', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{e.icon}</div>
                                        {i < events.length - 1 && <div style={{ flex: 1, width: '2px', background: '#fbcfe8', minHeight: '12px' }} />}
                                    </div>
                                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '12px', flex: 1 }}>
                                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(e.date)}</p>
                                        <p style={{ fontWeight: '700', fontSize: '15px' }}>{e.title}</p>
                                        {e.detail && <p style={{ fontSize: '14px', color: '#374151', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{e.detail}</p>}
                                        {e.photo && <img src={e.photo} alt="" style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', maxHeight: '250px', marginTop: '8px' }} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#9ca3af', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            Aucun souvenir enregistré pour le moment. Ajoutez des vaccins, observations, photos... pour construire l'histoire de {animal.nom} !
                        </p>
                    )}
                </div>
            );
        }

        const CHIRURGIE_COLOR = '#be123c';

        function ChirurgiesTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const [showForm, setShowForm] = React.useState(false);
            const [newChirurgie, setNewChirurgie] = React.useState({ nom: '', date: todayStr, notes: '', photo: '' });

            const handleAdd = () => {
                if (newChirurgie.nom && newChirurgie.date) {
                    addAnimalItem(animal, 'chirurgies', { nom: newChirurgie.nom, date: newChirurgie.date, notes: newChirurgie.notes, photo: newChirurgie.photo });
                    setNewChirurgie({ nom: '', date: todayStr, notes: '', photo: '' });
                    setShowForm(false);
                }
            };

            const sortedDesc = [...(animal.chirurgies || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `2px solid ${CHIRURGIE_COLOR}` }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter une chirurgie / intervention</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Type d'intervention (ex. Stérilisation, Détartrage, Extraction dentaire…)" value={newChirurgie.nom} onChange={(e) => setNewChirurgie({ ...newChirurgie, nom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="date" value={newChirurgie.date} onChange={(e) => setNewChirurgie({ ...newChirurgie, date: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <textarea placeholder="Notes (déroulement, suites opératoires, anesthésie…)" value={newChirurgie.notes} onChange={(e) => setNewChirurgie({ ...newChirurgie, notes: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px' }} />
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>📷 Photo (optionnel)</label>
                                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (!f || !f.type.startsWith('image/')) return; const fr = new FileReader(); fr.onload = (ev) => openCropModal(ev.target.result, NaN).then(cropped => setNewChirurgie(prev => ({ ...prev, photo: cropped }))).catch(() => {}); fr.readAsDataURL(f); }} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                                    {newChirurgie.photo && <img src={newChirurgie.photo} alt="preview" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px' }} />}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: CHIRURGIE_COLOR, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: CHIRURGIE_COLOR, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter une chirurgie / intervention
                        </button>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sortedDesc.length > 0 ? (
                            sortedDesc.map((c, i) => (
                                <div key={c.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${CHIRURGIE_COLOR}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <EditableRow
                                            item={c}
                                            color={CHIRURGIE_COLOR}
                                            fields={[
                                                { key: 'nom', label: "Type d'intervention" },
                                                { key: 'date', label: 'Date', type: 'date' },
                                                { key: 'notes', label: 'Notes', type: 'textarea', fullWidth: true }
                                            ]}
                                            onSave={(vals) => updateAnimalItem(animal, 'chirurgies', c.id, vals)}
                                            onDelete={() => deleteAnimalItem(animal, 'chirurgies', c.id)}
                                        >
                                            <p style={{ fontWeight: '600' }}>{c.nom}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(c.date)}</p>
                                            <ValidationBadge validePar={c.validePar} />
                                        </EditableRow>
                                    </div>
                                    {c.notes && <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{c.notes}</p>}
                                    {c.photo && <img src={c.photo} alt="Intervention" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', marginTop: '8px' }} />}
                                </div>
                            ))
                        ) : (
                            <EmptyList emoji="🔪" text="Aucune chirurgie ou intervention" hint="Appuyez sur + pour enregistrer une intervention" />
                        )}
                    </div>
                </div>
            );
        }

        const DOCUMENT_TYPES = {
            vaccin: '💉 Carnet de vaccination',
            ordonnance: '📝 Ordonnance',
            certificat: '📜 Certificat / Attestation',
            'compte-rendu': '🗒️ Compte-rendu de consultation',
            analyse: '🔬 Analyse / Résultat',
            facture: '🧾 Facture',
            assurance: '🛡️ Assurance / Mutuelle',
            icad: '🪪 I-CAD (identification)',
            adoption: '🏠 Document d\'adoption',
            photo: '📷 Photo importante',
            autres: '📄 Autre document'
        };

        // Owner-only: scan/store documents (vaccination records, prescriptions, certificates...) as compressed photos
        function DocumentsTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const [showForm, setShowForm] = React.useState(false);
            const [type, setType] = React.useState('vaccin');
            const [nom, setNom] = React.useState('');
            const [date, setDate] = React.useState(todayStr);
            const [photoBase64, setPhotoBase64] = React.useState('');
            const [fileError, setFileError] = React.useState('');

            const handlePhoto = (file) => {
                setFileError('');
                if (!file) return;
                if (file.type === 'application/pdf') {
                    readFileAsDataUrl(file, MAX_DOCUMENT_PDF_SIZE, setPhotoBase64,
                        () => setFileError(`PDF trop volumineux (max ${Math.round(MAX_DOCUMENT_PDF_SIZE / 1024)} Ko). Essayez de le compresser ou de photographier les pages.`));
                } else if (file.type.startsWith('image/')) {
                    const fr = new FileReader();
                    fr.onload = (e) => openCropModal(e.target.result, NaN).then(setPhotoBase64).catch(() => {});
                    fr.onerror = () => setFileError('Impossible de lire ce fichier.');
                    fr.readAsDataURL(file);
                } else {
                    setFileError('Format non supporté : choisissez une image ou un PDF.');
                }
            };

            const resetForm = () => {
                setType('vaccin');
                setNom('');
                setDate(todayStr);
                setPhotoBase64('');
                setFileError('');
                setShowForm(false);
            };

            const handleAdd = () => {
                if (photoBase64) {
                    addAnimalItem(animal, 'documents', { type, nom, date, photo: photoBase64 });
                    resetForm();
                }
            };

            const documents = [...(animal.documents || [])].reverse();

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #6366f1' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter un document</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                                <input type="text" placeholder="Description (optionnel)" value={nom} onChange={(e) => setNom(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>📷 Scanner une photo ou 📄 importer un PDF (export depuis le logiciel de votre vétérinaire, max {Math.round(MAX_DOCUMENT_PDF_SIZE / 1024)} Ko)</label>
                                    <input type="file" accept="image/*,application/pdf" onChange={(e) => handlePhoto(e.target.files[0])} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                                    {photoBase64 && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>✓ Document sélectionné{photoBase64.startsWith('data:application/pdf') ? '' : ' (compressé automatiquement)'}</p>}
                                </div>
                                {fileError && <p style={{ color: '#ef4444', fontSize: '13px' }}>{fileError}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={resetForm} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter un document
                        </button>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                        {documents.length > 0 ? (
                            documents.map((d, i) => (
                                <div key={d.id || i} style={{ background: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #6366f1' }}>
                                    {d.photo && (d.photo.startsWith('data:application/pdf')
                                        ? <a href={d.photo} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', height: '160px', background: '#f3f4f6', borderRadius: '6px', marginBottom: '8px', textDecoration: 'none', color: '#6366f1', fontWeight: '600', fontSize: '13px' }}>
                                            <span style={{ fontSize: '40px' }}>📄</span> Ouvrir le PDF
                                        </a>
                                        : <img src={d.photo} alt={d.nom || 'Document'} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />)}
                                    <EditableRow
                                        item={d}
                                        color="#6366f1"
                                        fields={[
                                            { key: 'type', label: 'Type', type: 'select', options: Object.entries(DOCUMENT_TYPES).map(([key, label]) => ({ value: key, label })) },
                                            { key: 'nom', label: 'Description' },
                                            { key: 'date', label: 'Date', type: 'date' }
                                        ]}
                                        onSave={(vals) => updateAnimalItem(animal, 'documents', d.id, vals)}
                                        onDelete={() => deleteAnimalItem(animal, 'documents', d.id)}
                                    >
                                        <p style={{ fontWeight: '600', fontSize: '14px' }}>{DOCUMENT_TYPES[d.type] || d.type}</p>
                                        {d.nom && <p style={{ fontSize: '13px', color: '#374151' }}>{d.nom}</p>}
                                        <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(d.date)}</p>
                                        {d.contenu && <p style={{ fontSize: '13px', color: '#374151', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{d.contenu}</p>}
                                        {d.source === 'veterinaire' && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '3px 8px', background: '#d1fae5', color: '#047857', fontSize: '11px', fontWeight: '700', borderRadius: '999px' }}>
                                                🩺 Émis par Dr. {[d.veterinaire?.prenom, d.veterinaire?.nom].filter(Boolean).join(' ') || 'vétérinaire'}
                                            </span>
                                        )}
                                    </EditableRow>
                                </div>
                            ))
                        ) : (
                            <EmptyList emoji="📄" text="Aucun document enregistré" hint="Appuyez sur + pour ajouter une ordonnance, une facture ou un certificat" />
                        )}
                    </div>
                </div>
            );
        }

        // Owner-only: local video storage (IndexedDB) — videos stay on this device, never synced to the cloud
        function VideosTab({ animal, animals, selectedAnimal, setSelectedAnimal }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const [videos, setVideos] = React.useState([]);
            const [showForm, setShowForm] = React.useState(false);
            const [nom, setNom] = React.useState('');
            const [date, setDate] = React.useState(todayStr);
            const [file, setFile] = React.useState(null);
            const [fileError, setFileError] = React.useState('');
            const [saving, setSaving] = React.useState(false);

            const loadVideos = React.useCallback(() => {
                getVideosForAnimal(animal.id)
                    .then(list => setVideos(list.sort((a, b) => b.id - a.id)))
                    .catch(() => setVideos([]));
            }, [animal.id]);

            React.useEffect(() => { loadVideos(); }, [loadVideos]);

            const formatSize = (bytes) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo` : `${Math.round(bytes / 1024)} Ko`;

            const handleFile = (f) => {
                setFileError('');
                setFile(null);
                if (!f) return;
                if (!f.type.startsWith('video/')) {
                    setFileError('Veuillez choisir un fichier vidéo.');
                    return;
                }
                if (f.size > MAX_VIDEO_SIZE) {
                    setFileError(`Vidéo trop volumineuse (max ${MAX_VIDEO_SIZE / (1024 * 1024)} Mo).`);
                    return;
                }
                setFile(f);
            };

            const resetForm = () => {
                setNom('');
                setDate(todayStr);
                setFile(null);
                setFileError('');
                setShowForm(false);
            };

            const handleAdd = async () => {
                if (!file) return;
                setSaving(true);
                try {
                    await addVideoToDB(animal.id, { nom, date, blob: file, mimeType: file.type });
                    resetForm();
                    loadVideos();
                } catch (e) {
                    setFileError("Impossible d'enregistrer la vidéo (espace de stockage de l'appareil insuffisant ?).");
                } finally {
                    setSaving(false);
                }
            };

            const handleDelete = async (id) => {
                await deleteVideoFromDB(id);
                loadVideos();
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
                        📱 Les vidéos sont enregistrées uniquement sur cet appareil (non synchronisées, non sauvegardées dans le cloud). Si vous changez d'appareil, désinstallez l'application ou videz les données du navigateur, elles seront définitivement perdues.
                    </div>

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #ec4899' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter une vidéo</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Description (optionnel)" value={nom} onChange={(e) => setNom(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>🎥 Choisir une vidéo (max {MAX_VIDEO_SIZE / (1024 * 1024)} Mo)</label>
                                    <input type="file" accept="video/*" capture="environment" onChange={(e) => handleFile(e.target.files[0])} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                                    {file && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>✓ {file.name} ({formatSize(file.size)})</p>}
                                </div>
                                {fileError && <p style={{ color: '#ef4444', fontSize: '13px' }}>{fileError}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} disabled={!file || saving} style={{ padding: '10px 20px', background: '#ec4899', color: 'white', border: 'none', borderRadius: '6px', cursor: (!file || saving) ? 'default' : 'pointer', fontWeight: '600', opacity: (!file || saving) ? 0.6 : 1 }}>
                                    {saving ? 'Enregistrement...' : '➕ Ajouter'}
                                </button>
                                <button onClick={resetForm} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#ec4899', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter une vidéo
                        </button>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                        {videos.length > 0 ? (
                            videos.map(v => (
                                <VideoCard key={v.id} video={v} formatSize={formatSize} onDelete={() => handleDelete(v.id)} />
                            ))
                        ) : (
                            <EmptyList emoji="🎥" text="Aucune vidéo enregistrée sur cet appareil" hint="Les vidéos sont stockées localement — appuyez sur + pour en ajouter une" />
                        )}
                    </div>
                </div>
            );
        }

        // Renders a single locally-stored video, managing its object URL lifecycle
        function VideoCard({ video, formatSize, onDelete }) {
            const [url, setUrl] = React.useState('');

            React.useEffect(() => {
                const objectUrl = URL.createObjectURL(video.blob);
                setUrl(objectUrl);
                return () => URL.revokeObjectURL(objectUrl);
            }, [video.blob]);

            return (
                <div style={{ background: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #ec4899' }}>
                    {url && <video src={url} controls style={{ width: '100%', borderRadius: '6px', marginBottom: '8px', background: '#000' }} />}
                    {video.nom && <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{video.nom}</p>}
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(video.date)} · {formatSize(video.size || video.blob.size)}</p>
                    <button onClick={onDelete} style={{ marginTop: '8px', padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><DeleteIcon size={14} /> Supprimer</button>
                </div>
            );
        }

        function PoidsChart({ poids, objectif }) {
            const sorted = [...poids].sort((a, b) => new Date(a.date) - new Date(b.date));
            if (sorted.length < 2) return null;
            const values = sorted.map(p => p.valeur);
            const allValues = objectif != null ? [...values, objectif] : values;
            const minVal = Math.min(...allValues);
            const maxVal = Math.max(...allValues);
            const range = maxVal - minVal || 1;
            const W = 360, H = 220;
            const padLeft = 48, padRight = 20, padTop = 15, padBottom = 50;
            const chartW = W - padLeft - padRight;
            const chartH = H - padTop - padBottom;
            const t0 = new Date(sorted[0].date).getTime();
            const t1 = new Date(sorted[sorted.length - 1].date).getTime();
            const tRange = t1 - t0 || 1;
            const toX = (dateStr) => padLeft + ((new Date(dateStr).getTime() - t0) / tRange) * chartW;
            const toY = (val) => H - padBottom - ((val - minVal) / range) * chartH;
            const points = sorted.map(p => ({ x: toX(p.date), y: toY(p.valeur), valeur: p.valeur, date: p.date }));
            const polyPts = points.map(p => `${p.x},${p.y}`).join(' ');

            const labelCount = Math.min(5, sorted.length);
            const xLabels = Array.from({ length: labelCount }, (_, i) => {
                const idx = Math.round(i * (sorted.length - 1) / (labelCount - 1 || 1));
                const d = new Date(sorted[idx].date);
                const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
                return { x: toX(sorted[idx].date), label };
            });

            return (
                <div style={{ overflowX: 'auto' }}>
                    <svg width={W} height={H} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', display: 'block' }}>
                        <defs>
                            <linearGradient id="poidsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="#d1d5db" strokeWidth="2" />
                        <line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke="#d1d5db" strokeWidth="2" />
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                            const val = minVal + (maxVal - minVal) * ratio;
                            const y = H - padBottom - ratio * chartH;
                            return (
                                <g key={i}>
                                    <line x1={padLeft - 4} y1={y} x2={padLeft} y2={y} stroke="#d1d5db" strokeWidth="1" />
                                    <text x={padLeft - 6} y={y + 4} fontSize="10" fill="#6b7280" textAnchor="end">{val.toFixed(1)}</text>
                                </g>
                            );
                        })}
                        {xLabels.map((l, i) => (
                            <text key={i} x={l.x} y={H - padBottom + 22} fontSize="10" fill="#6b7280" textAnchor="middle" fontWeight="600">{l.label}</text>
                        ))}
                        <polyline points={polyPts} fill="url(#poidsGrad)" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p, i) => (
                            <g key={i}>
                                <circle cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                                {i === points.length - 1 && (
                                    <text x={p.x} y={p.y - 8} fontSize="11" fill="#10b981" textAnchor="middle" fontWeight="700">{p.valeur} kg</text>
                                )}
                            </g>
                        ))}
                        {objectif != null && (() => {
                            const y = toY(objectif);
                            return (
                                <g>
                                    <line x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,4" />
                                    <text x={W - padRight} y={y - 4} fontSize="10" fill="#f59e0b" textAnchor="end" fontWeight="600">🎯 {objectif} kg</text>
                                </g>
                            );
                        })()}
                    </svg>
                </div>
            );
        }

        function PoidsTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem, saveAnimal }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const [showForm, setShowForm] = React.useState(false);
            const [valeur, setValeur] = React.useState('');
            const [date, setDate] = React.useState(todayStr);
            const [objectif, setObjectif] = React.useState(animal.poidsObjectif ?? '');

            React.useEffect(() => setObjectif(animal.poidsObjectif ?? ''), [animal.id, animal.poidsObjectif]);

            const poids = animal.poids || [];
            const sortedAsc = [...poids].sort((a, b) => new Date(a.date) - new Date(b.date));
            const sortedDesc = [...sortedAsc].reverse();
            const latest = sortedDesc[0];
            const first = sortedAsc[0];

            const handleAdd = () => {
                const val = parseFloat(valeur);
                if (val) {
                    addAnimalItem(animal, 'poids', { valeur: val, date });
                    setValeur('');
                    setDate(todayStr);
                    setShowForm(false);
                }
            };

            const handleSaveObjectif = () => {
                const val = parseFloat(objectif);
                saveAnimal({ ...animal, poidsObjectif: isNaN(val) ? null : val });
            };

            // Progress towards the goal weight, based on the first and most recent measurements
            let progressPct = null;
            if (animal.poidsObjectif != null && first && latest && first.valeur !== animal.poidsObjectif) {
                progressPct = (first.valeur - latest.valeur) / (first.valeur - animal.poidsObjectif) * 100;
                progressPct = Math.max(0, Math.min(100, progressPct));
            }

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {saveAnimal && (
                        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>🎯 Objectif de poids</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <input type="number" step="0.1" placeholder="Poids cible (kg)" value={objectif} onChange={(e) => setObjectif(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', flex: '1', minWidth: '120px' }} />
                                <button onClick={handleSaveObjectif} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>✅ Enregistrer</button>
                            </div>
                        </div>
                    )}

                    {animal.poidsObjectif != null && latest && (
                        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>📊 Progression vers l'objectif ({animal.poidsObjectif} kg)</h4>
                            {Math.abs(latest.valeur - animal.poidsObjectif) < 0.1 ? (
                                <p style={{ color: '#10b981', fontWeight: '600' }}>🎉 Objectif atteint !</p>
                            ) : (
                                <p style={{ color: '#374151', marginBottom: '8px' }}>
                                    Il reste <strong>{Math.abs(latest.valeur - animal.poidsObjectif).toFixed(1)} kg</strong> à {latest.valeur > animal.poidsObjectif ? 'perdre' : 'prendre'} pour atteindre l'objectif.
                                </p>
                            )}
                            {progressPct != null && (
                                <div style={{ background: '#f3f4f6', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                                    <div style={{ background: '#10b981', height: '100%', width: `${progressPct}%`, borderRadius: '6px' }} />
                                </div>
                            )}
                        </div>
                    )}

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #10b981' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter une mesure</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <input type="number" step="0.1" placeholder="Poids (kg)" value={valeur} onChange={(e) => setValeur(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter une mesure
                        </button>
                    )}

                    {poids.length >= 2 && (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '700' }}>📈 Courbe d'évolution</h4>
                            <PoidsChart poids={poids} objectif={animal.poidsObjectif} />
                        </div>
                    )}

                    {poids.length > 0 && (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '6px', textAlign: 'center' }}>
                                <p style={{ color: '#6b7280', fontSize: '11px' }}>Min</p>
                                <p style={{ color: '#10b981', fontWeight: '700' }}>{Math.min(...poids.map(p => p.valeur)).toFixed(1)} kg</p>
                            </div>
                            <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '6px', textAlign: 'center' }}>
                                <p style={{ color: '#6b7280', fontSize: '11px' }}>Moy</p>
                                <p style={{ color: '#10b981', fontWeight: '700' }}>{(poids.reduce((s, p) => s + p.valeur, 0) / poids.length).toFixed(1)} kg</p>
                            </div>
                            <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '6px', textAlign: 'center' }}>
                                <p style={{ color: '#6b7280', fontSize: '11px' }}>Max</p>
                                <p style={{ color: '#10b981', fontWeight: '700' }}>{Math.max(...poids.map(p => p.valeur)).toFixed(1)} kg</p>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sortedDesc.length > 0 ? (
                            sortedDesc.map((p, i) => (
                                <div key={p.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <EditableRow
                                        item={p}
                                        color="#10b981"
                                        fields={[
                                            { key: 'valeur', label: 'Poids (kg)', type: 'number', step: '0.1' },
                                            { key: 'date', label: 'Date', type: 'date' }
                                        ]}
                                        onSave={(vals) => updateAnimalItem(animal, 'poids', p.id, vals)}
                                        onDelete={() => deleteAnimalItem(animal, 'poids', p.id)}
                                    >
                                        <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{p.valeur} kg</h4>
                                        <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(p.date)}</p>
                                        <ValidationBadge validePar={p.validePar} />
                                    </EditableRow>
                                </div>
                            ))
                        ) : (
                            <EmptyList emoji="⚖️" text="Aucune mesure enregistrée" hint="Appuyez sur + pour enregistrer le premier poids" />
                        )}
                    </div>
                </div>
            );
        }

        // Secure messaging thread between the owner and a subscribed vet, stored in the
        // animals/{animalId}/messages subcollection. Shared between the owner app and VetApp:
        // currentRole/authorProfile determine which side ("proprietaire" or "veterinaire") is speaking.
        function MessagesTab({ animal, animals, selectedAnimal, setSelectedAnimal, db, currentRole, authorProfile }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const [messages, setMessages] = React.useState([]);
            const [text, setText] = React.useState('');
            const [photoBase64, setPhotoBase64] = React.useState('');
            const [fileError, setFileError] = React.useState('');
            const [sending, setSending] = React.useState(false);
            const bottomRef = React.useRef(null);

            React.useEffect(() => {
                const q = query(collection(db, 'animals', animal.id, 'messages'), orderBy('date'));
                const unsub = onSnapshot(q, (snap) => {
                    setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }, (err) => setFileError("Erreur lors du chargement des messages : " + err.message));
                return () => unsub();
            }, [animal.id]);

            React.useEffect(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, [messages]);

            const handlePhoto = (file) => {
                setFileError('');
                if (!file || !file.type.startsWith('image/')) return;
                const fr = new FileReader();
                fr.onload = (e) => openCropModal(e.target.result, NaN).then(setPhotoBase64).catch(() => {});
                fr.onerror = () => setFileError('Impossible de lire ce fichier.');
                fr.readAsDataURL(file);
            };

            const handleSend = async () => {
                if (!text.trim() && !photoBase64) return;
                setSending(true);
                setFileError('');
                try {
                    await addDoc(collection(db, 'animals', animal.id, 'messages'), {
                        from: currentRole,
                        authorUid: authorProfile?.userId || '',
                        authorNom: authorProfile?.nom || '',
                        authorPrenom: authorProfile?.prenom || '',
                        text: text.trim(),
                        photo: photoBase64 || null,
                        date: new Date().toISOString(),
                    });
                    setText('');
                    setPhotoBase64('');
                } catch (err) {
                    setFileError("Erreur lors de l'envoi : " + err.message);
                } finally {
                    setSending(false);
                }
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '12px', minHeight: '260px', maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {messages.length === 0 ? (
                            <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', margin: 'auto' }}>
                                Aucun message pour le moment. Posez une question {currentRole === 'proprietaire' ? 'au vétérinaire' : 'au propriétaire'}, avec une photo si besoin.
                            </p>
                        ) : messages.map(m => {
                            const mine = m.from === currentRole;
                            const authorName = [m.authorPrenom, m.authorNom].filter(Boolean).join(' ');
                            return (
                                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                    <div style={{ background: mine ? '#10b981' : '#f3f4f6', color: mine ? 'white' : '#1f2937', borderRadius: '12px', padding: '10px 14px', fontSize: '14px' }}>
                                        {!mine && (
                                            <p style={{ fontWeight: '700', fontSize: '12px', marginBottom: '4px', color: m.from === 'veterinaire' ? '#059669' : '#374151' }}>
                                                {m.from === 'veterinaire' ? `🩺 Dr. ${authorName || 'Vétérinaire'}` : (authorName || 'Propriétaire')}
                                            </p>
                                        )}
                                        {m.text && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.text}</p>}
                                        {m.photo && <img src={m.photo} alt="Pièce jointe" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: m.text ? '8px' : 0 }} />}
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 6px 0', textAlign: mine ? 'right' : 'left' }}>{(m.date?.toDate ? m.date.toDate() : new Date(m.date)).toLocaleString('fr-FR')}</p>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    {fileError && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>{fileError}</p>}

                    {photoBase64 && (
                        <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
                            <img src={photoBase64} alt="Aperçu" style={{ maxHeight: '100px', borderRadius: '8px' }} />
                            <button onClick={() => setPhotoBase64('')} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontWeight: '700' }}>×</button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <label style={{ padding: '10px', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer', fontSize: '18px' }}>
                            📎
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhoto(e.target.files[0])} />
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Écrire un message…"
                            style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'none', minHeight: '44px', fontFamily: 'inherit', fontSize: '14px' }}
                        />
                        <button onClick={handleSend} disabled={sending || (!text.trim() && !photoBase64)} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', opacity: (sending || (!text.trim() && !photoBase64)) ? 0.5 : 1 }}>
                            Envoyer
                        </button>
                    </div>
                </div>
            );
        }

        function PlanningTab({ animal, animals, selectedAnimal, setSelectedAnimal, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const [showForm, setShowForm] = React.useState(false);
            const [newRdv, setNewRdv] = React.useState({ date: todayStr, heure: '', motif: '', lieu: '', recurrence: 'aucune', notesConsultation: '' });

            const handleAdd = () => {
                if (newRdv.date && newRdv.motif) {
                    addAnimalItem(animal, 'rdvs', { ...newRdv });
                    setNewRdv({ date: todayStr, heure: '', motif: '', lieu: '', recurrence: 'aucune', notesConsultation: '' });
                    setShowForm(false);
                }
            };

            const rdvs = animal.rdvs || [];
            const sorted = [...rdvs].sort((a, b) => `${a.date}T${a.heure || '00:00'}`.localeCompare(`${b.date}T${b.heure || '00:00'}`));
            const now = new Date();
            const upcoming = sorted.filter(r => new Date(`${r.date}T${r.heure || '00:00'}`) >= now);
            const past = sorted.filter(r => new Date(`${r.date}T${r.heure || '00:00'}`) < now).reverse();

            const renderRdv = (r) => {
                const c = getCountdown(r.date);
                return (
                    <div key={r.id} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <EditableRow
                            item={r}
                            color="#10b981"
                            fields={[
                                { key: 'motif', label: 'Motif' },
                                { key: 'date', label: 'Date', type: 'date' },
                                { key: 'heure', label: 'Heure', type: 'time' },
                                { key: 'lieu', label: 'Lieu' },
                                { key: 'recurrence', label: 'Récurrence', type: 'select', options: [{value:'aucune',label:'Aucune'},{value:'mensuelle',label:'Mensuelle'},{value:'trimestrielle',label:'Trimestrielle'},{value:'semestrielle',label:'Semestrielle'},{value:'annuelle',label:'Annuelle'}] },
                                { key: 'notesConsultation', label: 'Notes / check-list', type: 'textarea' }
                            ]}
                            onSave={(vals) => updateAnimalItem(animal, 'rdvs', r.id, vals)}
                            onDelete={() => deleteAnimalItem(animal, 'rdvs', r.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <p style={{ fontWeight: '600' }}>{r.motif}</p>
                                {c && <span style={{ fontSize: '13px', fontWeight: '700', color: c.color, background: `${c.color}1a`, padding: '2px 10px', borderRadius: '12px' }}>{c.label}</span>}
                            </div>
                            <p style={{ color: '#6b7280', fontSize: '14px' }}>📅 {formatDate(r.date)}{r.heure ? ` à ${r.heure}` : ''}</p>
                            {r.lieu && <p style={{ color: '#6b7280', fontSize: '14px' }}>📍 {r.lieu}</p>}
                            {r.recurrence && r.recurrence !== 'aucune' && <p style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>🔁 {r.recurrence.charAt(0).toUpperCase() + r.recurrence.slice(1)}</p>}
                            {r.notesConsultation && <p style={{ color: '#374151', fontSize: '13px', marginTop: '4px', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>✅ {r.notesConsultation}</p>}
                        </EditableRow>
                    </div>
                );
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #10b981' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter un rendez-vous</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <input type="text" placeholder="Motif (ex : Vaccination, Consultation...)" value={newRdv.motif} onChange={(e) => setNewRdv({ ...newRdv, motif: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <input type="date" value={newRdv.date} onChange={(e) => setNewRdv({ ...newRdv, date: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                    <input type="time" value={newRdv.heure} onChange={(e) => setNewRdv({ ...newRdv, heure: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                </div>
                                <input type="text" placeholder="Lieu (ex : Clinique Saint-Germain)" value={newRdv.lieu} onChange={(e) => setNewRdv({ ...newRdv, lieu: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <select value={newRdv.recurrence} onChange={(e) => setNewRdv({ ...newRdv, recurrence: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                    <option value="aucune">Pas de récurrence</option>
                                    <option value="mensuelle">Mensuelle</option>
                                    <option value="trimestrielle">Tous les 3 mois</option>
                                    <option value="semestrielle">Tous les 6 mois</option>
                                    <option value="annuelle">Annuelle</option>
                                </select>
                                <textarea placeholder="✅ Check-list / notes de consultation (optionnel)" value={newRdv.notesConsultation} onChange={(e) => setNewRdv({ ...newRdv, notesConsultation: e.target.value })} rows={3} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical', fontSize: '14px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowForm(true)} style={{ marginBottom: '20px', padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            ➕ Ajouter un rendez-vous
                        </button>
                    )}

                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>À venir</h3>
                    {upcoming.length > 0 ? upcoming.map(renderRdv) : (
                        <EmptyList emoji="📅" text="Aucun rendez-vous à venir" hint="Appuyez sur + pour planifier un rendez-vous vétérinaire" />
                    )}

                    {past.length > 0 && (
                        <React.Fragment>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', color: '#9ca3af' }}>Passés</h3>
                            <div style={{ opacity: 0.6 }}>
                                {past.map(renderRdv)}
                            </div>
                        </React.Fragment>
                    )}
                </div>
            );
        }

        function BudgetTab({ animal, animals, budgetFilter, setBudgetFilter, getFilteredBudget, addAnimalItem, deleteAnimalItem, updateAnimalItem }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const todayStr = new Date().toISOString().split('T')[0];
            const CATEGORIES = ['Vétérinaire', 'Alimentation', 'Médicaments', 'Toilettage', 'Jouets', 'Accessoires', 'Autres'];
            const CATEGORY_EMOJIS = { 'Vétérinaire': '🏥', 'Alimentation': '🍎', 'Médicaments': '💊', 'Toilettage': '🛁', 'Jouets': '🎾', 'Accessoires': '🛠️', 'Autres': '➕' };

            const [showForm, setShowForm] = React.useState(false);
            const [type, setType] = React.useState('Vétérinaire');
            const [montant, setMontant] = React.useState('');
            const [date, setDate] = React.useState(todayStr);
            const [budgetAnimalFilter, setBudgetAnimalFilter] = React.useState('tous');

            const exportCSV = (entries, titleSuffix) => {
                const rows = [
                    ['Date', 'Animal', 'Catégorie', 'Montant (€)'],
                    ...entries.map(b => [b.date, b.animalNom, b.type, b.montant.toFixed(2)])
                ];
                const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = `budget-${titleSuffix.replace(/[^a-z0-9]/gi, '-')}-${todayStr}.csv`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };

            const handleAdd = () => {
                const m = parseFloat(montant);
                if (type && m) {
                    addAnimalItem(animal, 'budget', { type, montant: m, date });
                    setMontant('');
                    setDate(todayStr);
                    setShowForm(false);
                }
            };

            // Tag every expense with its animal so they can be combined and sorted by animal
            const taggedEntries = (a) => getFilteredBudget(a.budget || []).map(b => ({ ...b, animalId: a.id, animalNom: a.nom, animalEmoji: EMOJIS_ESPECE[a.espece] || '🐾' }));
            const allEntries = animals.flatMap(taggedEntries);
            const entries = budgetAnimalFilter === 'tous' ? allEntries : allEntries.filter(b => b.animalId === budgetAnimalFilter);
            const total = entries.reduce((s, b) => s + b.montant, 0);
            const perAnimalTotals = animals
                .map(a => ({ id: a.id, nom: a.nom, emoji: EMOJIS_ESPECE[a.espece] || '🐾', total: taggedEntries(a).reduce((s, b) => s + b.montant, 0) }))
                .filter(t => t.total > 0)
                .sort((a, b) => b.total - a.total);

            const filteredAnimal = animals.find(a => a.id === budgetAnimalFilter);
            const titleSuffix = budgetAnimalFilter === 'tous' ? 'de tous mes animaux' : `de ${filteredAnimal ? filteredAnimal.nom : animal.nom}`;

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>💰 Budget {titleSuffix}</h2>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Trier par animal :</span>
                        <select value={budgetAnimalFilter} onChange={(e) => setBudgetAnimalFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                            <option value="tous">🐾 Tous les animaux</option>
                            {animals.map(a => <option key={a.id} value={a.id}>{EMOJIS_ESPECE[a.espece] || '🐾'} {a.nom}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {['tout', 'semaine', 'mois', 'annee'].map(filter => (
                            <button key={filter} onClick={() => setBudgetFilter(filter)} style={{ padding: '8px 12px', background: budgetFilter === filter ? '#10b981' : '#e5e7eb', color: budgetFilter === filter ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                {filter === 'tout' ? 'Tout' : filter === 'semaine' ? 'Cette semaine' : filter === 'mois' ? 'Ce mois' : 'Cette année'}
                            </button>
                        ))}
                    </div>

                    {showForm ? (
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #f59e0b' }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Ajouter une dépense</h3>
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {c}</option>)}
                                </select>
                                <input type="number" step="0.01" placeholder="Montant (€)" value={montant} onChange={(e) => setMontant(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleAdd} style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                                ➕ Ajouter une dépense
                            </button>
                            {entries.length > 0 && (
                                <button onClick={() => exportCSV(entries, titleSuffix)} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                                    📊 Exporter CSV
                                </button>
                            )}
                        </div>
                    )}

                    {entries.length > 0 && (
                        <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ color: '#92400e', fontSize: '13px' }}>Total {titleSuffix}</p>
                            <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#b45309' }}>{total.toFixed(2)}€</h3>
                        </div>
                    )}

                    {budgetAnimalFilter === 'tous' && perAnimalTotals.length > 1 && (
                        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Répartition par animal</h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {perAnimalTotals.map(t => (
                                    <div key={t.id} onClick={() => setBudgetAnimalFilter(t.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', cursor: 'pointer' }}>
                                        <span style={{ fontSize: '13px' }}>{t.emoji} {t.nom}</span>
                                        <strong style={{ fontSize: '14px', color: '#f59e0b' }}>{t.total.toFixed(2)}€</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {entries.length > 1 && (() => {
                        const byCategory = {};
                        entries.forEach(b => { byCategory[b.type] = (byCategory[b.type] || 0) + b.montant; });
                        const cats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
                        const maxCat = cats[0]?.[1] || 1;
                        return (
                            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '14px', marginBottom: '16px' }}>📊 Répartition par catégorie</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {cats.map(([cat, total]) => (
                                        <div key={cat}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '600' }}>{CATEGORY_EMOJIS[cat] || '➕'} {cat}</span>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#d97706' }}>{total.toFixed(2)} €</span>
                                            </div>
                                            <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                                <div style={{ background: '#f59e0b', height: '100%', width: `${(total / maxCat) * 100}%`, borderRadius: '4px', transition: 'width 0.3s' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {entries.length === 0 ? (
                            <EmptyList emoji="💰" text="Aucune dépense enregistrée" hint="Appuyez sur + pour ajouter une dépense vétérinaire" />
                        ) : (
                            [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map((b, i) => (
                                <div key={b.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <EditableRow
                                        item={b}
                                        color="#f59e0b"
                                        fields={[
                                            { key: 'type', label: 'Catégorie', type: 'select', options: CATEGORIES.map(c => ({ value: c, label: `${CATEGORY_EMOJIS[c]} ${c}` })) },
                                            { key: 'montant', label: 'Montant (€)', type: 'number', step: '0.01' },
                                            { key: 'date', label: 'Date', type: 'date' }
                                        ]}
                                        onSave={(vals) => updateAnimalItem(animals.find(a => a.id === b.animalId) || animal, 'budget', b.id, vals)}
                                        onDelete={() => deleteAnimalItem(animals.find(a => a.id === b.animalId) || animal, 'budget', b.id)}
                                    >
                                        <p style={{ fontWeight: '600' }}>{CATEGORY_EMOJIS[b.type] || ''} {b.type}{budgetAnimalFilter === 'tous' && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: '4px' }}>{b.animalEmoji} {b.animalNom}</span>}</p>
                                        <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(b.date)}</p>
                                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', marginTop: '4px' }}>{b.montant.toFixed(2)}€</p>
                                    </EditableRow>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        function CalendrierTab({ animals }) {
            const now = new Date();
            const [ym, setYm] = React.useState({ year: now.getFullYear(), month: now.getMonth() });
            const { year, month } = ym;
            const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
            const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
            const [filterAnimalId, setFilterAnimalId] = React.useState(null);

            const monthName = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startOffset = (firstDay.getDay() + 6) % 7;
            const totalCells = startOffset + lastDay.getDate();
            const cells = Array.from({ length: Math.ceil(totalCells / 7) * 7 });

            const visibleAnimals = filterAnimalId ? animals.filter(a => a.id === filterAnimalId) : animals;

            const eventsByDate = {};
            visibleAnimals.forEach((animal, ai) => {
                const globalIdx = animals.findIndex(a => a.id === animal.id);
                const color = COLORS[globalIdx % COLORS.length];
                const emoji = EMOJIS_ESPECE[animal.espece] || '🐾';
                const addEvent = (date, label, type) => {
                    if (!date) return;
                    const key = date.slice(0, 10);
                    if (!eventsByDate[key]) eventsByDate[key] = [];
                    eventsByDate[key].push({ label, color, emoji, animalNom: animal.nom, animalPhoto: animal.photo || null, type });
                };
                (animal.vaccins || []).forEach(v => addEvent(v.prochaineDate, v.nom, '💉'));
                (animal.antiparasitaires || []).forEach(a => addEvent(a.prochainTraitement, a.nom, '🦟'));
                (animal.vermifuges || []).forEach(v => addEvent(v.prochainTraitement, v.nom, '🪱'));
                (animal.rdvs || []).forEach(r => addEvent(r.date, r.motif, '🏥'));
                (animal.medicaments || []).filter(m => m.prochaineDate).forEach(m => addEvent(m.prochaineDate, m.nom, '💊'));
            });

            const todayStr = now.toISOString().slice(0, 10);
            const [selectedDay, setSelectedDay] = React.useState(null);

            const prevMonth = () => setYm(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 });
            const nextMonth = () => setYm(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 });

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>📆 Calendrier multi-animaux</h2>

                    {/* ── Pastilles filtre animaux ── */}
                    {animals.length > 1 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                            <div onClick={() => setFilterAnimalId(null)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', background: filterAnimalId === null ? '#1f2937' : '#f3f4f6', color: filterAnimalId === null ? 'white' : '#6b7280', border: filterAnimalId === null ? '2px solid #1f2937' : '2px solid transparent', transition: 'all 0.15s' }}>
                                Tous
                            </div>
                            {animals.map((a, i) => {
                                const col = COLORS[i % COLORS.length];
                                const active = filterAnimalId === a.id;
                                return (
                                    <div key={a.id} onClick={() => setFilterAnimalId(active ? null : a.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '4px 12px 4px 4px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', background: active ? col : col + '18', color: active ? 'white' : col, border: `2px solid ${active ? col : col + '55'}`, transition: 'all 0.15s' }}>
                                        {a.photo
                                            ? <img src={a.photo} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${active ? 'white' : col}`, flexShrink: 0 }} />
                                            : <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.3)' : col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{EMOJIS_ESPECE[a.espece] || '🐾'}</span>
                                        }
                                        {a.nom}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <button onClick={prevMonth} style={{ padding: '6px 14px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}>‹</button>
                        <span style={{ fontWeight: '700', fontSize: '15px', textTransform: 'capitalize' }}>{monthName}</span>
                        <button onClick={nextMonth} style={{ padding: '6px 14px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}>›</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                        {JOURS.map(j => <div key={j} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#9ca3af', padding: '4px 0' }}>{j}</div>)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {cells.map((_, i) => {
                            const dayNum = i - startOffset + 1;
                            if (dayNum < 1 || dayNum > lastDay.getDate()) return <div key={i} />;
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const events = eventsByDate[dateStr] || [];
                            const isToday = dateStr === todayStr;
                            const isSelected = selectedDay === dateStr;
                            return (
                                <div key={i} onClick={() => setSelectedDay(isSelected ? null : dateStr)} style={{ minHeight: '52px', padding: '4px', background: isSelected ? '#d1fae5' : isToday ? '#ecfdf5' : 'white', border: isToday ? '2px solid #10b981' : '1px solid #f3f4f6', borderRadius: '6px', cursor: events.length ? 'pointer' : 'default', position: 'relative' }}>
                                    <span style={{ fontSize: '12px', fontWeight: isToday ? '700' : '500', color: isToday ? '#10b981' : '#374151' }}>{dayNum}</span>
                                    <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        {events.slice(0, 2).map((ev, ei) => (
                                            <div key={ei} style={{ fontSize: '10px', background: ev.color + '22', color: ev.color, borderRadius: '3px', padding: '1px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>{ev.type} {ev.label}</div>
                                        ))}
                                        {events.length > 2 && <div style={{ fontSize: '10px', color: '#9ca3af' }}>+{events.length - 2}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedDay && eventsByDate[selectedDay] && (
                        <div style={{ marginTop: '16px', background: 'white', padding: '14px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>
                                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h4>
                            {eventsByDate[selectedDay].map((ev, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < eventsByDate[selectedDay].length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    {ev.animalPhoto
                                        ? <img src={ev.animalPhoto} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${ev.color}`, flexShrink: 0 }} />
                                        : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: ev.color + '22', border: `2px solid ${ev.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{ev.emoji}</div>
                                    }
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{ev.type} {ev.label}</div>
                                        <div style={{ fontSize: '12px', color: ev.color, fontWeight: '600' }}>{ev.animalNom}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pastilles légende si un seul animal (pas de filtre affiché) */}
                    {animals.length === 1 && (
                        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {animals.map((a, i) => {
                                const col = COLORS[i % COLORS.length];
                                return (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '4px 12px 4px 4px', borderRadius: '20px', background: col + '18', border: `1.5px solid ${col}44`, color: col, fontWeight: '600' }}>
                                        {a.photo
                                            ? <img src={a.photo} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${col}`, flexShrink: 0 }} />
                                            : <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{EMOJIS_ESPECE[a.espece] || '🐾'}</span>
                                        }
                                        {a.nom}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        function VoyageTab({ animal, animals, selectedAnimal, setSelectedAnimal, saveAnimal }) {
            if (!animal) return <div style={{ padding: '20px' }}>Sélectionnez un animal</div>;

            const [destination, setDestination] = React.useState(animal.voyageDestination || 'france');
            const [notes, setNotes] = React.useState(animal.voyageNotes || '');
            const [checked, setChecked] = React.useState(animal.voyageChecked || {});
            const [saved, setSaved] = React.useState(false);

            const LISTES = {
                france: [
                    { id: 'carnet', label: 'Carnet de santé / carnet vaccinal', requis: true },
                    { id: 'puce', label: 'Puce électronique (identification)', requis: true },
                    { id: 'traitements', label: 'Médicaments en cours avec ordonnance', requis: false },
                    { id: 'vaccin_rage', label: 'Vaccin rage à jour', requis: false },
                    { id: 'antiparasitaire', label: 'Antiparasitaire récent (puces/tiques)', requis: false },
                    { id: 'gamelle', label: 'Gamelles eau et nourriture', requis: false },
                    { id: 'litiere', label: 'Litière / coussin / cage de transport', requis: false },
                    { id: 'jouets', label: 'Jouets et accessoires familiers', requis: false },
                    { id: 'urgences', label: 'Numéro vétérinaire de garde', requis: false },
                ],
                europe: [
                    { id: 'passeport', label: 'Passeport européen pour animaux', requis: true },
                    { id: 'puce', label: 'Puce électronique ISO 11784/11785', requis: true },
                    { id: 'vaccin_rage', label: 'Vaccin antirabique en cours de validité', requis: true },
                    { id: 'attestation_sante', label: 'Certificat sanitaire (selon pays)', requis: false },
                    { id: 'traitements', label: 'Médicaments + ordonnances traduits si besoin', requis: false },
                    { id: 'antiparasitaire', label: 'Traitement antiparasitaire (règlement PETS)', requis: false },
                    { id: 'assurance', label: 'Assurance voyage animaux', requis: false },
                    { id: 'gamelle', label: 'Gamelles et nourriture habituelle', requis: false },
                    { id: 'transport', label: 'Cage de transport homologuée (avion/train)', requis: false },
                ],
                international: [
                    { id: 'passeport', label: 'Passeport européen pour animaux', requis: true },
                    { id: 'puce', label: 'Puce ISO 11784/11785', requis: true },
                    { id: 'vaccin_rage', label: 'Vaccin antirabique + test sérologique si requis', requis: true },
                    { id: 'attestation_sante', label: 'Certificat sanitaire officiel visé (TRACES)', requis: true },
                    { id: 'traitement_parasites', label: 'Traitement antiparasitaire documenté', requis: true },
                    { id: 'permis_import', label: 'Permis d\'importation du pays de destination', requis: true },
                    { id: 'traitements', label: 'Médicaments + ordonnances traduits', requis: false },
                    { id: 'assurance', label: 'Assurance voyage internationale animaux', requis: false },
                    { id: 'transport', label: 'Transport homologué (cage IATA)', requis: false },
                    { id: 'urgences', label: 'Vétérinaires locaux (destination)', requis: false },
                ],
            };

            const items = LISTES[destination] || LISTES.france;
            const doneCount = items.filter(it => checked[it.id]).length;
            const pct = Math.round((doneCount / items.length) * 100);

            const toggle = (id) => setChecked(c => ({ ...c, [id]: !c[id] }));

            const handleSave = () => {
                saveAnimal({ ...animal, voyageDestination: destination, voyageNotes: notes, voyageChecked: checked });
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            };

            const openVoyageReport = () => {
                const destLabel = destination === 'france' ? '🇫🇷 France' : destination === 'europe' ? '🇪🇺 Europe' : '🌍 International';
                const generatedDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                const win = window.open('', '_blank');
                if (!win) return;
                const rowsHtml = items.map(it => `
                    <tr>
                        <td style="padding:8px 10px;width:28px;text-align:center">${checked[it.id] ? '<span style="color:#10b981;font-size:16px;font-weight:700">✓</span>' : '<span style="color:#d1d5db;font-size:16px">○</span>'}</td>
                        <td style="padding:8px 10px;font-size:14px;color:${checked[it.id] ? '#9ca3af' : '#1f2937'};text-decoration:${checked[it.id] ? 'line-through' : 'none'}">${escapeHtml(it.label)}</td>
                        <td style="padding:8px 10px;text-align:right">${it.requis ? '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;padding:2px 6px;border-radius:4px">REQUIS</span>' : ''}</td>
                    </tr>`).join('');
                win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiche voyage — ${escapeHtml(animal.nom)}</title>
                    <style>
                        body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 700px; margin: 0 auto; }
                        h1 { color: #10b981; margin-bottom: 4px; }
                        h2 { margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; font-size: 16px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        tr:nth-child(even) { background: #f9fafb; }
                        .stamp { font-size: 12px; color: #9ca3af; margin-bottom: 16px; }
                        .notes { background: #f9fafb; border-radius: 8px; padding: 14px; font-size: 14px; white-space: pre-wrap; margin-top: 8px; }
                        .progress { height: 10px; background: #e5e7eb; border-radius: 5px; margin: 12px 0; }
                        .progress-bar { height: 100%; background: ${pct === 100 ? '#10b981' : '#3b82f6'}; border-radius: 5px; width: ${pct}%; }
                        .print-btn { padding: 10px 18px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-bottom: 20px; }
                        @media print { .print-btn { display: none; } }
                    </style></head>
                    <body>
                        <button class="print-btn" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
                        <p class="stamp">Généré le ${generatedDate}</p>
                        <h1>✈️ Fiche voyage — ${escapeHtml(animal.nom)}</h1>
                        <table style="margin:8px 0 16px;border-collapse:collapse;width:100%">
                            <tr>
                                <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;white-space:nowrap">Animal</td>
                                <td style="padding:6px 0;font-size:14px;font-weight:700">${escapeHtml(EMOJIS_ESPECE[animal.espece] || '')} ${escapeHtml(animal.nom)}${animal.espece ? ' — ' + escapeHtml(animal.espece) : ''}${animal.race ? ' (' + escapeHtml(animal.race) + ')' : ''}</td>
                            </tr>
                            ${animal.sexe ? `<tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#6b7280">Sexe</td><td style="padding:4px 0;font-size:14px">${animal.sexe === 'male' ? 'Mâle' : 'Femelle'}${animal.sterilise ? ' (stérilisé/castré)' : ''}</td></tr>` : ''}
                            ${animal.dateNaissance ? `<tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#6b7280">Né(e) le</td><td style="padding:4px 0;font-size:14px">${escapeHtml(formatDate(animal.dateNaissance))}</td></tr>` : ''}
                            ${animal.identifiant ? `<tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#6b7280">Identifiant</td><td style="padding:4px 0;font-size:14px;font-family:monospace">${escapeHtml(animal.identifiant)}</td></tr>` : ''}
                            <tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#6b7280">Destination</td><td style="padding:4px 0;font-size:14px;font-weight:600">${destLabel}</td></tr>
                        </table>
                        <h2>Check-list de préparation</h2>
                        <div class="progress"><div class="progress-bar"></div></div>
                        <p style="font-size:13px;color:#6b7280">${doneCount} / ${items.length} éléments — ${pct}%</p>
                        <table>${rowsHtml}</table>
                        ${notes ? `<h2>📝 Notes de voyage</h2><div class="notes">${escapeHtml(notes)}</div>` : ''}
                    </body></html>`);
                win.document.close();
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
                    <AnimalSwitcher animals={animals} selectedAnimal={selectedAnimal} setSelectedAnimal={setSelectedAnimal} />
                    <AnimalProfileCard animal={animal} />

                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>✈️ Fiche voyage</h3>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {[['france','🇫🇷 France'],['europe','🇪🇺 Europe'],['international','🌍 International']].map(([val, lbl]) => (
                            <button key={val} onClick={() => { setDestination(val); setChecked(animal.voyageChecked || {}); }}
                                style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', background: destination === val ? '#10b981' : '#f3f4f6', color: destination === val ? 'white' : '#374151' }}>
                                {lbl}
                            </button>
                        ))}
                    </div>

                    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                            <span>Préparation</span>
                            <span style={{ color: pct === 100 ? '#10b981' : '#374151' }}>{doneCount}/{items.length} — {pct}%</span>
                        </div>
                        <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#3b82f6', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>

                        {items.map(it => (
                            <div key={it.id} onClick={() => toggle(it.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: checked[it.id] ? 'none' : '2px solid #d1d5db', background: checked[it.id] ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {checked[it.id] && <span style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>✓</span>}
                                </div>
                                <span style={{ flex: 1, fontSize: '14px', color: checked[it.id] ? '#9ca3af' : '#374151', textDecoration: checked[it.id] ? 'line-through' : 'none' }}>{it.label}</span>
                                {it.requis && <span style={{ fontSize: '10px', fontWeight: '700', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>REQUIS</span>}
                            </div>
                        ))}
                    </div>

                    {pct === 100 && (
                        <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
                            ✅ Tout est prêt pour le voyage !
                        </div>
                    )}

                    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>📝 Notes de voyage</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Coordonnées vétérinaire sur place, adresse hébergement, allergies, comportement en voiture..." rows={4} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button onClick={handleSave} style={{ padding: '12px', background: saved ? '#d1fae5' : '#10b981', color: saved ? '#10b981' : 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            {saved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
                        </button>
                        <button onClick={openVoyageReport} style={{ padding: '12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            🖨️ Imprimer / PDF
                        </button>
                    </div>
                </div>
            );
        }

        function UrgencesTab({ setActiveTab }) {
            const [openSection, setOpenSection] = React.useState(null);
            const toggle = (key) => setOpenSection(openSection === key ? null : key);

            const URGENCES_VILLES = [
                { ville: 'Paris / Île-de-France', cliniques: [
                    { nom: 'EnvA Alfort — Urgences chiens/chats/NAC', tel: '01 43 96 72 72', horaires: '24h/24, 7j/7', adresse: '7 av. du Général de Gaulle, 94700 Maisons-Alfort' },
                    { nom: 'Clinique Urgences Vétérinaires — Maisons-Alfort', tel: '01 48 45 94 59', horaires: 'Nuits + WE + jours fériés', adresse: '199 Av. de la République, 94700 Maisons-Alfort' },
                    { nom: 'UCVet Paris 20e', tel: '01 71 19 70 10', horaires: '24h/24, 7j/7', adresse: '54 rue Stendhal, 75020 Paris' },
                    { nom: 'Vet\'in Paris 11e', tel: '01 43 07 01 06', horaires: '24h/24, 7j/7', adresse: '89 rue du Faubourg Saint-Antoine, 75011 Paris' },
                    { nom: 'Dr. Le Bail — 15e', tel: '01 45 31 30 98', horaires: '24h/24, 7j/7', adresse: '24 Rue de l\'Abbé Groult, 75015 Paris' },
                    { nom: 'VetoAdom (à domicile — tout Paris/IDF)', tel: '01 47 46 09 09', horaires: '24h/24, 7j/7', adresse: 'Tout Paris et Île-de-France' },
                ]},
                { ville: 'Lyon', cliniques: [
                    { nom: 'Onlyvet', tel: '04 27 04 00 27', horaires: '24h/24, 7j/7', adresse: '7 rue Jean Zay, 69800 Saint-Priest' },
                ]},
                { ville: 'Marseille', cliniques: [
                    { nom: 'Urgences vétérinaires Marseille', tel: '04 91 13 44 44', horaires: '24h/24, 7j/7', adresse: '227 route des 3 Lucs, 13011 Marseille' },
                ]},
                { ville: 'Montpellier', cliniques: [
                    { nom: 'Urgences vétérinaires Montpellier', tel: '04 48 20 20 28', horaires: '24h/24, 7j/7', adresse: '' },
                ]},
                { ville: 'Toulouse', cliniques: [
                    { nom: 'VET-URGENTYS', tel: '05 61 11 21 31', horaires: '24h/24, 7j/7', adresse: '112 Bd de Suisse, 31200 Toulouse' },
                    { nom: 'Urgences vétérinaires Toulouse', tel: '05 32 09 39 90', horaires: '24h/24, 7j/7', adresse: '' },
                ]},
                { ville: 'Bordeaux', cliniques: [
                    { nom: 'Clinique Alliance Bordeaux', tel: '05 56 39 15 48', horaires: '24h/24, 7j/7', adresse: '8 Boulevard Godard, 33300 Bordeaux' },
                ]},
                { ville: 'Nantes', cliniques: [
                    { nom: 'Clinique Vét. de l\'Arche', tel: '02 40 63 44 44', horaires: '24h/24, 7j/7', adresse: '243 route de Vannes, 44800 Saint-Herblain' },
                ]},
                { ville: 'Strasbourg', cliniques: [
                    { nom: 'Maison des Urgences Vétérinaires', tel: '03 68 71 83 00', horaires: 'Nuits (19h–7h) + WE + jours fériés', adresse: 'Strasbourg (67)' },
                ]},
                { ville: 'Lille', cliniques: [
                    { nom: 'V2TU Lesquin', tel: '03 67 34 08 34', horaires: 'Nuits + WE + jours fériés', adresse: '11 Rue Paul Dubrule, 59810 Lesquin' },
                ]},
                { ville: 'Rennes', cliniques: [
                    { nom: 'V2TU Rennes', tel: '02 99 41 16 46', horaires: 'Nuits + week-ends', adresse: '6 rue du Bourg Nouveau, 35000 Rennes' },
                ]},
                { ville: 'Grenoble', cliniques: [
                    { nom: 'Maison des Urgences Vétérinaires — Échirolles', tel: '04 80 42 33 23', horaires: '19h30–7h30 sem. / 12h+ sam. / 24h/24 dim. & fériés', adresse: '32 rue de Comboire, 38130 Échirolles' },
                ]},
                { ville: 'Rouen', cliniques: [
                    { nom: 'V2TU Tourville-la-Rivière', tel: '02 35 87 94 94', horaires: 'Nuits + WE', adresse: '5 rue Parc en Seine, 76410 Tourville-la-Rivière' },
                ]},
                { ville: 'Clermont-Ferrand', cliniques: [
                    { nom: 'V2TU Clermont', tel: '04 88 60 20 50', horaires: 'Nuits + WE', adresse: '1 rue Roland Moreno, 63100 Clermont-Ferrand' },
                ]},
            ];

            const PREMIERS_SECOURS = [
                { icon: '☠️', type: 'Intoxication / Empoisonnement', steps: [
                    'Appeler immédiatement le CNITV (04 78 87 10 40) ou CAPAE (02 40 68 77 40)',
                    'Conserver l\'emballage du produit ingéré',
                    'NE PAS faire vomir l\'animal sauf instruction expresse d\'un professionnel',
                    'Maintenir l\'animal calme, à l\'écart de la source toxique',
                    'Symptômes d\'alerte : salivation abondante, vomissements, convulsions, difficultés respiratoires',
                ]},
                { icon: '⚡', type: 'Convulsions', steps: [
                    'Dégager l\'espace autour de l\'animal (retirer les objets dangereux)',
                    'NE PAS immobiliser l\'animal, ne rien mettre dans la gueule',
                    'Éloigner les autres animaux',
                    'Noter la durée de la crise',
                    'Appeler le vétérinaire dès la fin de la crise',
                ]},
                { icon: '🩸', type: 'Hémorragie / Saignement', steps: [
                    'Appuyer fermement un linge propre ou compresse sur la plaie',
                    'Maintenir la pression plusieurs minutes sans retirer',
                    'Élever le membre au-dessus du cœur si possible',
                    'Consulter immédiatement si saignement de la bouche, nez, zone génitale ou dans les urines/selles',
                ]},
                { icon: '🌡️', type: 'Coup de chaleur', steps: [
                    'Déplacer immédiatement dans un endroit frais ou climatisé',
                    'Mouiller avec de l\'eau fraîche (PAS glacée)',
                    'Proposer de petites quantités d\'eau à boire',
                    'NE PAS immerger dans l\'eau très froide',
                    'Consulter rapidement même si l\'animal semble récupérer',
                ]},
                { icon: '🦴', type: 'Fracture / Traumatisme', steps: [
                    'Minimiser les mouvements de l\'animal',
                    'Transporter en soutenant avec une serviette ou couverture en hamac',
                    'NE PAS improviser une attelle',
                    'Appeler le vétérinaire ou le 3115 avant de déplacer l\'animal si possible',
                ]},
                { icon: '🫁', type: 'Détresse respiratoire / Étouffement', steps: [
                    'Vérifier les voies aériennes sans enfoncer profondément les doigts',
                    'Si corps étranger visible : tête vers le bas, 4 compressions fermes sur l\'abdomen',
                    'En cas d\'exposition à fumée ou vapeurs : air frais immédiatement',
                    'Appeler le 3115 ou foncer à la clinique d\'urgence',
                ]},
                { icon: '💔', type: 'Inconscience / Arrêt cardiaque', steps: [
                    'Placer l\'animal sur le côté droit, voies aériennes libres',
                    'Vérifier la respiration et le pouls (face interne de la cuisse)',
                    'Si arrêt cardiaque : compressions sur le côté gauche du thorax, 100–120/min',
                    'Bouche-à-museau si nécessaire (former joint étanche autour du museau)',
                    'Appeler le 3115 immédiatement',
                ]},
                { icon: '🚨', type: 'Rétention urinaire (urgence chat)', steps: [
                    'Urgence absolue — notamment chez le chat mâle',
                    'Signes : efforts répétés sans uriner, cris, inconfort, abdomen tendu',
                    'Aller à la clinique d\'urgence SANS ATTENDRE',
                    'Risque vital en quelques heures si non traité',
                ]},
            ];

            const ALIMENTS_DANGEREUX = [
                { nom: 'Chocolat (surtout noir)', risque: 'Toxique chiens et chats — stimulant cardiaque et neurologique. Urgence selon la quantité.', level: 'red' },
                { nom: 'Raisins & raisins secs', risque: 'Insuffisance rénale aiguë, même en petite quantité.', level: 'red' },
                { nom: 'Oignons, ail, ciboulette, poireau', risque: 'Anémie hémolytique (destruction des globules rouges). Danger cuits aussi.', level: 'red' },
                { nom: 'Xylitol (édulcorant "sans sucre")', risque: 'Hypoglycémie grave et insuffisance hépatique. Présent dans chewing-gums, bonbons, certains yaourts.', level: 'red' },
                { nom: 'Pâte crue / levure de boulanger', risque: 'Fermentation dans l\'estomac → alcool + ballonnement dangereux.', level: 'red' },
                { nom: 'Café, thé, boissons énergisantes', risque: 'Caféine : stimulant cardiaque, convulsions.', level: 'red' },
                { nom: 'Alcool', risque: 'Dépression du système nerveux central, hypoglycémie.', level: 'red' },
                { nom: 'Noix de macadamia', risque: 'Faiblesse musculaire, hyperthermie, vomissements.', level: 'orange' },
                { nom: 'Avocat', risque: 'Toxique pour oiseaux, lapins, cochons d\'Inde. Risque digestif chez chien/chat.', level: 'orange' },
                { nom: 'Os cuits (poulet, lapin…)', risque: 'Esquilles tranchantes pouvant perforer l\'intestin.', level: 'orange' },
                { nom: 'Sel en grande quantité', risque: 'Déshydratation, troubles neurologiques.', level: 'orange' },
            ];

            const PLANTES_TOXIQUES = [
                { nom: 'Lys (toutes espèces)', risque: 'MORTEL pour le chat — insuffisance rénale aiguë même par contact avec le pollen.', level: 'red' },
                { nom: 'If (Taxus)', risque: 'Mort rapide par alcaloïdes. Très toxique chiens et chats.', level: 'red' },
                { nom: 'Laurier-rose / Oléandre', risque: 'Cardiotoxique — troubles cardiaques, vomissements, mort possible.', level: 'red' },
                { nom: 'Muguet', risque: 'Vomissements, troubles cardiaques, convulsions.', level: 'red' },
                { nom: 'Cyclamen', risque: 'Diarrhées, vomissements, convulsions, troubles cardiaques.', level: 'red' },
                { nom: 'Azalée / Rhododendron', risque: 'Vomissements, salivation, troubles cardiaques.', level: 'red' },
                { nom: 'Dieffenbachia / Philodendron', risque: 'Brûlures buccales intenses, risque d\'œdème laryngé.', level: 'orange' },
                { nom: 'Ficus', risque: 'Irritations buccales et gastro-intestinales, atteintes rénales.', level: 'orange' },
                { nom: 'Poinsettia (étoile de Noël)', risque: 'Irritations buccales et digestives.', level: 'orange' },
                { nom: 'Aloe vera', risque: 'Vomissements, diarrhées (surtout chez les chats).', level: 'orange' },
            ];

            const lvColor = l => l === 'red' ? '#dc2626' : '#d97706';
            const lvBg = l => l === 'red' ? '#fef2f2' : '#fffbeb';
            const lvBadge = l => l === 'red' ? '⚠️ DANGER' : '⚠️ Attention';

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>🆘 Urgences & Santé</h2>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Numéros d\'urgence, premiers secours et toxiques courants.</p>

                    {/* Numéros d'urgence */}
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 4px 10px' }}>Numéros d\'urgence</p>
                    <a href="tel:3115" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '10px', textDecoration: 'none' }}>
                        <span style={{ fontSize: '28px' }}>🚨</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#dc2626' }}>Vétérinaire de garde — national</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>24h/24 · 7j/7 · gratuit · entrez votre code postal</div>
                        </div>
                        <span style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626' }}>3115</span>
                    </a>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                        <a href="tel:0478871040" style={{ display: 'flex', flexDirection: 'column', gap: '3px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '14px', textDecoration: 'none' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed' }}>☠️ Antipoison — Lyon (CNITV)</span>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#4c1d95' }}>04 78 87 10 40</span>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>8h30–minuit · 7j/7 · gratuit</span>
                        </a>
                        <a href="tel:0240687740" style={{ display: 'flex', flexDirection: 'column', gap: '3px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '14px', textDecoration: 'none' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed' }}>☠️ Antipoison — Nantes (CAPAE)</span>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#4c1d95' }}>02 40 68 77 40</span>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>8h30–minuit · 7j/7 · gratuit</span>
                        </a>
                    </div>

                    {/* Cliniques d'urgence par ville — un seul accordéon */}
                    <div style={{ marginBottom: '8px' }}>
                        <button onClick={() => toggle('cliniques_villes')} style={{ width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: openSection === 'cliniques_villes' ? '10px 10px 0 0' : '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px' }}>🏙️ Cliniques d'urgence par ville <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '12px' }}>({URGENCES_VILLES.length} villes)</span></span>
                            <span style={{ fontSize: '16px', color: '#9ca3af' }}>{openSection === 'cliniques_villes' ? '▲' : '▼'}</span>
                        </button>
                        {openSection === 'cliniques_villes' && (
                            <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', background: 'white' }}>
                                {URGENCES_VILLES.map((g, gi) => (
                                    <div key={g.ville}>
                                        <div style={{ padding: '10px 16px 6px', background: '#f9fafb', borderTop: gi > 0 ? '1px solid #e5e7eb' : 'none' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏙️ {g.ville}</span>
                                        </div>
                                        {g.cliniques.map((c, i) => (
                                            <div key={i} style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                                                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '3px' }}>{c.nom}</div>
                                                {c.adresse ? <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '3px' }}>📍 {c.adresse}</div> : null}
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>🕐 {c.horaires}</div>
                                                <a href={`tel:${c.tel.replace(/\s/g, '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#d1fae5', color: '#059669', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '13px' }}>
                                                    📞 {c.tel}
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Premiers secours */}
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '24px 4px 10px' }}>Premiers secours</p>
                    {PREMIERS_SECOURS.map(ps => (
                        <div key={ps.type} style={{ marginBottom: '8px' }}>
                            <button onClick={() => toggle('ps' + ps.type)} style={{ width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: openSection === 'ps' + ps.type ? '10px 10px 0 0' : '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                                <span style={{ fontWeight: '600', fontSize: '14px' }}>{ps.icon} {ps.type}</span>
                                <span style={{ fontSize: '16px', color: '#9ca3af' }}>{openSection === 'ps' + ps.type ? '▲' : '▼'}</span>
                            </button>
                            {openSection === 'ps' + ps.type && (
                                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px 16px' }}>
                                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                        {ps.steps.map((s, i) => <li key={i} style={{ fontSize: '13px', color: '#374151', marginBottom: '8px', lineHeight: 1.5 }}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Aliments dangereux — accordéon */}
                    <div style={{ marginBottom: '8px' }}>
                        <button onClick={() => toggle('aliments')} style={{ width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: openSection === 'aliments' ? '10px 10px 0 0' : '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px' }}>🍽️ Aliments dangereux <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '12px' }}>({ALIMENTS_DANGEREUX.length} aliments)</span></span>
                            <span style={{ fontSize: '16px', color: '#9ca3af' }}>{openSection === 'aliments' ? '▲' : '▼'}</span>
                        </button>
                        {openSection === 'aliments' && (
                            <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                                {ALIMENTS_DANGEREUX.map((a, i) => (
                                    <div key={a.nom} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', background: lvBg(a.level) }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: lvColor(a.level), marginBottom: '3px' }}>🍽️ {a.nom}</div>
                                                <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.5 }}>{a.risque}</div>
                                            </div>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: lvColor(a.level), whiteSpace: 'nowrap', marginTop: '2px' }}>{lvBadge(a.level)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Plantes toxiques — accordéon */}
                    <div style={{ marginBottom: '24px' }}>
                        <button onClick={() => toggle('plantes')} style={{ width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: openSection === 'plantes' ? '10px 10px 0 0' : '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px' }}>🌿 Plantes toxiques <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '12px' }}>({PLANTES_TOXIQUES.length} plantes)</span></span>
                            <span style={{ fontSize: '16px', color: '#9ca3af' }}>{openSection === 'plantes' ? '▲' : '▼'}</span>
                        </button>
                        {openSection === 'plantes' && (
                            <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                                {PLANTES_TOXIQUES.map((p, i) => (
                                    <div key={p.nom} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', background: lvBg(p.level) }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: lvColor(p.level), marginBottom: '3px' }}>🌿 {p.nom}</div>
                                                <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.5 }}>{p.risque}</div>
                                            </div>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: lvColor(p.level), whiteSpace: 'nowrap', marginTop: '2px' }}>{lvBadge(p.level)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                        Sources : Ordre National des Vétérinaires · CNITV · CAPAE-Ouest · SantéVet
                    </p>
                </div>
            );
        }

        function VeterinairesTab({ animals, saveAnimal }) {
            const [userPos, setUserPos] = React.useState(null);
            const [geoStatus, setGeoStatus] = React.useState('idle'); // idle | loading | done | error
            const [geoError, setGeoError] = React.useState('');
            const [nearbyVets, setNearbyVets] = React.useState(null);
            const [vetsSource, setVetsSource] = React.useState(null); // 'cnov' | 'osm' | null
            const [vetsStatus, setVetsStatus] = React.useState('idle'); // idle | loading | done | error
            const [vetsError, setVetsError] = React.useState('');

            const applyVetsResult = (coords, found, source) => {
                const withDist = found
                    .map(v => ({ ...v, distanceKm: v.lat != null ? getDistanceKm(coords.lat, coords.lng, v.lat, v.lng) : null }))
                    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
                setNearbyVets(withDist);
                setVetsSource(source);
                setVetsStatus('done');
            };

            const locateMe = () => {
                if (!navigator.geolocation) {
                    setGeoStatus('error');
                    setGeoError("La géolocalisation n\'est pas disponible sur cet appareil.");
                    return;
                }

                // Reuse cached position if less than 10 minutes old
                try {
                    const cached = JSON.parse(localStorage.getItem('geoCache') || 'null');
                    if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
                        const coords = { lat: cached.lat, lng: cached.lng };
                        setUserPos(coords);
                        setGeoStatus('done');
                        setNearbyVets(null);
                        setVetsStatus('loading');
                        setVetsError('');
                        fetchNearbyVets(coords.lat, coords.lng)
                            .then(({ results, source }) => applyVetsResult(coords, results, source))
                            .catch(() => { setVetsStatus('error'); setVetsError("Impossible de récupérer les vétérinaires à proximité pour le moment. Voici une sélection d\'exemple en attendant."); });
                        return;
                    }
                } catch (e) {}

                setGeoStatus('loading');
                setGeoError('');
                setNearbyVets(null);
                setVetsStatus('idle');
                setVetsError('');
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        try { localStorage.setItem('geoCache', JSON.stringify({ lat: coords.lat, lng: coords.lng, ts: Date.now() })); } catch (e) {}
                        setUserPos(coords);
                        setGeoStatus('done');
                        setVetsStatus('loading');
                        try {
                            const { results, source } = await fetchNearbyVets(coords.lat, coords.lng);
                            applyVetsResult(coords, results, source);
                        } catch (err) {
                            console.error('Erreur recherche vétérinaires à proximité:', err);
                            setVetsStatus('error');
                            setVetsError("Impossible de récupérer les vétérinaires à proximité pour le moment. Voici une sélection d\'exemple en attendant.");
                        }
                    },
                    (err) => {
                        setGeoStatus('error');
                        setGeoError(err.code === err.PERMISSION_DENIED
                            ? "Localisation refusée : activez la géolocalisation de votre appareil (paramètres de localisation/GPS du téléphone) et autorisez ce site à accéder à votre position, puis réessayez."
                            : "Impossible de récupérer votre position pour le moment. Vérifiez que la géolocalisation est activée sur votre appareil.");
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            };

            const usingRealVets = nearbyVets !== null && nearbyVets.length > 0;
            const vets = usingRealVets
                ? nearbyVets
                : (userPos
                    ? VETERINAIRES
                        .map(v => ({ ...v, distanceKm: getDistanceKm(userPos.lat, userPos.lng, v.lat, v.lng) }))
                        .sort((a, b) => a.distanceKm - b.distanceKm)
                    : VETERINAIRES);

            // Toggle whether this animal's "vétérinaire habituel" is the given vet
            const toggleVetAssignment = (animal, vet) => {
                const isAssigned = animal.veterinaire && animal.veterinaire.id === vet.id;
                saveAnimal({ ...animal, veterinaire: isAssigned ? null : { id: vet.id, nom: vet.nom } });
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>🏥 Vétérinaires</h2>

                    <EmergencyVetButton />

                    <div style={{ marginBottom: '20px' }}>
                        <button onClick={locateMe} disabled={geoStatus === 'loading'} style={{ width: '100%', padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: geoStatus === 'loading' ? 'default' : 'pointer', fontWeight: '600', opacity: geoStatus === 'loading' ? 0.7 : 1 }}>
                            {geoStatus === 'loading' ? '📍 Localisation en cours…' : '📍 Me géolocaliser pour trouver les vétérinaires autour de moi'}
                        </button>
                        {geoStatus === 'error' && (
                            <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px' }}>
                                <p style={{ margin: '0 0 6px', fontWeight: '700', color: '#dc2626', fontSize: '14px' }}>⚠️ Localisation impossible</p>
                                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#7f1d1d', lineHeight: 1.5 }}>{geoError}</p>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <button onClick={locateMe} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                        🔄 Réessayer
                                    </button>
                                    <a href="https://www.google.com/maps/search/v%C3%A9t%C3%A9rinaire" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}>
                                        🗺️ Rechercher sur Google Maps
                                    </a>
                                </div>
                            </div>
                        )}
                        {geoStatus === 'done' && vetsStatus === 'loading' && <p style={{ marginTop: '8px', fontSize: '13px', color: '#2563eb' }}>🔎 Recherche des vétérinaires autour de votre position…</p>}
                        {geoStatus === 'done' && vetsStatus === 'done' && usingRealVets && (
                            <p style={{ marginTop: '8px', fontSize: '13px', color: '#10b981' }}>
                                {vetsSource === 'cnov'
                                    ? `✅ ${nearbyVets.length} vétérinaire${nearbyVets.length > 1 ? 's' : ''} trouvé${nearbyVets.length > 1 ? 's' : ''} dans votre département (annuaire officiel CNOV)`
                                    : `✅ ${nearbyVets.length} vétérinaire${nearbyVets.length > 1 ? 's' : ''} trouvé${nearbyVets.length > 1 ? 's' : ''} près de chez vous (données OpenStreetMap), triés par proximité`}
                            </p>
                        )}
                        {geoStatus === 'done' && vetsStatus === 'done' && !usingRealVets && <p style={{ marginTop: '8px', fontSize: '13px', color: '#d97706' }}>⚠️ Aucun vétérinaire trouvé autour de votre position. Voici une sélection d\'exemple en attendant.</p>}
                        {geoStatus === 'done' && vetsStatus === 'error' && <p style={{ marginTop: '8px', fontSize: '13px', color: '#d97706' }}>⚠️ {vetsError}</p>}
                    </div>

                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 4px 8px' }}>
                        {usingRealVets && vetsSource === 'cnov' ? 'Annuaire officiel CNOV — ' : ''}À proximité
                    </p>
                    {vets.map(vet => {
                        const distanceText = vet.distanceKm != null ? `${vet.distanceKm.toFixed(1)} km` : vet.distance;
                        const ratingFull = vet.rating ? Math.round(vet.rating) : 0;
                        return (
                            <div key={vet.id} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🏥</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '16px', fontWeight: '700' }}>{vet.nom}</div>
                                        {vet.source === 'cnov' && <span style={{ fontSize: '10px', fontWeight: '700', color: '#7c3aed', background: '#ede9fe', padding: '1px 7px', borderRadius: '999px', marginTop: '3px', display: 'inline-block' }}>🏛️ CNOV</span>}
                                        {vet.rating && (
                                            <div style={{ color: '#f59e0b', fontSize: '13px', marginTop: '2px' }}>
                                                {'★'.repeat(ratingFull)}<span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - ratingFull)}</span> {vet.rating}
                                            </div>
                                        )}
                                    </div>
                                    {distanceText && <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '999px', background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap', flexShrink: 0 }}>{distanceText}</span>}
                                </div>
                                {vet.horaires && <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0' }}>🕐 {vet.horaires}</p>}
                                {vet.adresse && <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0' }}>🏠 {vet.adresse}</p>}
                                {vet.specialites && (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0 12px' }}>
                                        {vet.specialites.map(s => <span key={s} style={{ fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '999px', background: '#ede9fe', color: '#7c3aed' }}>{s}</span>)}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <a
                                        href={vet.lat && vet.lng
                                            ? `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`
                                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vet.nom} ${vet.adresse || ''}`.trim())}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', background: '#e0f2fe', color: '#0369a1' }}
                                    >
                                        🗺️ Itinéraire
                                    </a>
                                    {vet.telephone && (
                                        <a
                                            href={`tel:${vet.telephone.replace(/\s+/g, '')}`}
                                            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', background: '#d1fae5', color: '#059669' }}
                                        >
                                            📞 Appeler
                                        </a>
                                    )}
                                </div>
                                {(animals || []).length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginRight: '2px', whiteSpace: 'nowrap' }}>👤 Vétérinaire de :</span>
                                        {animals.map(animal => {
                                            const active = animal.veterinaire && animal.veterinaire.id === vet.id;
                                            return (
                                                <span
                                                    key={animal.id}
                                                    onClick={() => toggleVetAssignment(animal, vet)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px 4px 5px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid', background: active ? '#d1fae5' : '#f9fafb', color: active ? '#047857' : '#9ca3af', borderColor: active ? '#a7f3d0' : '#e5e7eb' }}
                                                >
                                                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                                                        <AnimalAvatar animal={animal} size={12} />
                                                    </span>
                                                    {animal.nom}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        function RappelsTab({ reminders, sendEmailReminder, animals }) {
            const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
            const [filterAnimalId, setFilterAnimalId] = React.useState(null);

            const allItems = React.useMemo(() => {
                const items = [];
                (animals || []).forEach((animal, ai) => {
                    const animalColor = COLORS[ai % COLORS.length];
                    const add = (type, nom, dateStr) => {
                        const c = getCountdown(dateStr);
                        if (!c) return;
                        items.push({ type, nom, ...c, animal, animalColor });
                    };
                    (animal.vaccins || []).forEach(v => add('vaccin', v.nom, v.rappel || v.date));
                    (animal.medicaments || []).forEach(m => add('medicament', m.nom, m.dateFin));
                    (animal.antiparasitaires || []).forEach(t => add('antiparasitaire', t.nom || 'Antiparasitaire', t.prochainTraitement));
                    (animal.vermifuges || []).forEach(t => add('vermifuge', t.nom || 'Vermifuge', t.prochainTraitement));
                });
                return items.sort((a, b) => a.days - b.days);
            }, [animals]);

            const visible = filterAnimalId ? allItems.filter(e => e.animal.id === filterAnimalId) : allItems;
            const overdue   = visible.filter(e => e.days < 0);
            const thisWeek  = visible.filter(e => e.days >= 0 && e.days <= 7);
            const thisMonth = visible.filter(e => e.days > 7 && e.days <= 30);
            const later     = visible.filter(e => e.days > 30);

            const groupHeaderStyle = { fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '20px 4px 8px' };
            const groupBoxStyle = { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' };
            const rowStyle = (i, n) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: i < n - 1 ? '1px solid #f3f4f6' : 'none' });

            const ReminderRow = ({ e, i, n }) => {
                const info = REMINDER_TYPE_INFO[e.type] || { emoji: '⏰', label: '', color: '#6b7280' };
                return (
                    <div style={rowStyle(i, n)}>
                        {e.animal.photo
                            ? <img src={e.animal.photo} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${e.animalColor}`, flexShrink: 0 }} />
                            : <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: e.animalColor + '22', border: `2px solid ${e.animalColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>{EMOJIS_ESPECE[e.animal.espece] || '🐾'}</div>
                        }
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: info.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>{info.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nom}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{e.animal.nom} · {info.label}</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap', color: e.color, background: e.color + '18', flexShrink: 0 }}>{e.label}</span>
                        <button onClick={() => sendEmailReminder({ nom: e.nom, animal: e.animal.nom, daysUntil: e.days, type: e.type })}
                            title="Envoyer un rappel par email"
                            style={{ width: '30px', height: '30px', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>📧</button>
                    </div>
                );
            };

            const Group = ({ label, items }) => {
                if (!items.length) return null;
                return (
                    <>
                        <p style={groupHeaderStyle}>{label} ({items.length})</p>
                        <div style={groupBoxStyle}>
                            {items.map((e, i) => <ReminderRow key={i} e={e} i={i} n={items.length} />)}
                        </div>
                    </>
                );
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '14px' }}>⏰ Rappels</h2>

                    {/* ── Résumé badges ── */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        {allItems.length === 0
                            ? <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '600' }}>✅ Tout est à jour</span>
                            : <>
                                {overdue.length > 0 && <span style={{ padding: '5px 12px', borderRadius: '999px', background: '#fee2e2', color: '#ef4444', fontWeight: '700', fontSize: '13px' }}>🔴 {overdue.length} en retard</span>}
                                {thisWeek.length > 0 && <span style={{ padding: '5px 12px', borderRadius: '999px', background: '#fef3c7', color: '#d97706', fontWeight: '700', fontSize: '13px' }}>🟡 {thisWeek.length} cette semaine</span>}
                                {thisMonth.length > 0 && <span style={{ padding: '5px 12px', borderRadius: '999px', background: '#ecfdf5', color: '#059669', fontWeight: '700', fontSize: '13px' }}>🟢 {thisMonth.length} ce mois</span>}
                                {later.length > 0 && <span style={{ padding: '5px 12px', borderRadius: '999px', background: '#f3f4f6', color: '#6b7280', fontWeight: '700', fontSize: '13px' }}>📅 {later.length} à venir</span>}
                            </>
                        }
                    </div>

                    {/* ── Filtre par animal ── */}
                    {(animals || []).length > 1 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                            <div onClick={() => setFilterAnimalId(null)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', background: filterAnimalId === null ? '#1f2937' : '#f3f4f6', color: filterAnimalId === null ? 'white' : '#6b7280', border: filterAnimalId === null ? '2px solid #1f2937' : '2px solid transparent', transition: 'all 0.15s' }}>
                                Tous
                            </div>
                            {(animals || []).map((a, i) => {
                                const col = COLORS[i % COLORS.length];
                                const active = filterAnimalId === a.id;
                                return (
                                    <div key={a.id} onClick={() => setFilterAnimalId(active ? null : a.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '4px 12px 4px 4px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', background: active ? col : col + '18', color: active ? 'white' : col, border: `2px solid ${active ? col : col + '55'}`, transition: 'all 0.15s' }}>
                                        {a.photo
                                            ? <img src={a.photo} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${active ? 'white' : col}`, flexShrink: 0 }} />
                                            : <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.3)' : col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{EMOJIS_ESPECE[a.espece] || '🐾'}</span>
                                        }
                                        {a.nom}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Groupes par urgence ── */}
                    {visible.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                            <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>Tout est à jour</p>
                            <p style={{ fontSize: '13px' }}>Aucune échéance pour cet animal</p>
                        </div>
                    )}
                    <Group label="🔴 En retard" items={overdue} />
                    <Group label="🟡 Cette semaine" items={thisWeek} />
                    <Group label="🟢 Ce mois" items={thisMonth} />
                    <Group label="📅 À venir" items={later} />
                </div>
            );
        }

        // Generic collapsible card used for each Paramètres section ("volet déroulant")
        function CollapsibleSection({ icon, iconBg, iconColor, title, defaultOpen = false, center, style, children }) {
            const [open, setOpen] = React.useState(defaultOpen);
            return (
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', ...style }}>
                    <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', marginBottom: open ? '16px' : 0 }}>
                        <h3 style={{ fontWeight: '600', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                            <span style={sectionIconStyle(iconBg, iconColor)}>{icon}</span> {title}
                        </h3>
                        <span style={{ color: '#9ca3af', flexShrink: 0, fontSize: '14px' }}>{open ? '▲' : '▼'}</span>
                    </button>
                    {open && (center ? <div style={{ textAlign: 'center' }}>{children}</div> : children)}
                </div>
            );
        }

        // Collapsible FAQ shown in Paramètres, grouped by section
        function FAQSection() {
            const [openKey, setOpenKey] = React.useState(null);
            return (
                <CollapsibleSection icon="❓" iconBg="#ede9fe" iconColor="#7c3aed" title="FAQ">
                    <p style={{ fontSize: '13px', color: '#92400e', background: '#fef3c7', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px' }}>
                        ⚠️ Les informations de cette FAQ sont fournies à titre indicatif et ne remplacent en aucun cas une consultation vétérinaire. En cas de doute ou d'urgence, contactez toujours un professionnel.
                    </p>
                    {FAQ_DATA.map((section, si) => (
                        <div key={si} style={{ marginBottom: '16px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>{section.section}</p>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {section.items.map((item, ii) => {
                                    const key = `${si}-${ii}`;
                                    const isOpen = openKey === key;
                                    return (
                                        <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                            <button onClick={() => setOpenKey(isOpen ? null : key)}
                                                style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: isOpen ? '#f9fafb' : 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
                                                <span>{item.q}</span>
                                                <span style={{ color: '#9ca3af', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                                            </button>
                                            {isOpen && (
                                                <div style={{ padding: '0 14px 14px', fontSize: '13px', color: '#6b7280', whiteSpace: 'pre-line' }}>
                                                    {item.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </CollapsibleSection>
            );
        }

        function ParametresTab({ reminderSettings, setReminderSettings, user, db, animals, saveAnimal, auth, userProfile, saveUserProfile, householdId, createHousehold, leaveHousehold, regenerateInviteLink }) {
            const [importing, setImporting] = React.useState(false);
            const [importMsg, setImportMsg] = React.useState('');
            const [linkCopied, setLinkCopied] = React.useState(false);
            const [householdLinkCopied, setHouseholdLinkCopied] = React.useState(false);
            const [householdMembers, setHouseholdMembers] = React.useState([]);
            const [householdBusy, setHouseholdBusy] = React.useState(false);
            const [currentInviteToken, setCurrentInviteToken] = React.useState('');
            const [regenerating, setRegenerating] = React.useState(false);
            const [contacts, setContacts] = React.useState([]);
            const [contactsLoaded, setContactsLoaded] = React.useState(false);
            const [showContactForm, setShowContactForm] = React.useState(false);
            const [newContact, setNewContact] = React.useState({ nom: '', role: 'Vétérinaire habituel', tel: '' });

            React.useEffect(() => {
                if (!user || contactsLoaded) return;
                (async () => {
                    try {
                        const snap = await getDoc(doc(db, 'settings', user.uid));
                        if (snap.exists()) setContacts(snap.data().contacts || []);
                    } catch (e) {}
                    setContactsLoaded(true);
                })();
            }, [user]);

            const saveContacts = async (list) => {
                setContacts(list);
                try { await setDoc(doc(db, 'settings', user.uid), { contacts: list }, { merge: true }); } catch (e) {}
            };

            const addContact = () => {
                if (!newContact.nom) return;
                const list = [...contacts, { ...newContact, id: Date.now() }];
                saveContacts(list);
                setNewContact({ nom: '', role: 'Vétérinaire habituel', tel: '' });
                setShowContactForm(false);
            };

            const deleteContact = (id) => saveContacts(contacts.filter(c => c.id !== id));

            const appUrl = window.location.origin + window.location.pathname;

            React.useEffect(() => {
                if (!householdId) { setHouseholdMembers([]); setCurrentInviteToken(''); return; }
                (async () => {
                    try {
                        const q = query(collection(db, 'settings'), where('householdId', '==', householdId));
                        const snap = await getDocs(q);
                        setHouseholdMembers(snap.docs.map(d => d.data()));
                        // Charger le token d'invitation depuis le document households
                        const hSnap = await getDoc(doc(db, 'households', householdId));
                        setCurrentInviteToken(hSnap.data()?.currentInviteToken || '');
                    } catch (error) {
                        console.error('Erreur loading household:', error);
                    }
                })();
            }, [householdId]);

            const handleRegenerateInvite = async () => {
                if (!window.confirm("Regénérer le lien d'invitation ? L'ancien lien et QR code seront immédiatement révoqués.")) return;
                setRegenerating(true);
                try {
                    const newToken = await regenerateInviteLink();
                    if (newToken) setCurrentInviteToken(newToken);
                } catch {
                    alert("Erreur lors de la régénération du lien.");
                }
                setRegenerating(false);
            };

            const copyHouseholdLink = () => {
                navigator.clipboard.writeText(`${appUrl}?invite=${currentInviteToken}`);
                setHouseholdLinkCopied(true);
                setTimeout(() => setHouseholdLinkCopied(false), 2000);
            };

            const handleCreateHousehold = async () => {
                setHouseholdBusy(true);
                try { await createHousehold(); } catch (error) { alert('Erreur lors de la création du foyer.'); }
                setHouseholdBusy(false);
            };

            const handleLeaveHousehold = async () => {
                if (!window.confirm('Quitter ce foyer partagé ? Vos animaux ne seront plus visibles par les autres membres.')) return;
                setHouseholdBusy(true);
                try { await leaveHousehold(); } catch (error) { alert('Erreur lors du départ du foyer.'); }
                setHouseholdBusy(false);
            };

            const [profile, setProfile] = React.useState(userProfile);
            const [profileMsg, setProfileMsg] = React.useState('');
            React.useEffect(() => setProfile(userProfile), [userProfile]);

            const notifSupported = 'Notification' in window && 'serviceWorker' in navigator;
            const [notifPermission, setNotifPermission] = React.useState(notifSupported ? Notification.permission : 'unsupported');
            const [notifEnabled, setNotifEnabled] = React.useState(localStorage.getItem('notificationsEnabled') !== 'false');
            const [suggestion, setSuggestion] = React.useState('');

            const handleEnableNotifications = async () => {
                await Notification.requestPermission();
                setNotifPermission(Notification.permission);
                localStorage.removeItem('notifPromptDismissed');
                if (Notification.permission === 'granted') initFCM(user?.uid);
            };

            const handleToggleNotifications = (checked) => {
                localStorage.setItem('notificationsEnabled', checked ? 'true' : 'false');
                setNotifEnabled(checked);
            };

            const sendSuggestion = () => {
                const subject = 'Suggestion - Carnet Santé PRO';
                const body = `${suggestion}\n\n— Envoyé par ${user?.email || 'un utilisateur'}`;
                window.location.href = `mailto:carnetsante2@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                setSuggestion('');
            };

            const copyAppLink = () => {
                navigator.clipboard.writeText(appUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            };

            const handleSaveProfile = async () => {
                try {
                    await saveUserProfile(profile);
                    setProfileMsg('✅ Profil mis à jour !');
                } catch (error) {
                    setProfileMsg('❌ Erreur lors de la mise à jour du profil.');
                }
                setTimeout(() => setProfileMsg(''), 2500);
            };

            // ── Export JSON ──────────────────────────────────────────────────
            const exportJSON = (withPhotos) => {
                const clean = animals.map(({ id, userId, createdAt, ...rest }) => {
                    if (!withPhotos) {
                        const obs = (rest.observations || []).map(({ photo, audio, ...o }) => o);
                        return { ...rest, observations: obs };
                    }
                    return rest;
                });
                const payload = { exportDate: new Date().toISOString(), version: '1.0', animals: clean };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `carnet-sante-export-${new Date().toISOString().split('T')[0]}${withPhotos ? '' : '-sans-photos'}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };

            // ── Import JSON ──────────────────────────────────────────────────
            const handleImport = (file) => {
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (e) => {
                    setImportMsg(''); setImporting(true);
                    try {
                        const data = JSON.parse(e.target.result);
                        if (!Array.isArray(data.animals)) throw new Error('Format de fichier invalide.');
                        const n = data.animals.length;
                        if (!window.confirm(`Importer ${n} animal${n > 1 ? 'x' : ''} ? Ils seront ajoutés à votre compte existant.`)) { setImporting(false); return; }
                        for (const animal of data.animals) {
                            const { id, userId, ...rest } = animal;
                            await saveAnimal({ ...rest });
                        }
                        setImportMsg(`✅ ${n} animal${n > 1 ? 'x' : ''} importé${n > 1 ? 's' : ''} avec succès !`);
                    } catch (err) {
                        setImportMsg('❌ Erreur : ' + err.message);
                    }
                    setImporting(false);
                };
                reader.readAsText(file);
            };

            const saveSettings = async () => {
                try {
                    await setDoc(doc(db, 'settings', user.uid), { userId: user.uid, reminders: reminderSettings }, { merge: true });
                    alert('Paramètres sauvegardés !');
                } catch (error) {
                    console.error('Erreur saving settings:', error);
                    alert("Échec de la sauvegarde des paramètres : les règles de sécurité Firestore du projet n'autorisent pas l'écriture dans la collection « settings » pour cet utilisateur. Mettez à jour les règles Firestore (Console Firebase) pour autoriser allow read, write sur /settings/{uid} si request.auth.uid == uid.");
                }
            };

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>⚙️ Paramètres</h2>

                    {/* ── Owner profile ── */}
                    <CollapsibleSection icon="👤" iconBg="#e0e7ff" iconColor="#6366f1" title="Mon profil">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Prénom</label>
                                <input type="text" value={profile.prenom} onChange={(e) => setProfile({ ...profile, prenom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Nom</label>
                                <input type="text" value={profile.nom} onChange={(e) => setProfile({ ...profile, nom: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label htmlFor="profile-date-naissance" style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Date de naissance</label>
                            <input id="profile-date-naissance" type="date" value={profile.dateNaissance || ''} onChange={(e) => setProfile({ ...profile, dateNaissance: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Email</label>
                            <input type="email" value={user?.email || ''} disabled style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', background: '#f3f4f6', color: '#6b7280' }} />
                        </div>

                        <button onClick={handleSaveProfile} style={{ width: '100%', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                            💾 Enregistrer
                        </button>
                        {profileMsg && <p style={{ marginTop: '10px', fontSize: '14px', color: profileMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{profileMsg}</p>}
                    </CollapsibleSection>

                    {/* ── Notifications ── */}
                    <CollapsibleSection icon="🔔" iconBg="#fce7f3" iconColor="#ec4899" title="Notifications push">
                        {notifPermission === 'unsupported' && (
                            <p style={{ fontSize: '13px', color: '#6b7280' }}>Les notifications ne sont pas prises en charge par ce navigateur.</p>
                        )}
                        {notifPermission === 'denied' && (
                            <p style={{ fontSize: '14px', color: '#ef4444' }}>🚫 Les notifications sont bloquées. Réactivez-les dans les réglages de notifications de votre navigateur ou téléphone.</p>
                        )}
                        {notifPermission === 'default' && (
                            <div>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>Activez les notifications pour être prévenu avant les échéances : vaccins, traitements, antiparasitaires et vermifuges.</p>
                                <button onClick={handleEnableNotifications} style={{ padding: '11px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                                    🔔 Activer les notifications
                                </button>
                            </div>
                        )}
                        {notifPermission === 'granted' && (
                            <>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: notifEnabled ? '20px' : '0' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Recevoir les rappels sur cet appareil</span>
                                    <input type="checkbox" checked={notifEnabled} onChange={(e) => handleToggleNotifications(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                </label>
                                {notifEnabled && (
                                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '14px' }}>
                                            Être prévenu combien de jours avant :
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>💉 Vaccins</label>
                                                <input type="number" min="1" max="90"
                                                    value={reminderSettings.vaccin}
                                                    onChange={(e) => setReminderSettings({...reminderSettings, vaccin: Math.max(1, parseInt(e.target.value) || 1)})}
                                                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', fontSize: '15px' }}
                                                />
                                                <small style={{ color: '#6b7280', fontSize: '11px' }}>jours avant</small>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>💊 Traitements</label>
                                                <input type="number" min="1" max="90"
                                                    value={reminderSettings.medicament}
                                                    onChange={(e) => setReminderSettings({...reminderSettings, medicament: Math.max(1, parseInt(e.target.value) || 1)})}
                                                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', fontSize: '15px' }}
                                                />
                                                <small style={{ color: '#6b7280', fontSize: '11px' }}>jours avant</small>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>🦟 Antiparasitaires</label>
                                                <input type="number" min="1" max="90"
                                                    value={reminderSettings.antiparasitaire ?? 14}
                                                    onChange={(e) => setReminderSettings({...reminderSettings, antiparasitaire: Math.max(1, parseInt(e.target.value) || 1)})}
                                                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', fontSize: '15px' }}
                                                />
                                                <small style={{ color: '#6b7280', fontSize: '11px' }}>jours avant</small>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>🪱 Vermifuges</label>
                                                <input type="number" min="1" max="90"
                                                    value={reminderSettings.vermifuge ?? 14}
                                                    onChange={(e) => setReminderSettings({...reminderSettings, vermifuge: Math.max(1, parseInt(e.target.value) || 1)})}
                                                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', fontSize: '15px' }}
                                                />
                                                <small style={{ color: '#6b7280', fontSize: '11px' }}>jours avant</small>
                                            </div>
                                        </div>
                                        <button onClick={saveSettings} style={{ width: '100%', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                                            💾 Sauvegarder
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </CollapsibleSection>

                    {/* ── Carnet de contacts ── */}
                    <div style={{ background: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <h3 style={{ fontWeight: '700', marginBottom: '4px', fontSize: '16px' }}>📒 Carnet de contacts</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Votre vétérinaire habituel, la pension, le toiletteur… Appel en un tap.</p>
                        {contacts.length === 0 && !showContactForm && (
                            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px', fontStyle: 'italic' }}>Aucun contact enregistré.</p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: contacts.length > 0 || showContactForm ? '16px' : '0' }}>
                            {contacts.map(c => (
                                <div key={c.id} style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>{c.nom}</p>
                                        <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0 0' }}>{c.role}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        {c.tel && (
                                            <a href={`tel:${c.tel.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#d1fae5', color: '#059669', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}>
                                                📞 {c.tel}
                                            </a>
                                        )}
                                        <button onClick={() => deleteContact(c.id)} style={{ padding: '6px 9px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {showContactForm ? (
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <select value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                                    <option>Vétérinaire habituel</option>
                                    <option>Clinique urgence</option>
                                    <option>Pension / Garderie</option>
                                    <option>Toiletteur</option>
                                    <option>Comportementaliste</option>
                                    <option>Ostéopathe vétérinaire</option>
                                    <option>Autre</option>
                                </select>
                                <input type="text" placeholder="Nom / cabinet" value={newContact.nom} onChange={(e) => setNewContact({ ...newContact, nom: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                                <input type="tel" placeholder="Numéro de téléphone" value={newContact.tel} onChange={(e) => setNewContact({ ...newContact, tel: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={addContact} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>➕ Ajouter</button>
                                    <button onClick={() => setShowContactForm(false)} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setShowContactForm(true)} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                ➕ Ajouter un contact
                            </button>
                        )}
                    </div>

                    {/* ── Foyer partagé ── */}
                    <CollapsibleSection icon="👨‍👩‍👧" iconBg="#d1fae5" iconColor="#10b981" title="Foyer partagé">
                        {householdId ? (
                            <>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>
                                    Les membres de votre foyer peuvent consulter et modifier les carnets de tous les animaux du foyer.
                                </p>
                                {householdMembers.length > 0 && (
                                    <p style={{ fontSize: '14px', marginBottom: '14px' }}>
                                        👤 Membres : {householdMembers.map(m => `${m.prenom || ''} ${m.nom || ''}`.trim() || 'Membre').join(', ')}
                                    </p>
                                )}
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>Invitez un membre en partageant ce lien ou ce QR code. Le lien est révocable à tout moment.</p>
                                {currentInviteToken ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                        <ShareQRCode size={140} value={`${appUrl}?invite=${currentInviteToken}`} />
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', textAlign: 'center' }}>Chargement du lien d'invitation…</p>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button onClick={copyHouseholdLink} disabled={!currentInviteToken} style={{ padding: '10px 16px', background: householdLinkCopied ? '#d1fae5' : '#f3f4f6', color: householdLinkCopied ? '#10b981' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', opacity: currentInviteToken ? 1 : 0.5 }}>
                                        {householdLinkCopied ? '✅ Lien copié !' : "🔗 Copier le lien d'invitation"}
                                    </button>
                                    <button onClick={handleRegenerateInvite} disabled={regenerating || householdBusy} style={{ padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                                        {regenerating ? '⏳ Régénération…' : '🔄 Révoquer & regénérer le lien'}
                                    </button>
                                    <button onClick={handleLeaveHousehold} disabled={householdBusy} style={{ padding: '10px 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                                        Quitter le foyer
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>
                                    Créez un foyer pour partager vos carnets de santé avec les autres membres de votre famille
                                    (lecture et modification complètes de tous les animaux du foyer).
                                </p>
                                <button onClick={handleCreateHousehold} disabled={householdBusy} style={{ padding: '11px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                                    {householdBusy ? '⏳ Création…' : '👨‍👩‍👧 Créer un foyer'}
                                </button>
                            </>
                        )}
                    </CollapsibleSection>

                    {/* ── Export / Import ── */}
                    <CollapsibleSection icon="📦" iconBg="#cffafe" iconColor="#0891b2" title="Sauvegarde & restauration">
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Exportez vos données pour les sauvegarder ou les transférer. Le fichier JSON peut ensuite être réimporté.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                            <button
                                onClick={() => exportJSON(true)}
                                disabled={animals.length === 0}
                                style={{ padding: '11px 16px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: animals.length ? 'pointer' : 'not-allowed', opacity: animals.length ? 1 : 0.5, textAlign: 'left' }}
                            >
                                ⬇️ Exporter tout ({animals.length} animal{animals.length > 1 ? 'x' : ''}) — avec photos & audios
                            </button>
                            <button
                                onClick={() => exportJSON(false)}
                                disabled={animals.length === 0}
                                style={{ padding: '11px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: animals.length ? 'pointer' : 'not-allowed', opacity: animals.length ? 1 : 0.5, textAlign: 'left' }}
                            >
                                ⬇️ Exporter sans photos (fichier léger)
                            </button>
                        </div>

                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>Restaurer depuis un fichier d'export :</p>
                            <label style={{ display: 'block', padding: '11px 16px', background: '#f3f4f6', border: '2px dashed #d1d5db', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                                {importing ? '⏳ Importation en cours…' : '📂 Choisir un fichier .json à importer'}
                                <input type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => handleImport(e.target.files[0])} disabled={importing} />
                            </label>
                            {importMsg && <p style={{ marginTop: '10px', fontSize: '14px', color: importMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{importMsg}</p>}
                        </div>
                    </CollapsibleSection>

                    {/* ── Share app ── */}
                    <CollapsibleSection icon="📱" iconBg="#e0e7ff" iconColor="#6366f1" title="Partager l'application" center>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Faites scanner ce code pour ouvrir Carnet Santé PRO sur un autre téléphone.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <ShareQRCode size={140} />
                        </div>
                        <button onClick={copyAppLink} style={{ padding: '10px 16px', background: linkCopied ? '#d1fae5' : '#f3f4f6', color: linkCopied ? '#10b981' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                            {linkCopied ? '✅ Lien copié !' : '🔗 Copier le lien'}
                        </button>
                    </CollapsibleSection>

                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '32px', marginBottom: '16px' }}>ℹ️ À propos</h2>

                    <FAQSection />

                    {/* ── Suggestions ── */}
                    <CollapsibleSection icon="💡" iconBg="#fef3c7" iconColor="#f59e0b" title="Suggestions">
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Une idée pour améliorer l'application ? Un bug à signaler ? Écrivez-nous !</p>
                        <textarea
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                            rows={4}
                            placeholder="Votre suggestion..."
                            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical', marginBottom: '12px', fontFamily: 'inherit', fontSize: '14px' }}
                        />
                        <button
                            onClick={sendSuggestion}
                            disabled={!suggestion.trim()}
                            style={{ padding: '11px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: suggestion.trim() ? 'pointer' : 'not-allowed', opacity: suggestion.trim() ? 1 : 0.5 }}
                        >
                            📧 Envoyer la suggestion
                        </button>
                    </CollapsibleSection>

                    <button
                        onClick={() => signOut(auth)}
                        style={{ width: '100%', padding: '12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', marginTop: '24px' }}
                    >
                        Déconnexion
                    </button>
                    <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#9ca3af' }}>
                        <a href="privacy.html" target="_blank" rel="noopener" style={{ color: '#9ca3af' }}>Politique de confidentialité</a>
                    </p>
                </div>
            );
        }

        // Tabs available to veterinarians for an animal record
        const VET_TABS = [
            { id: 'vaccins', icon: '💉', label: 'Vaccins' },
            { id: 'medicaments', icon: '💊', label: 'Traitements' },
            { id: 'chirurgies', icon: '🔪', label: 'Chirurgies' },
            { id: 'notes', icon: '📋', label: 'Observations' },
            { id: 'poids', icon: '⚖️', label: 'Poids' },
            { id: 'ordonnances', icon: '📝', label: 'Ordonnances' },
            { id: 'messages', icon: '💬', label: 'Messagerie' },
        ];

        const ORDONNANCE_TYPES = {
            ordonnance: '📝 Ordonnance',
            certificat: '📜 Certificat / Attestation',
            'compte-rendu': '🗒️ Compte-rendu de consultation',
        };

        // Imprime un document vétérinaire dans une nouvelle fenêtre sans dépendance externe
        const printDocument = (doc, animal, vetProfile) => {
            const typeLabel = doc.type === 'ordonnance' ? 'Ordonnance'
                : doc.type === 'certificat' ? 'Certificat / Attestation'
                : doc.type === 'compte-rendu' ? 'Compte-rendu de consultation'
                : (doc.type || 'Document');
            const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${typeLabel}${doc.nom ? ` — ${doc.nom}` : ''}</title>
<style>
  body { font-family: Georgia, serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
  @media print { body { padding: 20mm; } }
  .header { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
  .type-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
  .doc-title { font-size: 22px; font-weight: bold; margin: 4px 0; }
  .doc-date { font-size: 13px; color: #555; }
  .animal-block { background: #f5f5f5; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px; }
  .animal-block p { margin: 2px 0; font-size: 13px; }
  .content { font-size: 14px; line-height: 1.7; white-space: pre-wrap; min-height: 200px; }
  .signature { margin-top: 48px; text-align: right; }
  .vet-name { font-size: 15px; font-weight: bold; }
  .vet-title { font-size: 13px; color: #555; }
  .footer { margin-top: 48px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 11px; color: #888; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <div class="type-label">${typeLabel}</div>
  <div class="doc-title">${esc(doc.nom || typeLabel)}</div>
  <div class="doc-date">${formatDate(doc.date)}</div>
</div>
<div class="animal-block">
  <p><strong>Animal :</strong> ${esc(animal.nom || '')}</p>
  <p><strong>Espèce :</strong> ${esc(animal.espece || '—')}</p>
  ${animal.dateNaissance ? `<p><strong>Date de naissance :</strong> ${formatDate(animal.dateNaissance)}</p>` : ''}
  ${animal.identifiant ? `<p><strong>N° de puce :</strong> ${esc(animal.identifiant)}</p>` : ''}
</div>
<div class="content">${esc(doc.contenu || '')}</div>
<div class="signature">
  <div class="vet-name">Dr. ${esc(`${vetProfile.prenom || ''} ${vetProfile.nom || ''}`.trim())}</div>
  <div class="vet-title">Vétérinaire</div>
</div>
<div class="footer">Document émis via Carnet Santé PRO · ${todayStr}</div>
</body>
</html>`;
            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); win.print(); }
        };

        // Vet space: generate an ordonnance/certificat/compte-rendu, added straight to the
        // owner's "Documents" tab (tagged with the issuing vet's name)
        function VetOrdonnanceTab({ animal, addAnimalItem, vetProfile }) {
            const todayStr = new Date().toISOString().split('T')[0];
            const [type, setType] = React.useState('ordonnance');
            const [titre, setTitre] = React.useState('');
            const [date, setDate] = React.useState(todayStr);
            const [contenu, setContenu] = React.useState('');

            const handleAdd = () => {
                if (!contenu.trim()) return;
                addAnimalItem(animal, 'documents', {
                    type, nom: titre, date, contenu,
                    source: 'veterinaire',
                    veterinaire: { nom: vetProfile.nom, prenom: vetProfile.prenom },
                });
                setTitre('');
                setContenu('');
                setDate(todayStr);
                setType('ordonnance');
            };

            const issued = [...(animal.documents || [])].filter(d => d.source === 'veterinaire').reverse();

            return (
                <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <AnimalProfileCard animal={animal} />

                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #6366f1' }}>
                        <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Générer un document</h3>
                        <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                            <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                                {Object.entries(ORDONNANCE_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                            <input type="text" placeholder="Titre (ex. Antibiothérapie, Certificat de bonne santé…)" value={titre} onChange={(e) => setTitre(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                            <textarea placeholder="Contenu (posologie, observations, conclusion…)" value={contenu} onChange={(e) => setContenu(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '140px', fontFamily: 'inherit', fontSize: '14px' }} />
                        </div>
                        <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px' }}>Le document sera ajouté directement au dossier "Documents" du propriétaire, signé en votre nom.</p>
                        <button onClick={handleAdd} disabled={!contenu.trim()} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: contenu.trim() ? 'pointer' : 'not-allowed', opacity: contenu.trim() ? 1 : 0.5, fontWeight: '600' }}>
                            ➕ Ajouter au dossier
                        </button>
                    </div>

                    <h3 style={{ marginBottom: '12px', fontWeight: '700', fontSize: '15px' }}>Documents émis pour cet animal</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {issued.length > 0 ? issued.map((d, i) => (
                            <div key={d.id || i} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #6366f1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                    <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>{ORDONNANCE_TYPES[d.type] || DOCUMENT_TYPES[d.type] || d.type}</p>
                                    <button onClick={() => printDocument(d, animal, vetProfile)} style={{ padding: '5px 10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>🖨️ Imprimer</button>
                                </div>
                                {d.nom && <p style={{ fontSize: '13px', color: '#374151' }}>{d.nom}</p>}
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(d.date)}</p>
                                {d.contenu && <p style={{ fontSize: '13px', color: '#374151', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{d.contenu}</p>}
                            </div>
                        )) : (
                            <p style={{ color: '#9ca3af', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Aucun document émis pour le moment</p>
                        )}
                    </div>
                </div>
            );
        }

        // Suivi actif : actions à venir dans les 30 prochains jours pour tous les patients autorisés
        function VetSuiviActif({ authorizedAnimals, onAnimalSelect }) {
            const daysUntil = (dateStr) => {
                if (!dateStr) return null;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                d.setHours(0, 0, 0, 0);
                return Math.round((d - now) / 86400000);
            };

            const items = [];
            (authorizedAnimals || []).forEach(a => {
                (a.vaccins || []).forEach(v => {
                    const days = daysUntil(v.prochainRappel);
                    if (days !== null && days <= 30) items.push({ icon: '💉', category: 'Vaccin', animalNom: a.nom, animal: a, nom: v.nom, days });
                });
                (a.medicaments || []).forEach(m => {
                    const days = daysUntil(m.dateFin);
                    if (days !== null && days <= 30) items.push({ icon: '💊', category: 'Médicament', animalNom: a.nom, animal: a, nom: m.nom, days });
                });
                (a.antiparasitaires || []).forEach(t => {
                    const days = daysUntil(t.prochainTraitement);
                    if (days !== null && days <= 30) items.push({ icon: '🦟', category: 'Antiparasitaire', animalNom: a.nom, animal: a, nom: t.nom || 'Antiparasitaire', days });
                });
                (a.vermifuges || []).forEach(t => {
                    const days = daysUntil(t.prochainTraitement);
                    if (days !== null && days <= 30) items.push({ icon: '🪱', category: 'Vermifuge', animalNom: a.nom, animal: a, nom: t.nom || 'Vermifuge', days });
                });
            });
            items.sort((x, y) => x.days - y.days);

            return (
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '18px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 12px' }}>🔔 Suivi actif — 30 prochains jours</h3>
                    {items.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucun suivi prévu dans les 30 prochains jours 🎉</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f9fafb', borderRadius: '8px', border: item.days < 0 ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
                                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div>
                                            <button onClick={() => onAnimalSelect(item.animal)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#059669', textDecoration: 'underline' }}>{item.animalNom}</button>
                                            <span style={{ fontSize: '13px', color: '#374151' }}> — {item.nom}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.category}</div>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: item.days < 0 ? '#ef4444' : item.days === 0 ? '#ef4444' : '#374151', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                        {item.days < 0 ? `en retard de ${Math.abs(item.days)}j` : item.days === 0 ? "aujourd'hui" : `dans ${item.days}j`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Dashboard overview for the vet space: aggregate stats and upcoming reminders across authorized animals
        function VetDashboard({ authorizedAnimals }) {
            const [stats, setStats] = React.useState(null);

            React.useEffect(() => {
                if (!authorizedAnimals) return;
                const echeances = [];
                authorizedAnimals.forEach(a => {
                    const push = (type, nom, dateStr) => {
                        const c = getCountdown(dateStr);
                        if (c) echeances.push({ type, nom, animal: a.nom, ...c });
                    };
                    (a.vaccins || []).forEach(v => push('vaccin', v.nom, v.rappel || v.date));
                    (a.medicaments || []).forEach(m => push('medicament', m.nom, m.dateFin));
                    (a.antiparasitaires || []).forEach(t => push('antiparasitaire', t.nom || 'Antiparasitaire', t.prochainTraitement));
                    (a.vermifuges || []).forEach(t => push('vermifuge', t.nom || 'Vermifuge', t.prochainTraitement));
                });
                echeances.sort((x, y) => x.days - y.days);
                setStats({ total: authorizedAnimals.length, echeances });
            }, [authorizedAnimals]);

            if (!stats) return <p style={{ color: '#6b7280', fontSize: '14px' }}>Chargement du tableau de bord…</p>;

            const upcoming = stats.echeances.filter(e => e.days >= 0);
            const overdue = stats.echeances.filter(e => e.days < 0);
            const upcomingVaccins = upcoming.filter(e => e.type === 'vaccin');
            const next30 = upcoming.filter(e => e.days <= 30);

            const cards = [
                { icon: '🐾', label: 'Animaux', value: stats.total, bg: '#dbeafe', color: '#2563eb' },
                { icon: '⚠️', label: 'Rappels en retard', value: overdue.length, bg: '#fee2e2', color: '#ef4444' },
                { icon: '💉', label: 'Vaccins à venir', value: upcomingVaccins.length, bg: '#d1fae5', color: '#059669' },
                { icon: '🔔', label: 'Rappels (30 j)', value: next30.length, bg: '#fef3c7', color: '#d97706' },
            ];

            const bucketDefs = [
                { label: '< 1 mois', min: 0, max: 30, color: '#3b82f6' },
                { label: '1-3 mois', min: 31, max: 90, color: '#8b5cf6' },
                { label: '3-6 mois', min: 91, max: 180, color: '#f59e0b' },
                { label: '> 6 mois', min: 181, max: Infinity, color: '#10b981' },
            ];
            const buckets = bucketDefs.map(b => ({ ...b, count: upcomingVaccins.filter(e => e.days >= b.min && e.days <= b.max).length }));
            const totalVaccins = upcomingVaccins.length;
            const radius = 60;
            const circumference = 2 * Math.PI * radius;
            let cumulative = 0;

            return (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                        {cards.map((c, i) => (
                            <div key={i} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '16px' }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: c.bg, color: c.color, marginBottom: '8px' }}>{c.icon}</div>
                                <div style={{ fontSize: '24px', fontWeight: '800' }}>{c.value}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{c.label}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 12px' }}>Rappels à venir</h3>
                            {upcoming.length === 0 ? (
                                <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Aucun rappel à venir.</p>
                            ) : upcoming.slice(0, 5).map((e, i) => {
                                const info = REMINDER_TYPE_INFO[e.type] || { emoji: '⏰', color: '#6b7280' };
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < Math.min(upcoming.length, 5) - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', background: `${info.color}1a`, color: info.color, flexShrink: 0 }}>{info.emoji}</div>
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                            <div style={{ fontWeight: '700', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nom}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.animal} • {formatReminderDelay(e.days)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 12px' }}>Vaccinations à venir</h3>
                            {totalVaccins === 0 ? (
                                <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Aucune vaccination à venir.</p>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    <svg width="140" height="140" viewBox="0 0 140 140">
                                        <g transform="rotate(-90 70 70)">
                                            {buckets.filter(b => b.count > 0).map((b, i) => {
                                                const fraction = b.count / totalVaccins;
                                                const dash = fraction * circumference;
                                                const el = (
                                                    <circle key={i} cx="70" cy="70" r={radius} fill="none" stroke={b.color} strokeWidth="20"
                                                        strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-cumulative} />
                                                );
                                                cumulative += dash;
                                                return el;
                                            })}
                                        </g>
                                        <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="800" fill="#1f2937">{totalVaccins}</text>
                                    </svg>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {buckets.map((b, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: b.color, display: 'inline-block', flexShrink: 0 }}></span>
                                                {b.label} ({b.count})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Pro space for veterinarians: requires an active subscription, then search an animal by its identifiant and add medical acts
        function VetApp({ user, auth, db }) {
            const [subStatus, setSubStatus] = React.useState(null); // null (chargement) | 'active' | 'inactive' | 'past_due' | 'canceled' | ...
            const [checkoutLoading, setCheckoutLoading] = React.useState(false);
            const [billingError, setBillingError] = React.useState('');
            const [authorizedAnimals, setAuthorizedAnimals] = React.useState(null); // null = chargement
            const [animal, setAnimal] = React.useState(null);
            const [error, setError] = React.useState('');
            const [activeTab, setActiveTab] = React.useState('vaccins');
            const [vetProfile, setVetProfile] = React.useState({ nom: '', prenom: '' });
            const [view, setView] = React.useState('home'); // 'home' | 'dashboard'
            const [vetCodeCopied, setVetCodeCopied] = React.useState(false);
            const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 768);
            const [sidebarOpen, setSidebarOpen] = React.useState(false);
            const [searchNom, setSearchNom] = React.useState('');
            const [searchPrenom, setSearchPrenom] = React.useState('');
            const [searchAnimalNom, setSearchAnimalNom] = React.useState('');
            const [searchResults, setSearchResults] = React.useState(null); // null = pas encore cherché
            const [searchLoading, setSearchLoading] = React.useState(false);
            const [searchError, setSearchError] = React.useState('');
            const [pendingRequestedIds, setPendingRequestedIds] = React.useState(new Set());
            const [requestLoading, setRequestLoading] = React.useState(null); // animalId en cours

            // Synchronise le Custom Claim vetPro au montage (migration des abonnés existants).
            // Si le claim est absent alors que le statut Firestore est 'active', on appelle
            // refreshVetClaim (côté serveur) puis on force le refresh du token.
            React.useEffect(() => {
                const syncClaim = async () => {
                    try {
                        const tokenResult = await user.getIdTokenResult();
                        if (!tokenResult.claims.vetPro) {
                            const refreshVetClaimFn = httpsCallable(functions, 'refreshVetClaim');
                            const result = await refreshVetClaimFn();
                            if (result.data.vetPro) await user.getIdToken(true);
                        }
                    } catch (e) {
                        console.warn('refreshVetClaim:', e.message);
                    }
                };
                syncClaim();
            }, []);

            // Live subscription status, kept in sync with the Stripe webhook.
            // Quand le statut passe à 'active', on force le refresh du token pour que
            // le Custom Claim vetPro soit immédiatement visible des règles Firestore.
            React.useEffect(() => {
                let prevStatus = null;
                const unsub = onSnapshot(doc(db, 'settings', user.uid), async (snap) => {
                    const data = snap.exists() ? snap.data() : {};
                    const newStatus = data.subscriptionStatus || 'inactive';
                    setSubStatus(newStatus);
                    setVetProfile({ nom: data.nom || '', prenom: data.prenom || '', userId: user.uid });
                    if (newStatus === 'active' && prevStatus !== null && prevStatus !== 'active') {
                        try { await user.getIdToken(true); } catch (e) { console.warn('token refresh:', e); }
                    }
                    prevStatus = newStatus;
                }, (err) => {
                    console.error('Erreur abonnement:', err);
                    setSubStatus('inactive');
                });
                return () => unsub();
            }, [user.uid]);

            // Chargement en temps réel des animaux autorisés par leurs propriétaires
            React.useEffect(() => {
                if (subStatus !== 'active') return;
                const q = query(collection(db, 'animals'), where('authorizedVets', 'array-contains', user.uid));
                const unsub = onSnapshot(q, (snap) => {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setAuthorizedAnimals(list);
                    // Garder l'animal sélectionné en sync si toujours autorisé
                    setAnimal(prev => prev ? (list.find(a => a.id === prev.id) || null) : null);
                }, (err) => {
                    console.error('Erreur animaux autorisés:', err);
                    setAuthorizedAnimals([]);
                });
                return () => unsub();
            }, [subStatus]);

            // Suivi en temps réel des demandes d'accès déjà envoyées (status: pending)
            React.useEffect(() => {
                if (subStatus !== 'active') return;
                const q = query(
                    collection(db, 'vetAccessRequests'),
                    where('vetUid', '==', user.uid),
                    where('status', '==', 'pending')
                );
                const unsub = onSnapshot(q, (snap) => {
                    setPendingRequestedIds(new Set(snap.docs.map(d => d.data().animalId)));
                }, () => {});
                return () => unsub();
            }, [subStatus]);

            const handleSearchAnimals = async () => {
                const nom = searchNom.trim();
                if (!nom) { setSearchError("Veuillez saisir le nom du propriétaire."); return; }
                setSearchError('');
                setSearchLoading(true);
                setSearchResults(null);
                try {
                    const searchAnimalsForVet = httpsCallable(functions, 'searchAnimalsForVet');
                    const { data } = await searchAnimalsForVet({
                        proprietaireNom: nom,
                        proprietairePrenom: searchPrenom.trim() || undefined,
                        animalNom: searchAnimalNom.trim() || undefined,
                    });
                    setSearchResults(data.results);
                } catch (err) {
                    setSearchError("Erreur de recherche : " + (err.message || String(err)));
                } finally {
                    setSearchLoading(false);
                }
            };

            const handleRequestAccess = async (animalData) => {
                setRequestLoading(animalData.animalId);
                try {
                    await addDoc(collection(db, 'vetAccessRequests'), {
                        vetUid: user.uid,
                        vetNom: vetProfile.nom,
                        vetPrenom: vetProfile.prenom,
                        animalId: animalData.animalId,
                        animalNom: animalData.animalNom,
                        ownerUid: animalData.ownerUid,
                        status: 'pending',
                        createdAt: new Date(),
                    });
                    setPendingRequestedIds(prev => new Set([...prev, animalData.animalId]));
                } catch (err) {
                    setSearchError("Erreur lors de la demande : " + err.message);
                } finally {
                    setRequestLoading(null);
                }
            };

            // Responsive split-pane : détecter desktop (≥768px)
            React.useEffect(() => {
                const onResize = () => setIsDesktop(window.innerWidth >= 768);
                window.addEventListener('resize', onResize);
                return () => window.removeEventListener('resize', onResize);
            }, []);

            const handleSubscribe = async () => {
                setBillingError('');
                setCheckoutLoading(true);
                try {
                    const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
                    const result = await createCheckoutSession();
                    window.location.href = result.data.url;
                } catch (err) {
                    setBillingError("Erreur lors de la création du paiement : " + err.message);
                    setCheckoutLoading(false);
                }
            };

            const handleManageSubscription = async () => {
                setBillingError('');
                try {
                    const createPortalSession = httpsCallable(functions, 'createPortalSession');
                    const result = await createPortalSession();
                    window.location.href = result.data.url;
                } catch (err) {
                    setBillingError("Erreur : " + err.message);
                }
            };

            const saveAnimal = async (animalData) => {
                try {
                    const { id, ...data } = animalData;
                    await updateDoc(doc(db, 'animals', id), data);
                    setAnimal(animalData);
                } catch (err) {
                    setError("Erreur lors de l'enregistrement : " + err.message);
                }
            };

            // Medical acts added/edited by a subscribed vet are tagged with a "validated by" stamp,
            // shown to the owner as a "✅ Validé par Dr. X" badge
            const validationStamp = () => ({ nom: vetProfile.nom, prenom: vetProfile.prenom, date: new Date().toISOString().split('T')[0] });

            const addAnimalItem = (animalObj, type, item) => {
                const extra = type === 'documents' ? {} : { validePar: validationStamp() };
                saveAnimal({ ...animalObj, [type]: [...(animalObj[type] || []), { ...item, ...extra, id: Date.now() }] });
            };

            const deleteAnimalItem = (animalObj, type, itemId) => {
                saveAnimal({ ...animalObj, [type]: (animalObj[type] || []).filter(i => i.id !== itemId) });
            };

            const updateAnimalItem = (animalObj, type, itemId, updates) => {
                const extra = type === 'documents' ? {} : { validePar: validationStamp() };
                saveAnimal({ ...animalObj, [type]: (animalObj[type] || []).map(i => i.id === itemId ? { ...i, ...updates, ...extra } : i) });
            };

            if (subStatus === null) {
                return <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>;
            }

            if (subStatus !== 'active') {
                const checkoutResult = new URLSearchParams(window.location.search).get('vet_checkout');
                return (
                    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                        <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
                            <span style={{ fontWeight: '800', fontSize: '18px', color: '#10b981' }}>🩺 Carnet Santé PRO — Espace Vétérinaire</span>
                            <button onClick={() => signOut(auth)} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#1f2937', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                                Déconnexion
                            </button>
                        </nav>

                        <div style={{ padding: '40px 20px', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🩺</div>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>Abonnement Espace Vétérinaire</h2>
                            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                                Accédez aux carnets de santé de vos patients avec leur consentement : le propriétaire vous autorise en entrant votre code vétérinaire. Ajoutez vaccins, médicaments, chirurgies, antiparasitaires, vermifuges, observations et pesées directement dans le carnet.
                            </p>
                            <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
                                <p style={{ fontSize: '36px', fontWeight: '800', color: '#10b981', marginBottom: '4px' }}>49,99 €<span style={{ fontSize: '15px', fontWeight: '500', color: '#6b7280' }}> / mois</span></p>
                                <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>Sans engagement, résiliable à tout moment.</p>
                                <button onClick={handleSubscribe} disabled={checkoutLoading} style={{ width: '100%', padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: checkoutLoading ? 'wait' : 'pointer', fontSize: '16px' }}>
                                    {checkoutLoading ? 'Redirection vers le paiement…' : "S'abonner — 49,99 €/mois"}
                                </button>
                            </div>
                            {checkoutResult === 'success' && (
                                <p style={{ color: '#10b981', fontSize: '14px', marginBottom: '12px' }}>✅ Paiement reçu ! Activation de votre abonnement en cours (quelques secondes)…</p>
                            )}
                            {checkoutResult === 'cancel' && (
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>Paiement annulé.</p>
                            )}
                            {billingError && <p style={{ color: '#ef4444', fontSize: '14px' }}>{billingError}</p>}
                            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>Paiement sécurisé par Stripe.</p>
                        </div>
                    </div>
                );
            }

            return (
                <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 10 }}>
                        <span style={{ fontWeight: '800', fontSize: '18px', color: '#10b981' }}>🩺 Carnet Santé PRO — Espace Vétérinaire</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setView(view === 'dashboard' ? 'home' : 'dashboard')} style={{ padding: '8px 16px', background: view === 'dashboard' ? '#10b981' : '#f3f4f6', color: view === 'dashboard' ? 'white' : '#1f2937', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                                {view === 'dashboard' ? '🐾 Mes patients' : '📊 Tableau de bord'}
                            </button>
                            <button onClick={handleManageSubscription} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#1f2937', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                                ⚙️ Abonnement
                            </button>
                            <button onClick={() => signOut(auth)} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#1f2937', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                                Déconnexion
                            </button>
                        </div>
                    </nav>

                    {/* Sidebar patients — position fixe, desktop (≥768px) uniquement */}
                    {isDesktop && authorizedAnimals != null && authorizedAnimals.length > 0 && (
                        <aside style={{ position: 'fixed', left: 0, top: '60px', width: '260px', height: 'calc(100vh - 60px)', background: 'white', borderRight: '1px solid #e5e7eb', overflowY: 'auto', zIndex: 5, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🐾 Mes patients</h3>
                            </div>
                            <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {authorizedAnimals.map(a => (
                                    <button key={a.id} onClick={() => { setAnimal(a); setActiveTab('vaccins'); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: animal?.id === a.id ? '#f0fdf4' : 'transparent', border: animal?.id === a.id ? '1px solid #10b981' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                                        <AnimalAvatar animal={a} size={26} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: '700', fontSize: '13px', color: animal?.id === a.id ? '#047857' : '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nom}</div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.espece}{a.race ? ` · ${a.race}` : ''}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </aside>
                    )}

                    <div style={{ paddingTop: '20px', paddingRight: '20px', paddingBottom: '20px', paddingLeft: isDesktop && authorizedAnimals != null && authorizedAnimals.length > 0 ? '280px' : '20px', maxWidth: isDesktop && authorizedAnimals != null && authorizedAnimals.length > 0 ? undefined : '900px', margin: isDesktop && authorizedAnimals != null && authorizedAnimals.length > 0 ? undefined : '0 auto' }}>
                        {billingError && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '12px' }}>{billingError}</p>}

                        {(!isDesktop || !animal) && (
                        <div style={{ marginBottom: '20px' }}>
                            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px' }}>👋 Bonjour{vetProfile.nom ? `, Dr. ${vetProfile.nom}` : ''}</h1>
                            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{view === 'dashboard' ? 'Vue d\'ensemble' : 'Que souhaitez-vous faire ?'}</p>
                        </div>
                        )}

                        {view === 'dashboard' && <VetDashboard authorizedAnimals={authorizedAnimals} />}

                        {view === 'home' && (<>
                        {!animal && (<div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '18px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 6px' }}>🆔 Mon code vétérinaire</h3>
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>Communiquez ce code aux propriétaires pour qu'ils vous autorisent à accéder au carnet de santé de leur animal.</p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <code style={{ flex: 1, padding: '10px 14px', background: '#f3f4f6', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#1f2937' }}>{user.uid}</code>
                                <button onClick={() => { navigator.clipboard.writeText(user.uid); setVetCodeCopied(true); setTimeout(() => setVetCodeCopied(false), 2000); }}
                                    style={{ padding: '10px 14px', background: vetCodeCopied ? '#d1fae5' : '#10b981', color: vetCodeCopied ? '#059669' : 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', flexShrink: 0, transition: 'background 0.2s' }}>
                                    {vetCodeCopied ? '✅ Copié' : '📋 Copier'}
                                </button>
                            </div>
                        </div>)}

                        {!animal && (<div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '18px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 6px' }}>🔍 Demander l'accès à un nouveau patient</h3>
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>Recherchez un animal par le nom de son propriétaire pour envoyer une demande d'accès au dossier.</p>
                            <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Nom du propriétaire *"
                                    value={searchNom}
                                    onChange={e => setSearchNom(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSearchAnimals(); }}
                                    style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Prénom du propriétaire (optionnel)"
                                    value={searchPrenom}
                                    onChange={e => setSearchPrenom(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSearchAnimals(); }}
                                    style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Nom de l'animal (optionnel)"
                                    value={searchAnimalNom}
                                    onChange={e => setSearchAnimalNom(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSearchAnimals(); }}
                                    style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                                />
                            </div>
                            <button
                                onClick={handleSearchAnimals}
                                disabled={searchLoading || !searchNom.trim()}
                                style={{ width: '100%', padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: (searchLoading || !searchNom.trim()) ? 'not-allowed' : 'pointer', opacity: (searchLoading || !searchNom.trim()) ? 0.6 : 1 }}
                            >
                                {searchLoading ? 'Recherche…' : '🔍 Rechercher'}
                            </button>
                            {searchError && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{searchError}</p>}
                            {searchResults !== null && (
                                <div style={{ marginTop: '12px' }}>
                                    {searchResults.length === 0 ? (
                                        <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '16px 0' }}>Aucun animal trouvé. Vérifiez l'orthographe du nom du propriétaire.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {searchResults.map(a => {
                                                const alreadyAuthorized = a.alreadyAuthorized || (authorizedAnimals || []).some(aa => aa.id === a.animalId);
                                                const alreadyRequested = pendingRequestedIds.has(a.animalId);
                                                const isLoading = requestLoading === a.animalId;
                                                return (
                                                    <div key={a.animalId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                                                        <AnimalAvatar animal={{ espece: a.espece }} size={28} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: '700', fontSize: '14px' }}>{a.animalNom}</div>
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{a.espece} — {[a.proprietairePrenom, a.proprietaireNom].filter(Boolean).join(' ')}</div>
                                                        </div>
                                                        {alreadyAuthorized ? (
                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#047857', background: '#d1fae5', padding: '4px 10px', borderRadius: '6px' }}>✅ Autorisé</span>
                                                        ) : alreadyRequested ? (
                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '6px' }}>⏳ Demande envoyée</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleRequestAccess(a)}
                                                                disabled={isLoading}
                                                                style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.6 : 1, flexShrink: 0 }}
                                                            >
                                                                {isLoading ? '…' : 'Demander l\'accès'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>)}

                        {!animal && authorizedAnimals != null && authorizedAnimals.length > 0 && (
                            <VetSuiviActif authorizedAnimals={authorizedAnimals} onAnimalSelect={(a) => { setAnimal(a); setActiveTab('vaccins'); }} />
                        )}

                        {!isDesktop && !animal && (<div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '18px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 12px' }}>🐾 Mes patients autorisés</h3>
                            {authorizedAnimals === null ? (
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>Chargement…</p>
                            ) : authorizedAnimals.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
                                    <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 6px' }}>Aucun animal ne vous a encore autorisé.</p>
                                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Partagez votre code ci-dessus avec vos clients : ils entrent ce code dans l'onglet Dossier de leur animal pour vous donner accès.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {authorizedAnimals.map(a => (
                                        <button key={a.id} onClick={() => { setAnimal(a); setActiveTab('vaccins'); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}>
                                            <AnimalAvatar animal={a} size={28} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '700', fontSize: '14px' }}>{a.nom}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.espece}{a.race ? ` • ${a.race}` : ''}{a.proprietairePrenom || a.proprietaireNom ? ` — ${[a.proprietairePrenom, a.proprietaireNom].filter(Boolean).join(' ')}` : ''}</div>
                                            </div>
                                            <span style={{ color: '#d1d5db', fontSize: '18px' }}>›</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>)}

                        {error && <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '14px' }}>{error}</p>}

                        {animal && (
                            <div>
                                <button onClick={() => setAnimal(null)} style={{ marginBottom: '14px', padding: '7px 14px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>← Retour{isDesktop ? ' à l\'accueil' : ' à la liste'}</button>
                                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 10px' }}>
                                        <AnimalAvatar animal={animal} size={32} />
                                    </div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px' }}>{animal.nom}</h2>
                                    <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 10px' }}>
                                        {animal.espece}{animal.race ? ` • ${animal.race}` : ''}{animal.sexe ? ` • ${animal.sexe === 'male' ? 'Mâle' : 'Femelle'}` : ''}
                                    </p>
                                    {animal.dateNaissance && (
                                        <span style={{ display: 'inline-block', background: '#d1fae5', color: '#047857', fontSize: '12px', fontWeight: '700', padding: '5px 14px', borderRadius: '999px' }}>
                                            Né(e) le {formatDate(animal.dateNaissance)}
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                                    {VET_TABS.map(t => (
                                        <div key={t.id} onClick={() => setActiveTab(t.id)}
                                            style={{ background: activeTab === t.id ? '#f0fdf4' : 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '14px 10px', textAlign: 'center', cursor: 'pointer', border: activeTab === t.id ? '2px solid #10b981' : '2px solid transparent' }}>
                                            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{t.icon}</div>
                                            <div style={{ fontSize: '12px', fontWeight: '700', color: activeTab === t.id ? '#047857' : '#374151' }}>{t.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {activeTab === 'vaccins' && <VaccinsTab animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />}
                                {activeTab === 'medicaments' && <MedicamentsTab animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />}
                                {activeTab === 'chirurgies' && <ChirurgiesTab animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />}
                                {activeTab === 'notes' && <NotesTab animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />}
                                {activeTab === 'poids' && <PoidsTab animal={animal} addAnimalItem={addAnimalItem} deleteAnimalItem={deleteAnimalItem} updateAnimalItem={updateAnimalItem} />}
                                {activeTab === 'ordonnances' && <VetOrdonnanceTab animal={animal} addAnimalItem={addAnimalItem} vetProfile={vetProfile} />}
                                {activeTab === 'messages' && <MessagesTab animal={animal} db={db} currentRole="veterinaire" authorProfile={vetProfile} />}
                            </div>
                        )}
                        </>)}
                    </div>
                </div>
            );
        }

        // Render App
        createRoot(document.getElementById('root')).render(<App />);
