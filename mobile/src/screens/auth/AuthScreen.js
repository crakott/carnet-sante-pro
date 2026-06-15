import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Input, Button, Field, Screen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme';

export default function AuthScreen() {
  const { signup, login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isVet, setIsVet] = useState(false);
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAuth = async () => {
    setError('');
    setResetMsg('');
    setSubmitting(true);
    try {
      if (isSignup) {
        await signup(email, password, isVet);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Entrez votre adresse email pour réinitialiser le mot de passe.');
      return;
    }
    setError('');
    setResetMsg('');
    try {
      await resetPassword(email);
      setResetMsg('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.header}>
          <Text style={styles.emoji}>🐾</Text>
          <Text style={styles.title}>Carnet Santé PRO</Text>
          <Text style={styles.subtitle}>{isSignup ? 'Créez votre compte gratuit' : 'Connectez-vous à votre espace'}</Text>
        </View>

        {isSignup && (
          <TouchableOpacity style={styles.vetCheckbox} onPress={() => setIsVet(!isVet)} activeOpacity={0.7}>
            <View style={[styles.checkbox, isVet ? styles.checkboxChecked : null]}>
              {isVet ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.vetCheckboxLabel}>🩺 Je suis vétérinaire / professionnel de santé animale (espace pro)</Text>
          </TouchableOpacity>
        )}

        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </Field>
        <Field label="Mot de passe">
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe"
            secureTextEntry
            autoCapitalize="none"
          />
        </Field>

        <Button title={isSignup ? 'Créer mon compte' : 'Se connecter'} onPress={handleAuth} disabled={submitting} style={{ marginBottom: spacing.sm }} />
        <Button
          title={isSignup ? 'Déjà inscrit ? Se connecter' : 'Créer un compte gratuit'}
          onPress={() => { setIsSignup(!isSignup); setError(''); setResetMsg(''); }}
          outline
        />

        {!isSignup && (
          <TouchableOpacity onPress={handlePasswordReset} style={{ marginTop: spacing.md }}>
            <Text style={styles.link}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        )}

        {resetMsg ? <Text style={styles.success}>{resetMsg}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.privacy}>
          En continuant, vous acceptez notre{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://carnet-sante-pro.web.app/privacy.html')}>
            politique de confidentialité
          </Text>
          .
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    color: colors.textLight,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  vetCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.greenLight,
    borderRadius: radius.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  vetCheckboxLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  success: {
    color: colors.primary,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  error: {
    color: colors.red,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  privacy: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});
