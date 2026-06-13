# Carnet Santé PRO

Application React (SPA, fichier unique `index.html`) + Firebase Auth/Firestore/Functions + Stripe.

## ⚠️ À FAIRE — Rappels importants

- [ ] **Slots AdSense** : remplacer les 5 occurrences de `xxxxxxxxxx` dans `index.html` par les vrais IDs de slot depuis le tableau de bord AdSense
- [x] **Politique de confidentialité** (`privacy.html`) : champs responsable de traitement complétés (Rakotoson Christopher / carnetsante2@gmail.com / 12 rue de Vendée, Villedieu-la-Blouère, 49450 Beaupréau-en-Mauges)
- [ ] **Règles Firestore (mise à jour)** : republier le contenu de `firestore.rules` dans Firebase
  Console > Firestore Database > Règles (la recherche vétérinaire par nom, le nouvel onglet
  Chirurgies, la "Fiche de garde" partagée par QR code, le "Foyer partagé", les ordonnances
  émises par le vétérinaire et la messagerie sécurisée nécessitent les nouvelles règles
  ci-dessous)
- [ ] **Mettre en place l'abonnement Stripe** (espace vétérinaire à 49,99 €/mois) — voir section dédiée ci-dessous, ÉTAPES MANUELLES OBLIGATOIRES avant que le paiement fonctionne
- [ ] **AdSense — repo `crakott.github.io` (hors périmètre de cet agent)** : la page de
  redirection `index.html` de ce repo contient encore le mauvais ID éditeur
  (`ca-pub-2220007213028900`) à corriger en `ca-pub-2220007721302800`. Il manque aussi le
  fichier `ads.txt` à la racine du domaine (`https://crakott.github.io/ads.txt`, actuellement
  404) — contenu exact disponible dans AdSense > Sites > statut "Introuvable" pour
  `crakott.github.io`. Une fois ces deux points corrigés, relancer "Valider" dans AdSense.

## Stack technique

- React 18 (UMD CDN) + Babel Standalone
- Firebase v10.7.0 (Auth + Firestore + Functions)
- Cloud Functions v2 (Node 20, région `europe-west1`) pour l'intégration Stripe
- Stripe (Checkout + Billing Portal + Webhooks) pour l'abonnement vétérinaire
- PWA : `manifest.json` + `sw.js` + icônes dans `icons/`, installable sur mobile (Add to Home Screen)
- Firestore : persistance locale IndexedDB activée (`persistentLocalCache` + `persistentMultipleTabManager`)
  pour permettre la consultation/modification hors connexion avec synchronisation au retour du réseau
- Google Tag Manager : GTM-MVNX7BHT
- Google AdSense : ca-pub-2220007721302800

## Branche de développement

`claude/new-session-b39y6h`

## Espace Vétérinaire (pro) — abonnement payant 49,99 €/mois

