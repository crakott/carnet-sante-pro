import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Input, Button, Field, Screen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatDateInput, displayToIso } from '../../utils/dates';
import { colors, radius, spacing } from '../../theme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '1059301417055-i01l03c4ssgfjrt8ikigohju742iv2ik.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '1059301417055-etcblvn03chui4rotliig4fsdfo85har.apps.googleusercontent.com';

export default function AuthScreen() {
  const { signup, login, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isVet, setIsVet] = useState(false);
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [googleRequest, googleResponse, googlePrompt] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.authentication?.idToken;
      if (idToken) {
        setSubmitting(true);
        setError('');
        signInWithGoogle(idToken)
          .catch((err) => setError(err.message))
          .finally(() => setSubmitting(false));
      } else {
        setError('Connexion Google échouée : token manquant.');
      }
    } else if (googleResponse?.type === 'error') {
      setError('Connexion Google annulée ou échouée.');
    }
  }, [googleResponse]);

  const handleAuth = async () => {
    setError('');
    setResetMsg('');
    setSubmitting(true);
    try {
      if (isSignup) {
        const profile = { nom: nom.trim(), prenom: prenom.trim(), dateNaissance: displayToIso(dateNaissance) };
        await signup(email, password, isVet, profile);
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

        {isSignup && (
          <>
            <View style={styles.nameRow}>
              <Field label="Prénom" style={{ flex: 1 }}>
                <Input value={prenom} onChangeText={setPrenom} placeholder="Prénom" autoCapitalize="words" />
              </Field>
              <Field label="Nom" style={{ flex: 1 }}>
                <Input value={nom} onChangeText={setNom} placeholder="Nom" autoCapitalize="words" />
              </Field>
            </View>
            <Field label="Date de naissance">
              <Input
                value={dateNaissance}
                onChangeText={(v) => setDateNaissance(formatDateInput(v))}
                placeholder="JJ/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
              />
            </Field>
          </>
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
          <View style={{ position: 'relative' }}>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{ paddingRight: 48 }}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </Field>

        <Button title={isSignup ? 'Créer mon compte' : 'Se connecter'} onPress={handleAuth} disabled={submitting} style={{ marginBottom: spacing.sm }} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleBtn, (submitting || !googleRequest) && { opacity: 0.6 }]}
          onPress={() => { setError(''); googlePrompt(); }}
          disabled={submitting || !googleRequest}
          activeOpacity={0.8}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleBtnText}>Continuer avec Google</Text>
        </TouchableOpacity>

        <Button
          title={isSignup ? 'Déjà inscrit ? Se connecter' : 'Créer un compte gratuit'}
          onPress={() => { setIsSignup(!isSignup); setError(''); setResetMsg(''); }}
          outline
          style={{ marginTop: spacing.sm }}
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
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 13,
    color: colors.textLight,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});
