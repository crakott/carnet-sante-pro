import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { httpsCallable } from 'firebase/functions';
import { Screen, Card, Button } from '../../components/ui';
import { functions } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

// Paywall for the "Espace Vétérinaire" — opens Stripe Checkout in the system browser
// (mirrors the subStatus !== 'active' branch of VetApp in the web app)
export default function VetSubscriptionScreen() {
  const { logout } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingError, setBillingError] = useState('');

  const handleSubscribe = async () => {
    setBillingError('');
    setCheckoutLoading(true);
    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession();
      await Linking.openURL(result.data.url);
    } catch (err) {
      setBillingError('Erreur lors de la création du paiement : ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🩺 Espace Vétérinaire</Text>
        <Text style={styles.logout} onPress={logout}>Déconnexion</Text>
      </View>
      <Screen>
        <View style={styles.content}>
          <Text style={styles.emoji}>🩺</Text>
          <Text style={styles.title}>Abonnement Espace Vétérinaire</Text>
          <Text style={styles.description}>
            Recherchez les animaux de vos patients par identifiant (puce électronique) et ajoutez
            vaccins, médicaments, antiparasitaires, vermifuges, observations et pesées directement
            dans leur carnet de santé.
          </Text>

          <Card style={styles.priceCard}>
            <Text style={styles.price}>49,99 € <Text style={styles.priceUnit}>/ mois</Text></Text>
            <Text style={styles.priceHint}>Sans engagement, résiliable à tout moment.</Text>
            <Button
              title={checkoutLoading ? 'Redirection vers le paiement…' : "S'abonner — 49,99 €/mois"}
              onPress={handleSubscribe}
              disabled={checkoutLoading}
            />
          </Card>

          {billingError ? <Text style={styles.error}>{billingError}</Text> : null}
          <Text style={styles.secure}>Paiement sécurisé par Stripe.</Text>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontWeight: '800', fontSize: 16, color: colors.primary },
  logout: { color: colors.text, fontWeight: '600', fontSize: 13 },
  content: { alignItems: 'center', paddingTop: spacing.xl },
  emoji: { fontSize: 48, marginBottom: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center', color: colors.text },
  description: { color: colors.textLight, fontSize: 14, textAlign: 'center', marginBottom: spacing.xl },
  priceCard: { width: '100%', alignItems: 'center', paddingVertical: spacing.xl },
  price: { fontSize: 32, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  priceUnit: { fontSize: 14, fontWeight: '500', color: colors.textLight },
  priceHint: { color: colors.textLight, fontSize: 13, marginBottom: spacing.lg },
  error: { color: colors.red, fontSize: 14, marginTop: spacing.md, textAlign: 'center' },
  secure: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
});
