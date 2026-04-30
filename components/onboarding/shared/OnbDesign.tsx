// FitBite Reimagined — Onboarding paylaşımlı tasarım sistemi
// Kaynak: Claude Design "FitBite Reimagined.html"

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ViewStyle,
  KeyboardAvoidingView,
} from 'react-native';

// ─── Design Tokens ───────────────────────────────────────────────────────────

export const OnbColors = {
  bg:         '#F2EFE6',
  bg2:        '#EAE5D7',
  ink:        '#17201A',
  ink2:       '#3A463D',
  ink3:       '#6B7A6F',
  ink4:       '#A8B3A8',
  surface:    '#FBF8EF',
  surface2:   '#F5F1E4',
  line:       '#DDD6C2',
  terracotta: '#E85D3C',
  primary:    '#2D6A4F',
  berry:      '#A3202A',
  berryBg:    '#F5E8E8',
};

export const SERIF  = Platform.OS === 'ios' ? 'Georgia' : 'serif';
export const MONO   = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
export const UI     = Platform.OS === 'ios' ? 'System' : 'sans-serif';

// ─── OnbShell ────────────────────────────────────────────────────────────────

interface ShellProps {
  children: React.ReactNode;
  step?: number;
  total?: number;
  hideStepper?: boolean;
  scrollable?: boolean;
  style?: ViewStyle;
}

