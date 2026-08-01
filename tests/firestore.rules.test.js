/**
 * Tests des règles Firestore — carnet-sante-pro
 *
 * Lance via :  npm run test:rules
 * (démarre l'émulateur Firestore, exécute vitest, arrête l'émulateur)
 *
 * IMPORTANT — @firebase/rules-unit-testing v3 utilise le SDK Compat Firebase et
 * appelle `firestore.useEmulator()` à chaque appel de `context.firestore()`.
 * Comme `useEmulator()` ne peut être invoqué qu'UNE SEULE FOIS par instance,
 * on stocke le résultat de `context.firestore()` dans `beforeAll` et on réutilise
 * la même référence dans tous les tests du fichier.
 *
 * Rôles simulés :
 *  ownerA          — propriétaire de animal-1 (uid-owner-a)
 *  ownerB          — autre propriétaire       (uid-owner-b)
 *  vetA            — vétérinaire, claim vetPro:true, dans authorizedVets  (uid-vet-a)
 *  vetB            — vétérinaire, claim vetPro:true, PAS dans authorizedVets (uid-vet-b)
 *  vetFake         — subscriptionStatus active dans Firestore, SANS claim vetPro (uid-vet-fake)
 *  householdMember — membre du foyer household-1 (uid-household-member)
 *  anon            — non authentifié
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECT_ID = 'carnet-sante-pro-test'

// ─── Environnement de test ───────────────────────────────────────────────────

let testEnv

/**
 * Instances Firestore par contexte — initialisées UNE SEULE FOIS dans beforeAll.
 * `context.firestore()` appelle `useEmulator()` à chaque fois (SDK compat) ;
 * appeler .firestore() plusieurs fois sur le même contexte déclenche
 * "Firestore has already been started". On stocke donc le résultat ici.
 */
let ownerADb, ownerBDb, vetADb, vetBDb, vetFakeDb, householdMemberDb, anonDb

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(__dirname, '../firestore.rules'), 'utf8'),
    },
  })

  // Obtenir UN SEUL objet Firestore par contexte et le conserver
  ownerADb         = testEnv.authenticatedContext('uid-owner-a').firestore()
  ownerBDb         = testEnv.authenticatedContext('uid-owner-b').firestore()
  // vetA : claim Firebase Auth `vetPro: true` + dans authorizedVets → accès autorisé
  vetADb           = testEnv.authenticatedContext('uid-vet-a', { vetPro: true }).firestore()
  // vetB : claim vetPro mais PAS dans authorizedVets → accès refusé
  vetBDb           = testEnv.authenticatedContext('uid-vet-b', { vetPro: true }).firestore()
  // vetFake : subscriptionStatus actif en Firestore, SANS claim vetPro → faille P0 bloquée
  vetFakeDb        = testEnv.authenticatedContext('uid-vet-fake').firestore()
  householdMemberDb = testEnv.authenticatedContext('uid-household-member').firestore()
  anonDb           = testEnv.unauthenticatedContext().firestore()
}, 30_000)

afterAll(async () => {
  await testEnv.cleanup()
})

// ─── Seeding ─────────────────────────────────────────────────────────────────

async function seedFirestore() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()

    // Animal appartenant à ownerA, dans household-1, vetA autorisé
    await setDoc(doc(db, 'animals', 'animal-1'), {
      userId:         'uid-owner-a',
      householdId:    'household-1',
      nom:            'Rex',
      espece:         'Chien',
      authorizedVets: ['uid-vet-a'],
      shareEnabled:   true,
    })

    // Foyer partagé : ownerA + householdMember
    await setDoc(doc(db, 'households', 'household-1'), {
      members: ['uid-owner-a', 'uid-household-member'],
    })

    // Settings des utilisateurs
    await setDoc(doc(db, 'settings', 'uid-owner-a'), {
      userId:      'uid-owner-a',
      role:        'proprietaire',
      householdId: 'household-1',
      nom:         'Dupont',
      prenom:      'Jean',
    })

    await setDoc(doc(db, 'settings', 'uid-household-member'), {
      userId:      'uid-household-member',
      role:        'proprietaire',
      householdId: 'household-1',
      nom:         'Dupont',
      prenom:      'Marie',
    })

    await setDoc(doc(db, 'settings', 'uid-vet-a'), {
      userId:             'uid-vet-a',
      role:               'veterinaire',
      subscriptionStatus: 'active',
      nom:                'Martin',
      prenom:             'Sophie',
    })

    // vetFake : subscriptionStatus actif en Firestore mais SANS claim Firebase Auth vetPro
    await setDoc(doc(db, 'settings', 'uid-vet-fake'), {
      userId:             'uid-vet-fake',
      role:               'veterinaire',
      subscriptionStatus: 'active',
      nom:                'Hacker',
      prenom:             'Evil',
    })

    // Fiche publique (publicAnimalCards)
    await setDoc(doc(db, 'publicAnimalCards', 'animal-1'), {
      nom:     'Rex',
      espece:  'Chien',
      vaccins: [],
    })

    // Lien d'invitation existant
    await setDoc(doc(db, 'invitationLinks', 'token-abc'), {
      householdId: 'household-1',
      createdBy:   'uid-owner-a',
      createdAt:   new Date(),
    })

    // Demande d'accès vétérinaire en attente (vetB demande l'accès à animal-1 d'ownerA)
    await setDoc(doc(db, 'vetAccessRequests', 'request-1'), {
      vetUid:    'uid-vet-b',
      vetNom:    'Leclerc',
      vetPrenom: 'Paul',
      animalId:  'animal-1',
      animalNom: 'Rex',
      ownerUid:  'uid-owner-a',
      status:    'pending',
      createdAt: new Date(),
    })
  })
}

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedFirestore()
}, 15_000)

