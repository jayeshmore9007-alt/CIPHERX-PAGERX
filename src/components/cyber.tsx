// cyber.tsx - shared cyberpunk UI kit components.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { COLORS, statusColor } from '../theme';

export const ScreenWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    {children}
  </ScrollView>
);

export const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={styles.header}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

export const Panel: React.FC<{ title: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ title, children, style }) => (
  <View style={[styles.panel, style]}>
    <Text style={styles.panelTitle}>{title}</Text>
    {children}
  </View>
);

export const Mono: React.FC<{ children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }> = ({ children, color, style }) => (
  <Text style={[styles.mono, color ? { color } : null, style]}>{children}</Text>
);

export const StatusDot: React.FC<{ state?: string }> = ({ state }) => (
  <View style={styles.dotRow}>
    <View style={[styles.dot, { backgroundColor: statusColor(state) }]} />
    <Text style={[styles.mono, { color: statusColor(state) }]}>{state || 'UNKNOWN'}</Text>
  </View>
);

export const Chip: React.FC<{
  label: string; state?: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>;
}> = ({ label, state, active, onPress, style }) => {
  const color = state ? statusColor(state) : active ? COLORS.primary : COLORS.textDim;
  const body = (
    <View style={[styles.chip, { borderColor: color }, style]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{body}</TouchableOpacity>;
  }
  return body;
};

export const GlowButton: React.FC<{
  label: string; onPress?: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, variant = 'primary', disabled, style }) => {
  const bg = disabled ? COLORS.border : variant === 'primary' ? COLORS.primary : variant === 'danger' ? COLORS.danger : 'transparent';
  const fg = disabled ? COLORS.textDim : variant === 'primary' || variant === 'danger' ? '#001a10' : COLORS.secondary;
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: bg, borderColor: variant === 'ghost' ? COLORS.border : 'transparent' }, style]}>
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: 16, paddingBottom: 48 },
  header: { marginBottom: 16 },
  title: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
  subtitle: { color: COLORS.textDim, marginTop: 4 },
  panel: {
    backgroundColor: COLORS.panel, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 8, padding: 12, marginBottom: 14,
  },
  panelTitle: { color: COLORS.secondary, marginBottom: 8, letterSpacing: 1 },
  mono: { color: COLORS.text, fontFamily: 'monospace', fontSize: 12, marginBottom: 2 },
  dotRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, backgroundColor: COLORS.textDim },
  chip: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    marginRight: 6, marginBottom: 6,
  },
  chipText: { fontSize: 11, fontFamily: 'monospace' },
  button: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, marginTop: 8, minWidth: 120, alignItems: 'center',
  },
  buttonText: { fontWeight: 'bold', letterSpacing: 1 },
});
