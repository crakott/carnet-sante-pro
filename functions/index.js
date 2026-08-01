const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp();

const REGION = 'europe-west1';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const stripePriceId = defineString('STRIPE_PRICE_ID');
const appUrl = defineString('APP_URL');

// Crée une session Stripe Checkout pour l'abonnement mensuel "Espace Vétérinaire" (49,99 €/mois)
exports.createCheckoutSession = onCall({ region: REGION, secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Vous devez être connecté.');
  }

  const stripe = new Stripe(stripeSecretKey.value());
  const uid = request.auth.uid;
  const db = admin.firestore();
  const settingsRef = db.doc(`settings/${uid}`);
  const settingsSnap = await settingsRef.get();
  const settings = settingsSnap.data() || {};

  let customerId = settings.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: request.auth.token.email,
      metadata: { firebaseUID: uid },
    });
    customerId = customer.id;
    await settingsRef.set({ stripeCustomerId: customerId }, { merge: true });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: stripePriceId.value(), quantity: 1 }],
    success_url: `${appUrl.value()}/?vet_checkout=success`,
    cancel_url: `${appUrl.value()}/?vet_checkout=cancel`,
    client_reference_id: uid,
    metadata: { firebaseUID: uid },
    subscription_data: { metadata: { firebaseUID: uid } },
  });

  return { url: session.url };
});

// Crée une session du portail de facturation Stripe (gestion / résiliation de l'abonnement)
exports.createPortalSession = onCall({ region: REGION, secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Vous devez être connecté.');
  }

  const stripe = new Stripe(stripeSecretKey.value());
  const uid = request.auth.uid;
  const settingsSnap = await admin.firestore().doc(`settings/${uid}`).get();
  const customerId = settingsSnap.data()?.stripeCustomerId;

  if (!customerId) {
    throw new HttpsError('failed-precondition', "Aucun abonnement n'a été trouvé pour ce compte.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl.value()}/`,
  });

  return { url: session.url };
});

// Positionne (ou retire) le Custom Claim Firebase Auth "vetPro" pour un UID donné.
// Ce claim est la source d'autorité pour les règles Firestore — le client ne peut pas
// le modifier directement, contrairement au document Firestore settings/{uid}.
const setVetClaim = async (uid, isActive) => {
  await admin.auth().setCustomUserClaims(uid, { vetPro: isActive === true });
};

