const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
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

// Webhook Stripe : tient à jour settings/{uid}.subscriptionStatus selon les événements d'abonnement
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
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const uid = subscription.metadata?.firebaseUID || await findUidByCustomerId(subscription.customer);
      if (uid) {
        const status = ['active', 'trialing'].includes(subscription.status) ? 'active' : subscription.status;
        await db.doc(`settings/${uid}`).set({
          subscriptionStatus: status,
          stripeSubscriptionId: subscription.id,
        }, { merge: true });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const uid = subscription.metadata?.firebaseUID || await findUidByCustomerId(subscription.customer);
      if (uid) {
        await db.doc(`settings/${uid}`).set({ subscriptionStatus: 'canceled' }, { merge: true });
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});
