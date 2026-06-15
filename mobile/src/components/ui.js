import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, radius, spacing, shadow } from '../theme';

export function Screen({ children, style }) {
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function ScreenTitle({ children }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

export function Card({ children, style, selected, accentColor, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : undefined}
      style={[
        styles.card,
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
        selected ? { borderColor: colors.primary, borderWidth: 2 } : null,
        style,
      ]}
    >
      {children}
    </Wrapper>
  );
}

export function Field({ label, hint, children }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props) {
  return <TextInput style={[styles.input, props.style]} placeholderTextColor={colors.textMuted} {...props} />;
}

export function Select({ selectedValue, onValueChange, items, placeholder }) {
  return (
    <View style={styles.selectWrapper}>
      <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker}>
        {placeholder ? <Picker.Item label={placeholder} value="" /> : null}
        {items.map((item) => (
          <Picker.Item key={String(item.value)} label={item.label} value={item.value} />
        ))}
      </Picker>
    </View>
  );
}

export function Button({ title, onPress, color = colors.primary, textColor = colors.white, style, disabled, outline }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        outline ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: color } : { backgroundColor: color },
        disabled ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: outline ? color : textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function IconButton({ title, onPress, color, bg }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.iconButton, { backgroundColor: bg }]}>
      <Text style={[styles.iconButtonText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function EmptyState({ children }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{children}</Text>
    </View>
  );
}

export function Row({ children, style }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function ModalSheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  selectWrapper: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    color: colors.text,
    ...(Platform.OS === 'android' ? {} : { height: 120 }),
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  iconButton: {
    padding: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 16,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
});