// ─────────────────────────────────────────────────────────────────────────────
// animals/{animalId} — LECTURE
// ─────────────────────────────────────────────────────────────────────────────

describe('animals/{animalId} — lecture', () => {
  it('ownerA peut lire son propre animal', async () => {
    await assertSucceeds(getDoc(doc(ownerADb, 'animals', 'animal-1')))
  })

  it("ownerB ne peut PAS lire l'animal d'ownerA", async () => {
    await assertFails(getDoc(doc(ownerBDb, 'animals', 'animal-1')))
  })

  it('householdMember peut lire (même foyer)', async () => {
    await assertSucceeds(getDoc(doc(householdMemberDb, 'animals', 'animal-1')))
  })

  it('vetA peut lire (claim vetPro + dans authorizedVets)', async () => {
    await assertSucceeds(getDoc(doc(vetADb, 'animals', 'animal-1')))
  })

  it('vetB ne peut PAS lire (claim vetPro mais PAS dans authorizedVets)', async () => {
    await assertFails(getDoc(doc(vetBDb, 'animals', 'animal-1')))
  })

  it('vetFake ne peut PAS lire (subscriptionStatus actif SANS claim vetPro — faille P0)', async () => {
    await assertFails(getDoc(doc(vetFakeDb, 'animals', 'animal-1')))
  })

  it('anonymous ne peut PAS lire', async () => {
    await assertFails(getDoc(doc(anonDb, 'animals', 'animal-1')))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// animals/{animalId} — MISE À JOUR
// ─────────────────────────────────────────────────────────────────────────────

describe('animals/{animalId} — mise à jour', () => {
  it('ownerA peut update son animal (tous champs)', async () => {
    await assertSucceeds(
      updateDoc(doc(ownerADb, 'animals', 'animal-1'), { nom: 'Rexou', espece: 'Chien' })
    )
  })

  it("ownerB ne peut PAS update l'animal d'ownerA", async () => {
    await assertFails(
      updateDoc(doc(ownerBDb, 'animals', 'animal-1'), { nom: 'Volé' })
    )
  })

  it('vetA peut update uniquement les champs médicaux (vaccins)', async () => {
    await assertSucceeds(
      updateDoc(doc(vetADb, 'animals', 'animal-1'), {
        vaccins: [{ nom: 'Rage', date: '2024-01-15' }],
      })
    )
  })

  it('vetA ne peut PAS update nom (champ non médical)', async () => {
    await assertFails(
      updateDoc(doc(vetADb, 'animals', 'animal-1'), { nom: 'RexModifié' })
    )
  })

  it('vetA ne peut PAS update authorizedVets (champ sensible propriétaire)', async () => {
    await assertFails(
      updateDoc(doc(vetADb, 'animals', 'animal-1'), {
        authorizedVets: ['uid-vet-a', 'uid-vet-b'],
      })
    )
  })

  it('vetB ne peut PAS update (pas dans authorizedVets)', async () => {
    await assertFails(
      updateDoc(doc(vetBDb, 'animals', 'animal-1'), {
        vaccins: [{ nom: 'Rage', date: '2024-01-15' }],
      })
    )
  })

  it('vetFake ne peut PAS update (pas de claim vetPro)', async () => {
    await assertFails(
      updateDoc(doc(vetFakeDb, 'animals', 'animal-1'), {
        vaccins: [{ nom: 'Rage', date: '2024-01-15' }],
      })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// settings/{settingId} — MISE À JOUR
// ─────────────────────────────────────────────────────────────────────────────

describe('settings/{settingId} — mise à jour', () => {
  it('ownerA peut update ses propres settings (champs neutres)', async () => {
    await assertSucceeds(
      updateDoc(doc(ownerADb, 'settings', 'uid-owner-a'), { nom: 'Durand', prenom: 'Paul' })
    )
  })

  it('ownerA ne peut PAS écrire subscriptionStatus (champ protégé serveur)', async () => {
    await assertFails(
      updateDoc(doc(ownerADb, 'settings', 'uid-owner-a'), { subscriptionStatus: 'active' })
    )
  })

  it('ownerA ne peut PAS écrire role (champ protégé serveur)', async () => {
    await assertFails(
      updateDoc(doc(ownerADb, 'settings', 'uid-owner-a'), { role: 'veterinaire' })
    )
  })

  it('ownerA ne peut PAS écrire stripeCustomerId (champ protégé serveur)', async () => {
    await assertFails(
      updateDoc(doc(ownerADb, 'settings', 'uid-owner-a'), { stripeCustomerId: 'cus_fake123' })
    )
  })

  it("ownerB ne peut PAS update les settings d'ownerA", async () => {
    await assertFails(
      updateDoc(doc(ownerBDb, 'settings', 'uid-owner-a'), { nom: 'Pirate' })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// settings/{settingId} — LECTURE
// ─────────────────────────────────────────────────────────────────────────────

describe('settings/{settingId} — lecture', () => {
  it('ownerA peut lire ses propres settings', async () => {
    await assertSucceeds(getDoc(doc(ownerADb, 'settings', 'uid-owner-a')))
  })

  it("ownerB ne peut PAS lire les settings d'ownerA", async () => {
    await assertFails(getDoc(doc(ownerBDb, 'settings', 'uid-owner-a')))
  })

  it("ownerA peut lire les settings d'un vétérinaire (role == veterinaire)", async () => {
    // Permettre la vérification d'identité du vet avant de l'ajouter à authorizedVets
    await assertSucceeds(getDoc(doc(ownerADb, 'settings', 'uid-vet-a')))
  })

  it("householdMember peut lire les settings d'ownerA (même householdId)", async () => {
    await assertSucceeds(getDoc(doc(householdMemberDb, 'settings', 'uid-owner-a')))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// publicAnimalCards/{animalId} — LECTURE
// ─────────────────────────────────────────────────────────────────────────────

describe('publicAnimalCards/{animalId} — lecture', () => {
  it('anonymous peut lire (accès public, objectif QR code)', async () => {
    await assertSucceeds(getDoc(doc(anonDb, 'publicAnimalCards', 'animal-1')))
  })

  it('ownerA peut lire', async () => {
    await assertSucceeds(getDoc(doc(ownerADb, 'publicAnimalCards', 'animal-1')))
  })

  it('ownerB peut lire', async () => {
    await assertSucceeds(getDoc(doc(ownerBDb, 'publicAnimalCards', 'animal-1')))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// publicAnimalCards/{animalId} — ÉCRITURE
// ─────────────────────────────────────────────────────────────────────────────

describe('publicAnimalCards/{animalId} — écriture', () => {
  it('ownerA (propriétaire de l\'animal) peut écrire', async () => {
    await assertSucceeds(
      setDoc(doc(ownerADb, 'publicAnimalCards', 'animal-1'), {
        nom: 'Rex', espece: 'Chien', vaccins: [{ nom: 'Rage' }],
      })
    )
  })

  it('householdMember (membre du foyer) peut écrire', async () => {
    await assertSucceeds(
      setDoc(doc(householdMemberDb, 'publicAnimalCards', 'animal-1'), {
        nom: 'Rex', espece: 'Chien', vaccins: [],
      })
    )
  })

  it('ownerB ne peut PAS écrire (ni propriétaire ni membre du foyer)', async () => {
    await assertFails(
      setDoc(doc(ownerBDb, 'publicAnimalCards', 'animal-1'), {
        nom: 'Rex Volé', espece: 'Chien', vaccins: [],
      })
    )
  })

  it('anonymous ne peut PAS écrire', async () => {
    await assertFails(
      setDoc(doc(anonDb, 'publicAnimalCards', 'animal-1'), {
        nom: 'Rex', espece: 'Chien', vaccins: [],
      })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// households/{householdId} — REJOINDRE / QUITTER
// ─────────────────────────────────────────────────────────────────────────────

describe('households/{householdId} — rejoindre / quitter', () => {
  it("ownerB peut rejoindre household-1 (s'ajouter lui-même)", async () => {
    // Taille passe de 2 à 3, uid-owner-b s'ajoute lui-même
    await assertSucceeds(
      updateDoc(doc(ownerBDb, 'households', 'household-1'), {
        members: ['uid-owner-a', 'uid-household-member', 'uid-owner-b'],
      })
    )
  })

  it('householdMember peut quitter household-1 (se retirer lui-même)', async () => {
    // Taille passe de 2 à 1, uid-household-member se retire
    await assertSucceeds(
      updateDoc(doc(householdMemberDb, 'households', 'household-1'), {
        members: ['uid-owner-a'],
      })
    )
  })

  it("ownerA ne peut PAS ajouter ownerB à sa place (doit être soi-même)", async () => {
    // ownerA (déjà membre) tente d'ajouter uid-owner-b : la règle exige que
    // c'est request.auth.uid qui s'ajoute lui-même et qu'il n'était pas déjà là
    await assertFails(
      updateDoc(doc(ownerADb, 'households', 'household-1'), {
        members: ['uid-owner-a', 'uid-household-member', 'uid-owner-b'],
      })
    )
  })

  it('anonymous ne peut PAS rejoindre', async () => {
    await assertFails(
      updateDoc(doc(anonDb, 'households', 'household-1'), {
        members: ['uid-owner-a', 'uid-household-member', 'uid-anon'],
      })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// invitationLinks/{token} — LECTURE
// ─────────────────────────────────────────────────────────────────────────────

describe('invitationLinks/{token} — lecture', () => {
  it('anonymous peut lire (le token UUID est le secret)', async () => {
    await assertSucceeds(getDoc(doc(anonDb, 'invitationLinks', 'token-abc')))
  })

  it('ownerA peut lire', async () => {
    await assertSucceeds(getDoc(doc(ownerADb, 'invitationLinks', 'token-abc')))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// invitationLinks/{token} — CRÉATION
// ─────────────────────────────────────────────────────────────────────────────

describe("invitationLinks/{token} — création", () => {
  it("ownerA (membre du foyer) peut créer un lien d'invitation", async () => {
    await assertSucceeds(
      setDoc(doc(ownerADb, 'invitationLinks', 'token-new-ownerA'), {
        householdId: 'household-1',
        createdBy:   'uid-owner-a',
        createdAt:   new Date(),
      })
    )
  })

  it("ownerB (non membre) ne peut PAS créer un lien d'invitation", async () => {
    await assertFails(
      setDoc(doc(ownerBDb, 'invitationLinks', 'token-new-ownerB'), {
        householdId: 'household-1',
        createdBy:   'uid-owner-b',
        createdAt:   new Date(),
      })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// vetAccessRequests/{requestId} — flux invitation vétérinaire
// ─────────────────────────────────────────────────────────────────────────────

describe('vetAccessRequests — création', () => {
  it('vetA (claim vetPro) peut créer une demande d\'accès', async () => {
    await assertSucceeds(
      setDoc(doc(vetADb, 'vetAccessRequests', 'request-by-vetA'), {
        vetUid:    'uid-vet-a',
        vetNom:    'Martin',
        vetPrenom: 'Sophie',
        animalId:  'animal-1',
        animalNom: 'Rex',
        ownerUid:  'uid-owner-a',
        status:    'pending',
        createdAt: new Date(),
      })
    )
  })

  it('vetFake (sans claim vetPro) ne peut PAS créer une demande', async () => {
    await assertFails(
      setDoc(doc(vetFakeDb, 'vetAccessRequests', 'request-by-fake'), {
        vetUid:    'uid-vet-fake',
        vetNom:    'Hacker',
        vetPrenom: 'Evil',
        animalId:  'animal-1',
        animalNom: 'Rex',
        ownerUid:  'uid-owner-a',
        status:    'pending',
        createdAt: new Date(),
      })
    )
  })

  it('ownerA (sans claim vetPro) ne peut PAS créer une demande', async () => {
    await assertFails(
      setDoc(doc(ownerADb, 'vetAccessRequests', 'request-by-owner'), {
        vetUid:    'uid-owner-a',
        vetNom:    'Dupont',
        vetPrenom: 'Jean',
        animalId:  'animal-1',
        animalNom: 'Rex',
        ownerUid:  'uid-owner-a',
        status:    'pending',
        createdAt: new Date(),
      })
    )
  })
})

describe('vetAccessRequests — lecture et mise à jour du statut', () => {
  it('ownerA peut lire les demandes en attente sur ses animaux', async () => {
    await assertSucceeds(getDoc(doc(ownerADb, 'vetAccessRequests', 'request-1')))
  })

  it('ownerA peut accepter une demande (status → accepted)', async () => {
    await assertSucceeds(
      updateDoc(doc(ownerADb, 'vetAccessRequests', 'request-1'), { status: 'accepted' })
    )
  })

  it('vetA ne peut PAS modifier le statut (seul le propriétaire peut accepter/refuser)', async () => {
    await assertFails(
      updateDoc(doc(vetADb, 'vetAccessRequests', 'request-1'), { status: 'accepted' })
    )
  })
})
