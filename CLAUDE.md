# Carnet Santé PRO

Application React (SPA, fichier unique `index.html`) + Firebase Auth/Firestore/Functions + Stripe.

## ⚠️ À FAIRE — Rappels importants

- [ ] **Slots AdSense** : remplacer les 5 occurrences de `xxxxxxxxxx` dans `index.html` par les vrais IDs de slot depuis le tableau de bord AdSense
- [x] **Politique de confidentialité** (`privacy.html`) : champs responsable de traitement complétés (Rakotoson Christopher / carnetsante2@gmail.com / 12 rue de Vendée, Villedieu-la-Blouère, 49450 Beaupréau-en-Mauges)
- [ ] **Règles Firestore** : copier le contenu de `firestore.rules` dans Firebase Console > Firestore Database > Règles, puis publier (nécessaire pour activer l'espace vétérinaire et le contrôle d'abonnement)
- [ ] **Mettre en place l'abonnement Stripe** (espace vétérinaire à 49,99 €/mois) — voir section dédiée ci-dessous, ÉTAPES MANUELLES OBLIGATOIRES avant que le paiement fonctionne

## Stack technique

- React 18 (UMD CDN) + Babel Standalone
- Firebase v10.7.0 (Auth + Firestore + Functions)
- Cloud Functions v2 (Node 20, région `europe-west1`) pour l'intégration Stripe
- Stripe (Checkout + Billing Portal + Webhooks) pour l'abonnement vétérinaire
- PWA : `manifest.json` + `sw.js` + icônes dans `icons/`, installable sur mobile (Add to Home Screen)
- Firestore : persistance locale IndexedDB activée (`persistentLocalCache` + `persistentMultipleTabManager`)
  pour permettre la consultation/modification hors connexion avec synchronisation au retour du réseau
- Google Tag Manager : GTM-MVNX7BHT
- Google AdSense : ca-pub-2220007213028900

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
- **Accès une fois abonné** : le vétérinaire recherche un animal via son `identifiant` (ex :
  numéro de puce électronique), un champ optionnel renseigné par le propriétaire dans le profil
  de l'animal (et affiché avec un bouton "Copier" sur la fiche).
- **Permissions** : lecture complète du dossier + ajout de vaccins, médicaments,
  antiparasitaires, vermifuges, observations et pesées. Pas d'accès au profil de base
  (nom, race, sexe…), au budget, ni aux partages — ces champs restent réservés au propriétaire.

## Document `settings/{uid}`

Le document de paramètres est désormais identifié par l'UID Firebase de l'utilisateur (au lieu
d'un ID auto-généré recherché via `where('userId','==',uid)`). Le champ `userId` est conservé
pour compatibilité avec les règles Firestore existantes. Au premier chargement, un éventuel
ancien document (`userId == uid` mais ID aléatoire) est automatiquement migré vers `settings/{uid}`.

Champs :
- `userId` : uid du propriétaire du document
- `role` : `'proprietaire'` ou `'veterinaire'`
- `reminders` : préférences de rappels (`vaccin`, `medicament`, `antiparasitaire`, `vermifuge`)
- `subscriptionStatus` (vétérinaires uniquement) : `'inactive' | 'active' | 'past_due' | 'canceled' | ...`
  mis à jour par le webhook Stripe (`functions/index.js`)
- `stripeCustomerId`, `stripeSubscriptionId` : identifiants Stripe associés au compte

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

      // Vétérinaires "pro" abonnés : lecture de tout animal ayant un identifiant, écriture limitée
      // aux actes médicaux (pas le profil, le budget ou les partages)
      allow read: if request.auth != null && resource.data.identifiant is string && resource.data.identifiant != ''
        && get(/databases/$(database)/documents/settings/$(request.auth.uid)).data.subscriptionStatus == 'active';
      allow update: if request.auth != null
        && resource.data.identifiant is string && resource.data.identifiant != ''
        && get(/databases/$(database)/documents/settings/$(request.auth.uid)).data.subscriptionStatus == 'active'
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['vaccins', 'medicaments', 'antiparasitaires', 'vermifuges', 'observations', 'poids']);
    }
    match /settings/{settingId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
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
