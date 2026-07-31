import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// steps: [{ icon?, title, description, arrow?: 'up'|'down' }]
export default function TutorialOverlay({ steps, storageKey, visible, onDone }) {
  const [step, setStep] = useState(0);

  if (!visible || !steps.length) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const dismiss = async () => {
    await AsyncStorage.setItem(storageKey, 'true');
    onDone();
  };

  const next = async () => {
    if (isLast) {
      await dismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />

        <View style={styles.wrapper}>
          {current.arrow === 'up' && <View style={styles.arrowUp} />}

          <View style={styles.card}>
            {current.icon ? <Text style={styles.icon}>{current.icon}</Text> : null}
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.description}>{current.description}</Text>

            <View style={styles.footer}>
              <View style={styles.dotsRow}>
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === step ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.btnSkip} onPress={dismiss}>
                  <Text style={styles.btnSkipText}>Passer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnNext} onPress={next}>
                  <Text style={styles.btnNextText}>
                    {isLast ? 'Compris !' : 'Suivant'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {current.arrow === 'down' && <View style={styles.arrowDown} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  arrowUp: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    marginBottom: 0,
  },
  arrowDown: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#059669',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#d1d5db',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnSkip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  btnSkipText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  btnNext: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  btnNextText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