Un compte peut avoir le rôle `veterinaire` (champ `role` dans `settings/{uid}`, choisi à
l'inscription via la case "Je suis vétérinaire"). Ces comptes arrivent sur `VetApp` au lieu de
l'app standard.

- **Abonnement requis** : l'accès à la recherche d'animaux et à l'ajout d'actes médicaux est
  réservé aux vétérinaires dont `settings/{uid}.subscriptionStatus == 'active'`. Tant que ce
  n'est pas le cas, `VetApp` affiche un écran d'abonnement ("S'abonner — 49,99 €/mois") qui
  ouvre une session Stripe Checkout (mode `subscription`).
- **Gestion de l'abonnement** : un bouton "⚙️ Abonnement" ouvre le portail de facturation Stripe
  (résiliation, moyen de paiement, factures).
- **Accès une fois abonné** : le vétérinaire recherche un animal soit via son `identifiant` (ex :
  numéro de puce électronique, champ optionnel renseigné par le propriétaire dans le profil de
  l'animal et affiché avec un bouton "Copier" sur la fiche), soit par le **nom de l'animal +
  nom (et prénom optionnel) du propriétaire**. Cette seconde recherche fonctionne pour tout
  animal (pas seulement ceux ayant un `identifiant`).
- **Permissions** : lecture complète du dossier + ajout de vaccins, médicaments, chirurgies/petites
  interventions, antiparasitaires, vermifuges, observations et pesées. Pas d'accès au profil de
  base (nom, race, sexe…), au budget, ni aux partages — ces champs restent réservés au
  propriétaire. Le vétérinaire peut en plus ajouter des documents (ordonnances, certificats,
  comptes-rendus — onglet "📝 Ordonnances", voir ci-dessous), mais pas modifier/supprimer les
  documents existants du propriétaire.
- **Validation professionnelle** : chaque acte ajouté ou modifié par un vétérinaire abonné
  (vaccin, médicament, chirurgie, antiparasitaire/vermifuge, observation, pesée) reçoit un champ
  `validePar: { nom, prenom, date }` (nom/prénom du vétérinaire), affiché côté propriétaire comme
  un badge "✅ Validé par Dr. X" (composant `ValidationBadge`).
- **Ordonnances numériques** (onglet "📝 Ordonnances" de l'espace pro, `VetOrdonnanceTab`) : le
  vétérinaire génère une ordonnance, un certificat ou un compte-rendu de consultation (titre,
  date, contenu texte), ajouté directement au tableau `documents` de l'animal avec
  `source: 'veterinaire'` et `veterinaire: { nom, prenom }`. Le document apparaît automatiquement
  dans l'onglet "Documents" du propriétaire, avec un badge "🩺 Émis par Dr. X" et son contenu.
- **Messagerie sécurisée** (onglet "💬 Messagerie") : fil de discussion par animal
  (`animals/{animalId}/messages`), entre le propriétaire (et les membres de son foyer) et tout
  vétérinaire abonné consultant le dossier. Chaque message a `from` (`'proprietaire'` ou
  `'veterinaire'`), `authorNom`/`authorPrenom`, `text` et/ou `photo` (base64) et `date`. Visible
  côté propriétaire dans la carte "Dossier" "💬 Messagerie vétérinaire" (groupe "Quotidien") et
  dans le menu desktop, et côté vétérinaire dans l'onglet "💬 Messagerie" de l'espace pro.

## Document `settings/{uid}`

Le document de paramètres est désormais identifié par l'UID Firebase de l'utilisateur (au lieu
d'un ID auto-généré recherché via `where('userId','==',uid)`). Le champ `userId` est conservé
pour compatibilité avec les règles Firestore existantes. Au premier chargement, un éventuel
ancien document (`userId == uid` mais ID aléatoire) est automatiquement migré vers `settings/{uid}`.

Champs :
- `userId` : uid du propriétaire du document
- `role` : `'proprietaire'` ou `'veterinaire'`
- `nom`, `prenom`, `dateNaissance` : identité de l'utilisateur, saisis à l'inscription. `nom`
  et `prenom` sont recopiés (dénormalisés) sur chaque animal créé (`proprietaireNom`,
  `proprietairePrenom`) pour permettre la recherche vétérinaire par nom de propriétaire
- `reminders` : préférences de rappels (`vaccin`, `medicament`, `antiparasitaire`, `vermifuge`)
- `subscriptionStatus` (vétérinaires uniquement) : `'inactive' | 'active' | 'past_due' | 'canceled' | ...`
  mis à jour par le webhook Stripe (`functions/index.js`)
- `stripeCustomerId`, `stripeSubscriptionId` : identifiants Stripe associés au compte
- `householdId` : identifiant du foyer partagé (`households/{householdId}`) auquel l'utilisateur
  appartient, ou absent/`null` s'il n'en a pas. Voir section "Foyer partagé" ci-dessous

## Document `animals/{animalId}`

En plus des champs de profil existants (`nom`, `espece`, `race`, `sexe`, `dateNaissance`,
`identifiant`, `photo`…) et des tableaux d'actes médicaux (`vaccins`, `medicaments`,
`antiparasitaires`, `vermifuges`, `observations`, `poids`) :
- `proprietaireNom`, `proprietairePrenom` : copie du nom/prénom du propriétaire
  (`settings/{userId}`) au moment de la création de l'animal, utilisée par la recherche
  vétérinaire par nom
- `validePar` (optionnel, sur chaque élément des tableaux `vaccins`, `medicaments`,
  `chirurgies`, `antiparasitaires`, `vermifuges`, `observations`, `poids`) : `{ nom, prenom,
  date }` du vétérinaire abonné ayant ajouté ou modifié cet élément depuis l'espace pro.
  Affiché côté propriétaire comme badge "✅ Validé par Dr. X"
- `chirurgies` : tableau des chirurgies et petites interventions (`nom`, `date`, `notes`),
  visible et modifiable par le propriétaire (onglet "🔪 Chirurgies") et par le vétérinaire
  abonné (onglet du même nom dans l'espace pro)
- `poidsObjectif` : poids cible (kg, nombre), défini par le propriétaire dans l'onglet
  "⚖️ Poids" ("🎯 Objectif de poids"). Affiché comme ligne pointillée sur la courbe de poids
  et utilisé pour calculer la barre de progression vers l'objectif
- `documents` : tableau de documents (`type`, `nom`, `date`, `photo` en base64) — carnet de
  vaccination, ordonnances, certificats, analyses, factures… Ajoutés par le propriétaire
  (scan/photo), ou par un vétérinaire abonné via l'onglet "📝 Ordonnances" (`type`:
  `'ordonnance' | 'certificat' | 'compte-rendu'`, `contenu` : texte, `source: 'veterinaire'`,
  `veterinaire: { nom, prenom }`). Le vétérinaire peut uniquement ajouter des documents
  (`source: 'veterinaire'`), pas modifier/supprimer ceux du propriétaire
- `shareEnabled` : booléen activé par le propriétaire depuis l'onglet "Dossier" (carte
  "🔗 Fiche de garde") pour générer un lien/QR code public, en lecture seule, vers une
  fiche résumée de l'animal (profil, vaccins, traitements, chirurgies, poids,
  alimentation, observations — sans budget ni documents). Le lien
  (`?share=<animalId>`) ouvre `SharedDossierView` sans authentification ; voir la règle
  Firestore `allow get` ci-dessous
- `householdId` : copié depuis `settings/{userId}.householdId` à la création de l'animal (et
  mis à jour si le propriétaire rejoint/quitte un foyer). Voir section "Foyer partagé"

