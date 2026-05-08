import React, { ReactNode, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  TextInputProps,
  Platform,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Colors } from '../../lib/constants';

const SERIF = 'InstrumentSerif_400Regular';
const SERIF_ITALIC = 'InstrumentSerif_400Regular_Italic';
const UI = 'Geist_400Regular';
const UI_MED = 'Geist_500Medium';
const MONO = 'GeistMono_400Regular';

export const AuthFonts = { SERIF, SERIF_ITALIC, UI, UI_MED, MONO };

// ─────────────────────────── Corner marks ───────────────────────────

export function AuthCornerMarks() {
  // viewBox 402x874 — matches design canvas. preserveAspectRatio none stretches.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 402 874" preserveAspectRatio="none">
        {/* TL */}
        <Line x1={20} y1={70} x2={34} y2={70} stroke={Colors.ink} strokeWidth={0.5} />
        <Line x1={20} y1={70} x2={20} y2={84} stroke={Colors.ink} strokeWidth={0.5} />
        {/* TR */}
        <Line x1={382} y1={70} x2={368} y2={70} stroke={Colors.ink} strokeWidth={0.5} />
        <Line x1={382} y1={70} x2={382} y2={84} stroke={Colors.ink} strokeWidth={0.5} />
        {/* BL */}
        <Line x1={20} y1={854} x2={34} y2={854} stroke={Colors.ink} strokeWidth={0.5} />
        <Line x1={20} y1={854} x2={20} y2={840} stroke={Colors.ink} strokeWidth={0.5} />
        {/* BR */}
        <Line x1={382} y1={854} x2={368} y2={854} stroke={Colors.ink} strokeWidth={0.5} />
        <Line x1={382} y1={854} x2={382} y2={840} stroke={Colors.ink} strokeWidth={0.5} />
      </Svg>
    </View>
  );
}

// ─────────────────────────── Logo ───────────────────────────

export function AuthLogo() {
  return (
    <View style={styles.logoRow}>
      <Text style={styles.logoText}>FitBite</Text>
      <View style={styles.logoDot} />
      <Text style={styles.logoVersion}>SÜRÜM 2026</Text>
    </View>
  );
}

// ─────────────────────────── Input ───────────────────────────

interface AuthInputProps extends Omit<TextInputProps, 'onChange' | 'value' | 'style'> {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  secondary?: ReactNode;
  big?: boolean;
}

export function AuthInput({
  label,
  hint,
  value,
  onChange,
  secondary,
  big,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  autoFocus,
  textContentType,
}: AuthInputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputHeader}>
        <Text style={[styles.inputLabel, focus && { color: Colors.terracotta }]}>{label}</Text>
        {secondary}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={hint}
        placeholderTextColor={Colors.ink4}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        autoCorrect={false}
        textContentType={textContentType}
        style={[
          styles.input,
          { fontSize: big ? 26 : 22 },
          { borderBottomColor: focus ? Colors.ink : Colors.ink3 },
        ]}
      />
    </View>
  );
}

// ─────────────────────────── Primary CTA (pill) ───────────────────────────

interface AuthCtaProps {
  label: string;
  kicker?: string;
  onPress?: () => void;
  dim?: boolean;
  loading?: boolean;
}

export function AuthCta({ label, kicker = '↵', onPress, dim, loading }: AuthCtaProps) {
  const disabled = dim || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cta,
        {
          backgroundColor: dim ? Colors.surfaceSecondary : Colors.ink,
          opacity: pressed && !disabled ? 0.92 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.ctaKicker,
          { color: dim ? Colors.ink4 : Colors.background, opacity: dim ? 0.7 : 0.55 },
        ]}
      >
        {kicker}
      </Text>
      <Text
        style={[
          styles.ctaLabel,
          { color: dim ? Colors.ink4 : Colors.background },
        ]}
      >
        {loading ? 'Yükleniyor…' : label}
      </Text>
      <Text
        style={[
          styles.ctaArrow,
          { color: dim ? Colors.ink4 : Colors.background },
        ]}
      >
        →
      </Text>
    </Pressable>
  );
}

// ─────────────────────────── OR divider ───────────────────────────

export function OrDivider({ label = 'ya da' }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label.toUpperCase()}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─────────────────────────── Provider mark glyphs ───────────────────────────

export function ProviderMark({ kind }: { kind: 'apple' | 'google' | 'email' }) {
  if (kind === 'google') {
    return (
      <View style={styles.providerGlyphCircle}>
        <Text style={styles.providerGlyphG}>G</Text>
      </View>
    );
  }
  if (kind === 'apple') {
    return (
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Line x1={2.8} y1={8.2} x2={11.2} y2={8.2} stroke={Colors.ink} strokeWidth={1} />
      </Svg>
    );
  }
  if (kind === 'email') {
    return (
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Line x1={2} y1={3.5} x2={12} y2={3.5} stroke={Colors.ink} strokeWidth={1} />
        <Line x1={2} y1={10.5} x2={12} y2={10.5} stroke={Colors.ink} strokeWidth={1} />
        <Line x1={2} y1={3.5} x2={2} y2={10.5} stroke={Colors.ink} strokeWidth={1} />
        <Line x1={12} y1={3.5} x2={12} y2={10.5} stroke={Colors.ink} strokeWidth={1} />
        <Line x1={2} y1={4} x2={7} y2={7.5} stroke={Colors.ink} strokeWidth={1} />
        <Line x1={12} y1={4} x2={7} y2={7.5} stroke={Colors.ink} strokeWidth={1} />
      </Svg>
    );
  }
  return null;
}