// Webhook Stripe : tient à jour settings/{uid}.subscriptionStatus ET le Custom Claim
// vetPro selon les événements d'abonnement. Les deux sont toujours mis à jour ensemble.
exports.stripeWebhook = onRequest({ region: REGION, secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
  const stripe = new Stripe(stripeSecretKey.value());
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
  } catch (err) {
    console.error('Signature webhook Stripe invalide:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const db = admin.firestore();

  const findUidByCustomerId = async (customerId) => {
    const snap = await db.collection('settings').where('stripeCustomerId', '==', customerId).limit(1).get();
    return snap.empty ? null : snap.docs[0].id;
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const uid = session.metadata?.firebaseUID || session.client_reference_id;
      if (uid) {
        await db.doc(`settings/${uid}`).set({
          subscriptionStatus: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        }, { merge: true });
        await setVetClaim(uid, true);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const uid = subscription.metadata?.firebaseUID || await findUidByCustomerId(subscription.customer);
      if (uid) {
        const isActive = ['active', 'trialing'].includes(subscription.status);
        const status = isActive ? 'active' : subscription.status;
        await db.doc(`settings/${uid}`).set({
          subscriptionStatus: status,
          stripeSubscriptionId: subscription.id,
        }, { merge: true });
        await setVetClaim(uid, isActive);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const uid = subscription.metadata?.firebaseUID || await findUidByCustomerId(subscription.customer);
      if (uid) {
        await db.doc(`settings/${uid}`).set({ subscriptionStatus: 'canceled' }, { merge: true });
        await setVetClaim(uid, false);
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

// Synchronise le Custom Claim vetPro pour le vétérinaire connecté.
// Appelée côté client au montage de VetApp pour les abonnés existants qui n'auraient
// pas encore leur claim (migration ou expiration de token). Le statut est lu depuis
// Firestore côté serveur (champ protégé en écriture pour le client), pas depuis le token.
exports.refreshVetClaim = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Connexion requise.');
  }
  const uid = request.auth.uid;
  const settingsSnap = await admin.firestore().doc(`settings/${uid}`).get();
  const isActive = settingsSnap.data()?.subscriptionStatus === 'active';
  await setVetClaim(uid, isActive);
  return { vetPro: isActive };
});

// Scheduled daily at 8:00 AM Paris time: send FCM push notifications for upcoming
// vaccine, treatment, antiparasitic and dewormer due dates, based on each user's
// configured thresholds (settings/{uid}.reminders). Fires at threshold day (advance
// warning), the day before, and the day of. Dedup via settings/{uid}.upcomingSentKeys.
exports.sendUpcomingReminders = onSchedule({ schedule: '0 8 * * *', region: REGION, timeZone: 'Europe/Paris' }, async () => {
  const db = admin.firestore();
  const messaging = admin.messaging();

  const now = new Date();
  const parisDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [day, month, year] = parisDate.split('/');
  const todayStr = `${year}-${month}-${day}`;
  const todayMs = new Date(todayStr).getTime();

  const settingsSnap = await db.collection('settings').where('fcmToken', '!=', null).get();

  for (const settingDoc of settingsSnap.docs) {
    const uid = settingDoc.id;
    const { fcmToken, householdId, reminders = {}, lastUpcomingDate, upcomingSentKeys = [] } = settingDoc.data();
    if (!fcmToken) continue;

    const thresholds = {
      vaccin: reminders.vaccin ?? 3,
      medicament: reminders.medicament ?? 3,
      antiparasitaire: reminders.antiparasitaire ?? 14,
      vermifuge: reminders.vermifuge ?? 14,
    };

    const sentKeys = lastUpcomingDate === todayStr ? upcomingSentKeys : [];

    const animalsQuery = householdId
      ? db.collection('animals').where('householdId', '==', householdId)
      : db.collection('animals').where('userId', '==', uid);
    const animalsSnap = await animalsQuery.get();

    const newKeys = [];

    const checkAndSend = async (type, animalNom, nom, dateStr, threshold) => {
      if (!dateStr) return;
      const targetMs = new Date(dateStr).getTime();
      if (isNaN(targetMs)) return;
      const daysUntil = Math.ceil((targetMs - todayMs) / 86400000);
      if (daysUntil < 0 || (daysUntil !== threshold && daysUntil !== 1 && daysUntil !== 0)) return;

      const key = `${type}|${animalNom}|${nom}|${daysUntil}`;
      if (sentKeys.includes(key) || newKeys.includes(key)) return;

      const emoji = type === 'vaccin' ? '💉' : type === 'medicament' ? '💊' : type === 'antiparasitaire' ? '🦟' : '🪱';
      const delay = daysUntil === 0 ? "aujourd'hui" : daysUntil === 1 ? 'demain' : `dans ${daysUntil} jours`;

      try {
        await messaging.send({
          token: fcmToken,
          notification: { title: `${emoji} ${animalNom} — ${nom}`, body: `Rappel ${delay}` },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });
        newKeys.push(key);
      } catch (err) {
        if (err.code === 'messaging/registration-token-not-registered') {
          await settingDoc.ref.set({ fcmToken: null }, { merge: true });
        }
      }
    };

    for (const animalDoc of animalsSnap.docs) {
      const animal = animalDoc.data();
      for (const v of (animal.vaccins || [])) await checkAndSend('vaccin', animal.nom, v.nom, v.rappel || v.date, thresholds.vaccin);
      for (const m of (animal.medicaments || [])) await checkAndSend('medicament', animal.nom, m.nom, m.dateFin, thresholds.medicament);
      for (const t of (animal.antiparasitaires || [])) await checkAndSend('antiparasitaire', animal.nom, t.nom || 'Antiparasitaire', t.prochainTraitement, thresholds.antiparasitaire);
      for (const t of (animal.vermifuges || [])) await checkAndSend('vermifuge', animal.nom, t.nom || 'Vermifuge', t.prochainTraitement, thresholds.vermifuge);
    }

    if (newKeys.length > 0) {
      await settingDoc.ref.set({
        lastUpcomingDate: todayStr,
        upcomingSentKeys: [...sentKeys, ...newKeys],
      }, { merge: true });
    }
  }
});

// Scheduled every 30 minutes: send FCM push notifications for medication dose times
// that fall within the current 30-minute window (Paris timezone).
// Users receive a push notification even when their phone is locked, as long as
// they have activated notifications in the app and the VAPID key is configured.
exports.sendDoseReminders = onSchedule({ schedule: 'every 30 minutes', region: REGION, timeZone: 'Europe/Paris' }, async () => {
  const db = admin.firestore();
  const messaging = admin.messaging();

  // Current window in Paris time
  const now = new Date();
  const fmt = (type) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', [type]: '2-digit', hour12: false }).format(now);
  const parisHour = parseInt(fmt('hour'));
  const parisMin = parseInt(fmt('minute'));
  const windowStart = parisHour * 60 + parisMin;
  const windowEnd = windowStart + 30;

  const parisDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [day, month, year] = parisDate.split('/');
  const todayStr = `${year}-${month}-${day}`;

  // All users with an FCM token registered
  const settingsSnap = await db.collection('settings').where('fcmToken', '!=', null).get();

  for (const settingDoc of settingsSnap.docs) {
    const uid = settingDoc.id;
    const { fcmToken, householdId, lastNotifDate, notifSentKeys = [] } = settingDoc.data();
    if (!fcmToken) continue;

    // Reset daily dedup if it's a new day
    const sentKeys = lastNotifDate === todayStr ? notifSentKeys : [];

    const animalsQuery = householdId
      ? db.collection('animals').where('householdId', '==', householdId)
      : db.collection('animals').where('userId', '==', uid);
    const animalsSnap = await animalsQuery.get();

    const newKeys = [];
    for (const animalDoc of animalsSnap.docs) {
      const animal = animalDoc.data();
      for (const med of (animal.medicaments || [])) {
        if (!med.heures || !med.heures.length) continue;
        if (!med.dateDebut || !med.dateFin) continue;
        if (todayStr < med.dateDebut || todayStr > med.dateFin) continue;

        for (const heure of med.heures) {
          const [h, m] = heure.split(':').map(Number);
          const doseMin = h * 60 + m;
          if (doseMin < windowStart || doseMin >= windowEnd) continue;

          const key = `${animalDoc.id}|${med.nom}|${heure}`;
          if (sentKeys.includes(key) || newKeys.includes(key)) continue;

          try {
            await messaging.send({
              token: fcmToken,
              notification: { title: `💊 ${animal.nom}`, body: `${med.nom} — dose de ${heure}` },
              android: { priority: 'high' },
              apns: { payload: { aps: { sound: 'default', badge: 1 } } },
            });
            newKeys.push(key);
          } catch (err) {
            // Invalid or expired token — remove it so we don't keep trying
            if (err.code === 'messaging/registration-token-not-registered') {
              await settingDoc.ref.set({ fcmToken: null }, { merge: true });
            }
          }
        }
      }
    }

    if (newKeys.length > 0) {
      await settingDoc.ref.set({
        lastNotifDate: todayStr,
        notifSentKeys: [...sentKeys, ...newKeys],
      }, { merge: true });
    }
  }
});

// Triggered when a new message is created in animals/{animalId}/messages/{messageId}.
// Sends a FCM push notification to the recipient(s):
//   - from 'veterinaire' → notify the animal's owner + household members
//   - from 'proprietaire' → notify vets who previously participated in this thread
exports.sendMessageNotification = onDocumentCreated({ document: 'animals/{animalId}/messages/{messageId}', region: REGION }, async (event) => {
  const message = event.data.data();
  const { animalId } = event.params;
  if (!message || !message.from) return;

  const db = admin.firestore();
  const messaging = admin.messaging();

  const animalDoc = await db.doc(`animals/${animalId}`).get();
  if (!animalDoc.exists) return;
  const animal = animalDoc.data();
  const animalNom = animal.nom || 'Animal';
  const bodyText = message.text ? message.text.substring(0, 120) : '📷 Photo';

  let title;

  const sendTo = async (uid) => {
    if (!uid) return;
    const settingsDoc = await db.doc(`settings/${uid}`).get();
    const fcmToken = settingsDoc.data()?.fcmToken;
    if (!fcmToken) return;
    try {
      await messaging.send({
        token: fcmToken,
        notification: { title, body: `${animalNom} — ${bodyText}` },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
    } catch (err) {
      if (err.code === 'messaging/registration-token-not-registered') {
        await db.doc(`settings/${uid}`).set({ fcmToken: null }, { merge: true });
      }
    }
  };

  if (message.from === 'veterinaire') {
    const vetName = [message.authorPrenom, message.authorNom].filter(Boolean).join(' ') || 'Votre vétérinaire';
    title = `💬 Dr. ${vetName}`;
    const recipientUids = new Set([animal.userId].filter(Boolean));
    if (animal.householdId) {
      const householdDoc = await db.doc(`households/${animal.householdId}`).get();
      (householdDoc.data()?.members || []).forEach(uid => recipientUids.add(uid));
    }
    for (const uid of recipientUids) await sendTo(uid);

  } else if (message.from === 'proprietaire') {
    const ownerName = [message.authorPrenom, message.authorNom].filter(Boolean).join(' ') || 'Le propriétaire';
    title = `💬 ${ownerName}`;
    const prevVetMessages = await db.collection(`animals/${animalId}/messages`)
      .where('from', '==', 'veterinaire')
      .limit(20)
      .get();
    const vetUids = new Set();
    prevVetMessages.docs.forEach(doc => {
      const uid = doc.data().authorUid;
      if (uid) vetUids.add(uid);
    });
    for (const uid of vetUids) await sendTo(uid);
  }
});

// Recherche d'animaux pour un vétérinaire — retourne uniquement les champs non-sensibles.
// Accessible uniquement aux vétérinaires avec le Custom Claim vetPro: true.
// Ne retourne jamais : medical data, authorizedVets complet, householdId, etc.
exports.searchAnimalsForVet = onCall({ region: REGION }, async (request) => {
  if (!request.auth || !request.auth.token.vetPro) {
    throw new HttpsError('permission-denied', 'Réservé aux vétérinaires abonnés.');
  }

  const { proprietaireNom, proprietairePrenom, animalNom } = request.data || {};
  if (!proprietaireNom || String(proprietaireNom).trim().length < 2) {
    throw new HttpsError('invalid-argument', 'Nom du propriétaire requis (min. 2 caractères).');
  }

  const db = admin.firestore();
  let q = db.collection('animals').where('proprietaireNom', '==', String(proprietaireNom).trim());
  if (proprietairePrenom && String(proprietairePrenom).trim()) {
    q = q.where('proprietairePrenom', '==', String(proprietairePrenom).trim());
  }

  const snap = await q.get();
  const vetUid = request.auth.uid;
  const animalNomFilter = animalNom ? String(animalNom).trim().toLowerCase() : '';

  const results = snap.docs
    .filter(docSnap => {
      if (!animalNomFilter) return true;
      return (docSnap.data().nom || '').toLowerCase().includes(animalNomFilter);
    })
    .map(docSnap => {
      const d = docSnap.data();
      return {
        animalId: docSnap.id,
        animalNom: d.nom || '',
        espece: d.espece || '',
        proprietaireNom: d.proprietaireNom || '',
        proprietairePrenom: d.proprietairePrenom || '',
        alreadyAuthorized: Array.isArray(d.authorizedVets) && d.authorizedVets.includes(vetUid),
        ownerUid: d.userId || '',
      };
    });

  return { results };
});

// Recherche d'animaux pour un vétérinaire — retourne uniquement les champs publics.
// Accessible uniquement aux vétérinaires avec le Custom Claim vetPro: true.
// Ne retourne jamais userId, authorizedVets, données médicales, documents ou budget.
exports.searchAnimalsForVet = onCall({ region: REGION }, async (request) => {
  if (!request.auth || !request.auth.token.vetPro) {
    throw new HttpsError('permission-denied', 'Réservé aux vétérinaires abonnés.');
  }
  const { proprietaireNom, proprietairePrenom, animalNom } = request.data;
  if (!proprietaireNom || proprietaireNom.trim().length < 2) {
    throw new HttpsError('invalid-argument', 'Nom du propriétaire requis (min. 2 caractères).');
  }

  let q = admin.firestore().collection('animals')
    .where('proprietaireNom', '==', proprietaireNom.trim());
  if (proprietairePrenom && proprietairePrenom.trim()) {
    q = q.where('proprietairePrenom', '==', proprietairePrenom.trim());
  }

  const snap = await q.get();
  const results = snap.docs
    .filter(doc => !animalNom || (doc.data().nom || '').toLowerCase().includes(animalNom.toLowerCase()))
    .map(doc => ({
      animalId: doc.id,
      animalNom: doc.data().nom || '',
      espece: doc.data().espece || '',
      proprietaireNom: doc.data().proprietaireNom || '',
      proprietairePrenom: doc.data().proprietairePrenom || '',
      alreadyAuthorized: Array.isArray(doc.data().authorizedVets) && doc.data().authorizedVets.includes(request.auth.uid),
    }));

  return { results };
});