## Foyer partagé (`households/{householdId}`)

Permet à plusieurs comptes (membres d'une même famille) de partager l'accès complet
(lecture + écriture, comme le propriétaire) aux carnets de tous les animaux du foyer.

- Document `households/{householdId}` : `{ members: [uid1, uid2, ...] }`
- Carte "👨‍👩‍👧 Foyer partagé" dans Paramètres :
  - **Créer un foyer** : crée le document `households`, fixe `settings/{uid}.householdId` et
    `animals/{animalId}.householdId` (pour les animaux du créateur) sur le nouvel id
  - **Inviter** : lien/QR `?join=<householdId>` (composant `ShareQRCode`, comme la fiche de
    garde). Ouvrir ce lien (connecté) affiche `JoinHouseholdBanner` proposant de rejoindre —
    accepter ajoute l'utilisateur à `members`, met à jour son `householdId` et celui de ses
    propres animaux (s'il appartenait déjà à un autre foyer, il le quitte d'abord)
  - **Quitter le foyer** : retire l'utilisateur de `members` et remet `householdId` à `null`
    sur son `settings` et ses propres animaux (les animaux des autres membres ne sont pas
    affectés)
- Chargement des animaux : si l'utilisateur a un `householdId`, la requête se fait sur
  `where('householdId','==',householdId)` (tous les animaux du foyer) ; sinon
  `where('userId','==',uid)` (comportement inchangé)
- La liste des membres affichée dans Paramètres lit `settings` filtrés par `householdId`
  (nom/prénom de chaque membre)

## Règles Firestore (à jour)

Le fichier `firestore.rules` à la racine du dépôt contient les règles à jour. À copier dans
Firebase Console > Firestore Database > Règles, puis publier.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /animals/{animalId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;

      // Foyer partagé : un membre du même foyer (households/{householdId}.members) a un accès
      // complet (comme le propriétaire) à tous les animaux du foyer
      allow read, update, delete: if request.auth != null
        && resource.data.householdId != null
        && request.auth.uid in get(/databases/$(database)/documents/households/$(resource.data.householdId)).data.members;

      // Vétérinaires "pro" abonnés : lecture de tout animal, écriture limitée
      // aux actes médicaux (pas le profil, le budget ou les partages). L'écriture sur
      // "documents" est limitée à l'ajout d'ordonnances/certificats/comptes-rendus
      // (source: 'veterinaire'), pas aux documents du propriétaire
      allow read: if request.auth != null
        && get(/databases/$(database)/documents/settings/$(request.auth.uid)).data.subscriptionStatus == 'active';
      allow update: if request.auth != null
        && get(/databases/$(database)/documents/settings/$(request.auth.uid)).data.subscriptionStatus == 'active'
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['vaccins', 'medicaments', 'chirurgies', 'antiparasitaires', 'vermifuges', 'observations', 'poids', 'documents']);

      // Fiche de garde : lecture publique (sans connexion) d'un animal dont le propriétaire
      // a activé le partage via un lien/QR code (champ shareEnabled)
      allow get: if resource.data.shareEnabled == true;
    }

    // Messagerie sécurisée propriétaire <-> vétérinaire, par animal
    match /animals/{animalId}/messages/{messageId} {
      // Lecture : propriétaire de l'animal, membre du foyer partagé, ou vétérinaire abonné
      allow read: if request.auth != null
        && (
          request.auth.uid == get(/databases/$(database)/documents/animals/$(animalId)).data.userId
          || (get(/databases/$(database)/documents/animals/$(animalId)).data.householdId != null
              && request.auth.uid in get(/databases/$(database)/documents/households/$(get(/databases/$(database)/documents/animals/$(animalId)).data.householdId)).data.members)
          || get(/databases/$(database)/documents/settings/$(request.auth.uid)).data.subscriptionStatus == 'active'
        );

      // Création : même conditions d'accès, et l'auteur déclaré ("from") doit correspondre
      // au rôle réel de l'utilisateur (propriétaire/foyer = 'proprietaire', vétérinaire abonné = 'veterinaire')
      allow create: if request.auth != null
        && (
          (request.resource.data.from == 'proprietaire'
            && (request.auth.uid == get(/databases/$(database)/documents/animals/$(animalId)).data.userId
                || (get(/databases/$(database)/documents/animals/$(animalId)).data.householdId != null
                    && request.auth.uid in get(/databases/$(database)/documents/households/$(get(/databases/$(database)/documents/animals/$(animalId)).data.householdId)).data.members)))
          || (request.resource.data.from == 'veterinaire'
              && get(/databases/$(database)/documents/settings/$(request.auth.uid)).data.subscriptionStatus == 'active')
        );
    }
    match /settings/{settingId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;

      // Foyer partagé : un membre du même foyer peut lire les settings (nom/prénom) des
      // autres membres pour afficher la liste des membres du foyer
      allow read: if request.auth != null
        && resource.data.householdId != null
        && resource.data.householdId == get(/databases/$(database)/documents/settings/$(request.auth.uid)).data.householdId;
    }
    match /households/{householdId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.members;

      // Création : l'utilisateur crée son foyer en étant son seul membre initial
      allow create: if request.auth != null
        && request.resource.data.members == [request.auth.uid];

      // Rejoindre (ajout de soi-même) ou quitter (retrait de soi-même) le foyer
      allow update: if request.auth != null
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members'])
        && (
          (request.resource.data.members.size() == resource.data.members.size() + 1
            && request.auth.uid in request.resource.data.members
            && !(request.auth.uid in resource.data.members))
          || (request.resource.data.members.size() == resource.data.members.size() - 1
            && !(request.auth.uid in request.resource.data.members)
            && request.auth.uid in resource.data.members)
        );
    }
  }
}
```

## Mise en place de l'abonnement Stripe (étapes manuelles obligatoires)

L'intégration Stripe est codée (Cloud Functions + UI), mais elle ne fonctionnera qu'après ces
étapes, à réaliser une seule fois :

### 1. Compte Stripe

1. Créer/ouvrir un compte sur [stripe.com](https://stripe.com).
2. Dans le Dashboard Stripe, créer un **produit** "Espace Vétérinaire" avec un **prix récurrent
   mensuel de 49,99 €**. Noter l'identifiant du prix (`price_...`).
3. Récupérer la **clé secrète API** (`sk_live_...` ou `sk_test_...` pour les tests).

### 2. Passer le projet Firebase au plan Blaze

Les Cloud Functions sortantes (appels réseau vers Stripe) nécessitent le plan **Blaze**
(pay-as-you-go) : Firebase Console > Paramètres du projet > Utilisation et facturation.

### 3. Installer le CLI Firebase et se connecter

```bash
npm install -g firebase-tools
firebase login
```

### 4. Configurer les secrets/paramètres des Cloud Functions

Depuis la racine du dépôt :

```bash
firebase use carnet-sante-pro

firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET   # voir étape 6, peut être mis à jour après coup

firebase functions:config:set 2> /dev/null || true   # (ignorer, on utilise defineString ci-dessous)
```

`STRIPE_PRICE_ID` et `APP_URL` sont définis via `defineString` (params) — Firebase demandera
leur valeur lors du premier déploiement, ou on peut créer un fichier `functions/.env` (non
commité, voir `functions/.gitignore`) :

```
STRIPE_PRICE_ID=price_xxxxxxxxxxxxx
APP_URL=https://carnet-sante-pro.web.app
```

(Remplacer `APP_URL` par le domaine réel de l'application si différent.)

### 5. Déployer les règles et les fonctions

```bash
firebase deploy --only firestore:rules,functions
```

Cela déploie `createCheckoutSession`, `createPortalSession` et `stripeWebhook`
(région `europe-west1`).

### 6. Configurer le webhook Stripe

1. Récupérer l'URL de la fonction `stripeWebhook` affichée après le déploiement (ex :
   `https://europe-west1-carnet-sante-pro.cloudfunctions.net/stripeWebhook`).
2. Dans le Dashboard Stripe > Développeurs > Webhooks, créer un endpoint avec cette URL et
   sélectionner les événements :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Copier le "Signing secret" (`whsec_...`) généré et le configurer :

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase deploy --only functions:stripeWebhook
```

### 7. Vérification

- Créer un compte vétérinaire (case "Je suis vétérinaire" à l'inscription).
- Se connecter : l'écran "🩺 Abonnement Espace Vétérinaire" doit apparaître.
- Cliquer sur "S'abonner — 49,99 €/mois" → redirection Stripe Checkout.
- Après paiement (utiliser une carte de test Stripe en mode test, ex : `4242 4242 4242 4242`),
  retour sur l'app avec `?vet_checkout=success` et déblocage automatique de l'espace vétérinaire
  (`subscriptionStatus` passe à `'active'` via le webhook, mis à jour en temps réel par
  `onSnapshot`).
- Le bouton "⚙️ Abonnement" doit ouvrir le portail de facturation Stripe.