// ─────────────────────────── Provider row (Apple / Google) ───────────────────────────

interface ProviderItem {
  k: 'apple' | 'google' | 'email';
  label: string;
}

export function ProviderRow({ items, onPick, disabled }: { items: ProviderItem[]; onPick?: (k: ProviderItem['k']) => void; disabled?: boolean }) {
  return (
    <View style={styles.providerRow}>
      {items.map((it, i) => (
        <Pressable
          key={it.k}
          onPress={() => onPick?.(it.k)}
          disabled={disabled}
          style={({ pressed }) => [
            styles.providerCell,
            i > 0 && styles.providerCellBorder,
            { opacity: pressed && !disabled ? 0.6 : 1 },
          ]}
        >
          <View style={styles.providerInner}>
            <ProviderMark kind={it.k} />
            <Text style={styles.providerLabel}>{it.label}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ─────────────────────────── Foot switch (alt link) ───────────────────────────

export function FootSwitch({ kicker, label, italic, onPress }: { kicker: string; label: string; italic: string; onPress?: () => void }) {
  return (
    <View style={styles.footWrap}>
      <Text style={styles.footKicker}>{kicker.toUpperCase()}</Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={styles.footLabel}>
          {label}
          <Text style={styles.footItalic}> {italic}</Text>
          <Text style={styles.footArrow}>  →</Text>
        </Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────── Show / hide secondary ───────────────────────────

export function ShowToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} hitSlop={8}>
      <Text style={styles.showToggle}>{shown ? 'GİZLE' : 'GÖSTER'}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────── Strength indicator ───────────────────────────

export function pwScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

const STRENGTH_COLORS = [Colors.ink4, '#B0392B', Colors.ochre, Colors.primary, Colors.primaryDark];
const STRENGTH_LABELS = ['HENÜZ', 'ZAYIF', 'ORTA', 'İYİ', 'SAĞLAM'];

export function StrengthIndicator({ score }: { score: number }) {
  return (
    <View style={styles.strengthRow}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.strengthTick,
            { backgroundColor: i < score ? Colors.ink : Colors.line, opacity: i < score ? 1 : 0.6 },
          ]}
        />
      ))}
    </View>
  );
}

export function StrengthLabel({ score }: { score: number }) {
  return (
    <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[score] }]}>
      {STRENGTH_LABELS[score]}
    </Text>
  );
}

// ─────────────────────────── Consent row ───────────────────────────

export function ConsentRow({
  checked,
  onToggle,
  required,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.consentRow}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <Text style={styles.consentText}>
        {required && <Text style={styles.consentRequired}>ZORUNLU  </Text>}
        {children}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────── Forgot password small link ───────────────────────────

export function ForgotPassword({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.forgotRow}>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={styles.forgotText}>Şifremi unuttum</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────── Styles ───────────────────────────

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  logoText: {
    fontFamily: SERIF,
    fontSize: 22,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.terracotta,
    transform: [{ translateY: -3 }],
  },
  logoVersion: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 2.7,
    color: Colors.ink3,
  },

  inputWrap: {
    marginTop: 22,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  inputLabel: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 2,
    color: Colors.ink3,
  },
  input: {
    width: '100%',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
    fontFamily: SERIF,
    color: Colors.ink,
    letterSpacing: -0.2,
  },

  cta: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaKicker: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 2,
  },
  ctaLabel: {
    fontFamily: SERIF,
    fontSize: 19,
    letterSpacing: 0.2,
  },
  ctaArrow: {
    fontFamily: SERIF,
    fontSize: 19,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.line,
  },
  dividerLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.ink3,
  },

  providerRow: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: Colors.ink,
  },
  providerCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  providerCellBorder: {
    borderLeftWidth: 0.5,
    borderLeftColor: Colors.ink,
  },
  providerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  providerLabel: {
    fontFamily: UI,
    fontSize: 12.5,
    color: Colors.ink,
  },
  providerGlyphCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerGlyphG: {
    fontFamily: SERIF_ITALIC,
    fontSize: 9,
    color: Colors.ink,
    lineHeight: 10,
  },

  footWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  footKicker: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 2,
    color: Colors.ink3,
    marginBottom: 6,
  },
  footLabel: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.ink,
  },
  footItalic: {
    fontFamily: SERIF_ITALIC,
    color: Colors.terracotta,
  },
  footArrow: {
    fontFamily: SERIF,
    color: Colors.ink,
  },

  showToggle: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 1.7,
    color: Colors.ink3,
  },

  strengthRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  strengthTick: {
    flex: 1,
    height: 2,
  },
  strengthLabel: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.5,
  },

  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 0.5,
    borderColor: Colors.ink,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: Colors.ink,
  },
  checkboxTick: {
    fontFamily: SERIF,
    fontSize: 12,
    color: Colors.background,
    lineHeight: 12,
  },
  consentText: {
    flex: 1,
    fontFamily: UI,
    fontSize: 12,
    lineHeight: 17.4,
    color: Colors.ink2,
  },
  consentRequired: {
    fontFamily: MONO,
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: Colors.terracotta,
  },

  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  forgotText: {
    fontFamily: SERIF_ITALIC,
    fontSize: 13,
    color: Colors.ink2,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.ink3,
    paddingBottom: 1,
  },
});