export function OnbShell({
  children,
  step,
  total,
  hideStepper,
  scrollable = true,
  style,
}: ShellProps) {
  const inner = (
    <View style={[onbStyles.shell, style]}>
      {!hideStepper && step !== undefined && total !== undefined && (
        <OnbStepper step={step} total={total} />
      )}
      {children}
    </View>
  );

  const kvBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  if (!scrollable) {
    return (
      <KeyboardAvoidingView
        style={onbStyles.container}
        behavior={kvBehavior}
      >
        {inner}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={onbStyles.container}
      behavior={kvBehavior}
    >
      <ScrollView
        contentContainerStyle={onbStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {inner}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── OnbStepper ──────────────────────────────────────────────────────────────

export function OnbStepper({ step, total }: { step: number; total: number }) {
  return (
    <View style={onbStyles.stepper}>
      <View style={onbStyles.stepperRow}>
        <Text style={onbStyles.stepperLeft}>
          ADIM {String(step).padStart(2, '0')}
          <Text style={{ opacity: 0.45 }}> / {total}</Text>
        </Text>
        <Text style={[onbStyles.stepperLeft, { opacity: 0.5 }]}>
          FİTBİTE · KURULUM
        </Text>
      </View>
      <View style={onbStyles.tickRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              onbStyles.tick,
              {
                backgroundColor: i < step ? OnbColors.ink : OnbColors.line,
                opacity: i < step ? 1 : 0.6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── OnbHead ─────────────────────────────────────────────────────────────────

interface HeadProps {
  kicker?: string;
  title: string;
  italic?: string;
  subtitle?: string;
}

export function OnbHead({ kicker, title, italic, subtitle }: HeadProps) {
  return (
    <View style={onbStyles.head}>
      {kicker ? (
        <Text style={onbStyles.headKicker}>{kicker.toUpperCase()}</Text>
      ) : null}
      <Text style={onbStyles.headTitle}>
        {title}
        {italic ? (
          <Text style={onbStyles.headItalic}> {italic}</Text>
        ) : null}
      </Text>
      {subtitle ? (
        <Text style={onbStyles.headSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

// ─── OnbFoot ─────────────────────────────────────────────────────────────────

interface FootProps {
  cta?: string;
  onNext: () => void;
  onBack?: () => void;
  dim?: boolean;
  note?: string;
}

export function OnbFoot({
  cta = 'Devam',
  onNext,
  onBack,
  dim,
  note,
}: FootProps) {
  return (
    <View style={onbStyles.foot}>
      {note ? (
        <Text style={onbStyles.footNote}>{note.toUpperCase()}</Text>
      ) : null}
      <TouchableOpacity
        style={[onbStyles.footCta, dim && onbStyles.footCtaDim]}
        onPress={dim ? undefined : onNext}
        activeOpacity={dim ? 1 : 0.8}
      >
        <Text style={[onbStyles.footSide, dim && { opacity: 0 }]}>↵</Text>
        <Text style={[onbStyles.footCtaText, dim && onbStyles.footCtaTextDim]}>
          {cta}
        </Text>
        <Text style={[onbStyles.footSide, dim && { opacity: 0 }]}>→</Text>
      </TouchableOpacity>
      {onBack ? (
        <TouchableOpacity style={onbStyles.backBtn} onPress={onBack}>
          <Text style={onbStyles.backText}>← Geri</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── OnbTile ─────────────────────────────────────────────────────────────────

interface TileProps {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
  compact?: boolean;
  accentBar?: boolean;
  style?: ViewStyle;
}

export function OnbTile({
  active,
  onPress,
  children,
  compact,
  accentBar,
  style,
}: TileProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        onbStyles.tile,
        active && onbStyles.tileActive,
        compact && onbStyles.tileCompact,
        style,
      ]}
    >
      {accentBar && active ? <View style={onbStyles.tileBar} /> : null}
      {children}
    </TouchableOpacity>
  );
}

// ─── OnbToggle ────────────────────────────────────────────────────────────────

export function OnbToggle({ on }: { on: boolean }) {
  return (
    <View style={[onbStyles.toggle, on && onbStyles.toggleOn]}>
      <View style={[onbStyles.toggleThumb, on && onbStyles.toggleThumbOn]} />
    </View>
  );
}

// ─── OnbRadio ────────────────────────────────────────────────────────────────

export function OnbRadio({ selected }: { selected: boolean }) {
  return (
    <View style={onbStyles.radio}>
      {selected ? <View style={onbStyles.radioDot} /> : null}
    </View>
  );
}

// ─── OnbCheckbox ─────────────────────────────────────────────────────────────

export function OnbCheckbox({ checked }: { checked: boolean }) {
  return (
    <View style={[onbStyles.checkbox, checked && onbStyles.checkboxChecked]}>
      {checked ? <Text style={onbStyles.checkmark}>✓</Text> : null}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function OnbDivider() {
  return <View style={onbStyles.divider} />;
}

// ─── MonoText helpers ─────────────────────────────────────────────────────────

export function MonoLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <Text style={[onbStyles.monoLabel, style]}>{children}</Text>;
}

export function SerifDisplay({
  children,
  size = 28,
  italic,
  color,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  italic?: boolean;
  color?: string;
  style?: object;
}) {
  return (
    <Text
      style={[
        onbStyles.serifDisplay,
        { fontSize: size, lineHeight: size * 1.1 },
        italic && { fontStyle: 'italic' },
        color ? { color } : undefined,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

export const onbStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnbColors.bg,
  },
  shell: {
    paddingTop: 0,
    paddingBottom: 130,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Stepper
  stepper: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 22,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepperLeft: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
  },
  tickRow: {
    flexDirection: 'row',
    gap: 3,
  },
  tick: {
    flex: 1,
    height: 2,
  },

  // Head
  head: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 18,
  },
  headKicker: {
    fontSize: 10,
    letterSpacing: 2.0,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headTitle: {
    fontSize: 34,
    lineHeight: 38,
    color: OnbColors.ink,
    fontFamily: SERIF,
    letterSpacing: -0.5,
  },
  headItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
    fontFamily: SERIF,
  },
  headSubtitle: {
    fontSize: 13.5,
    color: OnbColors.ink2,
    marginTop: 10,
    lineHeight: 20,
  },

  // Foot
  foot: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
    backgroundColor: OnbColors.bg,
  },
  footNote: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: OnbColors.ink3,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: MONO,
  },
  footCta: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: OnbColors.ink,
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footCtaDim: {
    backgroundColor: '#E5E0D4',
  },
  footSide: {
    fontSize: 11,
    fontFamily: MONO,
    color: OnbColors.bg,
    opacity: 0.55,
    letterSpacing: 1.6,
  },
  footCtaText: {
    fontSize: 18,
    fontFamily: SERIF,
    color: OnbColors.bg,
  },
  footCtaTextDim: {
    color: OnbColors.ink4,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  backText: {
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: 1.8,
    color: OnbColors.ink3,
    textTransform: 'uppercase',
    textDecorationLine: 'underline',
    textDecorationColor: OnbColors.line,
  },

  // Tile
  tile: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: OnbColors.line,
    padding: 14,
    position: 'relative',
  },
  tileActive: {
    backgroundColor: OnbColors.surface,
    borderColor: OnbColors.ink,
  },
  tileCompact: {
    padding: 12,
  },
  tileBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: OnbColors.terracotta,
  },

  // Toggle
  toggle: {
    width: 44,
    height: 22,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: OnbColors.ink,
  },
  toggleThumb: {
    position: 'absolute',
    left: 1.5,
    width: 17,
    height: 17,
    borderRadius: 999,
    backgroundColor: OnbColors.ink,
  },
  toggleThumbOn: {
    left: 23,
    backgroundColor: OnbColors.terracotta,
  },

  // Radio
  radio: {
    width: 18,
    height: 18,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: OnbColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: OnbColors.ink,
  },

  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: OnbColors.ink,
  },
  checkmark: {
    color: OnbColors.bg,
    fontSize: 14,
    fontFamily: SERIF,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: OnbColors.line,
  },

  // Mono label
  monoLabel: {
    fontSize: 9.5,
    letterSpacing: 2.0,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
  },

  // Serif display
  serifDisplay: {
    fontFamily: SERIF,
    color: OnbColors.ink,
    letterSpacing: -0.3,
  },
});
