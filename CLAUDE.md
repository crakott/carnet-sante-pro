# Carnet Santé PRO

Application React (SPA, fichier unique `index.html`) + Firebase Auth/Firestore.

## ⚠️ À FAIRE — Rappels importants

- [ ] **Slots AdSense** : remplacer les 5 occurrences de `xxxxxxxxxx` dans `index.html` par les vrais IDs de slot depuis le tableau de bord AdSense
- [ ] **Politique de confidentialité** (`privacy.html`) : remplir les 3 champs `[À COMPLÉTER]` — nom/société, email de contact, adresse postale du responsable de traitement

## Stack technique

- React 18 (UMD CDN) + Babel Standalone
- Firebase v10.7.0 (Auth + Firestore)
- PWA : `manifest.json` + `sw.js` + icônes dans `icons/`
- Google Tag Manager : GTM-MVNX7BHT
- Google AdSense : ca-pub-2220007213028900

## Branche de développement

`claude/new-session-b39y6h`

## Règles Firestore (à jour)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /animals/{animalId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    match /settings/{settingId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```
