# Carnet Santé PRO

Application React (SPA, fichier unique `index.html`) + Firebase Auth/Firestore.

## ⚠️ À FAIRE — Rappels importants

- [ ] **Slots AdSense** : remplacer les 5 occurrences de `xxxxxxxxxx` dans `index.html` par les vrais IDs de slot depuis le tableau de bord AdSense
- [ ] **Politique de confidentialité** (`privacy.html`) : remplir les 3 champs `[À COMPLÉTER]` — nom/société, email de contact, adresse postale du responsable de traitement
- [ ] **Règles Firestore** : copier le contenu de `firestore.rules` dans Firebase Console > Firestore Database > Règles, puis publier (nécessaire pour activer l'espace vétérinaire)

## Stack technique

- React 18 (UMD CDN) + Babel Standalone
- Firebase v10.7.0 (Auth + Firestore)
- PWA : `manifest.json` + `sw.js` + icônes dans `icons/`
- Google Tag Manager : GTM-MVNX7BHT
- Google AdSense : ca-pub-2220007213028900

## Branche de développement

`claude/new-session-b39y6h`

## Espace Vétérinaire (pro)

Un compte peut avoir le rôle `veterinaire` (champ `role` dans le document `settings`, choisi à
l'inscription via la case "Je suis vétérinaire"). Ces comptes arrivent sur `VetApp` au lieu de
l'app standard.

- **Accès** : le vétérinaire recherche un animal via son `identifiant` (ex : numéro de puce
  électronique), un champ optionnel renseigné par le propriétaire dans le profil de l'animal
  (et affiché avec un bouton "Copier" sur la fiche).
- **Permissions** : lecture complète du dossier + ajout de vaccins, médicaments,
  antiparasitaires, vermifuges, observations et pesées. Pas d'accès au profil de base
  (nom, race, sexe…), au budget, ni aux partages — ces champs restent réservés au propriétaire.

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

      // Vétérinaires "pro" : lecture de tout animal ayant un identifiant, écriture limitée
      // aux actes médicaux (pas le profil, le budget ou les partages)
      allow read: if request.auth != null && resource.data.identifiant is string && resource.data.identifiant != '';
      allow update: if request.auth != null
        && resource.data.identifiant is string && resource.data.identifiant != ''
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
